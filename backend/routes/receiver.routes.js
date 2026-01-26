const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { validateBloodRequest } = require('../middleware/validation.middleware');
const {
  createRequest,
  getMyRequests,
  getRequest,
  getInterestedDonors,
  acceptDonor,
  completeRequest,
  cancelRequest,
  getStats
} = require('../controllers/receiver.controller');

// All routes are protected and receiver-only
router.use(protect);
// Unified role model: normal users can create/track requests (receiver mode).
router.use(authorize('user', 'admin'));

router.post('/request', validateBloodRequest, createRequest);
router.get('/my-requests', getMyRequests);
router.get('/request/:id', getRequest);
router.get('/request/:id/donors', getInterestedDonors);
router.put('/request/:id/accept-donor/:donorId', acceptDonor);
router.put('/request/:id/complete', completeRequest);
router.put('/request/:id/cancel', cancelRequest);
router.get('/stats', getStats);

module.exports = router;
