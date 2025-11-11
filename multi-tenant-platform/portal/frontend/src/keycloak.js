import Keycloak from 'keycloak-js';

// Keycloak configuration
const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'n8n-platform',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'n8n-portal',
};

// Create Keycloak instance
const keycloak = new Keycloak(keycloakConfig);

/**
 * Initialize Keycloak
 * @returns {Promise<boolean>} Whether user is authenticated
 */
export async function initKeycloak() {
  try {
    const authenticated = await keycloak.init({
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      pkceMethod: 'S256',
    });

    if (authenticated) {
      console.log('User is authenticated');
      startTokenRefresh();
    } else {
      console.log('User is not authenticated');
    }

    return authenticated;
  } catch (error) {
    console.error('Failed to initialize Keycloak', error);
    throw error;
  }
}

/**
 * Login with Keycloak
 */
export function login() {
  keycloak.login();
}

/**
 * Logout from Keycloak
 */
export function logout() {
  keycloak.logout();
}

/**
 * Get the current access token
 * @returns {string|undefined} Access token
 */
export function getToken() {
  return keycloak.token;
}

/**
 * Get user profile information
 * @returns {Promise<Object>} User profile
 */
export async function getUserProfile() {
  try {
    const profile = await keycloak.loadUserProfile();
    return profile;
  } catch (error) {
    console.error('Failed to load user profile', error);
    throw error;
  }
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  return keycloak.authenticated || false;
}

/**
 * Update token if it's about to expire
 * @returns {Promise<boolean>} Whether token was updated
 */
export async function updateToken() {
  try {
    const refreshed = await keycloak.updateToken(30); // Refresh if expires in 30 seconds
    if (refreshed) {
      console.log('Token was successfully refreshed');
    }
    return refreshed;
  } catch (error) {
    console.error('Failed to refresh token', error);
    logout();
    throw error;
  }
}

/**
 * Start automatic token refresh
 */
function startTokenRefresh() {
  // Update token every 60 seconds
  setInterval(() => {
    updateToken().catch((err) => {
      console.error('Token refresh failed:', err);
    });
  }, 60000);
}

export default keycloak;
