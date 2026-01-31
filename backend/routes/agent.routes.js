const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getAgentInsights,
  getRequestAgentState,
  getAllAgentStates,
  triggerEscalation,
  getSystemPerformance
} = require('../controllers/agent.controller');

// All routes protected - admin only
router.use(protect);
router.use(authorize('admin'));

// Agent AI visibility endpoints
router.get('/insights', getAgentInsights);
router.get('/request/:requestId/state', getRequestAgentState);
router.get('/states', getAllAgentStates);
router.post('/request/:requestId/escalate', triggerEscalation);
router.get('/performance', getSystemPerformance);

module.exports = router;
