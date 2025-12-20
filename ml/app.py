"""
LifeLink - ML Inference API using Flask
Provides /predict endpoint for fake blood request detection
"""

from flask import Flask, request, jsonify
import joblib
import numpy as np
import os

app = Flask(__name__)

# Load model and scaler
MODEL_PATH = 'models/fake_detector.pkl'
SCALER_PATH = 'models/scaler.pkl'

model = None
scaler = None

def load_model():
    """Load the trained model and scaler"""
    global model, scaler
    
    try:
        if not os.path.exists(MODEL_PATH):
            print(f"❌ Model not found at {MODEL_PATH}")
            print("   Please run: python train_model.py")
            return False
        
        model = joblib.load(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        print("✅ Model and scaler loaded successfully")
        return True
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return False

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'message': 'LifeLink ML API is running',
        'model_loaded': model is not None
    }), 200

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict if a blood request is fake or genuine
    
    Expected JSON body:
    {
        "features": [requests_per_day, account_age_days, time_gap_hours, location_changes]
    }
    
    Returns:
    {
        "prediction": "fake" or "genuine",
        "score": float (negative = fake),
        "confidence": float (0-1)
    }
    """
    
    try:
        # Check if model is loaded
        if model is None or scaler is None:
            return jsonify({
                'error': 'Model not loaded. Please train the model first.',
                'message': 'Run: python train_model.py'
            }), 503
        
        # Get request data
        data = request.get_json()
        
        if not data or 'features' not in data:
            return jsonify({
                'error': 'Invalid request',
                'message': 'Please provide features array'
            }), 400
        
        features = data['features']
        
        # Validate features
        if not isinstance(features, list) or len(features) != 4:
            return jsonify({
                'error': 'Invalid features',
                'message': 'Features must be an array of 4 numbers: [requests_per_day, account_age_days, time_gap_hours, location_changes]'
            }), 400
        
        # Prepare features
        X = np.array([features])
        X_scaled = scaler.transform(X)
        
        # Make prediction
        prediction = model.predict(X_scaled)[0]
        score = model.decision_function(X_scaled)[0]
        
        # Convert to readable format
        result = 'fake' if prediction == -1 else 'genuine'
        
        # Calculate confidence (0-1 scale)
        # Score ranges roughly from -0.5 to 0.5
        # More negative = more likely fake
        # More positive = more likely genuine
        confidence = abs(score)
        confidence = min(confidence, 1.0)  # Cap at 1.0
        
        response = {
            'prediction': result,
            'score': float(score),
            'confidence': float(confidence),
            'features_received': features
        }
        
        print(f"📊 Prediction: {result} | Score: {score:.4f} | Features: {features}")
        
        return jsonify(response), 200
        
    except Exception as e:
        print(f"❌ Prediction error: {e}")
        return jsonify({
            'error': 'Prediction failed',
            'message': str(e)
        }), 500

@app.route('/info', methods=['GET'])
def info():
    """API information"""
    return jsonify({
        'name': 'LifeLink Fake Request Detection API',
        'version': '1.0.0',
        'algorithm': 'Isolation Forest',
        'features': [
            'requests_per_day (0-10)',
            'account_age_days (0-365)',
            'time_gap_hours (0-8760)',
            'location_changes (0-10)'
        ],
        'endpoints': {
            '/health': 'Health check',
            '/predict': 'Make prediction (POST)',
            '/info': 'API information (GET)'
        }
    }), 200

if __name__ == '__main__':
    print("=" * 60)
    print("🩸 LifeLink - ML Inference API")
    print("=" * 60)
    
    # Load model
    if load_model():
        print("\n🚀 Starting Flask server...")
        print("   URL: http://localhost:5001")
        print("   Endpoints:")
        print("   - GET  /health")
        print("   - POST /predict")
        print("   - GET  /info")
        print("=" * 60)
        
        app.run(host='0.0.0.0', port=5001, debug=False)
    else:
        print("\n❌ Failed to start server. Please train the model first.")
        print("   Run: python train_model.py")
