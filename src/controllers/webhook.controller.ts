import { Request, Response } from "express";

interface PaymentReceivedWebhook {
  event: "payment.received";
  data: {
    orderId: string;
    paymentHash: string;
    amountPaid: number;
    currency: string;
    status: string;
    timestamp: string;
  };
}

interface PaymentSentWebhook {
  event: "payment.sent";
  data: {
    orderId: string;
    transactionId: string;
    amount: number;
    currency: string;
    beneficiary: {
      accountNumber: string;
      accountName: string;
      bankName: string;
    };
    status: "success" | "failed";
    timestamp: string;
    failureReason?: string;
  };
}

type MavapayWebhook = PaymentReceivedWebhook | PaymentSentWebhook;

export async function mavapayWebhookHandler(req: Request, res: Response) {
  try {
    // Verify webhook secret if provided
    const webhookSecret = req.headers['x-webhook-secret'] || req.headers['webhook-secret'];
    const expectedSecret = process.env.MAVAPAY_WEBHOOK_SECRET;
    
    if (expectedSecret && webhookSecret !== expectedSecret) {
      console.error("❌ Invalid webhook secret:", webhookSecret);
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const webhook = req.body as MavapayWebhook;
    
    console.log("🔔 Webhook received:", {
      event: webhook.event,
      orderId: webhook.data.orderId
    });

    if (webhook.event === "payment.received") {
      // Lightning payment was received
      console.log("⚡ Lightning payment received:", {
        orderId: webhook.data.orderId,
        paymentHash: webhook.data.paymentHash,
        amount: webhook.data.amountPaid,
        status: webhook.data.status
      });

      // TODO: Update your database
      // await updatePaymentStatus(webhook.data.orderId, "lightning_received");

      // TODO: Notify user via WhatsApp
      // await sendWhatsAppMessage(
      //   userPhoneNumber,
      //   `⚡ Lightning payment received! Processing payout...`
      // );

    } else if (webhook.event === "payment.sent") {
      // Bank transfer completed
      const { data } = webhook;
      
      console.log("💸 Bank transfer completed:", {
        orderId: data.orderId,
        transactionId: data.transactionId,
        status: data.status,
        beneficiary: data.beneficiary.accountName,
        bank: data.beneficiary.bankName
      });

      if (data.status === "success") {
        // TODO: Update your database
        // await updatePaymentStatus(data.orderId, "completed");

        // TODO: Notify user via WhatsApp
        // await sendWhatsAppMessage(
        //   userPhoneNumber,
        //   `✅ Transfer Complete!\n\n` +
        //   `💵 ${data.amount / 100} NGN sent to:\n` +
        //   `👤 ${data.beneficiary.accountName}\n` +
        //   `🏦 ${data.beneficiary.bankName}\n` +
        //   `🆔 Transaction ID: ${data.transactionId}`
        // );

        console.log("✅ Payout successful to:", data.beneficiary.accountName);
      } else {
        // Payment failed
        // TODO: Update your database
        // await updatePaymentStatus(data.orderId, "failed", data.failureReason);

        // TODO: Notify user via WhatsApp
        // await sendWhatsAppMessage(
        //   userPhoneNumber,
        //   `❌ Transfer Failed\n\n` +
        //   `Reason: ${data.failureReason || "Unknown error"}\n\n` +
        //   `Please contact support with Order ID: ${data.orderId}`
        // );

        console.error("❌ Payout failed:", data.failureReason);
      }
    }

    // Always respond with 200 OK to acknowledge webhook
    res.status(200).json({ received: true });

  } catch (err: any) {
    console.error("❌ Webhook processing error:", err.message);
    
    // Still return 200 to prevent retries for parsing errors
    res.status(200).json({ received: true, error: err.message });
  }
}

// Helper function to verify webhook authenticity (if Mavapay provides signature)
function verifyWebhookSignature(
  payload: string, 
  signature: string, 
  secret: string
): boolean {
  // TODO: Implement signature verification if Mavapay provides it
  // const crypto = require('crypto');
  // const expectedSignature = crypto
  //   .createHmac('sha256', secret)
  //   .update(payload)
  //   .digest('hex');
  // return signature === expectedSignature;
  return true;
}