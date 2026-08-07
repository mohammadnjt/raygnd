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
const referralRoutes = require('./routes/referral.routes');

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.use(helmet({
  frameguard: false,
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));
app.use(morgan('dev'));

// Logger Mode Middleware (Reads package.json -> orchestrator)
app.use((req, res, next) => {
  let isLoggerEnabled = false;
  try {
    const pkgPath = path.join(__dirname, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg && pkg.orchestrator) {
        const orch = pkg.orchestrator;
        isLoggerEnabled = !!(orch.logger || orch.loggerMode || orch.enableLogger || orch.debugLogger || orch.debug);
      }
    }
  } catch (e) {}

  if (!isLoggerEnabled && process.env.LOGGER_MODE !== 'true') {
    return next();
  }

  const startTime = Date.now();
  const method = req.method;
  const url = req.originalUrl || req.url;

  console.log(`\n---> [API RECEIVED] ${method} ${url}`);

  const originalSend = res.send;
  const originalJson = res.json;

  let responseBody;

  res.json = function (body) {
    responseBody = body;
    return originalJson.apply(this, arguments);
  };

  res.send = function (body) {
    if (responseBody === undefined) {
      try {
        responseBody = typeof body === 'string' ? JSON.parse(body) : body;
      } catch (_) {
        responseBody = body;
      }
    }
    return originalSend.apply(this, arguments);
  };

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    console.log(`\n================== [LOGGER MODE (FINISH)] ==================`);
    console.log(`[API REQUEST] ${method} ${url} -> Status ${statusCode} (${duration}ms)`);
    if (req.params && Object.keys(req.params).length > 0) {
      console.log(`[REQ PARAMS]:`, JSON.stringify(req.params, null, 2));
    }
    if (req.query && Object.keys(req.query).length > 0) {
      console.log(`[REQ QUERY]:`, JSON.stringify(req.query, null, 2));
    }
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`[REQ BODY]:`, JSON.stringify(req.body, null, 2));
    }
    if (responseBody !== undefined) {
      const logResp = typeof responseBody === 'object' ? JSON.stringify(responseBody, null, 2) : responseBody;
      console.log(`[RES BODY]:`, logResp);
    }
    console.log(`===================================================\n`);
  });

  res.on('close', () => {
    if (!res.writableFinished) {
      const duration = Date.now() - startTime;
      console.log(`\n================== [LOGGER MODE (CLIENT CLOSED)] ==================`);
      console.log(`[API REQUEST] ${method} ${url} -> Client Closed Connection (${duration}ms)`);
      console.log(`===================================================\n`);
    }
  });

  next();
});

mongoose.set('bufferCommands', false);
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rayg', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 2000,
}).then(() => {
  console.log('Connected to MongoDB');
})
.catch(err => console.warn('[AI Studio] Could not connect to MongoDB:', err.message));

// Serves static upload files with explicit CORP and CORS headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Cleanup tmp uploads older than 1 day
setInterval(() => {
  const tmpDir = path.join(__dirname, 'uploads/tmp');
  if (fs.existsSync(tmpDir)) {
    fs.readdir(tmpDir, (err, files) => {
      if (err) return;
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      files.forEach(file => {
        const filePath = path.join(tmpDir, file);
        fs.stat(filePath, (err, stats) => {
          if (err) return;
          if (now - stats.mtimeMs > oneDay) {
            fs.unlink(filePath, () => {});
          }
        });
      });
    });
  }
}, 60 * 60 * 1000); // Check every hour


// New Routes Setup
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ticket', ticketRoutes);
app.use('/api/inquiry', inquiryRoutes);
app.use('/api/general', generalRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/referrals', referralRoutes);

// Version endpoint (used by tests)
app.get('/api/version', (req, res) => {
  res.json({ 
    success: true, 
    version: "1.0.0",
    aboutUs: {
      title: "درباره ما",
      description: "ما یک پلتفرم جامع برای ارتباط طلا فروشان و آزمایشگاه‌های عیارسنجی طلا هستیم و تلاش می‌کنیم بهترین خدمات را به شما ارائه دهیم.",
      contactEmail: "info@example.com",
      contactPhone: "021-12345678"
    },
    banners: [
      "https://example.com/banner1.jpg",
      "https://example.com/banner2.jpg"
    ]
  });
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
  const server = app.listen(PORT, HOST, () => {
    console.log(`HTTP Server running on http://${HOST}:${PORT}`);
  });
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  server.requestTimeout = 300000; // 5 minutes timeout for uploads
}

module.exports = app;
