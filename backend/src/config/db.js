const { PrismaClient } = require('@prisma/client');
const env = require('./env');

let prisma;

try {
  prisma = new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });
} catch (error) {
  console.warn('⚠️ Prisma Client initialization warning:', error.message);
}

// Health check function for database connectivity
const checkDbConnection = async () => {
  try {
    if (!prisma) return false;
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    console.warn('⚠️ Database connection check failed:', err.message);
    return false;
  }
};

module.exports = {
  prisma,
  checkDbConnection,
};
