import Docker from 'dockerode';
import { config } from './config.js';

/**
 * Docker manager for creating and managing n8n containers
 */
class DockerManager {
  constructor() {
    this.docker = new Docker({ socketPath: config.docker.socketPath });
  }

  /**
   * Create a new n8n container for a user
   * @param {string} userId - User ID
   * @param {Object} dbCredentials - Database credentials
   * @param {Object} userInfo - User information
   * @returns {Promise<Object>} Container information
   */
  async createContainer(userId, dbCredentials, userInfo) {
    const containerName = `n8n-user-${userId}`;
    const subdomain = `user-${userId}`;

    try {
      // Check if container already exists
      const existingContainer = await this.getContainer(userId);
      if (existingContainer) {
        console.log(`Container ${containerName} already exists`);
        return this.getContainerInfo(existingContainer);
      }

      // Pull the n8n image if not present
      await this.pullImage(config.n8n.image);

      // Create container
      console.log(`Creating container ${containerName}`);
      const container = await this.docker.createContainer({
        Image: config.n8n.image,
        name: containerName,
        Env: [
          `DB_TYPE=postgresdb`,
          `DB_POSTGRESDB_HOST=${dbCredentials.host}`,
          `DB_POSTGRESDB_PORT=${dbCredentials.port}`,
          `DB_POSTGRESDB_DATABASE=${dbCredentials.database}`,
          `DB_POSTGRESDB_USER=${dbCredentials.username}`,
          `DB_POSTGRESDB_PASSWORD=${dbCredentials.password}`,
          `N8N_HOST=${subdomain}.${config.n8n.baseDomain}`,
          `WEBHOOK_URL=http://${subdomain}.${config.n8n.baseDomain}/`,
          `N8N_EDITOR_BASE_URL=http://${subdomain}.${config.n8n.baseDomain}/`,
        ],
        Labels: {
          'n8n-instance': 'true',
          'n8n-user-id': userId,
          'traefik.enable': 'true',
          'traefik.http.routers.n8n-user-${userId}.rule': `Host(\`${subdomain}.${config.n8n.baseDomain}\`)`,
        },
        HostConfig: {
          NetworkMode: config.n8n.network,
          RestartPolicy: {
            Name: 'unless-stopped',
          },
          Memory: this.parseMemory(config.n8n.memoryLimit),
          NanoCpus: config.n8n.cpuLimit * 1e9,
        },
      });

      // Start container
      await container.start();
      console.log(`Container ${containerName} started successfully`);

      return this.getContainerInfo(container);
    } catch (error) {
      throw new Error(`Failed to create container: ${error.message}`);
    }
  }

  /**
   * Get container by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Docker container object or null
   */
  async getContainer(userId) {
    try {
      const containers = await this.docker.listContainers({ all: true });
      const containerInfo = containers.find(
        (c) => c.Labels['n8n-user-id'] === userId
      );

      if (!containerInfo) {
        return null;
      }

      return this.docker.getContainer(containerInfo.Id);
    } catch (error) {
      console.error('Error getting container:', error);
      return null;
    }
  }

  /**
   * Get container information
   * @param {Object} container - Docker container object
   * @returns {Promise<Object>} Container information
   */
  async getContainerInfo(container) {
    const info = await container.inspect();
    return {
      id: info.Id,
      name: info.Name.replace('/', ''),
      status: info.State.Running ? 'running' : 'stopped',
      created: info.Created,
      image: info.Config.Image,
    };
  }

  /**
   * Stop and remove a container
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async deleteContainer(userId) {
    try {
      const container = await this.getContainer(userId);
      if (!container) {
        console.log(`Container for user ${userId} not found`);
        return;
      }

      const info = await container.inspect();
      if (info.State.Running) {
        console.log(`Stopping container for user ${userId}`);
        await container.stop();
      }

      console.log(`Removing container for user ${userId}`);
      await container.remove();
      console.log(`Container for user ${userId} deleted successfully`);
    } catch (error) {
      throw new Error(`Failed to delete container: ${error.message}`);
    }
  }

  /**
   * List all n8n containers
   * @returns {Promise<Array>} List of container information
   */
  async listContainers() {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: { label: ['n8n-instance=true'] },
      });

      return containers.map((c) => ({
        id: c.Id,
        name: c.Names[0].replace('/', ''),
        userId: c.Labels['n8n-user-id'],
        status: c.State,
        created: c.Created,
      }));
    } catch (error) {
      throw new Error(`Failed to list containers: ${error.message}`);
    }
  }

  /**
   * Pull Docker image
   * @param {string} imageName - Image name
   * @returns {Promise<void>}
   */
  async pullImage(imageName) {
    try {
      console.log(`Checking for image ${imageName}`);
      const images = await this.docker.listImages();
      const imageExists = images.some((img) =>
        img.RepoTags?.includes(imageName)
      );

      if (imageExists) {
        console.log(`Image ${imageName} already exists`);
        return;
      }

      console.log(`Pulling image ${imageName}...`);
      await new Promise((resolve, reject) => {
        this.docker.pull(imageName, (err, stream) => {
          if (err) return reject(err);

          this.docker.modem.followProgress(stream, (err, output) => {
            if (err) return reject(err);
            resolve(output);
          });
        });
      });

      console.log(`Image ${imageName} pulled successfully`);
    } catch (error) {
      console.error(`Failed to pull image: ${error.message}`);
      // Don't throw - continue with existing image if pull fails
    }
  }

  /**
   * Parse memory limit string to bytes
   * @param {string} memoryStr - Memory string (e.g., "512m", "1g")
   * @returns {number} Memory in bytes
   */
  parseMemory(memoryStr) {
    const units = { k: 1024, m: 1024 ** 2, g: 1024 ** 3 };
    const match = memoryStr.match(/^(\d+)([kmg])$/i);

    if (!match) {
      return 512 * 1024 * 1024; // Default 512MB
    }

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    return value * units[unit];
  }
}

export default new DockerManager();
