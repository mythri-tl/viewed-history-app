const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', historyController.getHistory);
router.delete('/', historyController.clearHistory);
router.get('/settings', historyController.getSettings);
router.patch('/settings', historyController.updateSettings);
router.post('/view', historyController.markViewed);

module.exports = router;
