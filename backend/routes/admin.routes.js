const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getFlaggedRequests,
  approveRequest,
  rejectRequest,
  getAllRequests,
  getDashboardStats,
  getAllUsers,
  deactivateUser,
  activateUser
} = require('../controllers/admin.controller');

// All routes are protected and admin-only
router.use(protect);
router.use(authorize('admin'));

router.get('/flagged-requests', getFlaggedRequests);
router.put('/approve-request/:id', approveRequest);
router.put('/reject-request/:id', rejectRequest);
router.get('/requests', getAllRequests);
router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.put('/users/:id/deactivate', deactivateUser);
router.put('/users/:id/activate', activateUser);

module.exports = router;
