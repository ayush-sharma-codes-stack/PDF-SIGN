const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const Document = require('../models/Document');
const Signature = require('../models/Signature');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');
const { createAuditEntry } = require('../middleware/auditLogger');
const upload = require('../middleware/upload');

const SIGNED_DIR = path.join(__dirname, '../../uploads/signed');

// @desc    Upload a PDF document
// @route   POST /api/docs/upload
// @access  Private
router.post('/upload', protect, (req, res) => {
  upload.single('file')(req, res, async function (err) {
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

      await createAuditEntry({
        action: 'uploaded',
        fileId: document._id,
        userId: req.user._id,
        req,
        metadata: { originalName: req.file.originalname },
      });

      console.log(`✅ Document uploaded: ${req.file.originalname} by user ${req.user._id}`);
      res.status(201).json(document);
    } catch (error) {
      console.error('DB error on upload:', error);
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

// @desc    Download / stream the original PDF document
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

    await createAuditEntry({
      action: 'downloaded',
      fileId: document._id,
      userId: req.user._id,
      req,
    });

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

// @desc    Generate final signed PDF from ALL signed signatures on a document (Day 8)
// @route   POST /api/docs/:fileId/sign
// @access  Private
router.post('/:fileId/sign', protect, async (req, res) => {
  try {
    const document = await Document.findById(req.params.fileId);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.uploader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!fs.existsSync(document.path)) {
      return res.status(404).json({ message: 'PDF file not found on disk' });
    }

    // Gather all signed signatures for this document
    const signedSignatures = await Signature.find({
      fileRef: document._id,
      status: 'signed',
      signatureData: { $ne: null },
    });

    if (signedSignatures.length === 0) {
      return res.status(400).json({ message: 'No signed signatures found for this document' });
    }

    // Load original PDF and burn in all signatures
    const pdfBytes = fs.readFileSync(document.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    for (const sig of signedSignatures) {
      const pageIndex = sig.coordinates.page - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) continue;

      const page = pages[pageIndex];
      const { width, height } = page.getSize();

      const xPct = sig.coordinates.x / 100;
      const yPct = sig.coordinates.y / 100;
      const wPct = (sig.coordinates.width || 150) / 612;
      const hPct = (sig.coordinates.height || 50) / 792;
      const drawWidth = wPct * width;
      const drawHeight = hPct * height;
      const drawX = xPct * width;
      const drawY = (1 - yPct) * height - drawHeight;

      if (sig.signatureType === 'draw') {
        const base64Data = sig.signatureData.replace(/^data:image\/png;base64,/, '');
        const imageBytes = Buffer.from(base64Data, 'base64');
        const pngImage = await pdfDoc.embedPng(imageBytes);
        page.drawImage(pngImage, { x: drawX, y: drawY, width: drawWidth, height: drawHeight });
      } else if (sig.signatureType === 'text') {
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
        const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        page.drawText(sig.signatureData, {
          x: drawX + 10,
          y: drawY + drawHeight / 2 - 6,
          size: 16,
          font,
          color: rgb(0.1, 0.2, 0.6),
        });
        page.drawText(`Digitally signed by ${sig.signerInfo.name}`, {
          x: drawX + 10,
          y: drawY + 4,
          size: 6,
          font: regularFont,
          color: rgb(0.4, 0.4, 0.4),
        });
      }
    }

    const updatedBytes = await pdfDoc.save();

    if (!fs.existsSync(SIGNED_DIR)) {
      fs.mkdirSync(SIGNED_DIR, { recursive: true });
    }

    const signedFilename = `signed_${Date.now()}_${path.basename(document.filename)}`;
    const signedFilePath = path.join(SIGNED_DIR, signedFilename);
    fs.writeFileSync(signedFilePath, updatedBytes);

    const signedFileUrl = `/signed/${signedFilename}`;
    document.signedFilePath = signedFileUrl;
    await document.save();

    await createAuditEntry({
      action: 'signed',
      fileId: document._id,
      userId: req.user._id,
      req,
      metadata: { signedFileUrl, signaturesApplied: signedSignatures.length },
    });

    res.json({
      message: 'Signed PDF generated successfully',
      signedFileUrl,
      downloadUrl: `http://localhost:${process.env.PORT || 5000}${signedFileUrl}`,
    });
  } catch (error) {
    console.error('Final sign error:', error);
    res.status(500).json({ message: 'Server error generating signed PDF' });
  }
});

// @desc    Delete a document and all related files & records
// @route   DELETE /api/docs/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.uploader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this document' });
    }

    // 1. Delete original file from disk
    if (document.path && fs.existsSync(document.path)) {
      try {
        fs.unlinkSync(document.path);
      } catch (err) {
        console.error('Error deleting original file:', err);
      }
    }

    // 2. Delete signed file from disk if it exists
    if (document.signedFilePath) {
      const filename = path.basename(document.signedFilePath);
      const fullSignedPath = path.join(SIGNED_DIR, filename);
      if (fs.existsSync(fullSignedPath)) {
        try {
          fs.unlinkSync(fullSignedPath);
        } catch (err) {
          console.error('Error deleting signed file:', err);
        }
      }
    }

    // 3. Delete database records
    await Signature.deleteMany({ fileRef: document._id });
    await AuditLog.deleteMany({ fileId: document._id });
    await document.deleteOne();

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Server error deleting document' });
  }
});

module.exports = router;
