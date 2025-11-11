import pg from 'pg';
import { config } from './config.js';

const { Client } = pg;

/**
 * Database manager for creating and managing PostgreSQL databases
 */
class DatabaseManager {
  /**
   * Create a new database for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Database credentials
   */
  async createDatabase(userId) {
    const dbName = `n8n_user_${userId.replace(/-/g, '_')}`;
    const dbUser = `n8n_${userId.substring(0, 8)}`;
    const dbPassword = this.generatePassword();

    const client = new Client({
      host: config.postgres.host,
      port: config.postgres.port,
      user: config.postgres.user,
      password: config.postgres.password,
      database: config.postgres.database,
    });

    try {
      await client.connect();

      // Check if database already exists
      const dbCheckQuery = `SELECT 1 FROM pg_database WHERE datname = $1`;
      const dbResult = await client.query(dbCheckQuery, [dbName]);

      if (dbResult.rows.length > 0) {
        console.log(`Database ${dbName} already exists`);
        await client.end();
        return {
          host: config.postgres.host,
          port: config.postgres.port,
          database: dbName,
          username: dbUser,
          password: dbPassword, // Note: This may not be the actual password if user exists
        };
      }

      // Create user if doesn't exist
      const userCheckQuery = `SELECT 1 FROM pg_user WHERE usename = $1`;
      const userResult = await client.query(userCheckQuery, [dbUser]);

      if (userResult.rows.length === 0) {
        console.log(`Creating user ${dbUser}`);
        await client.query(`CREATE USER ${dbUser} WITH PASSWORD '${dbPassword}'`);
      }

      // Create database
      console.log(`Creating database ${dbName}`);
      await client.query(`CREATE DATABASE ${dbName} OWNER ${dbUser}`);

      // Grant privileges
      await client.query(`GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser}`);

      console.log(`Database ${dbName} created successfully`);

      await client.end();

      return {
        host: config.postgres.host,
        port: config.postgres.port,
        database: dbName,
        username: dbUser,
        password: dbPassword,
      };
    } catch (error) {
      await client.end();
      throw new Error(`Failed to create database: ${error.message}`);
    }
  }

  /**
   * Delete a user's database
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async deleteDatabase(userId) {
    const dbName = `n8n_user_${userId.replace(/-/g, '_')}`;
    const dbUser = `n8n_${userId.substring(0, 8)}`;

    const client = new Client({
      host: config.postgres.host,
      port: config.postgres.port,
      user: config.postgres.user,
      password: config.postgres.password,
      database: config.postgres.database,
    });

    try {
      await client.connect();

      // Terminate existing connections
      await client.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = $1
          AND pid <> pg_backend_pid()
      `, [dbName]);

      // Drop database
      console.log(`Dropping database ${dbName}`);
      await client.query(`DROP DATABASE IF EXISTS ${dbName}`);

      // Drop user
      console.log(`Dropping user ${dbUser}`);
      await client.query(`DROP USER IF EXISTS ${dbUser}`);

      await client.end();

      console.log(`Database ${dbName} deleted successfully`);
    } catch (error) {
      await client.end();
      throw new Error(`Failed to delete database: ${error.message}`);
    }
  }

  /**
   * Check if a database exists
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  async databaseExists(userId) {
    const dbName = `n8n_user_${userId.replace(/-/g, '_')}`;

    const client = new Client({
      host: config.postgres.host,
      port: config.postgres.port,
      user: config.postgres.user,
      password: config.postgres.password,
      database: config.postgres.database,
    });

    try {
      await client.connect();
      const query = `SELECT 1 FROM pg_database WHERE datname = $1`;
      const result = await client.query(query, [dbName]);
      await client.end();
      return result.rows.length > 0;
    } catch (error) {
      await client.end();
      throw new Error(`Failed to check database existence: ${error.message}`);
    }
  }

  /**
   * Generate a random password
   * @returns {string}
   */
  generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 24; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}

export default new DatabaseManager();
