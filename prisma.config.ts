import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'

config()

export default defineConfig({
  datasource: {
    // Migrations use the direct connection (port 5432) — never the pooler
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
})
