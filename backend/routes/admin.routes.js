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
  getAllAdmins,
  getAllDonors,
  toggleUserStatus,
  deleteUser,
  getAdvancedAnalytics,
  exportData,
  getActivityLogs,
  getLocationDetections,
  getUserLocationHistory,
  getSuspiciousLocations,
  processUnanalyzedRequests
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

// Admin View Page Routes
router.get('/donors', authorize('admin', 'super_admin'), getAllDonors);
router.put('/users/:id/status', authorize('admin', 'super_admin'), toggleUserStatus);
router.delete('/users/:id', authorize('admin', 'super_admin'), deleteUser);
router.get('/analytics', authorize('admin', 'super_admin'), getAdvancedAnalytics);
router.get('/export/:type', authorize('admin', 'super_admin'), exportData);
router.get('/activity-logs', authorize('admin', 'super_admin'), getActivityLogs);

// Location-based fraud detection routes
router.get('/location-detections', authorize('admin', 'super_admin'), getLocationDetections);
router.get('/user/:userId/location-history', authorize('admin', 'super_admin'), getUserLocationHistory);
router.get('/suspicious-locations', authorize('admin', 'super_admin'), getSuspiciousLocations);

// Agentic AI routes
router.post('/process-unanalyzed-requests', authorize('admin', 'super_admin'), processUnanalyzedRequests);

// Super Admin only routes - Admin approval management
router.get('/pending-admins', authorizeSuperAdmin, getPendingAdmins);
router.put('/approve-admin/:id', authorizeSuperAdmin, approveAdmin);
router.put('/reject-admin/:id', authorizeSuperAdmin, rejectAdmin);
router.get('/all-admins', authorizeSuperAdmin, getAllAdmins);

module.exports = router;
