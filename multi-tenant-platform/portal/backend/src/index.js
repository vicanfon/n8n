import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import { authenticateToken } from './middleware/auth.js';
import instancesRouter from './routes/instances.js';

const app = express();

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors(config.cors));
app.use(express.json());

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'n8n-portal-backend' });
});

// API routes (all require authentication)
app.use('/api/instances', authenticateToken, instancesRouter);

// User info endpoint
app.get('/api/user/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

// Error handling middleware
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
  console.log(`Portal backend running on port ${config.port}`);
  console.log(`Keycloak URL: ${config.keycloak.url}`);
  console.log(`Keycloak Realm: ${config.keycloak.realm}`);
  console.log(`Provisioner URL: ${config.provisioner.url}`);
});
