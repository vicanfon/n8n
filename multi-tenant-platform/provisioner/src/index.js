import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import dbManager from './db-manager.js';
import dockerManager from './docker-manager.js';
import instanceTracker from './instance-tracker.js';

const app = express();

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'n8n-provisioner',
    instances: instanceTracker.count(),
  });
});

/**
 * POST /instances
 * Provision a new n8n instance
 */
app.post('/instances', async (req, res) => {
  const { userId, email, username, name } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // Check if instance already exists
    if (instanceTracker.has(userId)) {
      const existingInstance = instanceTracker.get(userId);
      return res.json({
        message: 'Instance already exists',
        instance: existingInstance,
      });
    }

    console.log(`Provisioning instance for user ${userId}`);

    // Create database
    const dbCredentials = await dbManager.createDatabase(userId);

    // Create Docker container
    const containerInfo = await dockerManager.createContainer(
      userId,
      dbCredentials,
      { email, username, name }
    );

    // Track instance
    const instance = {
      userId,
      status: containerInfo.status,
      containerId: containerInfo.id,
      containerName: containerInfo.name,
      database: dbCredentials.database,
      createdAt: new Date().toISOString(),
      userInfo: { email, username, name },
    };

    instanceTracker.set(userId, instance);

    console.log(`Instance provisioned successfully for user ${userId}`);

    res.status(201).json({
      message: 'Instance provisioned successfully',
      instance,
    });
  } catch (error) {
    console.error('Error provisioning instance:', error);
    res.status(500).json({ error: 'Failed to provision instance' });
  }
});

/**
 * GET /instances/:userId
 * Get instance information
 */
app.get('/instances/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const instance = instanceTracker.get(userId);

    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    // Get current container status
    const container = await dockerManager.getContainer(userId);
    if (container) {
      const containerInfo = await dockerManager.getContainerInfo(container);
      instance.status = containerInfo.status;
      instanceTracker.set(userId, instance);
    }

    res.json(instance);
  } catch (error) {
    console.error('Error getting instance:', error);
    res.status(500).json({ error: 'Failed to get instance' });
  }
});

/**
 * GET /instances
 * List all instances
 */
app.get('/instances', async (req, res) => {
  try {
    const instances = instanceTracker.getAll();
    res.json(instances);
  } catch (error) {
    console.error('Error listing instances:', error);
    res.status(500).json({ error: 'Failed to list instances' });
  }
});

/**
 * DELETE /instances/:userId
 * Delete an instance
 */
app.delete('/instances/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const instance = instanceTracker.get(userId);

    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    console.log(`Deleting instance for user ${userId}`);

    // Delete Docker container
    await dockerManager.deleteContainer(userId);

    // Delete database
    await dbManager.deleteDatabase(userId);

    // Remove from tracker
    instanceTracker.delete(userId);

    console.log(`Instance deleted successfully for user ${userId}`);

    res.json({ message: 'Instance deleted successfully' });
  } catch (error) {
    console.error('Error deleting instance:', error);
    res.status(500).json({ error: 'Failed to delete instance' });
  }
});

/**
 * POST /instances/:userId/restart
 * Restart an instance
 */
app.post('/instances/:userId/restart', async (req, res) => {
  const { userId } = req.params;

  try {
    const container = await dockerManager.getContainer(userId);

    if (!container) {
      return res.status(404).json({ error: 'Container not found' });
    }

    console.log(`Restarting container for user ${userId}`);
    await container.restart();

    const containerInfo = await dockerManager.getContainerInfo(container);
    const instance = instanceTracker.get(userId);
    if (instance) {
      instance.status = containerInfo.status;
      instanceTracker.set(userId, instance);
    }

    res.json({ message: 'Instance restarted successfully' });
  } catch (error) {
    console.error('Error restarting instance:', error);
    res.status(500).json({ error: 'Failed to restart instance' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(config.port, () => {
  console.log(`Provisioner running on port ${config.port}`);
  console.log(`PostgreSQL: ${config.postgres.host}:${config.postgres.port}`);
  console.log(`n8n image: ${config.n8n.image}`);
  console.log(`Docker network: ${config.n8n.network}`);
});
