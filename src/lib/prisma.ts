import { PrismaClient } from "@prisma/client";

// Standard Next.js dev-mode singleton pattern: avoids exhausting the SQLite
// connection pool when Turbopack/webpack hot-reloads modules in development.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
