const HistoryModel = require('../models/historyModel');

class HistoryCacheService {
  constructor() {
    this.cache = new Map(); // Key: CacheKey, Value: { data, expiry }
    this.TTL = 60 * 1000; // 1 minute cache duration
  }

  _generateKey(userId, filters, page) {
    return `${userId}-${JSON.stringify(filters)}-${page}`;
  }

  async getCachedHistory(userId, filters, page, limit) {
    const key = this._generateKey(userId, filters, page);
    
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      if (Date.now() < cached.expiry) {
        console.log(`[Cache Hit] Serving history from memory for user ${userId}`);
        return cached.data;
      } else {
        this.cache.delete(key);
      }
    }

    // Cache Miss
    console.log(`[Cache Miss] Fetching history from SQLite for user ${userId}`);
    const offset = (page - 1) * limit;
    const data = await HistoryModel.getAdvancedHistory(userId, filters, limit, offset);
    
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.TTL
    });

    return data;
  }

  invalidateUserCache(userId) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}-`)) {
        this.cache.delete(key);
      }
    }
  }
}

module.exports = new HistoryCacheService();
