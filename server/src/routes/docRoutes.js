const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// @desc    Upload a PDF document
// @route   POST /api/docs/upload
// @access  Private
router.post('/upload', protect, (req, res) => {
  upload.single('file')(req, res, async function (err) {
    // Handle multer errors (file size, wrong type, etc.)
    if (err) {
      console.error('Multer error:', err.message);
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file received. Please upload a PDF.' });
    }

    try {
      const document = await Document.create({
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        uploader: req.user._id,
      });

      console.log(`✅ Document uploaded: ${req.file.originalname} by user ${req.user._id}`);
      res.status(201).json(document);
    } catch (error) {
      console.error('DB error on upload:', error);
      // Clean up the uploaded file if DB save fails
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: 'Server error while saving document record' });
    }
  });
});

// @desc    Get all documents for logged-in user
// @route   GET /api/docs
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const documents = await Document.find({ uploader: req.user._id }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (error) {
    console.error('Fetch docs error:', error);
    res.status(500).json({ message: 'Server error fetching documents' });
  }
});

// @desc    Get single document metadata
// @route   GET /api/docs/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    // FIX: was incorrectly using req.id — must be req.params.id
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.uploader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this document' });
    }

    res.json(document);
  } catch (error) {
    console.error('Fetch single doc error:', error);
    res.status(500).json({ message: 'Server error fetching document' });
  }
});

// @desc    Download / stream a PDF document
// @route   GET /api/docs/:id/download
// @access  Private
router.get('/:id/download', protect, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.uploader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to download this document' });
    }

    const filePath = document.path;

    if (!fs.existsSync(filePath)) {
      console.error(`File missing on disk: ${filePath}`);
      return res.status(404).json({ message: 'PDF file not found on disk. It may have been deleted.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalName)}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (streamErr) => {
      console.error('File stream error:', streamErr);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming file' });
      }
    });
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Server error during download' });
  }
});

module.exports = router;
