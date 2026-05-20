const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');

// All post routes require authentication
router.use(protect);

router.post('/', postController.createPost);
router.get('/:id', postController.getPost);
router.patch('/:id', postController.updatePost);
router.delete('/:id', postController.deletePost);
router.post('/:id/like', postController.likePost);
router.post('/:id/comment', postController.commentOnPost);
router.get('/:id/comments', postController.getComments);
router.patch('/:id/comment/:commentId', postController.editComment);
router.delete('/:id/comment/:commentId', postController.deleteComment);

module.exports = router;
