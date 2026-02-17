# 🚀 Quick Start Guide - Email OTP & Security Features

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies (if needed)

```bash
cd backend
npm install
```

**Required packages** (already in package.json):
- ✅ nodemailer (email service)
- ✅ bcryptjs (password hashing)
- ✅ jsonwebtoken (authentication)

---

### Step 2: Configure Gmail SMTP

#### 2.1 Get Gmail App Password

1. Go to: https://myaccount.google.com/security
2. Enable **2-Step Verification** (if not enabled)
3. Go to: https://myaccount.google.com/apppasswords
4. Select **App**: Mail
5. Select **Device**: Other → Name it "LifeLink"
6. Click **Generate**
7. Copy the 16-character password (remove spaces)

#### 2.2 Create .env File

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/lifelink

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=lifelink_secret_2024

# Email (Gmail SMTP)
EMAIL_USER=akhilkrishnakondri@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop   # Your 16-char app password

# Frontend
FRONTEND_URL=http://localhost:3000
```

---

### Step 3: Create Super Admin

```bash
cd backend
node scripts/create-super-admin.js
```

**Output:**
```
✅ Super Admin created successfully!
-----------------------------------
Email: akhilkrishnakondri@gmail.com
Password: 12345678
Role: super_admin
-----------------------------------
```

---

### Step 4: Migrate Existing Users (Optional)

**Only if you have existing users in database:**

```bash
cd backend
node scripts/migrate-security-features.js
```

This marks all existing users as verified and approved.

---

### Step 5: Start the Server

```bash
cd backend
npm run dev
```

**Server should start on:** http://localhost:5000

---

### Step 6: Test the System

#### Test 1: New User Registration

1. Open: http://localhost:3000/register.html
2. Fill the form:
   ```
   Name: Test User
   Email: your-email@gmail.com
   Password: testpass123
   Phone: 1234567890
   Role: user
   ```
3. Click **Register**
4. **Check your email** for OTP (check spam folder)
5. Enter the 6-digit OTP
6. Click **Verify Email**
7. Success! Now login

#### Test 2: Forgot Password

1. Open: http://localhost:3000/login.html
2. Click **"Forgot Password?"**
3. Enter email
4. Check email for OTP
5. Enter OTP
6. Set new password
7. Login with new password

#### Test 3: Super Admin Login

1. Open: http://localhost:3000/login.html
2. Login with:
   ```
   Email: akhilkrishnakondri@gmail.com
   Password: 12345678
   ```
3. Should redirect to admin dashboard

#### Test 4: Admin Approval Flow

1. **Register as Admin:**
   - Open: http://localhost:3000/register.html
   - Role: admin
   - Complete email verification

2. **Try to Login:**
   - Should show: "Pending approval"

3. **Approve as Super Admin:**
   - Login as Super Admin
   - View pending admins
   - Approve the admin

4. **Admin Login:**
   - Now admin can login successfully

---

## 🎯 API Testing with Postman/Thunder Client

### 1. Register User

```http
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "name": "Test User",
  "email": "test@example.com",
  "password": "testpass123",
  "phone": "1234567890",
  "role": "user"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful! Please check your email for verification code.",
  "data": {
    "userId": "...",
    "email": "test@example.com",
    "requiresEmailVerification": true
  }
}
```

### 2. Verify OTP

```http
POST http://localhost:5000/api/auth/verify-otp
Content-Type: application/json

{
  "email": "test@example.com",
  "otp": "123456"
}
```

### 3. Login

```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "testpass123"
}
```

### 4. Forgot Password

```http
POST http://localhost:5000/api/auth/forgot-password
Content-Type: application/json

{
  "email": "test@example.com"
}
```

### 5. Super Admin - Get Pending Admins

```http
GET http://localhost:5000/api/admin/pending-admins
Authorization: Bearer YOUR_JWT_TOKEN
```

### 6. Super Admin - Approve Admin

```http
PUT http://localhost:5000/api/admin/approve-admin/ADMIN_ID
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📧 Email Templates Preview

### Email Verification OTP

```
Subject: Email Verification - LifeLink

🩸 LifeLink
Email Verification Required

Hello [Name]!

Thank you for registering with LifeLink. Please verify your email address.

Your One-Time Password (OTP)
┌─────────────┐
│   123456    │
└─────────────┘

⚠️ Important:
• Valid for 5 minutes
• Do not share this code
• If you didn't request this, ignore this email
```

### Password Reset OTP

```
Subject: Password Reset Request - LifeLink

🩸 LifeLink
Password Reset Request

Hello [Name]!

We received a request to reset your password.

Your One-Time Password (OTP)
┌─────────────┐
│   654321    │
└─────────────┘

⚠️ Security Note:
If you didn't request this, your account may be at risk.
Contact support immediately.
```

### Admin Approval

```
Subject: Admin Registration APPROVED - LifeLink

🩸 LifeLink
Admin Registration Update

Hello [Name]!

Status: APPROVED ✅

Congratulations! Your admin registration has been approved.
You can now login and access admin features.

[Login Now Button]
```

---

## 🔍 Verify Setup

### Check Environment Variables

```bash
cd backend
cat .env
```

Should show:
- ✅ EMAIL_USER set
- ✅ EMAIL_PASSWORD set
- ✅ JWT_SECRET set
- ✅ MONGODB_URI set

### Check Database

```bash
# Connect to MongoDB
mongo lifelink

# Check users
db.users.find({}).pretty()

# Verify Super Admin exists
db.users.findOne({ email: "akhilkrishnakondri@gmail.com" })
```

### Check Server Logs

```bash
cd backend
npm run dev
```

Should show:
```
Server running on http://localhost:5000
MongoDB connected successfully
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: Email Not Sending

**Error:** `Failed to send verification email`

**Solution:**
1. Check `EMAIL_USER` and `EMAIL_PASSWORD` in `.env`
2. Verify App Password is 16 characters (no spaces)
3. Ensure 2-Step Verification is enabled on Google Account
4. Try generating a new App Password

### Issue 2: OTP Expired

**Error:** `OTP has expired`

**Solution:**
1. Click "Resend Code" button
2. OTP is valid for 5 minutes only
3. Maximum 3 resend attempts

### Issue 3: "Pending Approval" on Login

**Error:** Admin can't login

**Solution:**
1. This is expected for new admins
2. Login as Super Admin
3. Go to pending admins page
4. Approve the admin
5. Admin receives email notification

### Issue 4: Super Admin Can't Login

**Error:** Invalid credentials

**Solution:**
```bash
cd backend
node scripts/create-super-admin.js
```

Credentials:
- Email: `akhilkrishnakondri@gmail.com`
- Password: `12345678`

---

## 📊 System Status Check

Run this checklist:

### Backend
- [ ] `npm install` completed
- [ ] `.env` file configured
- [ ] Super Admin created
- [ ] Server starts without errors
- [ ] MongoDB connected

### Email
- [ ] Gmail App Password generated
- [ ] `EMAIL_USER` set in .env
- [ ] `EMAIL_PASSWORD` set in .env
- [ ] Test email sent successfully

### Frontend
- [ ] `verify-email.html` exists
- [ ] `forgot-password.html` exists
- [ ] `login.html` updated
- [ ] Registration redirects to verify page

### Database
- [ ] Super Admin user exists
- [ ] Existing users migrated (if applicable)
- [ ] User model has new fields

---

## 🎉 You're Ready!

### Test User Journey

1. **Register** → Receive OTP → **Verify Email** → **Login** ✅
2. **Forgot Password** → Receive OTP → **Reset** → **Login** ✅
3. **Admin Register** → **Verify** → **Wait for Approval** → **Login** ✅

### Super Admin Journey

1. **Login as Super Admin** ✅
2. **View Pending Admins** ✅
3. **Approve/Reject Admins** ✅

### Security Features Active

- ✅ Email OTP verification
- ✅ Admin approval workflow
- ✅ Password reset with OTP
- ✅ Backward compatibility
- ✅ FREE email service

---

## 📚 Next Steps

1. **Customize emails:** Edit `backend/services/email.service.js`
2. **Change passwords:** Update Super Admin password after first login
3. **Production setup:** Update `.env` for production
4. **Monitor logs:** Check email delivery logs
5. **Test thoroughly:** Test all flows before production

---

## 💬 Support

**Questions?** Check:
- `EMAIL_SETUP_GUIDE.md` - Detailed setup
- `SECURITY_FEATURES_SUMMARY.md` - Feature overview
- Server logs for errors

**Contact:** akhilkrishnakondri@gmail.com

---

**🚀 Happy Coding! Your LifeLink platform is now secure!**
