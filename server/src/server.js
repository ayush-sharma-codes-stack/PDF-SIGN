require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// ── Ensure upload directories exist on startup ───────────────────────────────
const uploadsDir = path.join(__dirname, '../uploads');
const signedDir  = path.join(__dirname, '../uploads/signed');

[uploadsDir, signedDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// ── DB ──────────────────────────────────────────────────────────────────────
const connectDB = require('./config/db');

// ── Routes ──────────────────────────────────────────────────────────────────
const authRoutes  = require('./routes/authRoutes');
const docRoutes   = require('./routes/docRoutes');
const sigRoutes   = require('./routes/sigRoutes');
const auditRoutes = require('./routes/auditRoutes');

// ── App ──────────────────────────────────────────────────────────────────────
const app = express();

// Connect to MongoDB
connectDB();

// ── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or postman)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.endsWith('.vercel.app') || 
                      origin.startsWith('http://localhost:') || 
                      origin.startsWith('http://127.0.0.1:');
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Body parsers — must come before routes
// NOTE: multipart/form-data is handled by multer in the route, not here
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ── Static — serve signed PDFs publicly ──────────────────────────────────────
// Accessible at: GET /signed/<filename>
app.use('/signed', express.static(signedDir));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'PDF Signer API is running',
    timestamp: new Date().toISOString(),
    uploadsDir: fs.existsSync(uploadsDir),
    signedDir: fs.existsSync(signedDir),
  });
});

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/docs',       docRoutes);
app.use('/api/signatures', sigRoutes);
app.use('/api/audit',      auditRoutes);

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
  console.log(`📂 Uploads dir:      ${uploadsDir}`);
  console.log(`✍️  Signed PDFs dir:  ${signedDir}`);
});
