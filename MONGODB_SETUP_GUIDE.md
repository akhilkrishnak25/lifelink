# MongoDB Setup Guide for LifeLink

## Quick Install Options

### Option A: MongoDB Community Edition (Local)

1. **Download MongoDB Community Server:**
   - Visit: https://www.mongodb.com/try/download/community
   - Select: Windows, Latest Version
   - Download the MSI installer

2. **Install MongoDB:**
   - Run the MSI installer
   - Choose "Complete" installation
   - Select "Install MongoDB as a Service" (recommended)
   - Keep default service name: MongoDB
   - Install MongoDB Compass (optional GUI tool)

3. **Verify Installation:**
   ```powershell
   mongod --version
   ```

4. **Start MongoDB Service:**
   ```powershell
   net start MongoDB
   ```

### Option B: MongoDB Atlas (Cloud - Free Tier)

1. **Create Free Account:**
   - Visit: https://www.mongodb.com/cloud/atlas/register
   - Sign up for free account

2. **Create Free Cluster:**
   - Click "Build a Database"
   - Choose "FREE" tier (M0)
   - Select a cloud provider and region
   - Click "Create Cluster"

3. **Setup Database Access:**
   - Go to "Database Access"
   - Add new database user
   - Choose password authentication
   - Save username and password

4. **Setup Network Access:**
   - Go to "Network Access"
   - Add IP Address
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Confirm

5. **Get Connection String:**
   - Go to your cluster
   - Click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

6. **Update `.env` file:**
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lifelink?retryWrites=true&w=majority
   ```

## After MongoDB Setup

Once MongoDB is installed/configured, restart the backend:

```powershell
cd f:\blood\backend
node server.js
```

## Current Service Status

✅ **Frontend** - http://localhost:3000 (RUNNING)
❌ **Backend API** - http://localhost:5000 (Needs MongoDB)
❌ **ML Service** - http://localhost:5001 (Waiting to start)

## Quick Test Commands

After MongoDB is running:

```powershell
# Test MongoDB connection
mongosh --eval "db.version()"

# Start all services
# Terminal 1: Backend
cd f:\blood\backend
node server.js

# Terminal 2: ML Service
cd f:\blood\ml
python app.py

# Terminal 3: Frontend (already running)
# http://localhost:3000
```
