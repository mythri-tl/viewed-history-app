const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const { uploadPostImage } = require('../middleware/uploadPostImage');

// All post routes require authentication
router.use(protect);

router.get('/', postController.getFeed);
router.post('/', uploadPostImage, postController.createPost);
router.post('/create', uploadPostImage, postController.createPost);
router.get('/:id', postController.getPost);
router.patch('/:id', postController.updatePost);
router.delete('/:id', postController.deletePost);
router.post('/:id/like', postController.likePost);
router.post('/:id/comment', postController.commentOnPost);
router.post('/:id/comments', postController.commentOnPost);
router.get('/:id/comments', postController.getComments);
router.patch('/:id/comment/:commentId', postController.updateComment);
router.patch('/:id/comments/:commentId', postController.updateComment);
router.delete('/:id/comment/:commentId', postController.deleteComment);
router.delete('/:id/comments/:commentId', postController.deleteComment);

module.exports = router;
