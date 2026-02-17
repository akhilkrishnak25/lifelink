# 🚀 Production Deployment Checklist - LifeLink

## 📋 Pre-Deployment Checklist

### 1. Environment Configuration

- [ ] **Update `.env` for production:**
  ```env
  NODE_ENV=production
  MONGODB_URI=your-production-mongodb-uri
  JWT_SECRET=generate-strong-random-secret-key
  EMAIL_USER=akhilkrishnakondri@gmail.com
  EMAIL_PASSWORD=your-gmail-app-password
  FRONTEND_URL=https://your-production-domain.com
  PORT=5000
  ```

- [ ] **Generate strong JWT_SECRET:**
  ```bash
  # Use a random generator
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```

- [ ] **Verify Gmail App Password is working**

- [ ] **Test email delivery in production environment**

### 2. Database Preparation

- [ ] **Run migration for existing users:**
  ```bash
  node scripts/migrate-security-features.js
  ```

- [ ] **Verify Super Admin exists:**
  ```bash
  node scripts/create-super-admin.js
  ```

- [ ] **Backup database before deployment**

- [ ] **Create indexes (if not auto-created):**
  ```javascript
  // In MongoDB
  db.users.createIndex({ email: 1 }, { unique: true })
  ```

### 3. Security Hardening

- [ ] **Update all default passwords**
- [ ] **Change Super Admin password after first login**
- [ ] **Enable HTTPS/SSL for production**
- [ ] **Configure CORS properly:**
  ```javascript
  // In server.js
  cors({
    origin: process.env.FRONTEND_URL || 'https://yourdomain.com',
    credentials: true
  })
  ```

- [ ] **Rate limiting configured**
- [ ] **Input validation active**
- [ ] **SQL injection protection (using Mongoose)**

### 4. Email Configuration

- [ ] **Gmail App Password generated and tested**
- [ ] **Email templates reviewed**
- [ ] **Test emails in production:**
  - Registration OTP
  - Password reset OTP
  - Admin approval notifications
  - Welcome emails

- [ ] **Update email branding if needed**
- [ ] **Verify spam/deliverability**

### 5. Frontend Deployment

- [ ] **Update API URLs in frontend:**
  ```javascript
  const API_URL = 'https://your-api-domain.com/api';
  ```

- [ ] **Test all pages:**
  - [ ] `index.html`
  - [ ] `login.html`
  - [ ] `register.html`
  - [ ] `verify-email.html`
  - [ ] `forgot-password.html`
  - [ ] `admin-dashboard.html`

- [ ] **Build/minify assets if using build tools**
- [ ] **Configure CDN if applicable**

### 6. Backend Deployment

- [ ] **Install dependencies:**
  ```bash
  npm install --production
  ```

- [ ] **Set NODE_ENV=production**

- [ ] **Configure process manager (PM2):**
  ```bash
  npm install -g pm2
  pm2 start server.js --name lifelink-backend
  pm2 startup
  pm2 save
  ```

- [ ] **Setup logging:**
  ```bash
  pm2 install pm2-logrotate
  ```

- [ ] **Configure reverse proxy (nginx/Apache)**

- [ ] **Setup SSL certificate (Let's Encrypt)**

### 7. Testing in Production

- [ ] **Test Super Admin login**
- [ ] **Test new user registration + OTP**
- [ ] **Test forgot password flow**
- [ ] **Test admin registration + approval**
- [ ] **Test existing user login (backward compatibility)**
- [ ] **Verify email delivery**
- [ ] **Check all API endpoints**
- [ ] **Load testing**

### 8. Monitoring & Logging

- [ ] **Setup error logging:**
  ```javascript
  // Use winston or similar
  const winston = require('winston');
  ```

- [ ] **Monitor email delivery:**
  - Log successful sends
  - Log failures
  - Track OTP generation

- [ ] **Setup alerts for:**
  - Server crashes
  - Email failures
  - High error rates
  - Database connection issues

- [ ] **Application performance monitoring (APM)**

- [ ] **Database monitoring**

### 9. Backup & Recovery

- [ ] **Automated database backups configured**
- [ ] **Backup schedule set (daily recommended)**
- [ ] **Test restore procedure**
- [ ] **Document recovery process**
- [ ] **Store backups in secure location**

### 10. Documentation

- [ ] **Update README with production URLs**
- [ ] **Document deployment process**
- [ ] **Create runbook for common issues**
- [ ] **Document API endpoints**
- [ ] **Update admin guide**

---

## 🚀 Deployment Steps

### Option 1: Platform as a Service (Heroku, Railway, Render)

#### Heroku

```bash
# Install Heroku CLI
# Login
heroku login

# Create app
heroku create lifelink-backend

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-secret
heroku config:set EMAIL_USER=akhilkrishnakondri@gmail.com
heroku config:set EMAIL_PASSWORD=your-app-password
heroku config:set FRONTEND_URL=https://your-frontend.com

# Deploy
git push heroku main

# Scale
heroku ps:scale web=1

# Check logs
heroku logs --tail
```

#### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize
railway init

# Link to project
railway link

# Deploy
railway up

# Set environment variables in dashboard
# or via CLI:
railway variables set NODE_ENV=production
```

#### Render

1. Connect GitHub repository
2. Create new Web Service
3. Set environment variables in dashboard
4. Auto-deploy on push

### Option 2: VPS/Cloud (DigitalOcean, AWS, Azure)

```bash
# 1. SSH into server
ssh user@your-server-ip

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install MongoDB
# Follow official MongoDB installation guide

# 4. Clone repository
git clone https://github.com/your-repo/lifelink.git
cd lifelink/backend

# 5. Install dependencies
npm install --production

# 6. Create .env file
nano .env
# Paste production environment variables

# 7. Install PM2
sudo npm install -g pm2

# 8. Start application
pm2 start server.js --name lifelink-backend
pm2 startup
pm2 save

# 9. Configure nginx
sudo nano /etc/nginx/sites-available/lifelink

# Nginx config:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/lifelink /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 10. Setup SSL
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Option 3: Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
      - EMAIL_USER=${EMAIL_USER}
      - EMAIL_PASSWORD=${EMAIL_PASSWORD}
      - FRONTEND_URL=${FRONTEND_URL}
    restart: unless-stopped

  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

volumes:
  mongodb_data:
```

```bash
# Build and run
docker-compose up -d

# Check logs
docker-compose logs -f backend
```

---

## 🔍 Post-Deployment Verification

### 1. Health Check

```bash
# Backend health
curl https://your-api-domain.com

# API test
curl -X POST https://your-api-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

### 2. Feature Testing

- [ ] Register new user → Email OTP received
- [ ] Verify OTP → Account activated
- [ ] Login → Success
- [ ] Forgot password → OTP received
- [ ] Reset password → Success
- [ ] Admin registration → Pending approval
- [ ] Super Admin approval → Email sent
- [ ] Approved admin login → Success

### 3. Performance Testing

```bash
# Use Apache Bench
ab -n 1000 -c 100 https://your-api-domain.com/

# Or Artillery
npm install -g artillery
artillery quick --count 100 --num 10 https://your-api-domain.com/api/auth/login
```

### 4. Security Scan

```bash
# Use nmap
nmap -sV your-server-ip

# Check SSL
ssllabs.com/ssltest/

# OWASP ZAP scan
```

---

## 📊 Monitoring Dashboard

### Recommended Tools

1. **Application Monitoring:**
   - New Relic
   - Datadog
   - PM2 Plus

2. **Error Tracking:**
   - Sentry
   - Rollbar
   - LogRocket

3. **Uptime Monitoring:**
   - UptimeRobot
   - Pingdom
   - StatusCake

4. **Log Management:**
   - Loggly
   - Papertrail
   - ELK Stack

---

## 🆘 Rollback Plan

```bash
# PM2
pm2 list
pm2 stop lifelink-backend
pm2 delete lifelink-backend
git checkout previous-version
npm install
pm2 start server.js --name lifelink-backend

# Docker
docker-compose down
git checkout previous-version
docker-compose up -d

# Heroku
heroku releases
heroku rollback v123
```

---

## 📞 Support Contacts

- **Email:** akhilkrishnakondri@gmail.com
- **Emergency:** [Your emergency contact]
- **Documentation:** `/docs` folder

---

## ✅ Final Checklist

Before going live:

- [ ] All tests passing
- [ ] Environment variables set
- [ ] Database backed up
- [ ] Super Admin account ready
- [ ] Email delivery tested
- [ ] SSL configured
- [ ] Monitoring active
- [ ] Logs configured
- [ ] Rollback plan ready
- [ ] Team trained
- [ ] Documentation complete

---

**🎉 Ready for Production Deployment!**

**Deployment Date:** _________________
**Deployed By:** _________________
**Version:** 2.0.0 - Security Enhanced
