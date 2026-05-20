const { query } = require('../config/db');

class ConnectionsModel {
  static async getConnection(requesterId, receiverId) {
    const sql = `
      SELECT * FROM connections 
      WHERE (requester_id = $1 AND receiver_id = $2) 
         OR (requester_id = $3 AND receiver_id = $4)
    `;
    const { rows } = await query(sql, [requesterId, receiverId, receiverId, requesterId]);
    return rows[0];
  }

  static async requestConnection(requesterId, receiverId) {
    const sql = `
      INSERT INTO connections (requester_id, receiver_id, status)
      VALUES ($1, $2, 'pending')
      ON CONFLICT (requester_id, receiver_id) 
      DO UPDATE SET status = 'pending', created_at = CURRENT_TIMESTAMP
      RETURNING id, requester_id, receiver_id, status
    `;
    const { rows } = await query(sql, [requesterId, receiverId]);
    return rows[0];
  }

  static async acceptConnection(requesterId, receiverId) {
    const sql = `
      UPDATE connections 
      SET status = 'accepted' 
      WHERE requester_id = $1 AND receiver_id = $2
    `;
    await query(sql, [requesterId, receiverId]);
    return { requester_id: requesterId, receiver_id: receiverId, status: 'accepted' };
  }

  static async rejectConnection(requesterId, receiverId) {
    const sql = `
      UPDATE connections 
      SET status = 'rejected' 
      WHERE requester_id = $1 AND receiver_id = $2
    `;
    await query(sql, [requesterId, receiverId]);
    return { requester_id: requesterId, receiver_id: receiverId, status: 'rejected' };
  }

  static async getConnectionsList(userId) {
    const sql = `
      SELECT u.id, u.name, u.email, u.profile_image, c.created_at
      FROM connections c
      JOIN users u ON (c.requester_id = u.id OR c.receiver_id = u.id)
      WHERE (c.requester_id = $1 OR c.receiver_id = $2) 
        AND c.status = 'accepted'
        AND u.id != $3
    `;
    const { rows } = await query(sql, [userId, userId, userId]);
    return rows;
  }

  static async getIncomingRequests(userId) {
    const sql = `
      SELECT u.id, u.name, u.email, u.profile_image, c.created_at
      FROM connections c
      JOIN users u ON c.requester_id = u.id
      WHERE c.receiver_id = $1 AND c.status = 'pending'
    `;
    const { rows } = await query(sql, [userId]);
    return rows;
  }

  static async getSuggestions(userId) {
    // Basic rule-based: Users who are NOT the current user AND do not have any connection record
    const sql = `
      SELECT id, name, email, profile_image 
      FROM users 
      WHERE id != $1 
        AND id NOT IN (
          SELECT receiver_id FROM connections WHERE requester_id = $2 AND status IN ('pending', 'accepted')
          UNION
          SELECT requester_id FROM connections WHERE receiver_id = $3 AND status IN ('pending', 'accepted')
        )
      LIMIT 10
    `;
    const { rows } = await query(sql, [userId, userId, userId]);
    return rows;
  }
}

module.exports = ConnectionsModel;
