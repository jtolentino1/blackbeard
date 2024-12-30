import { Router } from 'express';
import { ChallengeModel } from '../models';
import { requireApiKey } from '../middleware/authMiddleware';
import { validateChallenge } from '../validators/challengeValidator';

const router = Router();

// Create new challenge
router.post('/create', requireApiKey, validateChallenge, async (req, res) => {
  try {
    // If there's an active challenge with the same title, prevent creation
    const existingChallenge = await ChallengeModel.findOne({ 
      title: req.body.title,
      isActive: true 
    });

    if (existingChallenge) {
      return res.status(400).json({
        error: 'Challenge exists',
        message: 'An active challenge with this title already exists'
      });
    }

    const challenge = await ChallengeModel.create(req.body);
    res.status(201).json(challenge);
  } catch (error) {
    console.error('Error creating challenge:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create challenge'
    });
  }
});

// get challenge endDate (there is only one active challenge at a time)
router.get('/endDate', requireApiKey, async (req, res) => {
  try {
    // const challenge = await ChallengeModel.findOne({ isActive: true });
    const challenge = await ChallengeModel.findOne();
    res.json({ endDate: challenge?.endDate });
  } catch (error) {
    console.error('Error fetching active challenge:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch active challenge'
    });
  }
});

router.post('/extend', requireApiKey, async (req, res) => {
    try {
      const activeChallenge = await ChallengeModel.findOne({ isActive: true });
      if (!activeChallenge) {
        return res.status(404).json({ error: 'No active challenge found' });
      }
  
      // Increment the endDate by 1 hour (3600000 milliseconds)
      const newEndDate = new Date(activeChallenge.endDate.getTime() + 3600000);
  
      // Update the challenge with the new endDate
      const updatedChallenge = await ChallengeModel.findOneAndUpdate(
        { isActive: true },
        { endDate: newEndDate },
        { new: true }
      );
  
      res.json({ endDate: updatedChallenge?.endDate });
    } catch (error) {
      console.error('Error extending challenge:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to extend challenge',
      });
    }
});

router.get('/isActive', async (req, res) => {
  try {
    const challenge = await ChallengeModel.findOne();
    res.json({ isActive: challenge?.isActive });
  } catch (error) {
    console.error('Error fetching active challenge:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch active challenge'
    });
  }
});
  

export default router;