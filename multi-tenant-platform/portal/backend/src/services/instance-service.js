import axios from 'axios';
import { config } from '../config.js';

/**
 * Service to manage n8n instances via the provisioner
 */
class InstanceService {
  constructor() {
    this.provisionerUrl = config.provisioner.url;
  }

  /**
   * Get instance info for a user
   * @param {string} userId - Keycloak user ID
   * @returns {Promise<Object>} Instance information
   */
  async getInstance(userId) {
    try {
      const response = await axios.get(`${this.provisionerUrl}/instances/${userId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // Instance doesn't exist
      }
      throw new Error(`Failed to get instance: ${error.message}`);
    }
  }

  /**
   * Provision a new n8n instance for a user
   * @param {string} userId - Keycloak user ID
   * @param {Object} userInfo - User information (email, username, etc.)
   * @returns {Promise<Object>} Provisioned instance information
   */
  async provisionInstance(userId, userInfo) {
    try {
      const response = await axios.post(`${this.provisionerUrl}/instances`, {
        userId,
        email: userInfo.email,
        username: userInfo.username,
        name: userInfo.name,
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to provision instance: ${error.message}`);
    }
  }

  /**
   * Get or create instance for a user
   * @param {string} userId - Keycloak user ID
   * @param {Object} userInfo - User information
   * @returns {Promise<Object>} Instance information
   */
  async getOrCreateInstance(userId, userInfo) {
    let instance = await this.getInstance(userId);

    if (!instance) {
      console.log(`Provisioning new instance for user ${userId}`);
      instance = await this.provisionInstance(userId, userInfo);
    } else {
      console.log(`Instance already exists for user ${userId}`);
    }

    return instance;
  }

  /**
   * Delete an instance
   * @param {string} userId - Keycloak user ID
   * @returns {Promise<void>}
   */
  async deleteInstance(userId) {
    try {
      await axios.delete(`${this.provisionerUrl}/instances/${userId}`);
    } catch (error) {
      throw new Error(`Failed to delete instance: ${error.message}`);
    }
  }

  /**
   * Get all instances
   * @returns {Promise<Array>} List of all instances
   */
  async getAllInstances() {
    try {
      const response = await axios.get(`${this.provisionerUrl}/instances`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get instances: ${error.message}`);
    }
  }

  /**
   * Get the URL for a user's n8n instance
   * @param {string} userId - Keycloak user ID
   * @returns {string} Instance URL
   */
  getInstanceUrl(userId) {
    const subdomain = `user-${userId}`;
    return `${config.n8n.protocol}://${subdomain}.${config.n8n.baseDomain}`;
  }
}

export default new InstanceService();
