const fs = require('fs');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');
const PostModel = require('../models/postModel');
const UserModel = require('../models/userModel');
const NotificationsModel = require('../models/notificationsModel');

const hasCloudinaryConfig = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper to upload base64 string to Cloudinary and return its hosted URL.
async function uploadBase64Image(base64Str) {
  if (!base64Str || !base64Str.startsWith('data:image/')) {
    return base64Str;
  }

  const matches = base64Str.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid Base64 image format');
  }

  const ext = matches[1].toLowerCase();
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    throw new Error('Unsupported image format');
  }

  if (!hasCloudinaryConfig) {
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext === 'jpeg' ? 'jpg' : ext}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
    return `/uploads/${filename}`;
  }

  const uploadResult = await cloudinary.uploader.upload(base64Str, {
    folder: 'viewed-history/posts',
    resource_type: 'image'
  });

  return uploadResult.secure_url;
}

async function deleteUploadedImage(imageUrl) {
  if (!imageUrl) return;

  try {
    const parsedUrl = new URL(imageUrl);
    if (parsedUrl.hostname.endsWith('res.cloudinary.com') && parsedUrl.pathname.includes('/image/upload/')) {
      const uploadPath = parsedUrl.pathname.split('/image/upload/')[1];
      const publicPath = uploadPath.replace(/^v\d+\//, '').replace(/\.[^.]+$/, '');
      if (publicPath) {
        await cloudinary.uploader.destroy(publicPath, { resource_type: 'image' });
      }
      return;
    }
  } catch {
    // Keep relative upload paths on the legacy local cleanup path below.
  }

  let uploadPath = imageUrl;
  try {
    uploadPath = new URL(imageUrl).pathname;
  } catch {
    // Keep relative upload paths as-is.
  }

  if (!uploadPath.startsWith('/uploads/')) return;

  const filename = path.basename(uploadPath);
  const uploadsDir = path.join(__dirname, '../../uploads');
  const filePath = path.join(uploadsDir, filename);

  if (!filePath.startsWith(uploadsDir)) return;
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

exports.createPost = async (req, res) => {
  try {
    let { content, imageUrl, hashtags } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Post content is required' });
    }

    content = content.trim();
    hashtags = hashtags ? hashtags.trim() : null;

    if (req.file) {
      imageUrl = hasCloudinaryConfig ? req.file.path : `/uploads/${req.file.filename}`;
    }

    // Convert base64 media upload to hosted Cloudinary URL if applicable.
    if (imageUrl && imageUrl.startsWith('data:image/')) {
      try {
        imageUrl = await uploadBase64Image(imageUrl);
      } catch (err) {
        console.error('Failed to upload base64 image:', err);
        return res.status(400).json({ message: 'Invalid image upload data format' });
      }
    }

    const post = await PostModel.createPost(userId, content, imageUrl, hashtags);
    const fullPost = await PostModel.getPostById(post.id);

    // Broadcast newly created post to all socket clients in real-time
    const io = req.app.get('io');
    if (io) {
      io.emit('post_created', fullPost);
    }

    res.status(201).json({ message: 'Post created successfully', post: fullPost });
  } catch (error) {
    console.error('Create Post Error:', error);
    res.status(500).json({ message: 'Server error while creating post' });
  }
};

exports.getFeed = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const cursor = req.query.cursor || null;
    const excludeViewed = req.query.excludeViewed === 'true';
    const searchQuery = req.query.q || null;
    const userId = req.user ? req.user.id : null;

    const posts = await PostModel.getFeed({
      limit,
      offset,
      cursor,
      excludeUserId: excludeViewed ? userId : null,
      searchQuery
    });
    const nextCursor = posts.length === limit ? posts[posts.length - 1].created_at : null;

    res.status(200).json({ posts, page, limit, nextCursor });
  } catch (error) {
    console.error('Get Feed Error:', error);
    res.status(500).json({ message: 'Server error while fetching feed' });
  }
};

exports.getPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await PostModel.getPostById(postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    res.status(200).json({ post });
  } catch (error) {
    console.error('Get Post Error:', error);
    res.status(500).json({ message: 'Server error while fetching post' });
  }
};

exports.likePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;

    const result = await PostModel.toggleLike(userId, postId);

    // Broadcast post like status update in real-time
    const io = req.app.get('io');
    if (io) {
      io.emit('post_liked', { 
        postId: parseInt(postId), 
        likeCount: result.likeCount,
        action: result.action,
        actorUserId: userId
      });
    }

    res.status(200).json({
      message: `Post ${result.action} successfully`,
      postId: parseInt(postId),
      action: result.action,
      likeCount: result.likeCount,
      actorUserId: userId
    });
  } catch (error) {
    console.error('Like Post Error:', error);
    res.status(500).json({ message: 'Server error while liking post' });
  }
};

exports.commentOnPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const post = await PostModel.getPostById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    await PostModel.addComment(userId, postId, content);
    
    // Retrieve full comments to get latest detailed comment structure (author fields)
    const comments = await PostModel.getComments(postId);
    const latestComment = comments[comments.length - 1];

    // Broadcast comment addition in real-time
    const io = req.app.get('io');
    if (io) {
      io.emit('comment_created', { 
        postId: parseInt(postId), 
        comment: latestComment,
        commentCount: comments.length
      });
    }

    if (post.user_id !== userId) {
      const commenter = await UserModel.findById(userId);
      const commenterName = commenter?.name || 'A user';
      const notification = await NotificationsModel.createNotification(
        post.user_id,
        'new_comment',
        `${commenterName} commented on your post.`
      );

      if (io) {
        io.to(`user_${post.user_id}`).emit(`notification-${post.user_id}`, notification);
        io.to(`user_${post.user_id}`).emit('notification_received', notification);
      }
    }

    res.status(201).json({ message: 'Comment added successfully', comment: latestComment });
  } catch (error) {
    console.error('Comment Error:', error);
    res.status(500).json({ message: 'Server error while commenting' });
  }
};

exports.updateComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: postId, commentId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const existingComment = await PostModel.getCommentById(commentId);
    if (!existingComment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (existingComment.post_id !== Number(postId)) {
      return res.status(404).json({ message: 'Comment not found for this post' });
    }

    if (existingComment.user_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to edit this comment' });
    }

    await PostModel.updateComment(commentId, userId, content.trim());
    const updatedComment = await PostModel.getCommentById(commentId);
    const comments = await PostModel.getComments(updatedComment.post_id);

    const io = req.app.get('io');
    if (io) {
      io.emit('comment_updated', {
        postId: updatedComment.post_id,
        comment: updatedComment,
        commentCount: comments.length
      });
    }

    res.status(200).json({ message: 'Comment updated successfully', comment: updatedComment });
  } catch (error) {
    console.error('Update Comment Error:', error);
    res.status(500).json({ message: 'Server error while updating comment' });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: postId, commentId } = req.params;

    const existingComment = await PostModel.getCommentById(commentId);
    if (!existingComment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (existingComment.post_id !== Number(postId)) {
      return res.status(404).json({ message: 'Comment not found for this post' });
    }

    if (existingComment.user_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    const deletedComment = await PostModel.deleteComment(commentId, userId);
    const comments = await PostModel.getComments(deletedComment.post_id);

    const io = req.app.get('io');
    if (io) {
      io.emit('comment_deleted', {
        postId: deletedComment.post_id,
        commentId: Number(commentId),
        commentCount: comments.length
      });
    }

    res.status(200).json({ message: 'Comment deleted successfully', commentId: Number(commentId) });
  } catch (error) {
    console.error('Delete Comment Error:', error);
    res.status(500).json({ message: 'Server error while deleting comment' });
  }
};

exports.getComments = async (req, res) => {
  try {
    const postId = req.params.id;
    const comments = await PostModel.getComments(postId);
    res.status(200).json({ comments });
  } catch (error) {
    console.error('Get Comments Error:', error);
    res.status(500).json({ message: 'Server error while fetching comments' });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    let { content, imageUrl, hashtags } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Post content is required' });
    }

    // Check if post exists
    const existingPost = await PostModel.getPostById(postId);
    if (!existingPost) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Verify authorship
    if (existingPost.user_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to edit this post' });
    }

    // Handle native base64 uploaded image if applicable
    if (imageUrl && imageUrl.startsWith('data:image/')) {
      try {
        imageUrl = await uploadBase64Image(imageUrl);
      } catch (err) {
        console.error('Failed to upload base64 image:', err);
        return res.status(400).json({ message: 'Invalid image upload data format' });
      }
    }

    await PostModel.updatePost(postId, userId, content, imageUrl, hashtags);
    const updatedPost = await PostModel.getPostById(postId);

    // Broadcast updated post to all connected socket clients in real-time
    const io = req.app.get('io');
    if (io) {
      io.emit('post_updated', updatedPost);
    }

    res.status(200).json({ message: 'Post updated successfully', post: updatedPost });
  } catch (error) {
    console.error('Update Post Error:', error);
    res.status(500).json({ message: 'Server error while updating post' });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const existingPost = await PostModel.getPostById(postId);
    if (!existingPost) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (existingPost.user_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await PostModel.deletePost(postId, userId);

    const io = req.app.get('io');
    if (io) {
      io.emit('post_deleted', { postId: Number(postId) });
    }

    await deleteUploadedImage(existingPost.image_url);

    res.status(200).json({ message: 'Post deleted', postId: Number(postId) });
  } catch (error) {
    console.error('Delete Post Error:', error);
    res.status(500).json({ message: 'Server error while deleting post' });
  }
};
