const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { validateDonorProfile } = require('../middleware/validation.middleware');
const {
  getProfile,
  createOrUpdateProfile,
  toggleAvailability,
  getNearbyRequests,
  getMatchedRequests,
  acceptRequest,
  getDonationHistory,
  getStats,
  downloadCertificate,
  regenerateCertificate,
  getCertificates
} = require('../controllers/donor.controller');

// All routes are protected and donor-only
router.use(protect);
// Unified role model: normal users can act as donors once they create a donor profile.
router.use(authorize('user', 'admin'));

router.get('/profile', getProfile);
router.post('/profile', validateDonorProfile, createOrUpdateProfile);
router.put('/availability', toggleAvailability);
router.get('/nearby-requests', getNearbyRequests);
router.get('/matched-requests', getMatchedRequests);
router.post('/accept-request/:id', acceptRequest);
router.get('/history', getDonationHistory);
router.get('/stats', getStats);

// Certificate routes
router.get('/certificates', getCertificates);
router.get('/certificate/:donationId', downloadCertificate);
router.post('/certificate/:donationId/regenerate', regenerateCertificate);

module.exports = router;
