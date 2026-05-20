const { query } = require('../config/db');

class AnalyticsModel {
  static async getViewedPostsRaw(userId) {
    const sql = `
      SELECT 
        p.id as post_id, 
        p.content, 
        p.hashtags, 
        vh.duration_seconds, 
        vh.completed, 
        vh.viewed_at
      FROM viewed_history vh
      JOIN posts p ON vh.post_id = p.id
      WHERE vh.user_id = $1
      ORDER BY vh.viewed_at DESC
    `;
    const { rows } = await query(sql, [userId]);
    return rows;
  }
}

module.exports = AnalyticsModel;
