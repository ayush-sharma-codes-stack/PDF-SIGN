const AuditLog = require('../models/AuditLog');

/**
 * getIp(req) — extract real IP from various proxy headers
 */
const getIp = (req) => {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown'
  );
};

/**
 * logAction(action, extraData)
 * Returns an Express middleware that creates an AuditLog entry.
 *
 * Usage in a route handler (call after the response has been sent, or inline):
 *   router.post('/sign', protect, logAction('signed'), handler)
 *
 * Or inside an async handler:
 *   await createAuditEntry({ action: 'signed', fileId, req })
 */
const logAction = (action, extraData = {}) => {
  return async (req, res, next) => {
    // We run the log after the route has finished — attach a finish listener
    res.on('finish', async () => {
      // Only log successful responses (2xx)
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      try {
        await AuditLog.create({
          fileId: extraData.fileId || req.params.fileId || req.params.id || req.body?.fileRef || null,
          signatureId: req.params.id || null,
          userId: req.user?._id || null,
          signerEmail: req.user?.email || req.body?.signerEmail || null,
          action,
          ipAddress: getIp(req),
          metadata: {
            ...extraData,
            method: req.method,
            path: req.originalUrl,
          },
        });
      } catch (err) {
        // Never crash the request because of audit logging
        console.error('⚠️  Audit log error:', err.message);
      }
    });
    next();
  };
};

/**
 * createAuditEntry({ action, fileId, signatureId, userId, signerEmail, req, metadata })
 * Imperative version — use inside async route handlers for fine-grained control.
 */
const createAuditEntry = async ({
  action,
  fileId = null,
  signatureId = null,
  userId = null,
  signerEmail = null,
  req = null,
  metadata = {},
}) => {
  try {
    await AuditLog.create({
      fileId,
      signatureId,
      userId,
      signerEmail,
      action,
      ipAddress: req ? getIp(req) : 'unknown',
      metadata,
    });
  } catch (err) {
    console.error('⚠️  Audit log error:', err.message);
  }
};

module.exports = { logAction, createAuditEntry, getIp };
