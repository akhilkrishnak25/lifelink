# LifeLink - Mobile-First Blood Donor Finder Web Application

## 📋 Project Overview
LifeLink is a complete, mobile-first web application that helps users find nearby blood donors during emergencies. The system includes machine learning-based fake blood request detection and operates completely free with no paid APIs.

## 🚀 Features

### Donor Module
- Donor registration & login
- Store blood group, location, availability
- Toggle availability status
- View nearby blood requests
- Accept blood requests
- View donation history

### Receiver Module
- Receiver registration & login
- Create emergency blood request
- Provide blood group, hospital name, urgency, location
- Track request status (Pending/Approved/Rejected)
- View donor responses

### Admin Features
- Review flagged fake requests
- Approve/reject blood requests
- Monitor system activity

### ML-Powered Fake Detection
- Isolation Forest algorithm
- Detects spam/fake requests based on:
  - Number of requests per day
  - Account age
  - Time gap between requests
  - Location change frequency

## 🛠️ Tech Stack

### Frontend
- HTML5
- CSS3 (Mobile-first, Responsive)
- JavaScript (ES6)
- Bootstrap 5

### Backend
- Node.js
- Express.js
- REST APIs
- JWT Authentication

### Database
- MongoDB
- Mongoose ODM
- GeoJSON for location queries

### Machine Learning
- Python 3.x
- scikit-learn
- Flask API
- Isolation Forest algorithm

## 📁 Project Structure

```
LifeLink/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Donor.js
│   │   ├── BloodRequest.js
│   │   └── DonationHistory.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── donor.routes.js
│   │   ├── receiver.routes.js
│   │   └── admin.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── donor.controller.js
│   │   ├── receiver.controller.js
│   │   └── admin.controller.js
│   ├── services/
│   │   ├── ml.service.js
│   │   └── geo.service.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   └── validation.middleware.js
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── auth.js
│   │   ├── donor.js
│   │   ├── receiver.js
│   │   └── common.js
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── donor-dashboard.html
│   ├── receiver-dashboard.html
│   └── admin-dashboard.html
├── ml/
│   ├── train_model.py
│   ├── app.py
│   ├── requirements.txt
│   └── models/
│       └── fake_detector.pkl
├── sample-data/
│   └── dummy-data.json
└── .env.example
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Python 3.8+
- Git

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd LifeLink
```

### Step 2: Set Up Backend
```bash
cd backend
npm install
```

Create `.env` file in backend folder:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/lifelink
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
ML_API_URL=http://localhost:5001
```

### Step 3: Set Up MongoDB
```bash
# Start MongoDB service
# Windows:
net start MongoDB

# Linux/Mac:
sudo systemctl start mongod
```

### Step 4: Set Up ML Service
```bash
cd ml
pip install -r requirements.txt
python train_model.py
```

### Step 5: Start the Application

**Terminal 1 - Backend Server:**
```bash
cd backend
node server.js
```

**Terminal 2 - ML Service:**
```bash
cd ml
python app.py
```

**Terminal 3 - Frontend (Simple HTTP Server):**
```bash
cd frontend
# Python 3
python -m http.server 3000

# OR using Node.js
npx http-server -p 3000
```

### Step 6: Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- ML API: http://localhost:5001

## 📊 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String (hashed),
  phone: String,
  role: String (donor/receiver/admin),
  createdAt: Date
}
```

### Donors Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: Users),
  bloodGroup: String,
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  address: String,
  isAvailable: Boolean,
  lastDonationDate: Date
}
```

### Blood Requests Collection
```javascript
{
  _id: ObjectId,
  receiverId: ObjectId (ref: Users),
  bloodGroup: String,
  urgency: String (critical/urgent/normal),
  hospitalName: String,
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  status: String (pending/approved/completed/rejected),
  isFake: Boolean,
  mlScore: Number,
  createdAt: Date
}
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Donor
- `GET /api/donor/profile` - Get donor profile
- `PUT /api/donor/availability` - Toggle availability
- `GET /api/donor/nearby-requests` - Get nearby blood requests
- `POST /api/donor/accept-request/:id` - Accept a request
- `GET /api/donor/history` - Get donation history

### Receiver
- `POST /api/receiver/request` - Create blood request
- `GET /api/receiver/my-requests` - Get all requests
- `GET /api/receiver/request/:id` - Get request details

### Admin
- `GET /api/admin/flagged-requests` - Get flagged requests
- `PUT /api/admin/approve-request/:id` - Approve request
- `PUT /api/admin/reject-request/:id` - Reject request

## 🤖 ML Model Details

### Training Features
- `requests_per_day`: Number of requests in last 24 hours
- `account_age_days`: Days since account creation
- `time_gap_hours`: Hours since last request
- `location_changes`: Number of location changes

### Algorithm
- **Isolation Forest**: Anomaly detection algorithm
- **Threshold**: Requests with score < -0.5 flagged as suspicious

## 🔒 Security Features
- Password hashing using bcrypt
- JWT-based authentication
- Role-based access control
- Request rate limiting
- Input validation and sanitization
- CORS protection

## 📱 Mobile-First Design
- Responsive design for all screen sizes
- Touch-friendly UI elements
- Optimized for mobile networks
- Progressive enhancement

## 🧪 Testing

### Sample Credentials
```
Donor Account:
Email: donor@test.com
Password: donor123

Receiver Account:
Email: receiver@test.com
Password: receiver123

Admin Account:
Email: admin@test.com
Password: admin123
```

## 🤝 Contributing
This is an educational project. Feel free to fork and enhance!

## 📄 License
MIT License

## 👥 Support
For issues and questions, please create an issue in the repository.

## 🎯 Future Enhancements
- Real-time notifications using Socket.io
- SMS integration (when budget allows)
- Mobile app (React Native)
- Blood bank integration
- Advanced analytics dashboard
