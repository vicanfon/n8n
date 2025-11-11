import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../config.js';

// Create JWKS client to fetch public keys from Keycloak
const client = jwksClient({
  jwksUri: `${config.keycloak.url}/realms/${config.keycloak.realm}/protocol/openid-connect/certs`,
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
});

/**
 * Get the signing key from Keycloak
 */
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Middleware to verify JWT token from Keycloak
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Verify token with Keycloak's public key
  jwt.verify(
    token,
    getKey,
    {
      audience: config.keycloak.clientId,
      issuer: `${config.keycloak.url}/realms/${config.keycloak.realm}`,
      algorithms: ['RS256'],
    },
    (err, decoded) => {
      if (err) {
        console.error('Token verification failed:', err.message);
        return res.status(403).json({ error: 'Invalid or expired token' });
      }

      // Attach user info to request
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        username: decoded.preferred_username,
        name: decoded.name,
      };

      next();
    }
  );
}

/**
 * Optional: Middleware to check for specific roles
 */
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const roles = req.user.realm_access?.roles || [];
    if (!roles.includes(role)) {
      return res.status(403).json({ error: `Required role: ${role}` });
    }

    next();
  };
}
