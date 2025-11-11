import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORTAL_BACKEND_PORT || 3001,

  keycloak: {
    url: process.env.KEYCLOAK_URL || 'http://localhost:8080',
    realm: process.env.KEYCLOAK_REALM || 'n8n-platform',
    clientId: process.env.KEYCLOAK_CLIENT_ID || 'n8n-portal',
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '',
  },

  provisioner: {
    url: process.env.PROVISIONER_URL || 'http://localhost:3002',
  },

  n8n: {
    baseDomain: process.env.N8N_BASE_DOMAIN || 'n8n.localhost',
    protocol: process.env.N8N_PROTOCOL || 'http',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
};
