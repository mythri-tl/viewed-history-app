const HistoryModel = require('../models/historyModel');

/**
 * In-Memory Cache simulating Redis for batching view events.
 * This ensures the database is not overwhelmed by thousands of concurrent scroll events.
 */
class ViewTrackerService {
  constructor() {
    this.viewCache = new Map(); // Key: `${userId}-${postId}`, Value: ViewEvent
    this.batchInterval = 5000; // Flush to DB every 5 seconds
    this.timer = setInterval(() => this.flushBatch(), this.batchInterval);
  }

  // Register a view event (debounced)
  trackView(userId, postId, duration, completed) {
    const key = `${userId}-${postId}`;
    
    // Duplicate Prevention / Debouncing
    if (this.viewCache.has(key)) {
      const existing = this.viewCache.get(key);
      existing.duration += duration;
      existing.completed = existing.completed || completed;
      existing.resumed_count += 1;
      existing.timestamp = Date.now();
    } else {
      this.viewCache.set(key, {
        userId,
        postId,
        duration,
        completed,
        resumed_count: 0,
        timestamp: Date.now()
      });
    }
  }

  // Bulk flush to Database transaction
  async flushBatch() {
    if (this.viewCache.size === 0) return;

    // Extract values and clear cache instantly to prevent race conditions during DB write
    const batch = Array.from(this.viewCache.values());
    this.viewCache.clear();

    try {
      await HistoryModel.bulkUpsert(batch);
      console.log(`[ViewTrackerService] Flushed batch of ${batch.length} view events to SQLite.`);
    } catch (err) {
      console.error(`[ViewTrackerService] Failed to flush batch:`, err);
    }
  }
}

// Export singleton instance
module.exports = new ViewTrackerService();
