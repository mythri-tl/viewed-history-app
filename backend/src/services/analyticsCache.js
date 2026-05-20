class AnalyticsCache {
  constructor() {
    this.cache = new Map(); // Key: userId-type, Value: { data, expiry }
    this.TTL = 5 * 60 * 1000; // 5 minutes cache duration
  }

  get(userId, type) {
    const key = `${userId}-${type}`;
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);
      if (Date.now() < entry.expiry) {
        console.log(`[Analytics Cache Hit] Serving cached ${type} for user ${userId}`);
        return entry.data;
      }
      this.cache.delete(key);
    }
    return null;
  }

  set(userId, type, data) {
    const key = `${userId}-${type}`;
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.TTL
    });
  }

  invalidate(userId) {
    console.log(`[Analytics Cache Invalidation] Cleared cache for user ${userId}`);
    this.cache.delete(`${userId}-topics`);
    this.cache.delete(`${userId}-trends`);
    this.cache.delete(`${userId}-insights`);
  }
}

module.exports = new AnalyticsCache();
