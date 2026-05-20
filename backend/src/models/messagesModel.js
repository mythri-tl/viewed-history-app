const { query } = require('../config/db');

class MessagesModel {
  static async sendMessage(senderId, receiverId, message) {
    const sql = `
      INSERT INTO messages (sender_id, receiver_id, message)
      VALUES ($1, $2, $3)
      RETURNING id, sender_id, receiver_id, message, timestamp
    `;
    const { rows } = await query(sql, [senderId, receiverId, message]);
    return rows[0];
  }

  static async getConversationHistory(userId1, userId2) {
    const sql = `
      SELECT m.*, 
             u1.name AS sender_name, u1.profile_image AS sender_image,
             u2.name AS receiver_name, u2.profile_image AS receiver_image
      FROM messages m
      JOIN users u1 ON m.sender_id = u1.id
      JOIN users u2 ON m.receiver_id = u2.id
      WHERE (m.sender_id = $1 AND m.receiver_id = $2)
         OR (m.sender_id = $3 AND m.receiver_id = $4)
      ORDER BY m.timestamp ASC
    `;
    const { rows } = await query(sql, [userId1, userId2, userId2, userId1]);
    return rows;
  }
}

module.exports = MessagesModel;
