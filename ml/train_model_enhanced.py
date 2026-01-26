"""
Enhanced ML Model with IP tracking and time pattern analysis
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
import os
from datetime import datetime

def generate_enhanced_training_data():
    """
    Generate enhanced synthetic training data with additional features
    
    Enhanced Features:
    1. requests_per_day: Number of requests in last 24 hours (0-10)
    2. account_age_days: Days since account creation (0-365)
    3. time_gap_hours: Hours since last request (0-8760)
    4. location_changes: Number of location changes (0-10)
    5. unusual_hour_requests: Requests made between 2-5 AM (0-5)
    6. device_changes: Number of different devices used (0-5)
    7. ip_changes: Number of different IP addresses (0-10)
    8. weekend_requests: Percentage of weekend requests (0-100)
    """
    
    print("📊 Generating enhanced synthetic training data...")
    
    # Generate GENUINE request patterns (80% of data)
    genuine_samples = 1000
    genuine_data = {
        'requests_per_day': np.random.choice([0, 1], size=genuine_samples, p=[0.8, 0.2]),
        'account_age_days': np.random.randint(30, 365, size=genuine_samples),
        'time_gap_hours': np.random.randint(168, 8760, size=genuine_samples),  # At least 7 days gap
        'location_changes': np.random.choice([0, 1], size=genuine_samples, p=[0.8, 0.2]),
        'unusual_hour_requests': np.random.choice([0, 1], size=genuine_samples, p=[0.9, 0.1]),
        'device_changes': np.random.choice([0, 1], size=genuine_samples, p=[0.85, 0.15]),
        'ip_changes': np.random.choice([0, 1, 2], size=genuine_samples, p=[0.7, 0.2, 0.1]),
        'weekend_requests': np.random.randint(20, 60, size=genuine_samples)
    }
    
    # Generate FAKE request patterns (20% of data)
    fake_samples = 250
    fake_data = {
        'requests_per_day': np.random.randint(3, 10, size=fake_samples),
        'account_age_days': np.random.randint(0, 15, size=fake_samples),
        'time_gap_hours': np.random.randint(1, 48, size=fake_samples),
        'location_changes': np.random.randint(3, 10, size=fake_samples),
        'unusual_hour_requests': np.random.randint(2, 5, size=fake_samples),
        'device_changes': np.random.randint(2, 5, size=fake_samples),
        'ip_changes': np.random.randint(3, 10, size=fake_samples),
        'weekend_requests': np.random.randint(0, 30, size=fake_samples)
    }
    
    # Combine data
    genuine_df = pd.DataFrame(genuine_data)
    genuine_df['label'] = 1  # 1 = genuine
    
    fake_df = pd.DataFrame(fake_data)
    fake_df['label'] = -1  # -1 = fake
    
    df = pd.concat([genuine_df, fake_df], ignore_index=True)
    df = df.sample(frac=1).reset_index(drop=True)  # Shuffle
    
    print(f"✅ Generated {len(df)} samples ({genuine_samples} genuine, {fake_samples} fake)")
    return df

def train_enhanced_model():
    """Train enhanced Isolation Forest model"""
    print("\n🤖 Training Enhanced Isolation Forest model...")
    
    # Generate training data
    df = generate_enhanced_training_data()
    
    # Prepare features
    feature_columns = [
        'requests_per_day', 'account_age_days', 'time_gap_hours', 
        'location_changes', 'unusual_hour_requests', 'device_changes',
        'ip_changes', 'weekend_requests'
    ]
    X = df[feature_columns].values
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train Isolation Forest
    # contamination = expected proportion of outliers (fake requests)
    model = IsolationForest(
        contamination=0.2,  # 20% expected fake requests
        random_state=42,
        n_estimators=200,  # More trees for better accuracy
        max_samples=256,
        n_jobs=-1
    )
    
    model.fit(X_scaled)
    
    # Evaluate on training data
    predictions = model.predict(X_scaled)
    scores = model.decision_function(X_scaled)
    
    # Calculate accuracy
    accuracy = np.mean(predictions == df['label']) * 100
    print(f"✅ Training accuracy: {accuracy:.2f}%")
    
    # Save model and scaler
    os.makedirs('models', exist_ok=True)
    joblib.dump(model, 'models/fake_detector_enhanced.pkl')
    joblib.dump(scaler, 'models/scaler_enhanced.pkl')
    
    print("✅ Enhanced model saved to models/fake_detector_enhanced.pkl")
    print("✅ Enhanced scaler saved to models/scaler_enhanced.pkl")
    
    return model, scaler

def test_enhanced_model():
    """Test the enhanced model with sample data"""
    print("\n🧪 Testing enhanced model...")
    
    # Load model
    model = joblib.load('models/fake_detector_enhanced.pkl')
    scaler = joblib.load('models/scaler_enhanced.pkl')
    
    # Test cases
    test_cases = [
        {
            'name': 'Genuine Request - Emergency',
            'features': [1, 180, 720, 0, 0, 0, 0, 35],  # One request, old account, long gap
            'expected': 'genuine'
        },
        {
            'name': 'Fake Request - Spam Pattern',
            'features': [5, 3, 6, 5, 3, 3, 6, 10],  # Multiple requests, new account, frequent
            'expected': 'fake'
        },
        {
            'name': 'Genuine Request - Regular User',
            'features': [1, 120, 2160, 1, 0, 1, 1, 45],
            'expected': 'genuine'
        },
        {
            'name': 'Suspicious Request - Many IP Changes',
            'features': [2, 7, 12, 3, 2, 2, 8, 15],
            'expected': 'fake'
        }
    ]
    
    print("\nTest Results:")
    print("-" * 80)
    
    for test in test_cases:
        X = np.array([test['features']])
        X_scaled = scaler.transform(X)
        
        prediction = model.predict(X_scaled)[0]
        score = model.decision_function(X_scaled)[0]
        confidence = abs(score) * 100
        
        result = 'fake' if prediction == -1 else 'genuine'
        status = '✅' if result == test['expected'] else '❌'
        
        print(f"\n{status} {test['name']}")
        print(f"   Features: {test['features']}")
        print(f"   Prediction: {result} (expected: {test['expected']})")
        print(f"   Score: {score:.4f}")
        print(f"   Confidence: {min(confidence, 100):.2f}%")

if __name__ == '__main__':
    print("=" * 80)
    print("  LifeLink - Enhanced Fake Blood Request Detection Model Training")
    print("=" * 80)
    
    # Train model
    model, scaler = train_enhanced_model()
    
    # Test model
    test_enhanced_model()
    
    print("\n" + "=" * 80)
    print("✅ Enhanced model training and testing completed!")
    print("=" * 80)
