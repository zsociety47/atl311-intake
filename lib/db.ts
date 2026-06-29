import { PrismaClient } from '@/app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as { db: PrismaClient | undefined }

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL
  console.log('DATABASE_URL prefix:', url?.substring(0, 50))
  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

export const db = globalForPrisma.db ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.db = db
