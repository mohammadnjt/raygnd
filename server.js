const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
// const cookieParser = require('cookie-parser');
const path = require('path');
const https = require('https');
const fs = require('fs');

const smsManager = require('./services/sms.service');
require('dotenv').config();

// Import routes
const publicRoutes = require('./routes/public.routes');
// const adminRoutes = require('./routes/admin.routes');

// Initialize express app
const app = express();

// Middleware
// app.use(express.json());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  // origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  // origin: '*'
  credentials: true // مهم: برای ارسال کوکی ضروری است
}));
// تنظیم cookie-parser با کلید مخفی برای امضا
// app.use(cookieParser(process.env.COOKIE_SECRET || 'your-cookie-secret-key'));
app.use(helmet({
  frameguard: false,
  contentSecurityPolicy: false,
}));
app.use(morgan('dev'));

// Connect to MongoDB
mongoose.set('bufferCommands', false); // CRITICAL: fail fast, don't hang if offline
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rayg', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 2000,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.warn('[AI Studio] Could not connect to MongoDB:', err.message));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/', publicRoutes);

// Root route - Interactive Test Dashboard
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rayg Gold Report Service</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://cdn.jsdelivr.net/npm/vazirmatn@33.0.3/Vazirmatn-font-face.css" rel="stylesheet" type="text/css" />
      <style>
        body { font-family: 'Vazirmatn', sans-serif; }
      </style>
    </head>
    <body class="bg-slate-900 text-slate-100 min-h-screen flex flex-col items-center justify-center p-4">
      <div class="max-w-xl w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-6">
        <div class="flex items-center justify-between border-b border-slate-700 pb-4">
          <div>
            <h1 class="text-xl font-bold text-amber-400">سامانه استعلام طلا (رایگ)</h1>
            <p class="text-xs text-slate-400 mt-1">Rayg Gold Report API Service</p>
          </div>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ● فعال
          </span>
        </div>

        <div class="space-y-4">
          <label class="block text-sm font-medium text-slate-300">کد استعلام گزارش:</label>
          <div class="flex gap-2">
            <input id="reportCode" type="text" placeholder="مثلاً: 123456" dir="ltr"
              class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500 text-sm">
            <button onclick="fetchReport()"
              class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2.5 rounded-lg transition text-sm">
              استعلام
            </button>
          </div>
        </div>

        <div id="resultContainer" class="hidden space-y-2">
          <p class="text-xs font-semibold text-slate-400">نتیجه استعلام:</p>
          <pre id="resultOutput" class="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-amber-300 overflow-x-auto max-h-60 dir-ltr text-left"></pre>
        </div>

        <div class="border-t border-slate-700/60 pt-4 text-xs text-slate-400 space-y-1">
          <p class="font-semibold text-slate-300">مسیرهای API available:</p>
          <code class="block bg-slate-950 px-2 py-1 rounded text-amber-400 dir-ltr text-left">GET /api/report?code={code}</code>
        </div>
      </div>

      <script>
        async function fetchReport() {
          const code = document.getElementById('reportCode').value.trim();
          if (!code) return alert('لطفاً کد استعلام را وارد کنید');
          const resContainer = document.getElementById('resultContainer');
          const resOutput = document.getElementById('resultOutput');
          resContainer.classList.remove('hidden');
          resOutput.textContent = 'در حال دریافت اطلاعات...';

          try {
            const response = await fetch('/api/report?code=' + encodeURIComponent(code));
            const data = await response.json();
            resOutput.textContent = JSON.stringify(data, null, 2);
          } catch (err) {
            resOutput.textContent = 'خطا در برقراری ارتباط با سرور: ' + err.message;
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.name === 'MongooseError' || err.name === 'MongoNetworkError' || (err.message && err.message.includes('buffering timed out'))) {
    console.warn('[AI Studio] Database offline — returning mock empty response');
    if (req.method === 'GET') {
      return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
    }
    return res.status(503).json({ error: 'Service temporarily unavailable (database offline)' });
  }
  console.error(err.stack);
  res.status(500).send({ message: 'Something went wrong!', error: err.message });
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

if (require.main === module) {
  // HTTP Server
  app.listen(PORT, HOST, () => {
    console.log(`HTTP Server running on http://${HOST}:${PORT}`);
  });

  // HTTPS Server with SSL (if ssl certs are available)
  const sslKeyPath = '/etc/letsencrypt/live/mozafar.gold/privkey.pem';
  const sslCertPath = '/etc/letsencrypt/live/mozafar.gold/fullchain.pem';
  if (process.env.ENABLE_HTTPS === 'true' && fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
    const HTTPS_PORT = process.env.HTTPS_PORT || 3051;
    https.createServer({
      key: fs.readFileSync(sslKeyPath),
      cert: fs.readFileSync(sslCertPath),
    }, app).listen(HTTPS_PORT, (err) => {
      if (err) console.log(err);
      else console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
    });
  }
}

module.exports = app;
