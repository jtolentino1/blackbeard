import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import mongoose from 'mongoose';
import { config } from './config/config';
import { initializeSocketServer } from './services/socketService';
import paymentRoutes from './routes/paymentRoutes';
import challengeRoutes from './routes/challengeRoutes';
import messageRoutes from './routes/messageRoutes';

export async function createApp() {
  const app = express();
  const httpServer = createServer(app);

  console.log('Creating app with config:', {
    port: config.port,
    mongoUri: config.mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'), // Hide credentials
    frontendUrl: config.frontendUrl,
    nodeEnv: config.nodeEnv
  });

  // Middleware
  app.use(cors({
    origin: config.frontendUrl || ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  }));

  app.use(express.json());

  // Routes
  app.use('/api/challenge', challengeRoutes); 
  app.use('/api/messages', messageRoutes);
  app.use('/api/payment', paymentRoutes);

  // Initialize Socket.IO
  initializeSocketServer(httpServer);

  // Connect to MongoDB
  try {
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }

  // Health check endpoint a
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  return httpServer;
}