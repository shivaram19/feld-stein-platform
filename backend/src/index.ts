import { createApp } from "./app"
import { env } from "./config/env"
import { prisma } from "./lib/prisma"

async function main() {
  const app = createApp()

  // Verify database connection on startup
  try {
    await prisma.$connect()
    console.log("✅ Database connected")
  } catch (error) {
    console.error("❌ Database connection failed:", error)
    process.exit(1)
  }

  app.listen(env.PORT, () => {
    console.log(`🚀 Feld & Stein API running on port ${env.PORT}`)
    console.log(`📊 Health: http://localhost:${env.PORT}/health`)
    console.log(`🌍 Environment: ${env.NODE_ENV}`)
  })
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
