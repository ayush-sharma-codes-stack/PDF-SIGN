const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const Document = require('../models/Document');
const { protect } = require('../middleware/auth');

// @desc    Get all audit logs for a document
// @route   GET /api/audit/:fileId
// @access  Private (owner only)
router.get('/:fileId', protect, async (req, res) => {
  try {
    const document = await Document.findById(req.params.fileId);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Only the document owner can view audit logs
    if (document.uploader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view audit logs for this document' });
    }

    const logs = await AuditLog.find({ fileId: req.params.fileId })
      .sort({ createdAt: -1 })
      .populate('userId', 'name email')
      .lean();

    res.json(logs);
  } catch (error) {
    console.error('Audit log fetch error:', error);
    res.status(500).json({ message: 'Server error fetching audit logs' });
  }
});

// @desc    Get all audit logs (admin / debug — owner's own docs only)
// @route   GET /api/audit
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Find all documents owned by the requesting user
    const docs = await Document.find({ uploader: req.user._id }).select('_id');
    const docIds = docs.map((d) => d._id);

    const logs = await AuditLog.find({ fileId: { $in: docIds } })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('userId', 'name email')
      .lean();

    res.json(logs);
  } catch (error) {
    console.error('Audit log fetch error:', error);
    res.status(500).json({ message: 'Server error fetching audit logs' });
  }
});

module.exports = router;
