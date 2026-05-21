const { pool, query } = require('../config/db');

class HistoryModel {
  static async bulkUpsert(batch) {
    if (!batch || batch.length === 0) return;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const sql = `
        INSERT INTO viewed_history (user_id, post_id, duration_seconds, completed, resumed_count)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT(user_id, post_id) DO UPDATE SET 
          duration_seconds = viewed_history.duration_seconds + EXCLUDED.duration_seconds,
          completed = CASE WHEN EXCLUDED.completed = TRUE THEN TRUE ELSE viewed_history.completed END,
          resumed_count = viewed_history.resumed_count + EXCLUDED.resumed_count + 1,
          viewed_at = CURRENT_TIMESTAMP
      `;
      for (const event of batch) {
        await client.query(sql, [
          event.userId, 
          event.postId, 
          event.duration, 
          event.completed ? true : false, 
          event.resumed_count
        ]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async getAdvancedHistory(userId, filters, limit = 50, offset = 0) {
    let paramIndex = 1;
    let sql = `
      SELECT 
        p.*,
        u.name as author_name,
        u.profile_image as author_image,
        vh.viewed_at,
        vh.duration_seconds,
        vh.completed,
        vh.resumed_count,
        (SELECT COUNT(*)::integer FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*)::integer FROM comments WHERE post_id = p.id) as comment_count
      FROM viewed_history vh
      JOIN posts p ON vh.post_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE vh.user_id = $${paramIndex++}
    `;
    
    const params = [userId];

    if (filters.q) {
      sql += ` AND (p.content ILIKE $${paramIndex} OR p.hashtags ILIKE $${paramIndex + 1})`;
      params.push(`%${filters.q}%`, `%${filters.q}%`);
      paramIndex += 2;
    }

    if (filters.author) {
      sql += ` AND u.name ILIKE $${paramIndex++}`;
      params.push(`%${filters.author}%`);
    }

    if (filters.completed !== undefined) {
      sql += ` AND vh.completed = $${paramIndex++}`;
      params.push(filters.completed ? true : false);
    }
    
    if (filters.minDuration) {
      sql += ` AND vh.duration_seconds >= $${paramIndex++}`;
      params.push(filters.minDuration);
    }

    if (filters.dateRange === 'today') {
      sql += ` AND vh.viewed_at::date = CURRENT_DATE`;
    } else if (filters.dateRange === 'week') {
      sql += ` AND vh.viewed_at >= NOW() - INTERVAL '7 days'`;
    }

    sql += ` ORDER BY vh.viewed_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const { rows } = await query(sql, params);
    return rows;
  }

  static async getHistoryItem(userId, postId) {
    const sql = `
      SELECT 
        p.*,
        u.name as author_name,
        u.profile_image as author_image,
        vh.viewed_at,
        vh.duration_seconds,
        vh.completed,
        vh.resumed_count,
        (SELECT COUNT(*)::integer FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*)::integer FROM comments WHERE post_id = p.id) as comment_count
      FROM viewed_history vh
      JOIN posts p ON vh.post_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE vh.user_id = $1 AND vh.post_id = $2
    `;
    const { rows } = await query(sql, [userId, postId]);
    return rows[0];
  }

  static async getSettings(userId) {
    const sql = `SELECT * FROM user_history_settings WHERE user_id = $1`;
    const { rows } = await query(sql, [userId]);
    if (rows.length === 0) {
      // Create default
      await query(`INSERT INTO user_history_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [userId]);
      return { 
        user_id: userId, 
        is_paused: false, 
        private_mode: false, 
        auto_delete_days: 30,
        min_duration_seconds: 3,
        min_visibility_pct: 50,
        filter_read_posts: false
      };
    }
    return rows[0];
  }

  static async updateSettings(userId, settings) {
    const current = await this.getSettings(userId);
    const updated = { ...current, ...settings };
    
    const sql = `
      UPDATE user_history_settings 
      SET is_paused = $1, private_mode = $2, auto_delete_days = $3, min_duration_seconds = $4, min_visibility_pct = $5, filter_read_posts = $6
      WHERE user_id = $7
    `;
    await query(sql, [
      updated.is_paused ? true : false, 
      updated.private_mode ? true : false, 
      updated.auto_delete_days, 
      updated.min_duration_seconds,
      updated.min_visibility_pct,
      updated.filter_read_posts ? true : false,
      userId
    ]);
    return updated;
  }

  static async clearHistory(userId) {
    await query(`DELETE FROM viewed_history WHERE user_id = $1`, [userId]);
    return true;
  }
}

module.exports = HistoryModel;
