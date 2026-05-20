const fs = require('fs');
const path = require('path');
const PostModel = require('../models/postModel');

// Helper to save base64 string as file and return URL
function saveBase64Image(base64Str, baseUrl) {
  if (!base64Str || !base64Str.startsWith('data:image/')) {
    return base64Str;
  }

  const matches = base64Str.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid Base64 image format');
  }

  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const dataBuffer = Buffer.from(matches[2], 'base64');
  
  const filename = `img_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
  const uploadsDir = path.join(__dirname, '../../uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, dataBuffer);

  return `${baseUrl}/uploads/${filename}`;
}

exports.createPost = async (req, res) => {
  try {
    let { content, imageUrl, hashtags } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ message: 'Post content is required' });
    }

    // Convert base64 media upload to hosted static asset URL if applicable
    if (imageUrl && imageUrl.startsWith('data:image/')) {
      try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        imageUrl = saveBase64Image(imageUrl, baseUrl);
      } catch (err) {
        console.error('Failed to save base64 image:', err);
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const excludeViewed = req.query.excludeViewed === 'true';
    const searchQuery = req.query.q || null;
    const userId = req.user ? req.user.id : null;

    const posts = await PostModel.getFeed(limit, offset, excludeViewed ? userId : null, searchQuery);
    res.status(200).json({ posts, page, limit });
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
    const fullPost = await PostModel.getPostById(postId);

    // Broadcast post like status update in real-time
    const io = req.app.get('io');
    if (io) {
      io.emit('post_liked', { 
        postId: parseInt(postId), 
        likeCount: fullPost.like_count,
        action: result.action 
      });
    }

    res.status(200).json({ message: `Post ${result.action} successfully`, likeCount: fullPost.like_count });
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

    const comment = await PostModel.addComment(userId, postId, content);
    
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

    res.status(201).json({ message: 'Comment added successfully', comment: latestComment });
  } catch (error) {
    console.error('Comment Error:', error);
    res.status(500).json({ message: 'Server error while commenting' });
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
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        imageUrl = saveBase64Image(imageUrl, baseUrl);
      } catch (err) {
        console.error('Failed to save base64 image:', err);
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
    
    const post = await PostModel.getPostById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.user_id !== userId) return res.status(403).json({ message: 'Not authorized to delete this post' });

    const deleted = await PostModel.deletePost(postId, userId);
    if (deleted) {
      const io = req.app.get('io');
      if (io) {
        io.emit('post_deleted', { postId });
      }
      res.status(200).json({ message: 'Post deleted successfully', postId });
    } else {
      res.status(400).json({ message: 'Failed to delete post' });
    }
  } catch (error) {
    console.error('Delete Post Error:', error);
    res.status(500).json({ message: 'Server error while deleting post' });
  }
};

exports.editComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    const { content } = req.body;

    if (!content) return res.status(400).json({ message: 'Content is required' });

    const updatedComment = await PostModel.updateComment(commentId, userId, content);
    if (!updatedComment) return res.status(404).json({ message: 'Comment not found or unauthorized' });

    const io = req.app.get('io');
    if (io) {
      io.emit('comment_updated', { postId: updatedComment.post_id, comment: updatedComment });
    }

    res.status(200).json({ message: 'Comment updated', comment: updatedComment });
  } catch (error) {
    console.error('Edit Comment Error:', error);
    res.status(500).json({ message: 'Server error while updating comment' });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const deleted = await PostModel.deleteComment(commentId, userId);
    if (!deleted) return res.status(404).json({ message: 'Comment not found or unauthorized' });

    // We need the comment count to broadcast
    const comments = await PostModel.getComments(deleted.post_id);

    const io = req.app.get('io');
    if (io) {
      io.emit('comment_deleted', { postId: deleted.post_id, commentId, commentCount: comments.length });
    }

    res.status(200).json({ message: 'Comment deleted', commentId });
  } catch (error) {
    console.error('Delete Comment Error:', error);
    res.status(500).json({ message: 'Server error while deleting comment' });
  }
};
