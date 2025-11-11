/**
 * In-memory instance tracker
 * For production, replace with a persistent store (Redis, database, etc.)
 */
class InstanceTracker {
  constructor() {
    this.instances = new Map();
  }

  /**
   * Add or update an instance
   * @param {string} userId - User ID
   * @param {Object} instanceData - Instance data
   */
  set(userId, instanceData) {
    this.instances.set(userId, {
      ...instanceData,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Get instance by user ID
   * @param {string} userId - User ID
   * @returns {Object|null} Instance data or null
   */
  get(userId) {
    return this.instances.get(userId) || null;
  }

  /**
   * Check if instance exists
   * @param {string} userId - User ID
   * @returns {boolean}
   */
  has(userId) {
    return this.instances.has(userId);
  }

  /**
   * Delete an instance
   * @param {string} userId - User ID
   * @returns {boolean} Whether instance was deleted
   */
  delete(userId) {
    return this.instances.delete(userId);
  }

  /**
   * Get all instances
   * @returns {Array} Array of instances
   */
  getAll() {
    return Array.from(this.instances.entries()).map(([userId, data]) => ({
      userId,
      ...data,
    }));
  }

  /**
   * Get instance count
   * @returns {number}
   */
  count() {
    return this.instances.size;
  }

  /**
   * Clear all instances (for testing)
   */
  clear() {
    this.instances.clear();
  }
}

export default new InstanceTracker();
