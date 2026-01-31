"""
LifeLink - Agentic AI Donor Scorer
Intelligent scoring system for donor-receiver matching
Part of the DECIDE layer in the agent loop
"""

import numpy as np
from datetime import datetime, timedelta
import math

class AgentScorer:
    """
    Intelligent donor scoring system that considers multiple factors
    and predicts donor behavior
    """
    
    def __init__(self):
        # Weights for different factors (tunable through learning)
        self.weights = {
            'distance': 0.25,
            'reliability': 0.20,
            'eligibility': 0.20,
            'response_history': 0.15,
            'blood_match': 0.10,
            'availability': 0.10
        }
        
        # Learned parameters (will be updated through feedback)
        self.avg_response_times = {}  # donor_id -> avg minutes
        self.success_rates = {}  # donor_id -> success percentage
    
    def score_donors(self, donors_data, request_context):
        """
        Score and rank donors based on request context
        
        Args:
            donors_data: List of donor objects with their attributes
            request_context: Dictionary with request details (urgency, location, etc.)
        
        Returns:
            List of scored donors with predictions
        """
        scored_donors = []
        
        for donor in donors_data:
            score_breakdown = self._calculate_score(donor, request_context)
            prediction = self._predict_donor_behavior(donor, request_context)
            
            scored_donor = {
                'donor_id': donor.get('donor_id'),
                'total_score': score_breakdown['total'],
                'confidence': score_breakdown['confidence'],
                'score_breakdown': score_breakdown,
                'predictions': prediction,
                'reason': self._generate_reason(score_breakdown, prediction)
            }
            
            scored_donors.append(scored_donor)
        
        # Sort by score (descending)
        scored_donors.sort(key=lambda x: x['total_score'], reverse=True)
        
        return scored_donors
    
    def _calculate_score(self, donor, request_context):
        """Calculate composite score with breakdown"""
        
        # 1. Distance Score (0-100)
        distance_km = donor.get('distance', 999)
        distance_score = max(0, 100 - (distance_km * 5))  # Penalize 5 points per km
        
        # 2. Reliability Score (0-100)
        reliability = donor.get('reliability_score', 50)
        reliability_score = reliability
        
        # 3. Eligibility Score (0-100)
        can_donate = donor.get('can_donate', False)
        days_since_donation = donor.get('days_since_last_donation', 999)
        
        if can_donate:
            eligibility_score = 100
        elif days_since_donation >= 60:  # Close to eligible
            eligibility_score = 50
        else:
            eligibility_score = 0
        
        # 4. Response History Score (0-100)
        donor_id = donor.get('donor_id')
        avg_response_time = self.avg_response_times.get(donor_id, 30)  # default 30 min
        # Faster responders get higher scores
        response_score = max(0, 100 - (avg_response_time * 2))
        
        # 5. Blood Match Score (0-100)
        exact_match = donor.get('blood_group') == request_context.get('blood_group')
        blood_match_score = 100 if exact_match else 70  # Compatible but not exact
        
        # 6. Availability Score (0-100)
        is_available = donor.get('is_available', False)
        last_active_hours = donor.get('last_active_hours', 24)
        
        if is_available and last_active_hours < 1:
            availability_score = 100
        elif is_available and last_active_hours < 6:
            availability_score = 80
        elif is_available:
            availability_score = 50
        else:
            availability_score = 20
        
        # Calculate weighted total
        total_score = (
            distance_score * self.weights['distance'] +
            reliability_score * self.weights['reliability'] +
            eligibility_score * self.weights['eligibility'] +
            response_score * self.weights['response_history'] +
            blood_match_score * self.weights['blood_match'] +
            availability_score * self.weights['availability']
        )
        
        # Urgency bonus
        urgency = request_context.get('urgency', 'normal')
        if urgency == 'critical' and distance_km < 5:
            total_score += 10  # Bonus for nearby donors in critical cases
        
        # Calculate confidence (0-1)
        # Higher confidence if we have historical data
        historical_data_points = 1 if donor_id in self.avg_response_times else 0
        confidence = min(0.9, 0.5 + (historical_data_points * 0.4))
        
        return {
            'total': round(total_score, 2),
            'confidence': round(confidence, 2),
            'distance': round(distance_score, 2),
            'reliability': round(reliability_score, 2),
            'eligibility': round(eligibility_score, 2),
            'response_history': round(response_score, 2),
            'blood_match': round(blood_match_score, 2),
            'availability': round(availability_score, 2)
        }
    
    def _predict_donor_behavior(self, donor, request_context):
        """Predict donor response time and success probability"""
        
        donor_id = donor.get('donor_id')
        urgency = request_context.get('urgency', 'normal')
        
        # Predict response time
        base_response_time = self.avg_response_times.get(donor_id, 25)  # minutes
        
        # Adjust based on time of day
        hour = datetime.now().hour
        if 22 <= hour or hour <= 6:  # Night time
            response_time = base_response_time * 2
        elif 9 <= hour <= 17:  # Business hours
            response_time = base_response_time * 0.8
        else:
            response_time = base_response_time
        
        # Critical requests get faster responses (urgency effect)
        if urgency == 'critical':
            response_time *= 0.7
        
        # Predict success probability
        base_success_rate = self.success_rates.get(donor_id, 0.5)
        
        # Factors that increase success
        can_donate = donor.get('can_donate', False)
        distance = donor.get('distance', 999)
        is_available = donor.get('is_available', False)
        
        success_probability = base_success_rate
        
        if can_donate:
            success_probability += 0.2
        if distance < 5:
            success_probability += 0.15
        if is_available:
            success_probability += 0.1
        if urgency == 'critical':
            success_probability += 0.05  # People respond better to emergencies
        
        success_probability = min(0.95, max(0.05, success_probability))
        
        return {
            'response_time_minutes': round(response_time, 1),
            'success_probability': round(success_probability, 2)
        }
    
    def _generate_reason(self, score_breakdown, prediction):
        """Generate human-readable reason for donor selection"""
        
        reasons = []
        
        if score_breakdown['distance'] >= 80:
            reasons.append("very close proximity")
        elif score_breakdown['distance'] >= 60:
            reasons.append("nearby location")
        
        if score_breakdown['reliability'] >= 80:
            reasons.append("high reliability score")
        
        if score_breakdown['eligibility'] >= 90:
            reasons.append("eligible to donate")
        
        if score_breakdown['blood_match'] >= 90:
            reasons.append("exact blood match")
        
        if prediction['success_probability'] >= 0.7:
            reasons.append("high success probability")
        
        if not reasons:
            reasons.append("available and compatible")
        
        return ", ".join(reasons)
    
    def recommend_strategy(self, scored_donors, request_context):
        """
        Recommend matching strategy based on scored donors and context
        
        Returns: dict with strategy type and parameters
        """
        
        urgency = request_context.get('urgency', 'normal')
        top_donors_count = len([d for d in scored_donors if d['total_score'] >= 60])
        avg_success_prob = np.mean([d['predictions']['success_probability'] 
                                     for d in scored_donors[:10]]) if scored_donors else 0
        
        # Decision logic for strategy
        if urgency == 'critical':
            if top_donors_count >= 5:
                strategy = {
                    'type': 'hybrid',
                    'top_donor_count': 5,
                    'broadcast_after_minutes': 5,
                    'reasoning': 'Critical urgency: notify top 5 donors immediately, broadcast if no response in 5 minutes'
                }
            else:
                strategy = {
                    'type': 'broadcast',
                    'broadcast_radius_km': 20,
                    'reasoning': 'Critical urgency with few high-score donors: immediate broadcast to wider area'
                }
        
        elif urgency == 'urgent':
            if top_donors_count >= 3 and avg_success_prob >= 0.6:
                strategy = {
                    'type': 'targeted',
                    'top_donor_count': min(5, top_donors_count),
                    'escalate_after_minutes': 15,
                    'reasoning': 'Urgent request with good candidates: targeted approach with escalation plan'
                }
            else:
                strategy = {
                    'type': 'escalation',
                    'initial_donor_count': 3,
                    'add_donors_every_minutes': 10,
                    'max_donors': 10,
                    'reasoning': 'Urgent with moderate candidates: gradual escalation to avoid donor fatigue'
                }
        
        else:  # normal
            if top_donors_count >= 5:
                strategy = {
                    'type': 'targeted',
                    'top_donor_count': 3,
                    'escalate_after_minutes': 30,
                    'reasoning': 'Normal request with strong matches: conservative targeted approach'
                }
            else:
                strategy = {
                    'type': 'broadcast',
                    'broadcast_radius_km': 10,
                    'reasoning': 'Normal request: moderate broadcast to find suitable donors'
                }
        
        strategy['confidence'] = round(min(0.9, avg_success_prob + 0.2), 2)
        
        return strategy
    
    def update_learning_data(self, donor_id, response_time_minutes, success):
        """Update learned parameters from feedback"""
        
        # Update average response time (exponential moving average)
        if donor_id in self.avg_response_times:
            current_avg = self.avg_response_times[donor_id]
            self.avg_response_times[donor_id] = (current_avg * 0.7) + (response_time_minutes * 0.3)
        else:
            self.avg_response_times[donor_id] = response_time_minutes
        
        # Update success rate
        if donor_id in self.success_rates:
            current_rate = self.success_rates[donor_id]
            new_value = 1.0 if success else 0.0
            self.success_rates[donor_id] = (current_rate * 0.8) + (new_value * 0.2)
        else:
            self.success_rates[donor_id] = 1.0 if success else 0.5
