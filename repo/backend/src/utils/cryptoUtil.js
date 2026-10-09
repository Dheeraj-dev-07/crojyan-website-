const crypto = require('crypto');

/**
 * Constant-time HMAC SHA256 signature verification helper
 * Prevents timing attacks on signature comparisons.
 */
const verifyHmacSha256 = (dataString, signatureHex, secret) => {
  if (!dataString || !signatureHex || !secret) return false;
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(dataString)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const actualBuffer = Buffer.from(signatureHex, 'utf8');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch (err) {
    return false;
  }
};

module.exports = {
  verifyHmacSha256
};
