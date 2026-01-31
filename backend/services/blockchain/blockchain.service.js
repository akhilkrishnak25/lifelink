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
    const records = await BlockchainRecord.find({ userId })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200));

    return records;
  }
}

module.exports = {
  BlockchainService,
  blockchainService: new BlockchainService(),
  sha256Hex
};
