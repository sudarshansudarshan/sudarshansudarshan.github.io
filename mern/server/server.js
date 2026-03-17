require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRouter = require('./routes/auth');
const sessionsRouter = require('./routes/sessions');
const messagesRouter = require('./routes/messages');
const chatRouter = require('./routes/chat');
const uploadRouter = require('./routes/upload');
const { requireAuth } = require('./middleware/auth');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chatengine';

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2000 })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use('/api/auth', authRouter);
app.use('/api/sessions', requireAuth, sessionsRouter);
app.use('/api/messages', requireAuth, messagesRouter);
app.use('/api/chat', requireAuth, chatRouter);
app.use('/api/upload', requireAuth, uploadRouter);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
