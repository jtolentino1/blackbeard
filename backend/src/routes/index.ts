import { Router } from 'express';
import messageRoutes from './messageRoutes';
import challengeRoutes from './challengeRoutes';

const router = Router();

router.use('/messages', messageRoutes);
router.use('/challenge', challengeRoutes);

export default router;
