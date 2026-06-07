require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// ── Ensure uploads directory exists on startup ──────────────────────────────
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`📁 Created uploads directory: ${uploadsDir}`);
}

// ── DB ──────────────────────────────────────────────────────────────────────
const connectDB = require('./config/db');

// ── Routes ──────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const docRoutes  = require('./routes/docRoutes');
const sigRoutes  = require('./routes/sigRoutes');

// ── App ──────────────────────────────────────────────────────────────────────
const app = express();

// Connect to MongoDB
connectDB();

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Body parsers — must come before routes
// NOTE: multipart/form-data is handled by multer in the route, not here
app.use(express.json({ limit: '20mb' }));           // for base64 signature images
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'PDF Signer API is running',
    timestamp: new Date().toISOString(),
    uploadsDir: fs.existsSync(uploadsDir),
  });
});

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/docs',       docRoutes);
app.use('/api/signatures', sigRoutes);

// ── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  console.log(`📂 Uploads dir: ${uploadsDir}`);
});
