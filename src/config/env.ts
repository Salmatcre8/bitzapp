// config/env.ts
import * as dotenv from "dotenv";

dotenv.config();

interface EnvConfig {
  // Server
  PORT: number;
  NODE_ENV: "development" | "production" | "staging";
  
  // Mavapay
  MAVAPAY_BASE_URL: string;
  MAVAPAY_API_KEY: string;
  MAVAPAY_WEBHOOK_SECRET?: string;

  BITNOB_BASE_URL: string;
  BITNOB_API_KEY: string;
  BITNOB_WEBHOOK_SECRET?: string
  
  // Twilio
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_WHATSAPP_NUMBER?: string;
}

function validateEnv(): EnvConfig {
  const required = [
    "MAVAPAY_BASE_URL",
    "MAVAPAY_API_KEY"
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
      `Please create a .env file with these variables.`
    );
  }
  
  return {
    PORT: parseInt(process.env.PORT || "3000", 10),
    NODE_ENV: (process.env.NODE_ENV as any) || "development",
    
    MAVAPAY_BASE_URL: process.env.MAVAPAY_BASE_URL!,
    MAVAPAY_API_KEY: process.env.MAVAPAY_API_KEY!,
    MAVAPAY_WEBHOOK_SECRET: process.env.MAVAPAY_WEBHOOK_SECRET,
    
    // Add these two lines:
    BITNOB_BASE_URL: process.env.BITNOB_BASE_URL || "https://sandboxapi.bitnob.co/api/v1",
    BITNOB_API_KEY: process.env.BITNOB_API_KEY || "",
    BITNOB_WEBHOOK_SECRET: process.env.BITNOB_WEBHOOK_SECRET,
    
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER
  };
}

export const ENV = validateEnv();

// Log configuration on startup (without sensitive data)
if (ENV.NODE_ENV === "development") {
  console.log("⚙️  Configuration loaded:");
  console.log(`   Environment: ${ENV.NODE_ENV}`);
  console.log(`   Port: ${ENV.PORT}`);
  console.log(`   Mavapay URL: ${ENV.MAVAPAY_BASE_URL}`);
  console.log(`   Mavapay API Key: ${ENV.MAVAPAY_API_KEY.substring(0, 8)}...`);
  console.log(`   Twilio configured: ${!!ENV.TWILIO_ACCOUNT_SID}`);
}