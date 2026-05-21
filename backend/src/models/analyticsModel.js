const { query } = require('../config/db');

class AnalyticsModel {
  static getRangeInterval(range = 'week') {
    return range === 'month' ? '30 days' : '7 days';
  }

  static async getViewedPostsRaw(userId, range = 'week', period = 'current') {
    const interval = this.getRangeInterval(range);
    const currentStart = `NOW() - INTERVAL '${interval}'`;
    const previousStart = `NOW() - INTERVAL '${range === 'month' ? '60 days' : '14 days'}'`;
    const windowSql = period === 'previous'
      ? `vh.viewed_at >= ${previousStart} AND vh.viewed_at < ${currentStart}`
      : `vh.viewed_at >= ${currentStart}`;

    const sql = `
      SELECT 
        p.id as post_id, 
        p.user_id as author_id,
        p.content, 
        p.image_url,
        p.hashtags, 
        u.name as author_name,
        vh.duration_seconds, 
        vh.completed, 
        vh.resumed_count,
        vh.viewed_at
      FROM viewed_history vh
      JOIN posts p ON vh.post_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE vh.user_id = $1
        AND ${windowSql}
      ORDER BY vh.viewed_at DESC
    `;
    const { rows } = await query(sql, [userId]);
    return rows;
  }

  static async getAnalyticsDataset(userId, range = 'week') {
    const [current, previous] = await Promise.all([
      this.getViewedPostsRaw(userId, range, 'current'),
      this.getViewedPostsRaw(userId, range, 'previous')
    ]);

    return { current, previous };
  }
}

module.exports = AnalyticsModel;
