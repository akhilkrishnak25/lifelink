"""
LifeLink - ML Inference API using Flask
Provides /predict endpoint for fake blood request detection
Extended with Agentic AI donor scoring and strategy recommendation
"""

from flask import Flask, request, jsonify
import joblib
import numpy as np
import os
from agent_scorer import AgentScorer

app = Flask(__name__)

# Load model and scaler
MODEL_PATH = 'models/fake_detector.pkl'
SCALER_PATH = 'models/scaler.pkl'

model = None
scaler = None
agent_scorer = AgentScorer()  # Initialize agentic AI scorer

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
            '/info': 'API information (GET)',
            '/score-donors': 'Agentic AI donor scoring (POST)',
            '/recommend-strategy': 'Get matching strategy recommendation (POST)',
            '/update-learning': 'Update learning data from feedback (POST)'
        }
    }), 200

@app.route('/score-donors', methods=['POST'])
def score_donors():
    """
    Agentic AI endpoint - Score and rank donors
    
    Expected JSON body:
    {
        "donors": [
            {
                "donor_id": "123",
                "blood_group": "A+",
                "distance": 5.2,
                "reliability_score": 85,
                "can_donate": true,
                "days_since_last_donation": 100,
                "is_available": true,
                "last_active_hours": 2
            }
        ],
        "request_context": {
            "blood_group": "A+",
            "urgency": "critical",
            "location": {"lat": 12.34, "lng": 56.78},
            "units_required": 2
        }
    }
    
    Returns: Scored and ranked donors with predictions
    """
    
    try:
        data = request.get_json()
        
        if not data or 'donors' not in data or 'request_context' not in data:
            return jsonify({
                'error': 'Invalid request',
                'message': 'Please provide donors array and request_context object'
            }), 400
        
        donors_data = data['donors']
        request_context = data['request_context']
        
        # Score donors using agentic AI
        scored_donors = agent_scorer.score_donors(donors_data, request_context)
        
        print(f"🤖 Scored {len(scored_donors)} donors for {request_context.get('urgency', 'normal')} request")
        
        return jsonify({
            'success': True,
            'scored_donors': scored_donors,
            'total_donors': len(scored_donors),
            'top_score': scored_donors[0]['total_score'] if scored_donors else 0
        }), 200
        
    except Exception as e:
        print(f"❌ Scoring error: {e}")
        return jsonify({
            'error': 'Scoring failed',
            'message': str(e)
        }), 500

@app.route('/recommend-strategy', methods=['POST'])
def recommend_strategy():
    """
    Agentic AI endpoint - Recommend matching strategy
    
    Expected JSON body:
    {
        "scored_donors": [...],  # From /score-donors response
        "request_context": {
            "urgency": "critical",
            "blood_group": "A+",
            "units_required": 2
        }
    }
    
    Returns: Recommended strategy (targeted, broadcast, escalation, hybrid)
    """
    
    try:
        data = request.get_json()
        
        if not data or 'scored_donors' not in data or 'request_context' not in data:
            return jsonify({
                'error': 'Invalid request',
                'message': 'Please provide scored_donors and request_context'
            }), 400
        
        scored_donors = data['scored_donors']
        request_context = data['request_context']
        
        # Get strategy recommendation
        strategy = agent_scorer.recommend_strategy(scored_donors, request_context)
        
        print(f"🎯 Strategy recommended: {strategy['type']} - {strategy['reasoning']}")
        
        return jsonify({
            'success': True,
            'strategy': strategy
        }), 200
        
    except Exception as e:
        print(f"❌ Strategy recommendation error: {e}")
        return jsonify({
            'error': 'Strategy recommendation failed',
            'message': str(e)
        }), 500

@app.route('/update-learning', methods=['POST'])
def update_learning():
    """
    Update learning data from feedback
    
    Expected JSON body:
    {
        "donor_id": "123",
        "response_time_minutes": 15,
        "success": true
    }
    """
    
    try:
        data = request.get_json()
        
        if not data or 'donor_id' not in data:
            return jsonify({
                'error': 'Invalid request',
                'message': 'Please provide donor_id, response_time_minutes, and success'
            }), 400
        
        donor_id = data['donor_id']
        response_time = data.get('response_time_minutes', 0)
        success = data.get('success', False)
        
        # Update learning data
        agent_scorer.update_learning_data(donor_id, response_time, success)
        
        print(f"📚 Learning updated for donor {donor_id}: {response_time}min, success={success}")
        
        return jsonify({
            'success': True,
            'message': 'Learning data updated'
        }), 200
        
    except Exception as e:
        print(f"❌ Learning update error: {e}")
        return jsonify({
            'error': 'Learning update failed',
            'message': str(e)
        }), 500

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
        print("   - POST /predict (Fake detection)")
        print("   - POST /score-donors (Agentic AI)")
        print("   - POST /recommend-strategy (Agentic AI)")
        print("   - POST /update-learning (Agentic AI)")
        print("   - GET  /info")
        print("=" * 60)
        
        app.run(host='0.0.0.0', port=5001, debug=False)
    else:
        print("\n❌ Failed to start server. Please train the model first.")
        print("   Run: python train_model.py")
