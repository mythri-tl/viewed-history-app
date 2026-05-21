const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { initDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const historyRoutes = require('./routes/historyRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const connectionsRoutes = require('./routes/connectionsRoutes');
const jobsRoutes = require('./routes/jobsRoutes');
const messagesRoutes = require('./routes/messagesRoutes');
const notificationsRoutes = require('./routes/notificationsRoutes');
const searchRoutes = require('./routes/searchRoutes');
const { protect } = require('./middleware/authMiddleware');
const postController = require('./controllers/postController');

const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const app = express();
app.set('trust proxy', 1);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

app.set('io', io);

const onlineUsers = new Map();

const normalizeUserId = (userId) => {
  if (userId === undefined || userId === null) return null;
  const normalized = String(userId).trim();
  return normalized || null;
};

const getOnlineUserIds = () => Array.from(onlineUsers.keys()).map(Number);

const addUserSocket = (userId, socketId) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return { userId: null, becameOnline: false };

  const existingSockets = onlineUsers.get(normalizedUserId);
  if (existingSockets) {
    existingSockets.add(socketId);
    return { userId: normalizedUserId, becameOnline: false };
  }

  onlineUsers.set(normalizedUserId, new Set([socketId]));
  return { userId: normalizedUserId, becameOnline: true };
};

const removeUserSocket = (userId, socketId) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return { userId: null, becameOffline: false };

  const existingSockets = onlineUsers.get(normalizedUserId);
  if (!existingSockets) return { userId: normalizedUserId, becameOffline: false };

  existingSockets.delete(socketId);
  if (existingSockets.size > 0) {
    return { userId: normalizedUserId, becameOffline: false };
  }

  onlineUsers.delete(normalizedUserId);
  return { userId: normalizedUserId, becameOffline: true };
};

const shortCacheRoutes = [
  /^\/api\/feed$/,
  /^\/api\/posts$/,
  /^\/api\/posts\/\d+$/,
  /^\/api\/posts\/\d+\/comments$/,
  /^\/api\/search$/,
  /^\/api\/history$/,
  /^\/api\/analytics\//
];

app.use(cors());
app.use(compression());
app.use((req, res, next) => {
  if (req.method === 'GET' && shortCacheRoutes.some((routePattern) => routePattern.test(req.path))) {
    res.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
  }
  next();
});
// Increase limit to handle larger base64 images if needed
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploads folder statically
app.use('/uploads', express.static(uploadsDir));

// Initialize Database Connection and Tables
initDB();

// Socket.io connection and real-time messaging pipeline
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.authenticatedUserId = normalizeUserId(decoded.id);
    } catch (error) {
      console.warn(`[Socket.io] Invalid auth token for socket ${socket.id}:`, error.message);
    }
  }
  
  socket.on('join', (userId) => {
    const requestedUserId = normalizeUserId(userId);
    const joinedUserId = socket.authenticatedUserId || requestedUserId;

    if (socket.authenticatedUserId && requestedUserId && requestedUserId !== socket.authenticatedUserId) {
      socket.emit('presence_error', { message: 'Socket user does not match authenticated user' });
      return;
    }

    if (!joinedUserId) {
      socket.emit('presence_error', { message: 'User id is required to join presence' });
      return;
    }

    if (socket.userId && socket.userId !== joinedUserId) {
      const { userId: previousUserId, becameOffline } = removeUserSocket(socket.userId, socket.id);
      socket.leave(`user_${previousUserId}`);
      if (becameOffline) {
        io.emit('user_offline', { userId: Number(previousUserId), onlineUserIds: getOnlineUserIds() });
      }
    }

    socket.userId = joinedUserId;
    socket.join(`user_${joinedUserId}`);

    const { becameOnline } = addUserSocket(joinedUserId, socket.id);
    console.log(`[Socket.io] User ${joinedUserId} joined room user_${joinedUserId}`);

    socket.emit('presence_snapshot', { userIds: getOnlineUserIds() });

    if (becameOnline) {
      io.emit('user_online', { userId: Number(joinedUserId), onlineUserIds: getOnlineUserIds() });
    }
  });

  socket.on('presence_snapshot', () => {
    socket.emit('presence_snapshot', { userIds: getOnlineUserIds() });
  });

  socket.on('send_message', async ({ senderId, receiverId, message }) => {
    if (!senderId || !receiverId || !message || message.trim() === '') return;
    if (socket.userId && socket.userId !== normalizeUserId(senderId)) {
      socket.emit('chat_error', { message: 'Socket user does not match message sender' });
      return;
    }
    
    try {
      const ConnectionsModel = require('./models/connectionsModel');
      const MessagesModel = require('./models/messagesModel');
      const UserModel = require('./models/userModel');
      const NotificationsModel = require('./models/notificationsModel');

      // Verify connection status
      const connection = await ConnectionsModel.getConnection(senderId, receiverId);
      if (!connection || connection.status !== 'accepted') {
        socket.emit('chat_error', { message: 'You can only message active connections' });
        return;
      }

      // Save message in database
      const chatMessage = await MessagesModel.sendMessage(senderId, receiverId, message);

      // Create message notification for recipient
      const sender = await UserModel.findById(senderId);
      const senderName = sender?.name || 'A user';
      const notificationMessage = `New message from ${senderName}: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`;
      const notification = await NotificationsModel.createNotification(receiverId, 'new_message', notificationMessage);

      // Broadcast message to receiver and sender rooms
      io.to(`user_${receiverId}`).emit('receive_message', chatMessage);
      io.to(`user_${senderId}`).emit('receive_message', chatMessage);

      // Broadcast notification to receiver room. Keep the user-scoped event for
      // older clients and the generic event for current React listeners.
      io.to(`user_${receiverId}`).emit(`notification-${receiverId}`, notification);
      io.to(`user_${receiverId}`).emit('notification_received', notification);
    } catch (e) {
      console.error('[Socket.io] send_message event error:', e);
    }
  });

  socket.on('disconnect', () => {
    const { userId, becameOffline } = removeUserSocket(socket.userId, socket.id);
    if (becameOffline) {
      io.emit('user_offline', { userId: Number(userId), onlineUserIds: getOnlineUserIds() });
    }
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/connections', connectionsRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/search', searchRoutes);

// Dedicated Feed API Route
app.get('/api/feed', protect, postController.getFeed);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'History API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong on the server!' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
