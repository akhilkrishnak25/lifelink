const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { hospitalService } = require('../services/hospital/hospital.service');

/**
 * Admin: Create hospital
 * POST /api/hospital
 */
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const result = await hospitalService.createHospital(req.body);

    res.status(201).json({
      success: true,
      message: 'Hospital created successfully',
      data: {
        hospital: result.hospital,
        webhookSecret: result.webhookSecret
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});


/**
 * Hospital dashboard
 * GET /api/hospital/:hospitalId/dashboard
 */
router.get('/:hospitalId/dashboard', protect, async (req, res) => {
  try {
    const result = await hospitalService.getHospitalDashboard(req.params.hospitalId);
    res.status(result.status).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Secure webhook receiver
 * POST /api/hospital/:hospitalId/stock-update
 * Header: x-lifelink-signature: sha256=<hex>
 */
router.post('/:hospitalId/stock-update', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-lifelink-signature'];
    const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);

    // Parse payload from raw body
    const parsed = JSON.parse(rawBody);

    const result = await hospitalService.handleStockUpdate({
      hospitalId: req.params.hospitalId,
      bloodStock: parsed.bloodStock,
      rawBody,
      signature
    });

    res.status(result.status).json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
