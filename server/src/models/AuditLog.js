const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    signatureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Signature',
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    signerEmail: {
      type: String,
      default: null,
    },
    action: {
      type: String,
      enum: ['uploaded', 'field_placed', 'signed', 'rejected', 'link_sent', 'link_opened', 'downloaded'],
      required: true,
    },
    ipAddress: {
      type: String,
      default: 'unknown',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AuditLog', AuditLogSchema);
