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
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a PDF file' });
    }

    try {
      const document = await Document.create({
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        uploader: req.user._id,
      });

      res.status(201).json(document);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });
});

// @desc    Get all documents for user
// @route   GET /api/docs
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const documents = await Document.find({ uploader: req.user._id }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get single document details
// @route   GET /api/docs/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const document = await Document.findById(req.id || req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Verify ownership
    if (document.uploader.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    res.json(document);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Download / Stream a PDF document
// @route   GET /api/docs/:id/download
// @access  Private
router.get('/:id/download', protect, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Verify ownership
    if (document.uploader.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const filePath = document.path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on disk' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalName)}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
