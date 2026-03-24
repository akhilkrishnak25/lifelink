/**
 * LifeLink - Blockchain Security Layer (adapter-based)
 *
 * Production note:
 * - This service is designed with a pluggable adapter.
 * - Default adapter is a "mock" that produces deterministic hashes.
 * - Switch to a real on-chain adapter (Infura/Alchemy + contract) later.
 */

const crypto = require('crypto');
const BlockchainRecord = require('../../models/BlockchainRecord');
const DonationHistory = require('../../models/DonationHistory');
const BloodRequest = require('../../models/BloodRequest');

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

class MockBlockchainAdapter {
  constructor() {
    this.chain = process.env.BLOCKCHAIN_NETWORK || 'polygon';
  }

  async writeRecord({ payloadHash }) {
    // Deterministic tx hash for local/dev usage
    const transactionHash = sha256Hex(`tx:${this.chain}:${payloadHash}:${Date.now()}`);
    return {
      transactionHash,
      chain: this.chain,
      status: 'confirmed'
    };
  }

  async verifyRecord({ transactionHash }) {
    // In mock mode, any hex-like hash is treated as verifiable
    const ok = typeof transactionHash === 'string' && transactionHash.length >= 32;
    return { verified: ok };
  }
}

class BlockchainService {
  constructor(adapter = null) {
    this.adapter = adapter || new MockBlockchainAdapter();
  }

  /**
   * Create tamper-proof donation record (stores hash + optional IPFS ref)
   */
  async createDonationRecord({ userId, donationId, ipfsHash, payload }) {
    const payloadString = JSON.stringify(payload || {});
    const payloadHash = sha256Hex(payloadString);

    const chainResult = await this.adapter.writeRecord({ payloadHash });

    const record = await BlockchainRecord.create({
      transactionHash: chainResult.transactionHash,
      chain: chainResult.chain,
      userId,
      donationId,
      action: 'donation_record',
      ipfsHash: ipfsHash || undefined,
      payloadHash,
      status: chainResult.status || 'pending',
      timestamp: new Date()
    });

    return {
      recordId: record._id,
      transactionHash: record.transactionHash,
      chain: record.chain,
      status: record.status,
      payloadHash: record.payloadHash,
      ipfsHash: record.ipfsHash
    };
  }

  /**
   * Verify a blood request record (creates a hash + on-chain write)
   */
  async verifyRequest({ userId, requestId, ipfsHash, payload }) {
    const payloadString = JSON.stringify(payload || {});
    const payloadHash = sha256Hex(payloadString);

    const chainResult = await this.adapter.writeRecord({ payloadHash });

    const record = await BlockchainRecord.create({
      transactionHash: chainResult.transactionHash,
      chain: chainResult.chain,
      userId,
      requestId,
      action: 'request_verification',
      ipfsHash: ipfsHash || undefined,
      payloadHash,
      status: chainResult.status || 'pending',
      timestamp: new Date()
    });

    return {
      recordId: record._id,
      transactionHash: record.transactionHash,
      chain: record.chain,
      status: record.status,
      payloadHash: record.payloadHash,
      ipfsHash: record.ipfsHash
    };
  }

  /**
   * Verify an on-chain transaction hash (adapter-based)
   */
  async verifyTransaction(transactionHash) {
    return await this.adapter.verifyRecord({ transactionHash });
  }

  /**
   * Compute a simple trust score based on confirmed records (placeholder)
   *
   * Production recommendation:
   * - Combine donation success, ratings, response time, and fraud signals.
   */
  async getDonorTrustScore(userId) {
    const confirmed = await BlockchainRecord.countDocuments({
      userId,
      status: 'confirmed',
      action: 'donation_record'
    });

    // Mildly saturating score: 0..100
    const score = Math.min(100, Math.round((1 - Math.exp(-confirmed / 10)) * 100));

    return {
      userId,
      score,
      confirmedDonationRecords: confirmed
    };
  }

  /**
   * List blockchain/audit records for a user (admin/user)
   */
  async listRecords({ userId, limit = 50 }) {
    const query = {};
    if (userId) {
      query.userId = userId;
    }

    const records = await BlockchainRecord.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200));

    return records;
  }

  /**
   * Backfill missing blockchain donation records from historical donation history.
   * Creates records only for donations that do not already have a donation_record entry.
   */
  async backfillDonationRecords({ limit = 100 } = {}) {
    const cappedLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);

    const donationHistories = await DonationHistory.find({ status: 'completed' })
      .populate('donorId', 'userId')
      .sort({ createdAt: -1 })
      .limit(cappedLimit)
      .lean();

    if (!donationHistories.length) {
      return { scanned: 0, created: 0, skipped: 0 };
    }

    const donationIds = donationHistories.map(d => d._id);

    const existingRecords = await BlockchainRecord.find({
      action: 'donation_record',
      donationId: { $in: donationIds }
    })
      .select('donationId')
      .lean();

    const existingDonationIdSet = new Set(existingRecords.map(r => String(r.donationId)));

    let created = 0;
    let skipped = 0;

    for (const donation of donationHistories) {
      const donationId = String(donation._id);
      if (existingDonationIdSet.has(donationId)) {
        skipped += 1;
        continue;
      }

      const donorUserId = donation?.donorId?.userId;
      if (!donorUserId) {
        skipped += 1;
        continue;
      }

      await this.createDonationRecord({
        userId: donorUserId,
        donationId: donation._id,
        payload: {
          donationId,
          requestId: donation.requestId?.toString(),
          donorId: donation.donorId?._id?.toString?.() || donation.donorId?.toString?.(),
          bloodGroup: donation.bloodGroup,
          unitsGiven: donation.unitsGiven,
          hospitalName: donation.hospitalName,
          donationDate: (donation.donationDate || donation.createdAt || new Date()).toISOString()
        }
      });

      created += 1;
    }

    const donationBackfill = {
      scanned: donationHistories.length,
      created,
      skipped
    };

    const completedRequests = await BloodRequest.find({ status: 'completed' })
      .sort({ completedAt: -1, updatedAt: -1, createdAt: -1 })
      .limit(cappedLimit)
      .lean();

    const requestIds = completedRequests.map(r => r._id);
    const existingRequestRecords = await BlockchainRecord.find({
      action: 'request_verification',
      requestId: { $in: requestIds }
    })
      .select('requestId')
      .lean();

    const existingRequestIdSet = new Set(existingRequestRecords.map(r => String(r.requestId)));

    let requestCreated = 0;
    let requestSkipped = 0;

    for (const request of completedRequests) {
      const requestId = String(request._id);
      if (existingRequestIdSet.has(requestId)) {
        requestSkipped += 1;
        continue;
      }

      if (!request.receiverId) {
        requestSkipped += 1;
        continue;
      }

      await this.verifyRequest({
        userId: request.receiverId,
        requestId: request._id,
        payload: {
          requestId,
          receiverId: request.receiverId?.toString?.(),
          bloodGroup: request.bloodGroup,
          urgency: request.urgency,
          status: request.status,
          unitsRequired: request.unitsRequired,
          hospitalName: request.hospitalName,
          city: request.city,
          completedAt: (request.completedAt || request.updatedAt || request.createdAt || new Date()).toISOString()
        }
      });

      requestCreated += 1;
    }

    return {
      scanned: donationBackfill.scanned + completedRequests.length,
      created: donationBackfill.created + requestCreated,
      skipped: donationBackfill.skipped + requestSkipped,
      donationBackfill,
      requestBackfill: {
        scanned: completedRequests.length,
        created: requestCreated,
        skipped: requestSkipped
      }
    };
  }
}

module.exports = {
  BlockchainService,
  blockchainService: new BlockchainService(),
  sha256Hex
};
