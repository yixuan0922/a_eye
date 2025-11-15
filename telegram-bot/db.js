// Import Prisma client from parent directory
const { PrismaClient } = require('../node_modules/@prisma/client');

const prisma = new PrismaClient();

module.exports = { prisma };
