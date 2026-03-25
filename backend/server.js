const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectDB = require('./config/db');
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend panels as static files
const root = process.cwd();
app.use('/uploads', express.static(path.join(root, 'uploads')));
app.use('/patient', express.static(path.join(root, 'frontend/patient')));
app.use('/doctor', express.static(path.join(root, 'frontend/doctor')));
app.use('/admin', express.static(path.join(root, 'frontend/admin')));
app.use('/shared', express.static(path.join(root, 'frontend/shared')));
app.use('/assets', express.static(path.join(root, 'frontend/website/assets')));
app.use('/', express.static(path.join(root, 'frontend/website')));

// Root route
app.get('/', (req, res) => res.sendFile(path.join(root, 'frontend/website/index.html')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/reports', require('./routes/reports'));

// Health check
app.get('/api/health', (req, res) => res.json({ success: true, message: 'Healify API is running 🏥' }));

// ─── Socket.io – Video Call Signaling ──────────────────────────────────────
const rooms = {};

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on('join-room', ({ roomId, userId, userName }) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.userId = userId;
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ socketId: socket.id, userId, userName });
    socket.to(roomId).emit('user-joined', { socketId: socket.id, userId, userName });
  });

  socket.on('offer', ({ to, offer }) => io.to(to).emit('offer', { from: socket.id, offer }));
  socket.on('answer', ({ to, answer }) => io.to(to).emit('answer', { from: socket.id, answer }));
  socket.on('ice-candidate', ({ to, candidate }) => io.to(to).emit('ice-candidate', { from: socket.id, candidate }));

  socket.on('leave-room', ({ roomId }) => {
    socket.to(roomId).emit('user-left', { socketId: socket.id });
    socket.leave(roomId);
    if (rooms[roomId]) rooms[roomId] = rooms[roomId].filter(u => u.socketId !== socket.id);
  });

  socket.on('disconnect', () => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('user-left', { socketId: socket.id });
      if (rooms[socket.roomId]) rooms[socket.roomId] = rooms[socket.roomId].filter(u => u.socketId !== socket.id);
    }
  });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`\n🏥 Healify Server running on http://localhost:${PORT}\n`));
}

// Export for Vercel
module.exports = app;
