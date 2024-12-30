// backend/src/routes/paymentRoutes.ts
import { Router } from 'express';
import { PaymentStats } from '../models/paymentStats';
import { requireApiKey } from '../middleware/authMiddleware';

const router = Router();

const DEFAULT_CONTRACT_ADDRESS = "So11111111111111111111111111111111111111112";

const createDefaultStats = () => ({
  totalAttempts: 0,
  costPerAttempt: 0,
  tokenCostPerAttempt: 0,
  contractAddress: DEFAULT_CONTRACT_ADDRESS
});

router.get('/attempts', async (req, res) => {
  try {
    let stats = await PaymentStats.findOne();
    if (!stats) {
      stats = await PaymentStats.create(createDefaultStats());
    }
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payment stats' });
  }
});

router.get('/cost', async (req, res) => {
  try {
    let stats = await PaymentStats.findOne();
    if (!stats) {
      stats = await PaymentStats.create(createDefaultStats());
    }
    res.json([stats.costPerAttempt, stats.tokenCostPerAttempt]); // Return both costs
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cost per attempt' });
  }
});

router.get('/contractAddress', async (req, res) => {
  try {
    let stats = await PaymentStats.findOne();
    if (!stats) {
      stats = await PaymentStats.create(createDefaultStats());
    }
    res.json(stats.contractAddress);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contract address' });
  }
});

router.post('/incrementAttempt', requireApiKey, async (req, res) => {
  try {
    let stats = await PaymentStats.findOne();
    if (!stats) {
      stats = await PaymentStats.create({
        ...createDefaultStats(),
        totalAttempts: 0,
        costPerAttempt: 0.05,
      });
    } else {
      stats.totalAttempts += 1;
      // fixed costs 
      // stats.costPerAttempt = Math.min(0.03 * Math.pow(1.0135, stats.totalAttempts), 1);
      await stats.save();
    }

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update attempts' });
  }
});

export default router;