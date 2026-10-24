const app = require('./app');
const env = require('./config/env');
const { prisma, checkDbConnection } = require('./config/db');

const server = app.listen(env.PORT, async () => {
  console.log(`\n==============================================`);
  console.log(`🛡️  Silent SOS Production Backend`);
  console.log(`🚀 Server listening on port ${env.PORT} (${env.NODE_ENV})`);
  console.log(`🌐 API Base URL: http://localhost:${env.PORT}/api`);
  console.log(`==============================================\n`);

  const isDbConnected = await checkDbConnection();
  if (isDbConnected) {
    console.log('✅ PostgreSQL Database connected successfully via Prisma');
  } else {
    console.log('ℹ️  PostgreSQL not detected on DATABASE_URL. Run `docker compose up -d` in backend/ to start PostgreSQL.');
  }
});

// Graceful shutdown
const handleShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    console.log('Process terminated cleanly.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = server;
