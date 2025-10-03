import twilio = require("twilio");
import { ENV } from "../config/env";

const client = twilio(ENV.TWILIO_ACCOUNT_SID, ENV.TWILIO_AUTH_TOKEN);

/**
 * Send WhatsApp message to a user
 * @param to - recipient phone number (e.g. "+2348012345678")
 * @param message - message text
 */
export async function sendWhatsAppMessage(to: string, message: string) {
  try {
    const response = await client.messages.create({
      from: `whatsapp:${ENV.TWILIO_WHATSAPP_NUMBER}`, // Twilio sandbox or registered WhatsApp number
      to: `whatsapp:${to}`,
      body: message
    });

    console.log("✅ WhatsApp message sent:", response.sid);
    return response;
  } catch (err) {
    console.error("❌ Failed to send WhatsApp message:", err);
    throw err;
  }
}
