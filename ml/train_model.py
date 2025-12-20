"""
LifeLink - Fake Blood Request Detection ML Model Training Script
Uses Isolation Forest algorithm for anomaly detection
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
import os

def generate_training_data():
    """
    Generate synthetic training data for fake request detection
    
    Features:
    1. requests_per_day: Number of requests in last 24 hours (0-10)
    2. account_age_days: Days since account creation (0-365)
    3. time_gap_hours: Hours since last request (0-8760)
    4. location_changes: Number of location changes (0-10)
    """
    
    print("📊 Generating synthetic training data...")
    
    # Generate GENUINE request patterns (80% of data)
    genuine_samples = 800
    genuine_data = {
        'requests_per_day': np.random.choice([0, 1], size=genuine_samples, p=[0.7, 0.3]),
        'account_age_days': np.random.randint(30, 365, size=genuine_samples),
        'time_gap_hours': np.random.randint(72, 8760, size=genuine_samples),  # At least 3 days gap
        'location_changes': np.random.choice([0, 1, 2], size=genuine_samples, p=[0.6, 0.3, 0.1])
    }
    
    # Generate FAKE request patterns (20% of data)
    fake_samples = 200
    fake_data = {
        'requests_per_day': np.random.randint(2, 10, size=fake_samples),  # Multiple requests per day
        'account_age_days': np.random.randint(0, 30, size=fake_samples),  # New accounts
        'time_gap_hours': np.random.randint(0, 24, size=fake_samples),  # Frequent requests
        'location_changes': np.random.randint(3, 10, size=fake_samples)  # Frequent location changes
    }
    
    # Combine data
    genuine_df = pd.DataFrame(genuine_data)
    genuine_df['label'] = 'genuine'
    
    fake_df = pd.DataFrame(fake_data)
    fake_df['label'] = 'fake'
    
    # Combine and shuffle
    df = pd.concat([genuine_df, fake_df], ignore_index=True)
    df = df.sample(frac=1).reset_index(drop=True)
    
    print(f"✅ Generated {len(df)} samples ({len(genuine_df)} genuine, {len(fake_df)} fake)")
    
    return df

def train_model(df):
    """
    Train Isolation Forest model
    """
    
    print("\n🤖 Training Isolation Forest model...")
    
    # Prepare features
    X = df[['requests_per_day', 'account_age_days', 'time_gap_hours', 'location_changes']].values
    
    # Normalize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train Isolation Forest
    # contamination = expected proportion of outliers (fake requests)
    model = IsolationForest(
        n_estimators=100,
        contamination=0.2,  # 20% fake requests
        random_state=42,
        max_samples='auto',
        bootstrap=False
    )
    
    model.fit(X_scaled)
    
    # Test predictions
    predictions = model.predict(X_scaled)
    scores = model.decision_function(X_scaled)
    
    # -1 for outliers (fake), 1 for inliers (genuine)
    predicted_fake = (predictions == -1).sum()
    predicted_genuine = (predictions == 1).sum()
    
    print(f"✅ Model trained successfully")
    print(f"   Predicted Fake: {predicted_fake}")
    print(f"   Predicted Genuine: {predicted_genuine}")
    
    return model, scaler

def save_model(model, scaler):
    """
    Save trained model and scaler
    """
    
    print("\n💾 Saving model and scaler...")
    
    # Create models directory
    os.makedirs('models', exist_ok=True)
    
    # Save model
    joblib.dump(model, 'models/fake_detector.pkl')
    joblib.dump(scaler, 'models/scaler.pkl')
    
    print("✅ Model saved to: models/fake_detector.pkl")
    print("✅ Scaler saved to: models/scaler.pkl")

def test_model(model, scaler):
    """
    Test model with sample data
    """
    
    print("\n🧪 Testing model with sample data...")
    
    # Test cases
    test_cases = [
        {
            'name': 'Normal genuine request',
            'features': [0, 180, 720, 0],  # 0 req/day, 6mo old, 30 days gap, 0 changes
            'expected': 'genuine'
        },
        {
            'name': 'Suspicious fake request',
            'features': [5, 7, 2, 5],  # 5 req/day, 1 week old, 2 hrs gap, 5 changes
            'expected': 'fake'
        },
        {
            'name': 'Borderline case',
            'features': [1, 45, 48, 1],  # 1 req/day, 1.5mo old, 2 days gap, 1 change
            'expected': 'genuine/borderline'
        }
    ]
    
    for test in test_cases:
        X_test = np.array([test['features']])
        X_test_scaled = scaler.transform(X_test)
        
        prediction = model.predict(X_test_scaled)[0]
        score = model.decision_function(X_test_scaled)[0]
        
        result = 'fake' if prediction == -1 else 'genuine'
        
        print(f"\n   Test: {test['name']}")
        print(f"   Features: {test['features']}")
        print(f"   Prediction: {result} (expected: {test['expected']})")
        print(f"   Score: {score:.4f} (negative = fake)")

def main():
    """
    Main training pipeline
    """
    
    print("=" * 60)
    print("🩸 LifeLink - Fake Request Detection ML Training")
    print("=" * 60)
    
    # Generate training data
    df = generate_training_data()
    
    # Train model
    model, scaler = train_model(df)
    
    # Save model
    save_model(model, scaler)
    
    # Test model
    test_model(model, scaler)
    
    print("\n" + "=" * 60)
    print("✅ Training complete! Model ready for use.")
    print("=" * 60)
    print("\n📝 Next steps:")
    print("   1. Start the Flask API: python app.py")
    print("   2. The model will be loaded automatically")
    print("   3. Send POST requests to /predict endpoint")

if __name__ == '__main__':
    main()
