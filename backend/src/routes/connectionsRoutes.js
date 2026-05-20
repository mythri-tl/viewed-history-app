const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const ConnectionsController = require('../controllers/connectionsController');

router.post('/request', protect, ConnectionsController.requestConnection);
router.post('/accept', protect, ConnectionsController.acceptConnection);
router.post('/reject', protect, ConnectionsController.rejectConnection);
router.get('/list', protect, ConnectionsController.getConnectionsList);
router.get('/suggestions', protect, ConnectionsController.getSuggestions);

module.exports = router;
