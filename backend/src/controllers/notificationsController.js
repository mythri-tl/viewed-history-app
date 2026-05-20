const NotificationsModel = require('../models/notificationsModel');

class NotificationsController {
  static async getNotifications(req, res) {
    const userId = req.user.id;
    try {
      const notifications = await NotificationsModel.getNotifications(userId);
      res.status(200).json({ notifications });
    } catch (error) {
      console.error('Error getNotifications:', error);
      res.status(500).json({ message: 'Failed to retrieve notifications' });
    }
  }

  static async markRead(req, res) {
    const userId = req.user.id;
    const { id, all } = req.body;

    try {
      if (all) {
        await NotificationsModel.markAllRead(userId);
        return res.status(200).json({ message: 'All notifications marked as read' });
      }

      if (!id) {
        return res.status(400).json({ message: 'Notification ID or "all" flag is required' });
      }

      await NotificationsModel.markRead(id, userId);
      res.status(200).json({ message: 'Notification marked as read' });
    } catch (error) {
      console.error('Error markRead:', error);
      res.status(500).json({ message: 'Failed to update notification status' });
    }
  }
}

module.exports = NotificationsController;
