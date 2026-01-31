/**
 * LifeLink - Hospital & Blood Bank Integration Service
 * Handles hospital onboarding and secure stock sync via webhook.
 */

const crypto = require('crypto');
const Hospital = require('../../models/Hospital');

class HospitalService {
  /**
   * Create a hospital record (admin-only typically)
   */
  async createHospital(payload) {
    const {
      name,
      address,
      city,
      state,
      pincode,
      contactNumber,
      longitude,
      latitude,
      hasBloodBank = true,
      bloodStock = {}
    } = payload;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new Error('Invalid coordinates');
    }

    const webhookSecret = crypto.randomBytes(32).toString('hex');

    const hospital = await Hospital.create({
      name,
      address,
      city,
      state,
      pincode,
      contactNumber,
      hasBloodBank,
      bloodStock,
      location: { type: 'Point', coordinates: [longitude, latitude] },
      webhookSecret,
      syncStatus: 'active',
      isActive: true
    });

    // Return secret once (caller should store securely)
    return {
      hospital,
      webhookSecret
    };
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   */
  verifyWebhookSignature({ secret, rawBody, signature }) {
    if (!secret) return false;
    if (!signature) return false;

    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    // Support optional prefix like "sha256=..."
    const normalized = signature.startsWith('sha256=') ? signature.slice(7) : signature;

    // Timing-safe compare
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(normalized, 'hex')
      );
    } catch {
      return false;
    }
  }

  /**
   * Handle stock update webhook from hospital system
   */
  async handleStockUpdate({ hospitalId, bloodStock, rawBody, signature }) {
    const hospital = await Hospital.findById(hospitalId).select('+webhookSecret');
    if (!hospital || !hospital.isActive) {
      return { success: false, status: 404, message: 'Hospital not found' };
    }

    const ok = this.verifyWebhookSignature({
      secret: hospital.webhookSecret,
      rawBody,
      signature
    });

    if (!ok) {
      return { success: false, status: 401, message: 'Invalid webhook signature' };
    }

    // Only allow known keys
    const allowedGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const nextStock = {};
    for (const g of allowedGroups) {
      if (bloodStock && Object.prototype.hasOwnProperty.call(bloodStock, g)) {
        const v = Number(bloodStock[g]);
        nextStock[g] = Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
      }
    }

    hospital.bloodStock = {
      ...hospital.bloodStock,
      ...nextStock
    };
    hospital.lastSyncedAt = new Date();
    hospital.syncStatus = 'active';

    await hospital.save();

    return { success: true, status: 200, hospitalId: hospital._id, bloodStock: hospital.bloodStock };
  }

  /**
   * Get hospital dashboard snapshot
   */
  async getHospitalDashboard(hospitalId) {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital || !hospital.isActive) {
      return { success: false, status: 404, message: 'Hospital not found' };
    }

    return {
      success: true,
      status: 200,
      hospital: {
        id: hospital._id,
        name: hospital.name,
        address: hospital.address,
        city: hospital.city,
        state: hospital.state,
        contactNumber: hospital.contactNumber,
        hasBloodBank: hospital.hasBloodBank,
        bloodStock: hospital.bloodStock,
        syncStatus: hospital.syncStatus,
        lastSyncedAt: hospital.lastSyncedAt
      }
    };
  }

  /**
   * List hospitals near a point
   */
  async getNearbyHospitals(latitude, longitude, radiusKm = 25, limit = 20) {
    const query = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: Math.min(radiusKm, 100) * 1000
        }
      },
      isActive: true
    };

    const hospitals = await Hospital.find(query).limit(limit);
    return hospitals;
  }
}

module.exports = {
  HospitalService,
  hospitalService: new HospitalService()
};
