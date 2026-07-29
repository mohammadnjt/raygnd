const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const https = require('https');
const fs = require('fs');

require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const ticketRoutes = require('./routes/ticket.routes');
const inquiryRoutes = require('./routes/inquiry.routes');
const generalRoutes = require('./routes/general.routes');
const uploadRoutes = require('./routes/upload.routes');

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  credentials: true
}));

app.use(helmet({
  frameguard: false,
  contentSecurityPolicy: false,
}));
app.use(morgan('dev'));

mongoose.set('bufferCommands', false);
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rayg', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 2000,
}).then(() => console.log('Connected to MongoDB'))
.catch(err => console.warn('[AI Studio] Could not connect to MongoDB:', err.message));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// New Routes Setup
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ticket', ticketRoutes);
app.use('/api/inquiry', inquiryRoutes);
app.use('/api/general', generalRoutes);
app.use('/api/upload', uploadRoutes);

// Version endpoint (used by tests)
app.get('/api/version', (req, res) => {
  res.json({ success: true, version: "1.0.0" });
});

app.get('/', (req, res) => {
  res.send('API is running. Please refer to /api');
});

app.use((err, req, res, next) => {
  if (err.name === 'MongooseError' || err.name === 'MongoNetworkError') {
    console.warn('[AI Studio] Database offline');
    if (req.method === 'GET') {
      return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
    }
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
  console.error(err.stack);
  res.status(500).send({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`HTTP Server running on http://${HOST}:${PORT}`);
  });
}

module.exports = app;
