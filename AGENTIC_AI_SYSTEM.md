# 🤖 LifeLink Agentic AI Smart Matching System

## Overview

The Agentic AI Smart Matching System is an intelligent, self-improving layer built on top of LifeLink's existing blood donor-receiver matching infrastructure. It implements a complete **Observe → Decide → Plan → Act → Learn** autonomous loop that continuously optimizes donor-receiver matching based on real-world feedback.

## 🏗️ Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENTIC AI SYSTEM                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  👁️  OBSERVE Layer                                          │
│  └─ Observer Service (observer.js)                          │
│     - Collects system state                                  │
│     - Analyzes donor pool                                    │
│     - Environmental context (time, day, load)                │
│                                                               │
│  🧠 DECIDE Layer                                            │
│  └─ ML Scorer (agent_scorer.py) + Agent Controller          │
│     - Scores donors intelligently                            │
│     - Predicts donor behavior                                │
│     - Recommends matching strategy                           │
│                                                               │
│  📋 PLAN Layer                                              │
│  └─ Strategy Planner (strategy.planner.js)                  │
│     - Creates multi-step execution plans                     │
│     - Targeted / Broadcast / Escalation / Hybrid            │
│     - Dynamic escalation logic                               │
│                                                               │
│  ⚡ ACT Layer                                               │
│  └─ Action Executor (action.executor.js)                    │
│     - Executes planned actions                               │
│     - Socket.IO notifications                                │
│     - Email, chat, donor locking                             │
│                                                               │
│  📚 LEARN Layer                                             │
│  └─ Learning Service (learning.service.js)                  │
│     - Records donor responses                                │
│     - Calculates performance metrics                         │
│     - Generates improvement suggestions                      │
│     - Feeds back to ML model                                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 The Agentic Loop

### 1. OBSERVE Phase

When a new blood request is created, the system:

- **Collects request data**: Blood group, urgency, location, units needed
- **Analyzes donor pool**: Available donors, eligibility, distances
- **Environmental context**: Time of day, weekend/weekday, system load
- **Admin flags**: Verification status, fake detection scores

**File**: `backend/services/agent/observer.js`

**Key Methods**:
- `collectSystemState()` - Gathers complete system snapshot
- `getDonorDataForScoring()` - Prepares donor data for AI
- `analyzeDonorPool()` - Counts available/eligible donors

### 2. DECIDE Phase

The AI scores each donor and selects a strategy:

- **Donor Scoring** (Python ML Service):
  - Distance score (0-100)
  - Reliability score from gamification
  - Eligibility (3-month donation gap)
  - Response history prediction
  - Blood type match bonus
  - Availability score

- **Strategy Recommendation**:
  - **Targeted**: Notify top 3-5 donors (normal requests)
  - **Broadcast**: Notify all in radius (urgent/critical or few good matches)
  - **Escalation**: Gradual expansion (moderate urgency)
  - **Hybrid**: Top donors first, then broadcast (critical)

**Files**: 
- `ml/agent_scorer.py` - Python ML scoring
- `backend/services/agent/agent.controller.js` - Decision orchestration

**Key Methods**:
- `score_donors()` - ML scoring algorithm
- `recommend_strategy()` - Strategy selection
- `_makeDecision()` - Main decision function

### 3. PLAN Phase

Creates a multi-step execution strategy:

**Targeted Plan Example**:
```javascript
{
  steps: [
    { action: 'notify_donors', targetDonors: [top5], timeout: 10min },
    { action: 'open_chat', targetDonors: [top5], timeout: null }
  ],
  responseWindow: 30,
  escalationPlan: {
    enabled: true,
    triggerAfterMinutes: 30,
    expandRadiusKm: 10
  }
}
```

**File**: `backend/services/agent/strategy.planner.js`

**Key Methods**:
- `generatePlan()` - Creates execution plan
- `shouldEscalate()` - Checks if escalation needed
- `generateEscalationPlan()` - Expands donor pool

### 4. ACT Phase

Executes the plan step-by-step:

**Actions**:
- `notify_donors` - Send Socket.IO + Email notifications
- `broadcast` - Area-wide broadcast
- `open_chat` - Initialize chat sessions
- `lock_slot` - Reserve donor (prevent double-booking)
- `escalate` - Expand search
- `admin_alert` - Manual intervention needed

**File**: `backend/services/agent/action.executor.js`

**Key Methods**:
- `executeAction()` - Runs single action
- `_notifyDonors()` - Targeted notifications
- `_broadcastToArea()` - Mass notifications

### 5. LEARN Phase

Collects feedback and improves:

**Tracked Metrics**:
- Response rate (% donors who responded)
- Success rate (% who accepted)
- Average response time
- Strategy effectiveness
- Prediction accuracy

**Learning Process**:
1. Record donor response time
2. Compare predicted vs actual
3. Calculate performance metrics
4. Generate improvement suggestions
5. Update ML model weights

**File**: `backend/services/agent/learning.service.js`

**Key Methods**:
- `recordDonorResponse()` - Log individual responses
- `recordFinalOutcome()` - Log final match result
- `getSystemInsights()` - Aggregate performance data

## 📊 Data Models

### AgentState Schema

Stores complete state for each request:

```javascript
{
  requestId: ObjectId,
  
  observation: {
    bloodGroup, urgency, location, city,
    timeOfDay, isWeekend,
    totalAvailableDonors, eligibleDonors,
    activeRequestsCount
  },
  
  decision: {
    rankedDonors: [{
      donorId, score, confidence, distance,
      responseTimePrediction, successProbability,
      reason
    }],
    strategyType: 'targeted|broadcast|escalation|hybrid',
    mlRecommendation: { ... }
  },
  
  plan: {
    steps: [{ action, targetDonors, scheduledTime, timeout }],
    responseWindow, escalationPlan
  },
  
  execution: {
    actions: [{ type, executedAt, success }],
    notificationsSent, donorsContacted,
    status: 'executing|awaiting_response|completed'
  },
  
  learning: {
    donorResponses: [{
      donorId, responseTimeMinutes, accepted,
      predictedVsActual: { accuracy }
    }],
    finalOutcome: { matched, completedAt, rating },
    performanceMetrics: { responseRate, successRate },
    improvements: [{ aspect, suggestion }]
  }
}
```

**File**: `backend/models/AgentState.js`

## 🔧 Integration Points

### 1. Blood Request Creation

**File**: `backend/controllers/receiver.controller.js`

```javascript
exports.createRequest = async (req, res) => {
  // Create request
  const request = await BloodRequest.create({...});
  
  // 🤖 Process with Agent System (async)
  processWithAgentSystem(request, io);
  
  res.json({ success: true, aiProcessing: true });
};
```

### 2. Donor Response

**File**: `backend/controllers/donor.controller.js`

```javascript
exports.acceptRequest = async (req, res) => {
  // Record interest
  request.interestedDonors.push({...});
  
  // 🤖 Record for learning
  agentController.handleDonorResponse(
    requestId, donorId, accepted=true
  );
};
```

### 3. Request Completion

**File**: `backend/controllers/receiver.controller.js`

```javascript
exports.completeRequest = async (req, res) => {
  // Mark complete
  request.status = 'completed';
  
  // 🤖 Record final outcome
  agentController.recordFinalOutcome(requestId, {
    matched: true,
    matchedDonorId,
    donationCompleted: true,
    receiverRating
  });
};
```

## 📡 API Endpoints

### Admin Endpoints (`/api/agent/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/insights` | GET | System-wide learning insights |
| `/request/:id/state` | GET | Detailed agent state for request |
| `/states` | GET | List all agent states (paginated) |
| `/request/:id/escalate` | POST | Manual escalation trigger |
| `/performance` | GET | Performance metrics dashboard |

### ML Service Endpoints (`http://localhost:5001/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/score-donors` | POST | Score and rank donors |
| `/recommend-strategy` | POST | Get matching strategy |
| `/update-learning` | POST | Update model from feedback |
| `/predict` | POST | Fake detection (existing) |

## 🛡️ Safety & Control

### Admin Oversight

- **No bypass of verification**: Fake-flagged requests never auto-matched
- **Medical eligibility**: 3-month gap strictly enforced
- **Manual override**: Admins can escalate or stop any agent process
- **Audit trail**: Every decision logged with reasoning

### Fallback Mechanisms

1. **ML Service Down**: Falls back to rule-based scoring
2. **No Donors Available**: Creates broadcast plan for later
3. **Escalation Failure**: Triggers admin alert
4. **Response Timeout**: Automatic escalation after window

## 📈 Performance Monitoring

### Key Metrics Tracked

1. **Response Rate**: % of donors who responded
2. **Success Rate**: % who accepted donation
3. **Avg Response Time**: Minutes until first response
4. **Strategy Effectiveness**: Match speed vs urgency
5. **Prediction Accuracy**: AI prediction vs reality

### Admin Dashboard Visibility

Admins can see:
- Why each donor was selected (score breakdown)
- Strategy reasoning
- Response timeline
- Success/failure analysis
- System improvement trends

## 🚀 Deployment & Configuration

### Environment Variables

```env
ML_API_URL=http://localhost:5001
```

### Starting Services

```bash
# Backend (with agent system)
cd backend
node server.js

# ML Service (with agentic scoring)
cd ml
python app.py

# Frontend
python serve-frontend.py
```

### Database Indexes

The `AgentState` model automatically creates indexes on:
- `requestId` (unique)
- `execution.status`
- `learning.feedbackCollectedAt`
- `createdAt`

## 🔮 Future Enhancements

1. **Real-time Model Retraining**: Auto-retrain when accuracy drops
2. **Multi-request Coordination**: Coordinate across multiple concurrent requests
3. **Donor Fatigue Prevention**: Track notification frequency
4. **Geographic Optimization**: Learn best routes/hospitals
5. **Seasonal Patterns**: Adjust for holidays, weather, events
6. **A/B Testing**: Compare strategies automatically

## 📚 Files Reference

### Backend Services
- `services/agent/agent.controller.js` - Main orchestrator
- `services/agent/observer.js` - System state collection
- `services/agent/strategy.planner.js` - Plan generation
- `services/agent/action.executor.js` - Action execution
- `services/agent/learning.service.js` - Feedback & learning

### ML Service
- `ml/agent_scorer.py` - Intelligent scoring
- `ml/app.py` - Flask API with agent endpoints

### Controllers
- `controllers/agent.controller.js` - Admin API endpoints
- `controllers/receiver.controller.js` - Integration point (create request)
- `controllers/donor.controller.js` - Integration point (accept request)

### Models
- `models/AgentState.js` - Complete agent state storage

### Routes
- `routes/agent.routes.js` - Admin agent API routes

## 🎯 Usage Example

### Creating a Request (User Side)

```javascript
POST /api/receiver/request
{
  "bloodGroup": "A+",
  "urgency": "critical",
  "hospitalName": "City Hospital",
  "unitsRequired": 2,
  // ... location data
}

// Response:
{
  "success": true,
  "message": "Blood request created successfully. Our AI is finding the best donors for you.",
  "aiProcessing": true
}
```

### Behind the Scenes

1. **Observe**: System finds 15 A+ donors within 25km
2. **Decide**: ML scores all donors, top 5 have 80+ scores
3. **Plan**: Critical urgency → Hybrid strategy (top 5 first, then broadcast in 5 min)
4. **Act**: Sends notifications to top 5 donors with personalized reasons
5. **Learn**: Waits for responses, records timing and outcomes

### Admin Monitoring

```javascript
GET /api/agent/request/{requestId}/state

// Response shows complete agent state:
{
  "observation": { /* system snapshot */ },
  "decision": {
    "rankedDonors": [
      {
        "score": 87.5,
        "reason": "very close proximity, high reliability score",
        "successProbability": 0.82
      }
    ],
    "strategyType": "hybrid"
  },
  "execution": {
    "status": "awaiting_response",
    "donorsContacted": 5,
    "notificationsSent": 5
  },
  "learning": { /* performance data */ }
}
```

## ✅ Success Criteria

The system is working correctly when:

1. ✅ Blood requests automatically trigger agent processing
2. ✅ Donors receive intelligent, personalized notifications
3. ✅ Responses are recorded for learning
4. ✅ Performance improves over time
5. ✅ Admin can see complete decision trail
6. ✅ System gracefully handles ML service failures
7. ✅ Escalation triggers automatically when needed
8. ✅ Final outcomes feed back to improve future matches

---

**Built with ❤️ for LifeLink - Saving lives through intelligent automation**
