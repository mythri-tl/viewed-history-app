const ConnectionsModel = require('../models/connectionsModel');
const UserModel = require('../models/userModel');
const NotificationsModel = require('../models/notificationsModel');

class ConnectionsController {
  static async requestConnection(req, res) {
    const requesterId = req.user.id;
    const { receiver_id } = req.body;

    if (!receiver_id) {
      return res.status(400).json({ message: 'Receiver user ID is required' });
    }

    if (requesterId === Number(receiver_id)) {
      return res.status(400).json({ message: 'You cannot connect with yourself' });
    }

    try {
      // Check if connection already exists
      const existing = await ConnectionsModel.getConnection(requesterId, receiver_id);
      if (existing) {
        if (existing.status === 'accepted') {
          return res.status(400).json({ message: 'You are already connected with this user' });
        } else if (existing.status === 'pending') {
          return res.status(400).json({ message: 'A connection request is already pending between you' });
        }
      }

      const connection = await ConnectionsModel.requestConnection(requesterId, receiver_id);
      
      // Fetch requester details to formulate a personalized alert
      const requester = await UserModel.findById(requesterId);
      const requesterName = requester?.name || 'A user';

      // Create Notification
      const notificationMessage = `${requesterName} sent you a connection request.`;
      const notification = await NotificationsModel.createNotification(receiver_id, 'connection_request', notificationMessage);

      // Emit real-time notification via Socket.io if receiver is online
      const io = req.app.get('io');
      if (io) {
        io.emit(`notification-${receiver_id}`, notification);
      }

      res.status(201).json({ message: 'Connection request sent successfully', connection });
    } catch (error) {
      console.error('Error requestConnection:', error);
      res.status(500).json({ message: 'Failed to send connection request' });
    }
  }

  static async acceptConnection(req, res) {
    const receiverId = req.user.id;
    const { requester_id } = req.body;

    if (!requester_id) {
      return res.status(400).json({ message: 'Requester user ID is required' });
    }

    try {
      const existing = await ConnectionsModel.getConnection(requester_id, receiverId);
      if (!existing || existing.status !== 'pending' || existing.receiver_id !== receiverId) {
        return res.status(400).json({ message: 'No pending connection request found to accept' });
      }

      const result = await ConnectionsModel.acceptConnection(requester_id, receiverId);

      // Notify the requester that their request has been accepted
      const receiver = await UserModel.findById(receiverId);
      const receiverName = receiver?.name || 'A user';

      const notificationMessage = `${receiverName} accepted your connection request.`;
      const notification = await NotificationsModel.createNotification(requester_id, 'connection_accept', notificationMessage);

      // Emit live socket alert
      const io = req.app.get('io');
      if (io) {
        io.emit(`notification-${requester_id}`, notification);
      }

      res.status(200).json({ message: 'Connection request accepted', result });
    } catch (error) {
      console.error('Error acceptConnection:', error);
      res.status(500).json({ message: 'Failed to accept connection request' });
    }
  }

  static async rejectConnection(req, res) {
    const receiverId = req.user.id;
    const { requester_id } = req.body;

    if (!requester_id) {
      return res.status(400).json({ message: 'Requester user ID is required' });
    }

    try {
      const existing = await ConnectionsModel.getConnection(requester_id, receiverId);
      if (!existing || existing.status !== 'pending' || existing.receiver_id !== receiverId) {
        return res.status(400).json({ message: 'No pending connection request found to reject' });
      }

      const result = await ConnectionsModel.rejectConnection(requester_id, receiverId);
      res.status(200).json({ message: 'Connection request rejected', result });
    } catch (error) {
      console.error('Error rejectConnection:', error);
      res.status(500).json({ message: 'Failed to reject connection request' });
    }
  }

  static async getConnectionsList(req, res) {
    const userId = req.user.id;
    try {
      const connections = await ConnectionsModel.getConnectionsList(userId);
      const incoming = await ConnectionsModel.getIncomingRequests(userId);
      res.status(200).json({ connections, incoming });
    } catch (error) {
      console.error('Error getConnectionsList:', error);
      res.status(500).json({ message: 'Failed to retrieve connections' });
    }
  }

  static async getSuggestions(req, res) {
    const userId = req.user.id;
    try {
      const suggestions = await ConnectionsModel.getSuggestions(userId);
      res.status(200).json({ suggestions });
    } catch (error) {
      console.error('Error getSuggestions:', error);
      res.status(500).json({ message: 'Failed to retrieve connection suggestions' });
    }
  }
}

module.exports = ConnectionsController;
