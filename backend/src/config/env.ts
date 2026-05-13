import dotenv from "dotenv"

dotenv.config()

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key]
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue
    throw new Error(`Missing required environment variable: ${key}`)
  }
  const parsed = Number(value)
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number`)
  }
  return parsed
}

export const env = {
  NODE_ENV: getEnv("NODE_ENV", "development"),
  PORT: getEnvNumber("PORT", 3001),
  FRONTEND_URL: getEnv("FRONTEND_URL", "http://localhost:3000"),

  DATABASE_URL: getEnv("DATABASE_URL"),
  REDIS_URL: getEnv("REDIS_URL", "redis://localhost:6379"),

  JWT_SECRET: getEnv("JWT_SECRET"),
  JWT_EXPIRES_IN: getEnv("JWT_EXPIRES_IN", "7d"),

  RAZORPAY_KEY_ID: getEnv("RAZORPAY_KEY_ID"),
  RAZORPAY_KEY_SECRET: getEnv("RAZORPAY_KEY_SECRET"),
  RAZORPAY_WEBHOOK_SECRET: getEnv("RAZORPAY_WEBHOOK_SECRET"),

  STRIPE_SECRET_KEY: getEnv("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: getEnv("STRIPE_WEBHOOK_SECRET"),

  OPENAI_API_KEY: getEnv("OPENAI_API_KEY"),
  OPENAI_MODEL: getEnv("OPENAI_MODEL", "gpt-4o-mini"),

  WHATSAPP_PHONE_NUMBER_ID: getEnv("WHATSAPP_PHONE_NUMBER_ID"),
  WHATSAPP_ACCESS_TOKEN: getEnv("WHATSAPP_ACCESS_TOKEN"),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: getEnv("WHATSAPP_WEBHOOK_VERIFY_TOKEN"),

  AWS_ACCESS_KEY_ID: getEnv("AWS_ACCESS_KEY_ID", ""),
  AWS_SECRET_ACCESS_KEY: getEnv("AWS_SECRET_ACCESS_KEY", ""),
  AWS_S3_BUCKET: getEnv("AWS_S3_BUCKET", "feld-stein-uploads"),
  AWS_REGION: getEnv("AWS_REGION", "ap-south-1"),

  GSTIN: getEnv("GSTIN", ""),
  IRP_API_URL: getEnv("IRP_API_URL", ""),
  IRP_CLIENT_ID: getEnv("IRP_CLIENT_ID", ""),
  IRP_CLIENT_SECRET: getEnv("IRP_CLIENT_SECRET", ""),
} as const

export type Env = typeof env
