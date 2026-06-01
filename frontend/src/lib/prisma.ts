import { PrismaNeon } from "@prisma/adapter-neon"
import { PrismaClient } from "@/generated/prisma"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set")
  const adapter = new PrismaNeon({ connectionString: url })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
