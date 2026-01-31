const { BlockchainService } = require('../services/blockchain/blockchain.service');

describe('BlockchainService (mock adapter)', () => {
  test('createDonationRecord returns tx hash', async () => {
    const service = new BlockchainService();

    // Monkeypatch DB create to avoid needing Mongo
    const BlockchainRecord = require('../models/BlockchainRecord');
    const originalCreate = BlockchainRecord.create;
    BlockchainRecord.create = async (doc) => ({ _id: 'mockid', ...doc });

    const result = await service.createDonationRecord({
      userId: '507f1f77bcf86cd799439011',
      donationId: '507f1f77bcf86cd799439012',
      payload: { hello: 'world' }
    });

    expect(result.transactionHash).toBeTruthy();
    expect(result.payloadHash).toMatch(/^[a-f0-9]{64}$/);

    BlockchainRecord.create = originalCreate;
  });

  test('getDonorTrustScore saturates to 100', async () => {
    const service = new BlockchainService();

    const BlockchainRecord = require('../models/BlockchainRecord');
    const originalCount = BlockchainRecord.countDocuments;
    BlockchainRecord.countDocuments = async () => 999;

    const score = await service.getDonorTrustScore('507f1f77bcf86cd799439011');
    expect(score.score).toBeLessThanOrEqual(100);
    expect(score.score).toBeGreaterThan(0);

    BlockchainRecord.countDocuments = originalCount;
  });
});
