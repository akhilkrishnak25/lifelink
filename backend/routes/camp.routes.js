const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const BloodCamp = require('../models/BloodCamp');

/**
 * @route   POST /api/camps
 * @desc    Create blood camp
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  try {
    const camp = await BloodCamp.create({
      ...req.body,
      organizerId: req.user.id,
      organizerName: req.user.name
    });
    
    res.status(201).json({ success: true, data: camp });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/camps
 * @desc    Get all blood camps
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { status = 'upcoming', city, limit = 20 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (city) query.city = new RegExp(city, 'i');
    
    const camps = await BloodCamp.find(query)
      .sort({ startDate: 1 })
      .limit(parseInt(limit));
    
    res.json({ success: true, data: camps });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/camps/:id/register
 * @desc    Register for blood camp
 * @access  Private (Donor)
 */
router.post('/:id/register', protect, async (req, res) => {
  try {
    const camp = await BloodCamp.findById(req.params.id);
    
    if (!camp) {
      return res.status(404).json({ success: false, message: 'Camp not found' });
    }
    
    const alreadyRegistered = camp.registeredDonors.some(
      d => d.donorId.toString() === req.user.id
    );
    
    if (alreadyRegistered) {
      return res.status(400).json({
        success: false,
        message: 'Already registered for this camp'
      });
    }
    
    camp.registeredDonors.push({ donorId: req.user.id });
    await camp.save();
    
    res.json({ success: true, message: 'Registered successfully', data: camp });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/camps/nearby
 * @desc    Get nearby blood camps
 * @access  Public
 */
router.get('/nearby', async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 50 } = req.query;
    
    const camps = await BloodCamp.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: maxDistance * 1000
        }
      },
      status: 'upcoming'
    }).limit(10);
    
    res.json({ success: true, data: camps });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
