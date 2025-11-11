import axios from 'axios';
import { getToken, updateToken } from './keycloak';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    try {
      // Try to update token before making request
      await updateToken();
    } catch (error) {
      console.error('Token update failed:', error);
    }

    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Unauthorized - redirecting to login');
      // Could trigger logout here
    }
    return Promise.reject(error);
  }
);

/**
 * Get current user info
 */
export async function getCurrentUser() {
  const response = await api.get('/api/user/me');
  return response.data;
}

/**
 * Get or create user's n8n instance
 */
export async function getOrCreateInstance() {
  const response = await api.get('/api/instances/me');
  return response.data;
}

/**
 * Get instance status
 */
export async function getInstanceStatus() {
  const response = await api.get('/api/instances/me/status');
  return response.data;
}

/**
 * Delete user's instance
 */
export async function deleteInstance() {
  const response = await api.delete('/api/instances/me');
  return response.data;
}

export default api;
