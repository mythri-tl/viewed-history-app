const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const MessagesController = require('../controllers/messagesController');

router.get('/:userId', protect, MessagesController.getConversationHistory);
router.post('/send', protect, MessagesController.sendMessage);

module.exports = router;
