const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const appointmentService = require('../services/appointment.service');

/**
 * @route   POST /api/appointments
 * @desc    Create appointment
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  try {
    const appointment = await appointmentService.createAppointment({
      ...req.body,
      // Unified role: user can create appointment; donorId must be provided explicitly
      donorId: req.body.donorId,
      receiverId: req.user.id
    });
    
    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/appointments
 * @desc    Get user appointments
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const appointments = await appointmentService.getAppointments(
      req.user.id,
      req.user.role
    );
    
    res.json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/appointments/upcoming
 * @desc    Get upcoming appointments
 * @access  Private
 */
router.get('/upcoming', protect, async (req, res) => {
  try {
    const appointments = await appointmentService.getUpcoming(
      req.user.id,
      req.user.role
    );
    
    res.json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/appointments/:id/status
 * @desc    Update appointment status
 * @access  Private
 */
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const appointment = await appointmentService.updateStatus(
      req.params.id,
      status,
      notes
    );
    
    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
