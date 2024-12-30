import { Request, Response, NextFunction } from 'express';

export function validateChallenge(req: Request, res: Response, next: NextFunction) {
  const { title, description, agent } = req.body;

  if (!title || !description || !agent) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Missing required fields'
    });
  }

  if (!agent.name || !agent.systemPrompt || !agent.model) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Missing required agent fields'
    });
  }

  if (agent.temperature && (agent.temperature < 0 || agent.temperature > 2)) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Temperature must be between 0 and 2'
    });
  }

  if (agent.maxTokens && (agent.maxTokens < 1 || agent.maxTokens > 4096)) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'maxTokens must be between 1 and 4096'
    });
  }

  next();
}