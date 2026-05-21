class AnalyticsCache {
  constructor() {
    this.cache = new Map(); // Key: userId-type, Value: { data, expiry }
    this.TTL = 60 * 1000; // Short cache so insights stay fresh as views arrive.
  }

  get(userId, type, range = 'week') {
    const key = `${userId}-${type}-${range}`;
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);
      if (Date.now() < entry.expiry) {
        console.log(`[Analytics Cache Hit] Serving cached ${type}/${range} for user ${userId}`);
        return entry.data;
      }
      this.cache.delete(key);
    }
    return null;
  }

  set(userId, type, data, range = 'week') {
    const key = `${userId}-${type}-${range}`;
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.TTL
    });
  }

  invalidate(userId) {
    console.log(`[Analytics Cache Invalidation] Cleared cache for user ${userId}`);
    const prefix = `${userId}-`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}

module.exports = new AnalyticsCache();
