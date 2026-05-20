const { query } = require('../config/db');

class UserModel {
  static async findByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = $1';
    const { rows } = await query(sql, [email]);
    return rows[0];
  }

  static async findById(id) {
    const sql = 'SELECT id, name, email, profile_image, created_at FROM users WHERE id = $1';
    const { rows } = await query(sql, [id]);
    return rows[0];
  }

  static async createUser(name, email, passwordHash) {
    const sql = `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, profile_image, created_at
    `;
    const { rows } = await query(sql, [name, email, passwordHash]);
    return rows[0];
  }
}

module.exports = UserModel;
