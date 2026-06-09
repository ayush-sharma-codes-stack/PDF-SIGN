const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const Signature = require('../models/Signature');
const Document = require('../models/Document');
const { protect } = require('../middleware/auth');
const { createAuditEntry } = require('../middleware/auditLogger');

// ── Helpers ────────────────────────────────────────────────────────────────

const SIGNED_DIR = path.join(__dirname, '../../uploads/signed');

/**
 * burnSignatureIntoPdf(pdfDoc, page, signature)
 * Mutates the given PDFDocument page in-place. Returns void.
 */
const burnSignatureIntoPdf = async (pdfDoc, page, signature) => {
  const { width, height } = page.getSize();
  const { signatureData, signatureType, coordinates, signerInfo } = signature;

  const xPct = coordinates.x / 100;
  const yPct = coordinates.y / 100;
  const wPct = (coordinates.width || 150) / 612;
  const hPct = (coordinates.height || 50) / 792;

  const drawWidth = wPct * width;
  const drawHeight = hPct * height;
  const drawX = xPct * width;
  const drawY = (1 - yPct) * height - drawHeight;

  if (signatureType === 'draw') {
    const base64Data = signatureData.replace(/^data:image\/png;base64,/, '');
    const imageBytes = Buffer.from(base64Data, 'base64');
    const pngImage = await pdfDoc.embedPng(imageBytes);
    page.drawImage(pngImage, { x: drawX, y: drawY, width: drawWidth, height: drawHeight });
  } else if (signatureType === 'text') {
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText(signatureData, {
      x: drawX + 10,
      y: drawY + drawHeight / 2 - 6,
      size: 16,
      font,
      color: rgb(0.1, 0.2, 0.6),
    });
    page.drawText(`Digitally signed by ${signerInfo.name}`, {
      x: drawX + 10,
      y: drawY + 4,
      size: 6,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    });
  }
};

/**
 * generateSignedPdf(document, signedSignatures)
 * Creates a new PDF with all provided signatures burned in.
 * Saves to uploads/signed/ and returns the relative URL path.
 */
const generateSignedPdf = async (document, signedSignatures) => {
  if (!fs.existsSync(document.path)) {
    throw new Error('Original PDF file not found on disk');
  }

  const pdfBytes = fs.readFileSync(document.path);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  for (const sig of signedSignatures) {
    if (sig.signatureData && sig.signatureType) {
      const pageIndex = sig.coordinates.page - 1;
      if (pageIndex >= 0 && pageIndex < pages.length) {
        await burnSignatureIntoPdf(pdfDoc, pages[pageIndex], sig);
      }
    }
  }

  const updatedBytes = await pdfDoc.save();

  if (!fs.existsSync(SIGNED_DIR)) {
    fs.mkdirSync(SIGNED_DIR, { recursive: true });
  }

  const signedFilename = `signed_${Date.now()}_${path.basename(document.filename)}`;
  const signedFilePath = path.join(SIGNED_DIR, signedFilename);
  fs.writeFileSync(signedFilePath, updatedBytes);

  return `/signed/${signedFilename}`;
};

// ── Routes ─────────────────────────────────────────────────────────────────

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

    const signature = await Signature.create({ fileRef, coordinates, signerInfo, status: 'pending' });

    await createAuditEntry({
      action: 'field_placed',
      fileId: fileRef,
      signatureId: signature._id,
      userId: req.user._id,
      signerEmail: signerInfo.email,
      req,
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

// @desc    Get a single signature by ID
// @route   GET /api/signatures/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const signature = await Signature.findById(req.params.id).populate('fileRef');
    if (!signature) return res.status(404).json({ message: 'Signature not found' });
    res.json(signature);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Burn signature into PDF (Day 8) and mark as signed
// @route   POST /api/signatures/:id/sign
// @access  Private
router.post('/:id/sign', protect, async (req, res) => {
  try {
    const { signatureType, signatureData } = req.body;

    if (!signatureType || !signatureData) {
      return res.status(400).json({ message: 'Please provide signatureType and signatureData' });
    }

    const signature = await Signature.findById(req.params.id);
    if (!signature) return res.status(404).json({ message: 'Signature field not found' });

    if (signature.status === 'signed') {
      return res.status(400).json({ message: 'This field is already signed' });
    }
    if (signature.status === 'rejected') {
      return res.status(400).json({ message: 'This signature has been rejected and cannot be signed' });
    }

    const document = await Document.findById(signature.fileRef);
    if (!document) return res.status(404).json({ message: 'Associated document not found' });

    if (!fs.existsSync(document.path)) {
      return res.status(404).json({ message: 'PDF file not found on disk' });
    }

    // Validate page
    const pdfBytes = fs.readFileSync(document.path);
    const pdfDocCheck = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDocCheck.getPageCount();
    const pageIndex = signature.coordinates.page - 1;
    if (pageIndex < 0 || pageIndex >= pageCount) {
      return res.status(400).json({ message: 'Invalid page number in signature coordinates' });
    }

    // Update the signature record with the actual signature data
    signature.status = 'signed';
    signature.signatureType = signatureType;
    signature.signatureData = signatureData;
    signature.signedAt = new Date();

    // Generate signed PDF (this signature only — full document PDF is via POST /api/docs/:fileId/sign)
    const signedUrl = await generateSignedPdf(document, [signature]);
    signature.signedFileUrl = signedUrl;
    await signature.save();

    // Also update the parent document's signedFilePath
    document.signedFilePath = signedUrl;
    await document.save();

    await createAuditEntry({
      action: 'signed',
      fileId: document._id,
      signatureId: signature._id,
      userId: req.user._id,
      signerEmail: signature.signerInfo.email,
      req,
      metadata: { signatureType },
    });

    res.json({ ...signature.toObject(), signedFileUrl: signedUrl });
  } catch (error) {
    console.error('Sign error:', error);
    res.status(500).json({ message: 'Server error during signing process' });
  }
});

// @desc    Update signature status (Day 11)
// @route   PATCH /api/signatures/:id/status
// @access  Private
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status, reason } = req.body;

    if (!['signed', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be "signed" or "rejected"' });
    }

    const signature = await Signature.findById(req.params.id);
    if (!signature) return res.status(404).json({ message: 'Signature not found' });

    const document = await Document.findById(signature.fileRef);
    if (!document) return res.status(404).json({ message: 'Associated document not found' });

    // Ownership check
    if (document.uploader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this signature' });
    }

    signature.status = status;

    if (status === 'rejected') {
      signature.rejectionReason = reason || null;
      signature.signedAt = null;
      await signature.save();

      await createAuditEntry({
        action: 'rejected',
        fileId: document._id,
        signatureId: signature._id,
        userId: req.user._id,
        signerEmail: signature.signerInfo.email,
        req,
        metadata: { reason },
      });
    } else if (status === 'signed') {
      // Conditionally trigger PDF generation if signatureData exists
      if (signature.signatureData && signature.signatureType) {
        signature.signedAt = new Date();
        const signedUrl = await generateSignedPdf(document, [signature]);
        signature.signedFileUrl = signedUrl;
        document.signedFilePath = signedUrl;
        await document.save();
      } else {
        signature.signedAt = new Date();
      }
      await signature.save();

      await createAuditEntry({
        action: 'signed',
        fileId: document._id,
        signatureId: signature._id,
        userId: req.user._id,
        signerEmail: signature.signerInfo.email,
        req,
      });
    }

    await signature.save();
    res.json(signature);
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ message: 'Server error updating status' });
  }
});

// @desc    Send invite for public signing (Day 9)
// @route   POST /api/signatures/:signatureId/invite
// @access  Private
router.post('/:signatureId/invite', protect, async (req, res) => {
  try {
    const { v4: uuidv4 } = require('uuid');
    const nodemailer = require('nodemailer');

    const signature = await Signature.findById(req.params.signatureId);
    if (!signature) return res.status(404).json({ message: 'Signature not found' });

    const document = await Document.findById(signature.fileRef);
    if (!document) return res.status(404).json({ message: 'Associated document not found' });

    // Ownership check
    if (document.uploader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to invite for this document' });
    }

    // Generate a secure token
    const token = uuidv4();
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    signature.inviteToken = token;
    signature.inviteTokenExpiry = expiry;
    signature.inviteSentAt = new Date();
    await signature.save();

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const signingLink = `${clientUrl}/sign/${token}`;

    // ── Send Email ──────────────────────────────────────────────────────
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"PDFSign" <${process.env.EMAIL_USER}>`,
        to: signature.signerInfo.email,
        subject: `${req.user.name} has requested your signature on "${document.originalName}"`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="color:#0d9488">You've been asked to sign a document</h2>
            <p><strong>${req.user.name}</strong> has requested your signature on <strong>${document.originalName}</strong>.</p>
            <p>This link expires on <strong>${expiry.toLocaleDateString()}</strong>.</p>
            <a href="${signingLink}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0d9488;color:white;text-decoration:none;border-radius:8px;font-weight:600;">
              Review &amp; Sign Document
            </a>
            <p style="margin-top:24px;font-size:12px;color:#888">If you did not expect this email, you can safely ignore it.</p>
          </div>
        `,
      });
      console.log(`📧 Email sent to ${signature.signerInfo.email}`);
    } else {
      // Console mock when no SMTP is configured
      console.log('\n📨 [EMAIL MOCK] ──────────────────────────────────────');
      console.log(`  To: ${signature.signerInfo.email}`);
      console.log(`  Subject: Signature request for "${document.originalName}"`);
      console.log(`  Signing Link: ${signingLink}`);
      console.log(`  Expires: ${expiry.toISOString()}`);
      console.log('──────────────────────────────────────────────────────\n');
    }

    await createAuditEntry({
      action: 'link_sent',
      fileId: document._id,
      signatureId: signature._id,
      userId: req.user._id,
      signerEmail: signature.signerInfo.email,
      req,
      metadata: { inviteLink: signingLink, expiry },
    });

    res.json({
      message: 'Invite sent successfully',
      signerEmail: signature.signerInfo.email,
      inviteLink: signingLink,
      expiresAt: expiry,
    });
  } catch (error) {
    console.error('Invite error:', error);
    res.status(500).json({ message: 'Server error sending invite' });
  }
});

// @desc    Public endpoint — validate invite token and return signing context
// @route   GET /api/signatures/public/:token
// @access  Public
router.get('/public/:token', async (req, res) => {
  try {
    const signature = await Signature.findOne({ inviteToken: req.params.token }).populate('fileRef');

    if (!signature) {
      return res.status(404).json({ message: 'Invalid or expired signing link' });
    }

    if (signature.inviteTokenExpiry && new Date() > signature.inviteTokenExpiry) {
      return res.status(410).json({ message: 'This signing link has expired' });
    }

    if (signature.status !== 'pending') {
      return res.status(409).json({ message: `This signature is already ${signature.status}` });
    }

    const { createAuditEntry: logEntry } = require('../middleware/auditLogger');
    await logEntry({
      action: 'link_opened',
      fileId: signature.fileRef?._id || signature.fileRef,
      signatureId: signature._id,
      signerEmail: signature.signerInfo.email,
      req,
    });

    res.json({
      signatureId: signature._id,
      signerInfo: signature.signerInfo,
      coordinates: signature.coordinates,
      document: {
        _id: signature.fileRef._id,
        originalName: signature.fileRef.originalName,
        filename: signature.fileRef.filename,
      },
      expiresAt: signature.inviteTokenExpiry,
    });
  } catch (error) {
    console.error('Token lookup error:', error);
    res.status(500).json({ message: 'Server error validating link' });
  }
});

module.exports = router;
