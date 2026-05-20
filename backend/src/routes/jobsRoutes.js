const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const JobsController = require('../controllers/jobsController');

router.post('/create', protect, JobsController.createJob);
router.get('/feed', protect, JobsController.getJobsFeed);
router.post('/apply', protect, JobsController.applyJob);
router.post('/save', protect, JobsController.saveJob);

module.exports = router;
