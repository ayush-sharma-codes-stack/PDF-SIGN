const mongoose = require('mongoose');

const SignatureSchema = new mongoose.Schema(
  {
    fileRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    coordinates: {
      x: {
        type: Number,
        required: true,
      },
      y: {
        type: Number,
        required: true,
      },
      page: {
        type: Number,
        required: true,
      },
      width: {
        type: Number,
        default: 150,
      },
      height: {
        type: Number,
        default: 50,
      },
    },
    signerInfo: {
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
    },
    // ── Status ─────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'signed', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    // ── Signature content ──────────────────────────────────────────────────
    signatureData: {
      type: String, // Base64 dataURL of drawing or typed text
      default: null,
    },
    signatureType: {
      type: String, // 'draw' | 'text'
      default: null,
    },
    signedAt: {
      type: Date,
      default: null,
    },
    // ── Signed file output ─────────────────────────────────────────────────
    signedFileUrl: {
      type: String, // relative URL served from /signed/<filename>
      default: null,
    },
    // ── Invite token (Day 9) ───────────────────────────────────────────────
    inviteToken: {
      type: String,
      default: null,
      index: true,
    },
    inviteTokenExpiry: {
      type: Date,
      default: null,
    },
    inviteSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Signature', SignatureSchema);
