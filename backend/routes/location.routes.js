const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { locationService } = require('../services/location/location.service');

/**
 * POST /api/location/update
 * Update current user's GPS location (live tracking)
 */
router.post('/update', protect, async (req, res) => {
  try {
    const { latitude, longitude, accuracy, heading, speed } = req.body;

    const result = await locationService.updateLocation(req.user._id.toString(), {
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: accuracy != null ? Number(accuracy) : null,
      heading: heading != null ? Number(heading) : null,
      speed: speed != null ? Number(speed) : null
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/location/nearby-donors?lat=..&lng=..&radius=..&bloodGroup=..
 */
router.get('/nearby-donors', protect, async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = req.query.radius != null ? Number(req.query.radius) : undefined;
    const bloodGroup = req.query.bloodGroup || null;

    const result = await locationService.getNearbyDonors(lat, lng, { radius, bloodGroup });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/location/nearby-hospitals?lat=..&lng=..&radius=..
 */
router.get('/nearby-hospitals', protect, async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = req.query.radius != null ? Number(req.query.radius) : undefined;

    const result = await locationService.getNearbyHospitals(lat, lng, { radius });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
