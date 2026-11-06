import { buildApp } from './app.js';
import { env } from './config/env.js';
import { disconnectPrisma } from './database/prisma.js';

async function bootstrap(): Promise<void> {
  const app = await buildApp();

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'Graceful shutdown initiated');
    try {
      await app.close();
      await disconnectPrisma();
      app.log.info('Graceful shutdown completed');
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason, promise) => {
    app.log.error({ reason, promise }, 'Unhandled Rejection detected');
  });

  process.on('uncaughtException', error => {
    app.log.fatal({ error }, 'Uncaught Exception detected');
    process.exit(1);
  });

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(
      `CrewFlow Backend listening on http://${env.HOST}:${env.PORT} in ${env.NODE_ENV} mode`,
    );
    app.log.info(`API Documentation available at http://${env.HOST}:${env.PORT}/docs`);
  } catch (err) {
    app.log.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

void bootstrap();

