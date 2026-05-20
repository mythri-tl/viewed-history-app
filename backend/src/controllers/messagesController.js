const MessagesModel = require('../models/messagesModel');
const ConnectionsModel = require('../models/connectionsModel');
const UserModel = require('../models/userModel');
const NotificationsModel = require('../models/notificationsModel');

class MessagesController {
  static async getConversationHistory(req, res) {
    const userId = req.user.id;
    const otherUserId = Number(req.params.userId);

    if (!otherUserId) {
      return res.status(400).json({ message: 'Other user ID is required' });
    }

    try {
      // Security check: Verify that they are actively connected
      const connection = await ConnectionsModel.getConnection(userId, otherUserId);
      if (!connection || connection.status !== 'accepted') {
        return res.status(403).json({ message: 'You can only message active connections' });
      }

      const history = await MessagesModel.getConversationHistory(userId, otherUserId);
      res.status(200).json({ history });
    } catch (error) {
      console.error('Error getConversationHistory:', error);
      res.status(500).json({ message: 'Failed to retrieve chat history' });
    }
  }

  static async sendMessage(req, res) {
    const senderId = req.user.id;
    const { receiver_id, message } = req.body;

    if (!receiver_id || !message || message.trim() === '') {
      return res.status(400).json({ message: 'Receiver ID and non-empty message are required' });
    }

    try {
      // Security check: Verify that they are actively connected
      const connection = await ConnectionsModel.getConnection(senderId, receiver_id);
      if (!connection || connection.status !== 'accepted') {
        return res.status(403).json({ message: 'You can only message active connections' });
      }

      const chatMessage = await MessagesModel.sendMessage(senderId, receiver_id, message);

      // Create Notification alert
      const sender = await UserModel.findById(senderId);
      const senderName = sender?.name || 'A user';
      
      const notificationMessage = `New message from ${senderName}: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`;
      const notification = await NotificationsModel.createNotification(receiver_id, 'new_message', notificationMessage);

      // Emit events via Socket.io
      const io = req.app.get('io');
      if (io) {
        // Emit to recipient's live listeners
        io.emit(`chat-${receiver_id}`, chatMessage);
        io.emit(`notification-${receiver_id}`, notification);
      }

      res.status(201).json({ message: 'Message sent successfully', chatMessage });
    } catch (error) {
      console.error('Error sendMessage:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  }
}

module.exports = MessagesController;
