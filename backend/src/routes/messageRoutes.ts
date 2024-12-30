import { Router } from 'express';
import { MessageModel } from '../models';
import { requireApiKey } from '../middleware/authMiddleware';

const router = Router();

router.get('/recent', requireApiKey, async (req, res) => {
  try {
    const messages = await MessageModel
      .find({})
      .sort({ timestamp: -1 })
      .limit(50)
      .then(messages => messages.reverse());

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;