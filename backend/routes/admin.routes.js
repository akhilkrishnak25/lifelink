const express = require('express');
const router = express.Router();
const { protect, authorize, authorizeSuperAdmin } = require('../middleware/auth.middleware');
const {
  getFlaggedRequests,
  approveRequest,
  rejectRequest,
  getAllRequests,
  getDashboardStats,
  getAllUsers,
  deactivateUser,
  activateUser,
  getPendingAdmins,
  approveAdmin,
  rejectAdmin,
  getAllAdmins
} = require('../controllers/admin.controller');

// All routes require authentication
router.use(protect);

// Regular admin routes
router.get('/flagged-requests', authorize('admin', 'super_admin'), getFlaggedRequests);
router.put('/approve-request/:id', authorize('admin', 'super_admin'), approveRequest);
router.put('/reject-request/:id', authorize('admin', 'super_admin'), rejectRequest);
router.get('/requests', authorize('admin', 'super_admin'), getAllRequests);
router.get('/stats', authorize('admin', 'super_admin'), getDashboardStats);
router.get('/users', authorize('admin', 'super_admin'), getAllUsers);
router.put('/users/:id/deactivate', authorize('admin', 'super_admin'), deactivateUser);
router.put('/users/:id/activate', authorize('admin', 'super_admin'), activateUser);

// Super Admin only routes - Admin approval management
router.get('/pending-admins', authorizeSuperAdmin, getPendingAdmins);
router.put('/approve-admin/:id', authorizeSuperAdmin, approveAdmin);
router.put('/reject-admin/:id', authorizeSuperAdmin, rejectAdmin);
router.get('/all-admins', authorizeSuperAdmin, getAllAdmins);

module.exports = router;
