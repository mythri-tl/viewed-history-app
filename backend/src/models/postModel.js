const { query } = require('../config/db');

class PostModel {
  static async createPost(userId, content, imageUrl = null, hashtags = null) {
    const sql = `
      INSERT INTO posts (user_id, content, image_url, hashtags)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, content, image_url, hashtags
    `;
    const { rows } = await query(sql, [userId, content, imageUrl, hashtags]);
    return rows[0];
  }

  static async getFeed(limit = 10, offset = 0, excludeUserId = null) {
    let paramIndex = 1;
    let sql = `
      SELECT 
        p.*,
        u.name as author_name,
        u.profile_image as author_image,
        (SELECT COUNT(*)::integer FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*)::integer FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
    `;
    const params = [];

    if (excludeUserId) {
      sql += `
        WHERE p.id NOT IN (
          SELECT post_id FROM viewed_history 
          WHERE user_id = $${paramIndex} AND (completed = true OR duration_seconds >= COALESCE((
            SELECT min_duration_seconds FROM user_history_settings WHERE user_id = $${paramIndex + 1}
          ), 3))
        )
      `;
      params.push(excludeUserId, excludeUserId);
      paramIndex += 2;
    }

    sql += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const { rows } = await query(sql, params);
    return rows;
  }

  static async getPostById(postId) {
    const sql = `
      SELECT 
        p.*,
        u.name as author_name,
        u.profile_image as author_image,
        (SELECT COUNT(*)::integer FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*)::integer FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `;
    const { rows } = await query(sql, [postId]);
    return rows[0];
  }

  static async toggleLike(userId, postId) {
    const checkSql = 'SELECT id FROM likes WHERE user_id = $1 AND post_id = $2';
    const { rows } = await query(checkSql, [userId, postId]);
    
    if (rows.length > 0) {
      // Unlike
      const deleteSql = 'DELETE FROM likes WHERE user_id = $1 AND post_id = $2';
      await query(deleteSql, [userId, postId]);
      return { action: 'unliked' };
    } else {
      // Like
      const insertSql = 'INSERT INTO likes (user_id, post_id) VALUES ($1, $2)';
      await query(insertSql, [userId, postId]);
      return { action: 'liked' };
    }
  }

  static async addComment(userId, postId, content) {
    const sql = `
      INSERT INTO comments (user_id, post_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, post_id, content
    `;
    const { rows } = await query(sql, [userId, postId, content]);
    return rows[0];
  }

  static async getComments(postId) {
    const sql = `
      SELECT c.*, u.name as author_name, u.profile_image as author_image
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC
    `;
    const { rows } = await query(sql, [postId]);
    return rows;
  }

  static async updatePost(postId, userId, content, imageUrl = null, hashtags = null) {
    const sql = `
      UPDATE posts
      SET content = $1, image_url = $2, hashtags = $3
      WHERE id = $4 AND user_id = $5
      RETURNING id, user_id, content, image_url, hashtags
    `;
    const { rows } = await query(sql, [content, imageUrl, hashtags, postId, userId]);
    return { id: postId, user_id: userId, content, image_url: imageUrl, hashtags, changes: rows.length };
  }
}

module.exports = PostModel;
