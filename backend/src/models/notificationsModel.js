const { query } = require('../config/db');

class NotificationsModel {
  static async createNotification(userId, type, message) {
    const sql = `
      INSERT INTO notifications (user_id, type, message, is_read)
      VALUES ($1, $2, $3, false)
      RETURNING id, user_id, type, message, is_read, created_at
    `;
    const { rows } = await query(sql, [userId, type, message]);
    return rows[0];
  }

  static async getNotifications(userId) {
    const sql = `
      SELECT * FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    const { rows } = await query(sql, [userId]);
    return rows;
  }

  static async markRead(notificationId, userId) {
    const sql = `
      UPDATE notifications 
      SET is_read = true 
      WHERE id = $1 AND user_id = $2
    `;
    await query(sql, [notificationId, userId]);
    return { success: true };
  }

  static async markAllRead(userId) {
    const sql = `
      UPDATE notifications 
      SET is_read = true 
      WHERE user_id = $1
    `;
    await query(sql, [userId]);
    return { success: true };
  }
}

module.exports = NotificationsModel;
