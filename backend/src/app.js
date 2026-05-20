const express = require('express');
const cors = require('cors');
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
const { protect } = require('./middleware/authMiddleware');
const postController = require('./controllers/postController');

const http = require('http');
const { Server } = require('socket.io');

const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  },
  pingInterval: 25000,
  pingTimeout: 5000
});

const onlineUsers = new Map();

app.set('io', io);

app.use(cors());
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
  
  socket.on('join', (userId) => {
    if (!userId) return;

    socket.userId = userId;
    socket.join(`user_${userId}`);

    const existingSockets = onlineUsers.get(userId) || new Set();
    const wasOffline = existingSockets.size === 0;
    existingSockets.add(socket.id);
    onlineUsers.set(userId, existingSockets);

    socket.emit('online_users', Array.from(onlineUsers.keys()));
    if (wasOffline) {
      socket.broadcast.emit('user_online', { userId });
    }
    console.log(`[Socket.io] User ${userId} joined room user_${userId} (connections=${existingSockets.size})`);
  });

  socket.on('send_message', async ({ senderId, receiverId, message }) => {
    if (!senderId || !receiverId || !message || message.trim() === '') return;
    
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

      // Broadcast notification to receiver room
      io.to(`user_${receiverId}`).emit(`notification-${receiverId}`, notification);
    } catch (e) {
      console.error('[Socket.io] send_message event error:', e);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    if (!socket.userId) return;

    const sockets = onlineUsers.get(socket.userId);
    if (!sockets) return;

    sockets.delete(socket.id);
    if (sockets.size === 0) {
      onlineUsers.delete(socket.userId);
      socket.broadcast.emit('user_offline', { userId: socket.userId });
      console.log(`[Socket.io] User ${socket.userId} is now offline`);
    } else {
      console.log(`[Socket.io] User ${socket.userId} still has ${sockets.size} active connection(s)`);
    }
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
