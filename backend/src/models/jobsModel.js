const { query } = require('../config/db');

class JobsModel {
  static async createJob(title, description, company, location, salaryRange, skillsRequired) {
    const sql = `
      INSERT INTO jobs (title, description, company, location, salary_range, skills_required)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, title, description, company, location, salary_range, skills_required
    `;
    const { rows } = await query(sql, [title, description, company, location, salaryRange, skillsRequired]);
    return rows[0];
  }

  static async getJobsFeed(userId) {
    const sql = `
      SELECT j.*, 
             (SELECT 1 FROM job_applications ja WHERE ja.job_id = j.id AND ja.user_id = $1) AS has_applied,
             (SELECT 1 FROM saved_jobs sj WHERE sj.job_id = j.id AND sj.user_id = $2) AS has_saved,
             (SELECT COUNT(*)::integer FROM job_applications ja2 WHERE ja2.job_id = j.id) AS applicant_count
      FROM jobs j
      ORDER BY j.created_at DESC
    `;
    const { rows } = await query(sql, [userId, userId]);
    return rows;
  }

  static async applyJob(jobId, userId) {
    const sql = `
      INSERT INTO job_applications (job_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (job_id, user_id) DO NOTHING
      RETURNING id
    `;
    const { rows } = await query(sql, [jobId, userId]);
    return { id: rows[0]?.id, job_id: jobId, user_id: userId };
  }

  static async getSavedJob(jobId, userId) {
    const sql = 'SELECT * FROM saved_jobs WHERE job_id = $1 AND user_id = $2';
    const { rows } = await query(sql, [jobId, userId]);
    return rows[0];
  }

  static async saveJob(jobId, userId) {
    const sql = `
      INSERT INTO saved_jobs (job_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (job_id, user_id) DO NOTHING
      RETURNING id
    `;
    const { rows } = await query(sql, [jobId, userId]);
    return { saved: true, id: rows[0]?.id };
  }

  static async unsaveJob(jobId, userId) {
    const sql = 'DELETE FROM saved_jobs WHERE job_id = $1 AND user_id = $2';
    await query(sql, [jobId, userId]);
    return { saved: false };
  }
}

module.exports = JobsModel;
