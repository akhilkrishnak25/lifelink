const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { blockchainService } = require('../services/blockchain/blockchain.service');

/**
 * POST /api/blockchain/donation
 * Create a blockchain donation record (hash-only by default)
 */
router.post('/donation', protect, async (req, res) => {
  try {
    const { donationId, ipfsHash, payload } = req.body;

    const result = await blockchainService.createDonationRecord({
      userId: req.user._id,
      donationId,
      ipfsHash,
      payload
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/blockchain/verify-request
 */
router.post('/verify-request', protect, async (req, res) => {
  try {
    const { requestId, ipfsHash, payload } = req.body;

    const result = await blockchainService.verifyRequest({
      userId: req.user._id,
      requestId,
      ipfsHash,
      payload
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/blockchain/trust-score/:userId
 * Admin can query any user; non-admin can only query self.
 */
router.get('/trust-score/:userId', protect, async (req, res) => {
  try {
    const targetUserId = req.params.userId;

    if (req.user.role !== 'admin' && req.user._id.toString() !== targetUserId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const result = await blockchainService.getDonorTrustScore(targetUserId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/blockchain/records
 * User: own records | Admin: can query by userId param
 */
router.get('/records', protect, async (req, res) => {
  try {
    const userId = req.user.role === 'admin' && req.query.userId ? req.query.userId : req.user._id;
    const limit = req.query.limit != null ? Number(req.query.limit) : 50;

    const records = await blockchainService.listRecords({ userId, limit });
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * Admin: verify a tx hash (adapter-based)
 */
router.get('/verify/:txHash', protect, authorize('admin'), async (req, res) => {
  try {
    const result = await blockchainService.verifyTransaction(req.params.txHash);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
