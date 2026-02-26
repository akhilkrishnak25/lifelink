# 🔍 Location-Based Fake Request Detection - Testing Guide

## 📋 Overview

This guide explains how to test the enhanced fake request detection system that combines ML-based analysis with location-based fraud detection.

## 🎯 Detection Rules

The system implements **5 location-based fraud detection rules**:

| Rule | Condition | Time Window | Flag | Severity |
|------|-----------|-------------|------|----------|
| **Location Jump** | >50km distance | <1 hour | `location_jump` | +30 points |
| **Impossible Travel** | >500km distance | <2 hours | `impossible_travel` | +50 points |
| **Rapid Requests** | 3+ requests | <30 minutes | `rapid_requests` | +20 points |
| **Different IP** | IP address changes | <1 hour | `different_ip` | +15 points |
| **Multiple Cities** | 3+ different cities | <6 hours | `location_jump` | +30 points |

## 🔢 Severity Scoring

- **Combined Severity** = ML Severity + Location Severity (capped at 100)
- **Auto-Flag** (≥80%): Request automatically flagged for manual review
- **Review** (≥50%): Request marked for review but processed
- **Normal** (<50%): Request processed normally with warnings

## 🧪 Testing Methods

### Method 1: Automated Test Script

Run the comprehensive test script that creates various fraud scenarios:

```bash
cd backend
node scripts/test-location-detection.js
```

This script will:
- Create a test receiver user
- Generate 6 different test scenarios
- Show expected vs. actual detection results
- Provide a summary of all flags triggered

### Method 2: Manual API Testing with curl

#### Test 1: Normal Request (Should Pass)

```bash
curl -X POST http://localhost:5000/api/receiver/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "bloodGroup": "O+",
    "urgency": "medium",
    "unitsRequired": 2,
    "hospitalName": "City Hospital",
    "location": {
      "address": "Mumbai, Maharashtra",
      "city": "Mumbai",
      "state": "Maharashtra",
      "latitude": 19.0760,
      "longitude": 72.8777
    },
    "contactNumber": "9876543210",
    "notes": "Regular blood request"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Blood request created successfully...",
  "data": {...},
  "aiProcessing": true
}
```

#### Test 2: Rapid Requests (Trigger rapid_requests flag)

Run the same request **3 times within 30 minutes** from the same user account.

**Expected Response (3rd request):**
```json
{
  "success": true,
  "message": "Blood request created successfully...",
  "warning": "We detected some unusual patterns...",
  "reasons": ["Multiple requests from same location in short time"],
  "severity": 20
}
```

#### Test 3: Location Jump (Different cities)

**First Request:**
```bash
# From Mumbai
curl -X POST http://localhost:5000/api/receiver/request \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "bloodGroup": "A+",
    "location": {"city": "Mumbai", "latitude": 19.0760, "longitude": 72.8777}
  }'
```

**Second Request (30 minutes later):**
```bash
# From Pune (150km away)
curl -X POST http://localhost:5000/api/receiver/request \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "bloodGroup": "A+",
    "location": {"city": "Pune", "latitude": 18.5204, "longitude": 73.8567}
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "warning": "We detected some unusual patterns...",
  "reasons": ["Request from different location (150.5 km away) within 0.5 hours"],
  "severity": 30
}
```

#### Test 4: Impossible Travel

**First Request (Mumbai)** → **Second Request (Delhi, 1400km, 1 hour later)**

**Expected Response:**
```json
{
  "success": true,
  "message": "Request submitted but flagged for manual review...",
  "needsReview": true,
  "reasons": [
    "Request from different location (1400.2 km away) within 1 hours",
    "Impossible travel detected: 1400km in 1 hours"
  ],
  "severity": 80
}
```

### Method 3: Use VPN/Proxies for Different IPs

1. **Use a VPN service** (like ProtonVPN, NordVPN) to change your IP address
2. Make requests from different IP addresses within a short time
3. System should detect `different_ip` flag

### Method 4: Frontend Testing

1. **Login as Receiver**
2. **Create multiple blood requests quickly**
3. **Change location between requests** (if using mobile with GPS)
4. **Check for warnings** in the response

## 📊 Viewing Detection Results

### Admin Dashboard Endpoints

#### 1. View All Location-Based Detections

```bash
GET http://localhost:5000/api/admin/location-detections
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suspiciousPatterns": [...],
    "flaggedRequests": [...],
    "stats": {
      "totalSuspicious": 12,
      "flagsByType": {
        "location_jump": 5,
        "rapid_requests": 3,
        "impossible_travel": 2,
        "different_ip": 2
      },
      "severityDistribution": {
        "high": 3,
        "medium": 5,
        "low": 4
      }
    }
  }
}
```

#### 2. View Location History for Specific User

```bash
GET http://localhost:5000/api/admin/user/USER_ID/location-history
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {...},
    "riskProfile": {
      "totalRequests": 10,
      "suspiciousRequests": 4,
      "riskScore": "40.0",
      "uniqueCities": 3,
      "uniqueIPs": 5
    },
    "locationHistory": [...],
    "requests": [...]
  }
}
```

#### 3. View Top Suspicious Users

```bash
GET http://localhost:5000/api/admin/suspicious-locations
```

#### 4. Receiver's Own Location Analytics

```bash
GET http://localhost:5000/api/receiver/location-analytics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRequests": 10,
    "suspiciousRequests": 3,
    "uniqueCities": 2,
    "uniqueIPs": 4,
    "cities": ["Mumbai", "Pune"],
    "recentLocations": [...],
    "flaggedRequests": [...]
  }
}
```

## 🔍 Database Inspection

### View RequestTracking Collection

```javascript
// In MongoDB shell or Compass
db.request_trackings.find({
  suspicionFlags: { $exists: true, $ne: [] }
}).sort({ timestamp: -1 })
```

### View Flagged Blood Requests

```javascript
db.blood_requests.find({
  $or: [
    { locationSuspicious: true },
    { status: 'flagged' },
    { status: 'review' }
  ]
})
```

### View Combined Analysis

```javascript
db.fake_request_analyses.find({
  $or: [
    { locationSuspicious: true },
    { combinedSeverity: { $gte: 50 } }
  ]
})
```

## ✅ Expected Behavior

### ✅ Low Severity (<30%)
- Request processed normally
- No warnings shown to user
- Background ML analysis continues

### ⚠️ Medium Severity (30-70%)
- Request processed with warning
- User sees: "We detected some unusual patterns..."
- Admin notified for monitoring

### 🚨 High Severity (≥70%)
- Request flagged for manual review
- User sees: "Your request will be reviewed by our admin team..."
- Admin must approve before processing
- No AI matching performed until approval

## 🐛 Troubleshooting

### Issue: No location data captured

**Solution:**
- Check if IP address is being passed correctly in request
- Verify ip-api.com is accessible (external API)
- Check server logs for geolocation errors

### Issue: All requests showing 0% severity

**Solution:**
- Make sure you're creating **multiple requests from same user**
- Detection requires **history to compare against**
- First request always has 0% severity

### Issue: Admin endpoints returning empty data

**Solution:**
- Create test data using the test script first
- Ensure admin user has proper authorization
- Check MongoDB connection and collections

## 📝 Testing Checklist

- [ ] Run automated test script successfully
- [ ] Create normal request (should pass)
- [ ] Create 3 rapid requests (should flag)
- [ ] Create requests from different cities (should flag)
- [ ] Test impossible travel scenario (should auto-flag)
- [ ] View detection results in admin dashboard
- [ ] Check user's location analytics
- [ ] Verify email notifications (if configured)
- [ ] Test combined ML + Location scoring
- [ ] Verify request status changes (pending → review → flagged)

## 🎓 Understanding the Flow

1. **User creates blood request** → IP address captured
2. **Location tracking service** → Calls ip-api.com for geolocation
3. **Pattern analysis** → Compares with user's request history
4. **Flag detection** → Checks against 5 detection rules
5. **Severity calculation** → Combines ML + location scores
6. **Request status** → Sets pending/review/flagged based on severity
7. **Response to user** → Shows warnings/review message if needed
8. **Admin notification** → High severity requests flagged for admin
9. **AI processing** → Skipped for high severity requests
10. **Database storage** → RequestTracking + BloodRequest + FakeRequestAnalysis

## 🔗 Related Files

- **Models:** `backend/models/RequestTracking.js`, `BloodRequest.js`, `FakeRequestAnalysis.js`
- **Services:** `backend/services/locationTracking.service.js`, `ml.service.js`
- **Controllers:** `backend/controllers/receiver.controller.js`, `admin.controller.js`
- **Routes:** `backend/routes/receiver.routes.js`, `admin.routes.js`
- **Test Script:** `backend/scripts/test-location-detection.js`

## 💡 Next Steps

After testing:
1. Update admin dashboard UI to show location flags
2. Add frontend alerts for flagged requests
3. Configure email notifications for admins
4. Set up monitoring for false positives
5. Fine-tune severity thresholds based on real data
