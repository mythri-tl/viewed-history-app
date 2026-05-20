const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const NotificationsController = require('../controllers/notificationsController');

router.get('/', protect, NotificationsController.getNotifications);
router.post('/mark-read', protect, NotificationsController.markRead);

module.exports = router;
