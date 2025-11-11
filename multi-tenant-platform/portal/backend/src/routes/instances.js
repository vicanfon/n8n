import express from 'express';
import instanceService from '../services/instance-service.js';

const router = express.Router();

/**
 * GET /api/instances/me
 * Get or create the current user's n8n instance
 */
router.get('/me', async (req, res) => {
  try {
    const userId = req.user.id;
    const userInfo = req.user;

    const instance = await instanceService.getOrCreateInstance(userId, userInfo);
    const instanceUrl = instanceService.getInstanceUrl(userId);

    res.json({
      instance,
      url: instanceUrl,
      status: instance.status,
    });
  } catch (error) {
    console.error('Error getting/creating instance:', error);
    res.status(500).json({ error: 'Failed to get or create instance' });
  }
});

/**
 * GET /api/instances/me/status
 * Get the status of the current user's instance
 */
router.get('/me/status', async (req, res) => {
  try {
    const userId = req.user.id;
    const instance = await instanceService.getInstance(userId);

    if (!instance) {
      return res.json({ exists: false });
    }

    res.json({
      exists: true,
      status: instance.status,
      url: instanceService.getInstanceUrl(userId),
      createdAt: instance.createdAt,
    });
  } catch (error) {
    console.error('Error getting instance status:', error);
    res.status(500).json({ error: 'Failed to get instance status' });
  }
});

/**
 * DELETE /api/instances/me
 * Delete the current user's instance
 */
router.delete('/me', async (req, res) => {
  try {
    const userId = req.user.id;
    await instanceService.deleteInstance(userId);

    res.json({ message: 'Instance deleted successfully' });
  } catch (error) {
    console.error('Error deleting instance:', error);
    res.status(500).json({ error: 'Failed to delete instance' });
  }
});

/**
 * GET /api/instances (Admin only - for future use)
 * Get all instances
 */
router.get('/', async (req, res) => {
  try {
    const instances = await instanceService.getAllInstances();
    res.json(instances);
  } catch (error) {
    console.error('Error getting all instances:', error);
    res.status(500).json({ error: 'Failed to get instances' });
  }
});

export default router;
