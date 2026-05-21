const { query } = require('../config/db');

const escapeLike = (value) => value.replace(/[\\%_]/g, '\\$&');
const normalizeLimit = (limit) => Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
const normalizeOffset = (offset) => Math.max(0, parseInt(offset, 10) || 0);

class SearchModel {
  static async searchPosts(searchTerm, limit, offset) {
    const sql = `
      SELECT
        p.*,
        u.name as author_name,
        u.profile_image as author_image,
        (SELECT COUNT(*)::integer FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*)::integer FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.content ILIKE $1 ESCAPE '\\'
         OR COALESCE(p.hashtags, '') ILIKE $2 ESCAPE '\\'
         OR u.name ILIKE $3 ESCAPE '\\'
      ORDER BY p.created_at DESC
      LIMIT $4 OFFSET $5
    `;

    const pattern = `%${escapeLike(searchTerm)}%`;
    const { rows } = await query(sql, [pattern, pattern, pattern, limit, offset]);
    return rows;
  }

  static async searchPeople(searchTerm, currentUserId, limit, offset) {
    const sql = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.profile_image,
        CASE
          WHEN c.status IS NULL THEN 'suggestion'
          ELSE c.status
        END as connection_status
      FROM users u
      LEFT JOIN connections c
        ON (
          (c.requester_id = $1 AND c.receiver_id = u.id)
          OR (c.receiver_id = $2 AND c.requester_id = u.id)
        )
      WHERE u.id != $3
        AND (
          u.name ILIKE $4 ESCAPE '\\'
          OR u.email ILIKE $5 ESCAPE '\\'
        )
      ORDER BY
        CASE WHEN c.status = 'accepted' THEN 0 WHEN c.status = 'pending' THEN 1 ELSE 2 END,
        u.name ASC
      LIMIT $6 OFFSET $7
    `;

    const pattern = `%${escapeLike(searchTerm)}%`;
    const { rows } = await query(sql, [currentUserId, currentUserId, currentUserId, pattern, pattern, limit, offset]);
    return rows;
  }

  static async searchJobs(searchTerm, currentUserId, limit, offset) {
    const sql = `
      SELECT
        j.*,
        (SELECT 1 FROM job_applications ja WHERE ja.job_id = j.id AND ja.user_id = $1) AS has_applied,
        (SELECT 1 FROM saved_jobs sj WHERE sj.job_id = j.id AND sj.user_id = $2) AS has_saved,
        (SELECT COUNT(*)::integer FROM job_applications ja2 WHERE ja2.job_id = j.id) AS applicant_count
      FROM jobs j
      WHERE j.title ILIKE $3 ESCAPE '\\'
         OR j.company ILIKE $4 ESCAPE '\\'
         OR j.location ILIKE $5 ESCAPE '\\'
         OR COALESCE(j.skills_required, '') ILIKE $6 ESCAPE '\\'
         OR j.description ILIKE $7 ESCAPE '\\'
      ORDER BY j.created_at DESC
      LIMIT $8 OFFSET $9
    `;

    const pattern = `%${escapeLike(searchTerm)}%`;
    const { rows } = await query(sql, [
      currentUserId,
      currentUserId,
      pattern,
      pattern,
      pattern,
      pattern,
      pattern,
      limit,
      offset
    ]);
    return rows;
  }

  static async search({ q, type = 'all', limit = 20, offset = 0, userId }) {
    const safeLimit = normalizeLimit(limit);
    const safeOffset = normalizeOffset(offset);
    const results = { posts: [], people: [], jobs: [] };

    if (!q || !q.trim()) {
      return results;
    }

    const searchTerm = q.trim();
    const searches = [];

    if (type === 'all' || type === 'posts') {
      searches.push(this.searchPosts(searchTerm, safeLimit, safeOffset).then((rows) => {
        results.posts = rows;
      }));
    }

    if (type === 'all' || type === 'people') {
      searches.push(this.searchPeople(searchTerm, userId, safeLimit, safeOffset).then((rows) => {
        results.people = rows;
      }));
    }

    if (type === 'all' || type === 'jobs') {
      searches.push(this.searchJobs(searchTerm, userId, safeLimit, safeOffset).then((rows) => {
        results.jobs = rows;
      }));
    }

    await Promise.all(searches);
    return results;
  }
}

module.exports = SearchModel;
