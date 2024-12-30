import { createApp } from './app';
import { config } from './config/config';

async function startServer() {
  const server = await createApp();
  
  server.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

startServer().catch(console.error);