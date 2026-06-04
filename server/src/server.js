require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = async () => {
  const conn = require('./config/db');
  await conn();
};
const authRoutes = require('./routes/authRoutes');
const docRoutes = require('./routes/docRoutes');
const sigRoutes = require('./routes/sigRoutes');

// Initialize app
const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(cors({
  origin: '*', // For development, allow all. In production, configure specific origin.
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' })); // Support larger payloads for signature base64 images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'PDF Signer API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/docs', docRoutes);
app.use('/api/signatures', sigRoutes);

// Error Handling Middleware
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
