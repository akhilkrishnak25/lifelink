# 🧪 Quick Test Guide - LifeLink Security Features

## ✅ Server Status

**Backend Server:** ✅ Running on http://localhost:5000  
**Database:** ✅ Connected to MongoDB Atlas  
**Frontend:** Should be accessible at http://localhost:3000  

---

## 🔑 Super Admin Credentials

**Email:** akhilkrishnakondri@gmail.com  
**Password:** 12345678  
**Role:** super_admin  

⚠️ **Important:** Change this password immediately after first login in production!

---

## 📝 Test Scenarios

### 🎯 Test 1: New User Registration with Email OTP

**Expected Flow:**
1. User registers → Receives OTP email
2. User enters OTP → Account verified
3. User can login immediately (if role is user/donor/receiver)

**Steps:**

```bash
# 1. Open registration page
http://localhost:3000/register.html

# 2. Fill in form:
Name: Test User
Email: your-test-email@gmail.com  # Use a real email!
Password: testpass123
Role: donor

# 3. Click Register
# ✅ Should see: "Registration successful! Check your email for verification code."
# ✅ Should redirect to: verify-email.html

# 4. Check email
# ✅ Should receive email from akhilkrishnakondri@gmail.com
# ✅ Subject: "Verify Your LifeLink Email Address"
# ✅ Contains: 6-digit OTP code

# 5. Enter OTP on verification page
# ✅ Should see: "Email verified successfully!"
# ✅ Should redirect to: login.html

# 6. Login with credentials
# ✅ Should see: "Login successful"
# ✅ Should redirect to: donor-dashboard.html
```

**Expected API Calls:**

```javascript
// Register
POST /api/auth/register
Body: {
  "name": "Test User",
  "email": "your-test-email@gmail.com",
  "password": "testpass123",
  "role": "donor"
}
Response: {
  "success": true,
  "requiresEmailVerification": true,
  "message": "Registration successful! Check your email for verification code."
}

// Verify OTP
POST /api/auth/verify-otp
Body: {
  "email": "your-test-email@gmail.com",
  "otp": "123456"
}
Response: {
  "success": true,
  "message": "Email verified successfully! You can now login.",
  "user": { ... }
}
```

---

### 🎯 Test 2: Admin Registration with Super Admin Approval

**Expected Flow:**
1. Admin registers → Receives OTP email
2. Admin verifies email → Account pending approval
3. Admin tries to login → Blocked with "Pending approval" message
4. Super Admin approves → Admin receives approval email
5. Admin can now login

**Steps:**

```bash
# 1. Register as admin
http://localhost:3000/register.html

# Fill form:
Name: Test Admin
Email: test-admin@gmail.com
Password: admin123456
Role: admin

# 2. Verify email (same as Test 1)
# ✅ Account created with status: pending

# 3. Try to login as admin
http://localhost:3000/login.html
Email: test-admin@gmail.com
Password: admin123456

# ✅ Should see error: "Your admin account is pending approval"

# 4. Login as Super Admin
Email: akhilkrishnakondri@gmail.com
Password: 12345678

# ✅ Should redirect to admin dashboard

# 5. Approve pending admin (via Postman or frontend)
# API endpoint: GET /api/admin/pending-admins
# Should return: [{ email: "test-admin@gmail.com", accountStatus: "pending" }]

# 6. Approve admin
# API endpoint: POST /api/admin/approve-admin/:userId

# 7. Test admin receives approval email
# ✅ Subject: "Your LifeLink Admin Account Has Been Approved"

# 8. Admin can now login
# ✅ Should redirect to admin-dashboard.html
```

**Expected API Calls:**

```javascript
// Get pending admins (Super Admin only)
GET /api/admin/pending-admins
Headers: { "Authorization": "Bearer <super-admin-token>" }
Response: {
  "success": true,
  "admins": [
    {
      "_id": "...",
      "email": "test-admin@gmail.com",
      "name": "Test Admin",
      "accountStatus": "pending",
      "isEmailVerified": true
    }
  ]
}

// Approve admin
POST /api/admin/approve-admin/:userId
Headers: { "Authorization": "Bearer <super-admin-token>" }
Response: {
  "success": true,
  "message": "Admin approved successfully",
  "admin": { ... }
}
```

---

### 🎯 Test 3: Forgot Password Flow

**Expected Flow:**
1. User clicks "Forgot Password" → Enters email
2. User receives OTP email
3. User enters OTP → Receives reset token
4. User sets new password → Can login with new password

**Steps:**

```bash
# 1. Go to login page
http://localhost:3000/login.html

# 2. Click "Forgot Password?" link
# ✅ Should redirect to: forgot-password.html

# 3. Enter email (use existing account)
Email: your-test-email@gmail.com

# 4. Click "Send Reset Code"
# ✅ Should see: Step 2 (OTP verification)
# ✅ Should receive email with OTP

# 5. Check email
# ✅ Subject: "Password Reset Request"
# ✅ Contains: 6-digit OTP code

# 6. Enter OTP
# ✅ Should see: Step 3 (Set new password)

# 7. Set new password
New Password: newpass123
Confirm: newpass123

# 8. Click "Reset Password"
# ✅ Should see: "Password reset successful!"
# ✅ Should redirect to: login.html

# 9. Login with new password
Email: your-test-email@gmail.com
Password: newpass123

# ✅ Should login successfully
```

**Expected API Calls:**

```javascript
// Request password reset
POST /api/auth/forgot-password
Body: { "email": "your-test-email@gmail.com" }
Response: {
  "success": true,
  "message": "Password reset code sent to your email"
}

// Verify reset OTP
POST /api/auth/verify-reset-otp
Body: {
  "email": "your-test-email@gmail.com",
  "otp": "123456"
}
Response: {
  "success": true,
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "OTP verified. You can now reset your password."
}

// Reset password
POST /api/auth/reset-password
Body: {
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "newpass123"
}
Response: {
  "success": true,
  "message": "Password reset successful"
}
```

---

### 🎯 Test 4: Backward Compatibility (Existing Users)

**Expected Flow:**
1. Existing users (created before Feb 1, 2026) can login normally
2. No email verification required
3. No approval required for existing admins

**Steps:**

```bash
# This test validates the migration script worked

# 1. Check database for existing users
# All users with createdAt < 2026-02-01 should have:
# - isEmailVerified: true
# - accountStatus: 'approved'

# 2. Login as existing user
# ✅ Should login without email verification
# ✅ Should NOT see verification prompts

# 3. Verify in database:
db.users.find({
  createdAt: { $lt: new Date('2026-02-01') }
}).forEach(user => {
  print(`${user.email}: verified=${user.isEmailVerified}, status=${user.accountStatus}`)
})

# Expected output:
# ✅ All existing users have isEmailVerified: true
# ✅ All existing users have accountStatus: 'approved'
```

---

## 🔧 Testing with API Tools (Postman/Insomnia)

### Setup

```javascript
// Base URL
const API_URL = 'http://localhost:5000/api';

// Headers for authenticated requests
{
  "Authorization": "Bearer <your-jwt-token>",
  "Content-Type": "application/json"
}
```

### Test Collection

**1. Register User**

```http
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "name": "API Test User",
  "email": "apitest@gmail.com",
  "password": "testpass123",
  "role": "donor"
}
```

**2. Verify Email OTP**

```http
POST http://localhost:5000/api/auth/verify-otp
Content-Type: application/json

{
  "email": "apitest@gmail.com",
  "otp": "123456"
}
```

**3. Login**

```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "apitest@gmail.com",
  "password": "testpass123"
}
```

**4. Get Pending Admins (Super Admin)**

```http
GET http://localhost:5000/api/admin/pending-admins
Authorization: Bearer <super-admin-token>
```

**5. Approve Admin**

```http
POST http://localhost:5000/api/admin/approve-admin/USER_ID
Authorization: Bearer <super-admin-token>
```

**6. Reject Admin**

```http
POST http://localhost:5000/api/admin/reject-admin/USER_ID
Authorization: Bearer <super-admin-token>
Content-Type: application/json

{
  "reason": "Does not meet admin criteria"
}
```

**7. Forgot Password**

```http
POST http://localhost:5000/api/auth/forgot-password
Content-Type: application/json

{
  "email": "apitest@gmail.com"
}
```

**8. Verify Reset OTP**

```http
POST http://localhost:5000/api/auth/verify-reset-otp
Content-Type: application/json

{
  "email": "apitest@gmail.com",
  "otp": "123456"
}
```

**9. Reset Password**

```http
POST http://localhost:5000/api/auth/reset-password
Content-Type: application/json

{
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "newpassword123"
}
```

**10. Resend OTP**

```http
POST http://localhost:5000/api/auth/resend-otp
Content-Type: application/json

{
  "email": "apitest@gmail.com"
}
```

---

## 🐛 Common Issues & Solutions

### Issue 1: OTP Email Not Received

**Symptoms:**
- User registered but no email received
- Email takes too long to arrive

**Solutions:**

```bash
# 1. Check email configuration
# backend/.env should have:
EMAIL_USER=akhilkrishnakondri@gmail.com
EMAIL_PASSWORD=<your-16-char-app-password>

# 2. Check spam folder

# 3. Verify Gmail App Password is correct
# - Visit: https://myaccount.google.com/apppasswords
# - Regenerate if needed

# 4. Test email service manually
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'akhilkrishnakondri@gmail.com',
    pass: 'your-app-password'
  }
});
transporter.sendMail({
  from: 'akhilkrishnakondri@gmail.com',
  to: 'test@gmail.com',
  subject: 'Test',
  text: 'Testing email'
}, console.log);
"

# 5. Check server logs
# Look for email errors in backend terminal
```

### Issue 2: "Invalid or Expired OTP"

**Symptoms:**
- OTP verification fails
- User sees error message

**Solutions:**

```bash
# 1. Check OTP expiry (5 minutes)
# Request new OTP if expired

# 2. Verify OTP hasn't been used
# OTPs are single-use only

# 3. Check rate limiting (max 3 attempts)
# Wait 15 minutes or request new OTP

# 4. Verify in database:
db.users.findOne({ email: "test@gmail.com" }, {
  emailOtp: 1,
  emailOtpExpiry: 1,
  emailOtpAttempts: 1
})

# If OTP expired, generate new one:
# Use "Resend OTP" button on frontend
```

### Issue 3: Admin Login Shows "Pending Approval"

**Symptoms:**
- Admin verified email but can't login
- Error: "Your admin account is pending approval"

**Expected Behavior:**
- This is correct! Admins need Super Admin approval

**Solutions:**

```bash
# 1. Login as Super Admin
Email: akhilkrishnakondri@gmail.com
Password: 12345678

# 2. Get pending admins via API:
curl http://localhost:5000/api/admin/pending-admins \
  -H "Authorization: Bearer <super-admin-token>"

# 3. Approve admin via API:
curl -X POST http://localhost:5000/api/admin/approve-admin/USER_ID \
  -H "Authorization: Bearer <super-admin-token>"

# 4. Admin can now login
```

### Issue 4: Existing Users Can't Login

**Symptoms:**
- Old users see verification/approval errors
- Migration didn't run properly

**Solutions:**

```bash
# 1. Run migration script
cd backend
node scripts/migrate-security-features.js

# 2. Verify migration in database:
db.users.find({
  createdAt: { $lt: new Date('2026-02-01') }
}).forEach(user => {
  if (!user.isEmailVerified || user.accountStatus !== 'approved') {
    print(`❌ User needs fix: ${user.email}`)
  }
})

# 3. Manual fix if needed:
db.users.updateMany(
  { createdAt: { $lt: new Date('2026-02-01') } },
  {
    $set: {
      isEmailVerified: true,
      accountStatus: 'approved'
    }
  }
)
```

### Issue 5: Server Not Starting

**Symptoms:**
- `npm run dev` fails
- Port 5000 already in use

**Solutions:**

```powershell
# 1. Check if port 5000 is in use
netstat -ano | findstr :5000

# 2. Kill process using port 5000
taskkill /PID <PID> /F

# 3. Start server manually
cd f:\blood\backend
node server.js

# 4. Check for missing dependencies
npm install

# 5. Verify MongoDB connection
# Check MONGODB_URI in .env
```

---

## ✅ Test Results Template

```markdown
## Test Results - [Date]

### Test 1: New User Registration
- [ ] Registration form submitted successfully
- [ ] OTP email received within 1 minute
- [ ] OTP verification successful
- [ ] User can login immediately
- **Status:** ✅ Pass / ❌ Fail
- **Notes:** _______________

### Test 2: Admin Approval Flow
- [ ] Admin registration successful
- [ ] Admin email verified
- [ ] Admin login blocked (pending)
- [ ] Super Admin sees pending request
- [ ] Approval email sent
- [ ] Admin can login after approval
- **Status:** ✅ Pass / ❌ Fail
- **Notes:** _______________

### Test 3: Forgot Password
- [ ] Reset email sent
- [ ] OTP received
- [ ] OTP verified
- [ ] Password changed successfully
- [ ] Login with new password works
- **Status:** ✅ Pass / ❌ Fail
- **Notes:** _______________

### Test 4: Backward Compatibility
- [ ] Existing users can login
- [ ] No verification prompts
- [ ] No approval prompts
- **Status:** ✅ Pass / ❌ Fail
- **Notes:** _______________
```

---

## 📧 Email Testing Checklist

Before production:

- [ ] OTP emails delivered within 60 seconds
- [ ] Email formatting correct (HTML renders properly)
- [ ] LifeLink branding visible
- [ ] Links work correctly
- [ ] Emails not in spam folder
- [ ] Mobile email formatting tested
- [ ] Multiple email providers tested (Gmail, Outlook, Yahoo)

---

## 🚀 Ready to Test!

**Current Setup:**
- ✅ Backend running on http://localhost:5000
- ✅ Database connected
- ✅ Super Admin ready
- ⚠️ **Need Gmail App Password** (see EMAIL_SETUP_GUIDE.md)

**Next Steps:**
1. Generate Gmail App Password
2. Update `backend/.env` with actual password
3. Restart server
4. Run Test 1 (New User Registration)
5. Check email delivery
6. Complete remaining tests

**Estimated Testing Time:** 30-45 minutes

---

**Questions?** See SETUP_STATUS.md or EMAIL_SETUP_GUIDE.md
