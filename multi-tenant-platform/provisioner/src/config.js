import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PROVISIONER_PORT || 3002,

  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: 'postgres', // Connect to postgres db to create other databases
  },

  n8n: {
    image: process.env.N8N_IMAGE || 'n8nio/n8n:latest',
    baseDomain: process.env.N8N_BASE_DOMAIN || 'n8n.localhost',
    network: process.env.DOCKER_NETWORK || 'n8n-platform',
    memoryLimit: process.env.N8N_MEMORY_LIMIT || '512m',
    cpuLimit: parseFloat(process.env.N8N_CPU_LIMIT || '1'),
  },

  docker: {
    socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
  },
};
