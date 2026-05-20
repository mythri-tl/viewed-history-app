const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/topics', analyticsController.getTopics);
router.get('/trends', analyticsController.getTrends);
router.get('/insights', analyticsController.getInsights);

module.exports = router;
