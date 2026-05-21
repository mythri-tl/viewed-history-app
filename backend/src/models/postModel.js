const { pool, query } = require('../config/db');

class PostModel {
  static async createPost(userId, content, imageUrl = null, hashtags = null) {
    const sql = `
      INSERT INTO posts (user_id, content, image_url, hashtags)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, content, image_url, hashtags, created_at
    `;
    const { rows } = await query(sql, [userId, content, imageUrl, hashtags]);
    return rows[0];
  }

  static async getFeed({ limit = 10, offset = 0, cursor = null, excludeUserId = null } = {}) {
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
    const whereClauses = [];

    if (excludeUserId) {
      whereClauses.push(`
        p.id NOT IN (
          SELECT post_id FROM viewed_history 
          WHERE user_id = $${paramIndex} AND (completed = true OR duration_seconds >= COALESCE((
            SELECT min_duration_seconds FROM user_history_settings WHERE user_id = $${paramIndex + 1}
          ), 3))
        )
      `);
      params.push(excludeUserId, excludeUserId);
      paramIndex += 2;
    }

    if (cursor) {
      whereClauses.push(`p.created_at < $${paramIndex++}`);
      params.push(cursor);
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    sql += ` ORDER BY p.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    if (!cursor && offset > 0) {
      sql += ` OFFSET $${paramIndex + 1}`;
      params.push(offset);
    }

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
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock($1, $2)', [Number(userId), Number(postId)]);

      const { rows } = await client.query(
        'SELECT id FROM likes WHERE user_id = $1 AND post_id = $2',
        [userId, postId]
      );

      let action;
      if (rows.length > 0) {
        await client.query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [userId, postId]);
        action = 'unliked';
      } else {
        await client.query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [userId, postId]);
        action = 'liked';
      }

      const countResult = await client.query(
        'SELECT COUNT(*)::integer AS like_count FROM likes WHERE post_id = $1',
        [postId]
      );

      await client.query('COMMIT');
      return { action, likeCount: countResult.rows[0].like_count };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async addComment(userId, postId, content) {
    const sql = `
      INSERT INTO comments (user_id, post_id, content, comment_text)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, post_id, content, created_at
    `;
    const { rows } = await query(sql, [userId, postId, content, content]);
    return rows[0];
  }

  static async getCommentById(commentId) {
    const sql = `
      SELECT
        c.*,
        COALESCE(c.content, c.comment_text) as content,
        u.name as author_name,
        u.profile_image as author_image
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `;
    const { rows } = await query(sql, [commentId]);
    return rows[0];
  }

  static async getComments(postId) {
    const sql = `
      SELECT
        c.*,
        COALESCE(c.content, c.comment_text) as content,
        u.name as author_name,
        u.profile_image as author_image
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC
    `;
    const { rows } = await query(sql, [postId]);
    return rows;
  }

  static async updateComment(commentId, userId, content) {
    const sql = `
      UPDATE comments
      SET content = $1, comment_text = $2
      WHERE id = $3 AND user_id = $4
      RETURNING id, user_id, post_id, COALESCE(content, comment_text) as content, created_at
    `;
    const { rows } = await query(sql, [content, content, commentId, userId]);
    return rows[0];
  }

  static async deleteComment(commentId, userId) {
    const sql = `
      DELETE FROM comments
      WHERE id = $1 AND user_id = $2
      RETURNING id, post_id
    `;
    const { rows } = await query(sql, [commentId, userId]);
    return rows[0];
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

  static async deletePost(postId, userId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM comments WHERE post_id = $1', [postId]);
      await client.query('DELETE FROM likes WHERE post_id = $1', [postId]);
      await client.query('DELETE FROM viewed_history WHERE post_id = $1', [postId]);

      const { rows } = await client.query(
        'DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING id',
        [postId, userId]
      );

      await client.query('COMMIT');
      return rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = PostModel;
