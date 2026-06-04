const express = require('express');
const router = express.Router();
const fs = require('fs');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const Signature = require('../models/Signature');
const Document = require('../models/Document');
const { protect } = require('../middleware/auth');

// @desc    Save a signature position / placeholder
// @route   POST /api/signatures
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { fileRef, coordinates, signerInfo } = req.body;

    if (!fileRef || !coordinates || !signerInfo || !signerInfo.name || !signerInfo.email) {
      return res.status(400).json({ message: 'Please provide fileRef, coordinates, and signerInfo' });
    }

    const document = await Document.findById(fileRef);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const signature = await Signature.create({
      fileRef,
      coordinates,
      signerInfo,
      status: 'pending',
    });

    res.status(201).json(signature);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all signature fields for a document
// @route   GET /api/signatures/doc/:docId
// @access  Private
router.get('/doc/:docId', protect, async (req, res) => {
  try {
    const signatures = await Signature.find({ fileRef: req.params.docId });
    res.json(signatures);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Burn signature into PDF and mark as signed
// @route   POST /api/signatures/:id/sign
// @access  Private
router.post('/:id/sign', protect, async (req, res) => {
  try {
    const { signatureType, signatureData } = req.body;

    if (!signatureType || !signatureData) {
      return res.status(400).json({ message: 'Please provide signatureType and signatureData' });
    }

    const signature = await Signature.findById(req.params.id);
    if (!signature) {
      return res.status(404).json({ message: 'Signature field not found' });
    }

    if (signature.status === 'signed') {
      return res.status(400).json({ message: 'Document is already signed at this position' });
    }

    const document = await Document.findById(signature.fileRef);
    if (!document) {
      return res.status(404).json({ message: 'Associated document not found' });
    }

    const filePath = document.path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'PDF file not found on disk' });
    }

    // Load PDF
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    // Page is 1-indexed in schema, but 0-indexed in pdf-lib
    const pageIndex = signature.coordinates.page - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) {
      return res.status(400).json({ message: 'Invalid page number in signature coordinates' });
    }

    const page = pages[pageIndex];
    const { width, height } = page.getSize();

    // Map percentage coordinates (0 to 100) to PDF coordinates
    // HTML y coordinate starts from top, PDF y coordinate starts from bottom
    const xPct = signature.coordinates.x / 100;
    const yPct = signature.coordinates.y / 100;
    const wPct = (signature.coordinates.width || 150) / 612; // Normalize width (standard Letter width is 612pt)
    const hPct = (signature.coordinates.height || 50) / 792;  // Normalize height (standard Letter height is 792pt)

    const drawWidth = wPct * width;
    const drawHeight = hPct * height;
    const drawX = xPct * width;
    const drawY = (1 - yPct) * height - drawHeight;

    if (signatureType === 'draw') {
      // signatureData is PNG Base64 Data URL: "data:image/png;base64,iVBOR..."
      const base64Data = signatureData.replace(/^data:image\/png;base64,/, '');
      const imageBytes = Buffer.from(base64Data, 'base64');
      
      const pngImage = await pdfDoc.embedPng(imageBytes);
      page.drawImage(pngImage, {
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight,
      });
    } else if (signatureType === 'text') {
      // signatureData is the typed text (e.g. "Aayush")
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
      
      // Draw signature text
      page.drawText(signatureData, {
        x: drawX + 10,
        y: drawY + (drawHeight / 2) - 6,
        size: 16,
        font: font,
        color: rgb(0.1, 0.2, 0.6), // Signature blue
      });

      // Draw subtle "Signed Digitally" subtext
      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      page.drawText(`Digitally signed by ${signature.signerInfo.name}`, {
        x: drawX + 10,
        y: drawY + 4,
        size: 6,
        font: regularFont,
        color: rgb(0.4, 0.4, 0.4),
      });
    } else {
      return res.status(400).json({ message: 'Invalid signature type' });
    }

    // Save modified PDF back to the file
    const updatedPdfBytes = await pdfDoc.save();
    fs.writeFileSync(filePath, updatedPdfBytes);

    // Update Signature Document in DB
    signature.status = 'signed';
    signature.signatureType = signatureType;
    signature.signatureData = signatureData;
    signature.signedAt = new Date();
    await signature.save();

    res.json(signature);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during signing process' });
  }
});

module.exports = router;
