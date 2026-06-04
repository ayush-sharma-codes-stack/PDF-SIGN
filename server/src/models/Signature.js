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
      }
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
    status: {
      type: String,
      enum: ['pending', 'signed'],
      default: 'pending',
    },
    signatureData: {
      type: String, // Base64 dataURL of drawing or font name for text
      default: null,
    },
    signatureType: {
      type: String, // 'draw' or 'text'
      default: null,
    },
    signedAt: {
      type: Date,
      default: null,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Signature', SignatureSchema);
