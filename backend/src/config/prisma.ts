import { PrismaClient } from "@prisma/client";
import { isProduction } from "./env";

// Reuse a single PrismaClient across hot reloads in dev; avoids exhausting
// MySQL connections when tsx watch restarts the process repeatedly.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: isProduction ? ["error", "warn"] : ["error", "warn", "query"],
  });

if (!isProduction) {
  global.__prisma = prisma;
}
