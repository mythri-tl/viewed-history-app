const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');

// All post routes require authentication
router.use(protect);

router.post('/', postController.createPost);
router.get('/:id', postController.getPost);
router.patch('/:id', postController.updatePost);
router.post('/:id/like', postController.likePost);
router.post('/:id/comment', postController.commentOnPost);
router.get('/:id/comments', postController.getComments);

module.exports = router;
