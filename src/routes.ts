import express from "express";
import { unifiedWhatsAppWebhook } from "./controllers/unified-whatsapp.controller";
import { mavapayWebhookHandler } from "./controllers/webhook.controller";

const router = express.Router();

// Unified WhatsApp webhook (handles both Mavapay and Bitnob commands)
router.post("/whatsapp/webhook", express.urlencoded({ extended: true }), unifiedWhatsAppWebhook);

// Mavapay payment status webhooks
router.post("/mavapay/webhook", express.json(), mavapayWebhookHandler);

// TODO: Add Bitnob webhook handler
// router.post("/bitnob/webhook", express.json(), bitnobWebhookHandler);

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    service: "BitBuddy - Bitcoin & NGN Payments"
  });
});

export default router;
