# Email OTP & Security Features - Environment Configuration

## 📧 Email Service Setup (FREE - Gmail SMTP)

To enable email OTP verification and password reset features, you need to configure Gmail SMTP in your environment variables.

### Step 1: Create Gmail App Password

1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification** (enable if not already enabled)
3. Scroll down to **App passwords**
4. Click **Select app** → Choose "Mail"
5. Click **Select device** → Choose "Other" and name it "LifeLink"
6. Click **Generate**
7. Copy the 16-character password (remove spaces)

### Step 2: Configure Environment Variables

Add the following to your `.env` file in the `backend` folder:

```env
# Email Configuration (Gmail SMTP)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-16-char-app-password

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000

# JWT Secret (if not already set)
JWT_SECRET=your-secret-key-here
```

**Example:**
```env
EMAIL_USER=akhilkrishnakondri@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
FRONTEND_URL=http://localhost:3000
JWT_SECRET=mySecretKey123!@#
```

### Step 3: Verify Configuration

Create a test `.env` file:

**`backend/.env`**
```env
# Database
MONGODB_URI=mongodb://localhost:27017/lifelink

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=lifelink_secret_key_2024_secure

# Email (Gmail SMTP)
EMAIL_USER=akhilkrishnakondri@gmail.com
EMAIL_PASSWORD=your-gmail-app-password-here

# Frontend
FRONTEND_URL=http://localhost:3000
```

---

## 🔐 Super Admin Setup

### Create Super Admin Account

The Super Admin is **hardcoded** for security. To create the Super Admin:

**Option 1: Database Script**

Run this MongoDB script:

```javascript
// Connect to your database
use lifelink

// Create Super Admin
db.users.insertOne({
  name: "Super Admin",
  email: "akhilkrishnakondri@gmail.com",
  password: "$2a$10$YourHashedPasswordHere", // Use bcrypt to hash "12345678"
  phone: "1234567890",
  role: "super_admin",
  isActive: true,
  isEmailVerified: true,
  accountStatus: "approved",
  createdAt: new Date("2026-01-01T00:00:00.000Z") // Before feature date
})
```

**Option 2: Create via Registration (Recommended)**

1. Register normally with:
   - Email: `akhilkrishnakondri@gmail.com`
   - Password: `12345678`
   - Role: `admin`

2. After email verification, manually update in database:
   ```javascript
   db.users.updateOne(
     { email: "akhilkrishnakondri@gmail.com" },
     { 
       $set: { 
         role: "super_admin",
         accountStatus: "approved"
       }
     }
   )
   ```

**Option 3: Create Script**

Create `backend/scripts/create-super-admin.js`:

```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lifelink');

async function createSuperAdmin() {
  const User = require('../models/User');
  
  const hashedPassword = await bcrypt.hash('12345678', 10);
  
  await User.findOneAndUpdate(
    { email: 'akhilkrishnakondri@gmail.com' },
    {
      name: 'Super Admin',
      email: 'akhilkrishnakondri@gmail.com',
      password: hashedPassword,
      phone: '1234567890',
      role: 'super_admin',
      isActive: true,
      isEmailVerified: true,
      accountStatus: 'approved',
      createdAt: new Date('2026-01-01')
    },
    { upsert: true, new: true }
  );
  
  console.log('✅ Super Admin created successfully!');
  process.exit(0);
}

createSuperAdmin();
```

Run it:
```bash
cd backend
node scripts/create-super-admin.js
```

---

## 🔄 Migration Strategy

### For Existing Production Database

Run this migration script to update existing users:

**`backend/scripts/migrate-security-features.js`**

```javascript
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lifelink');

async function migrateUsers() {
  const User = mongoose.model('User', require('../models/User').schema);
  
  // Update all existing users
  const result = await User.updateMany(
    { createdAt: { $lt: new Date('2026-02-01') } },
    {
      $set: {
        isEmailVerified: true,
        accountStatus: 'approved',
        emailOtpAttempts: 0
      }
    }
  );
  
  console.log(`✅ Updated ${result.modifiedCount} existing users`);
  console.log('All existing users are now verified and approved.');
  
  process.exit(0);
}

migrateUsers().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

Run it:
```bash
cd backend
node scripts/migrate-security-features.js
```

---

## 📋 Testing Checklist

### ✅ Email OTP Verification

- [ ] Register new user → receives email
- [ ] Enter OTP → email verified
- [ ] Login with verified email → success
- [ ] Try login without verification → blocked
- [ ] Resend OTP → new email received
- [ ] Expired OTP → error message

### ✅ Admin Approval

- [ ] Register as admin → pending status
- [ ] Super Admin sees pending admin
- [ ] Super Admin approves → email sent
- [ ] Approved admin can login
- [ ] Rejected admin cannot login

### ✅ Forgot Password

- [ ] Request reset → email received
- [ ] Enter OTP → verified
- [ ] Set new password → success
- [ ] Login with new password → works

### ✅ Backward Compatibility

- [ ] Existing users login without OTP
- [ ] Existing admins access dashboard
- [ ] No errors for old accounts

---

## 🚀 Quick Start

1. **Install dependencies** (if not done):
   ```bash
   cd backend
   npm install
   ```

2. **Configure .env**:
   ```bash
   cp .env.example .env
   # Edit .env with your Gmail credentials
   ```

3. **Create Super Admin**:
   ```bash
   node scripts/create-super-admin.js
   ```

4. **Start server**:
   ```bash
   npm run dev
   ```

5. **Test email**:
   - Register new user
   - Check email for OTP
   - Verify and login

---

## 🔒 Security Notes

- OTP expires in 5 minutes
- Maximum 3 OTP resend attempts
- Passwords minimum 8 characters
- bcrypt encryption
- JWT tokens for authentication
- Super Admin role protected
- Email verification required for new users
- Admin approval required for new admins

---

## 📧 Email Templates

The system sends these emails:

1. **Email Verification OTP** - New registrations
2. **Password Reset OTP** - Forgot password
3. **Admin Approval** - Admin approved/rejected
4. **Welcome Email** - After successful verification

All emails are HTML formatted with LifeLink branding.

---

## ⚠️ Troubleshooting

### Email not sending?

1. Check Gmail credentials in `.env`
2. Verify App Password is correct (16 chars)
3. Check if 2-Step Verification is enabled
4. Check server logs for errors

### OTP not received?

1. Check spam/junk folder
2. Verify email address is correct
3. Check server logs
4. Try resend OTP

### Super Admin can't login?

1. Verify role is `super_admin` in database
2. Check `accountStatus` is `approved`
3. Check `isEmailVerified` is `true`
4. Verify password is correct

---

## 📞 Support

For issues or questions:
- Email: akhilkrishnakondri@gmail.com
- Check logs: `backend/logs/`
- Database: `mongodb://localhost:27017/lifelink`
