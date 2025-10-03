import { Request, Response } from "express";
import { whatsappWebhook as mavapayHandler } from "./whatsapp.controller";
import { bitnobWhatsAppHandler } from "./bitnob-whatsapp.controller";

/**
 * Unified WhatsApp controller that routes commands to appropriate service
 */
export async function unifiedWhatsAppWebhook(req: Request, res: Response) {
  const incomingMsg = req.body.Body?.toLowerCase() || "";
  
  console.log("📨 Incoming WhatsApp message:", req.body.Body);

  // ========================================
  // ROUTE TO BITNOB (Bitcoin/Lightning)
  // ========================================
  
  const bitnobCommands = [
    "receive btc",
    "get address",
    "btc address",
    "send btc",
    "send bitcoin",
    "receive lightning",
    "create invoice",
    "lightning invoice",
    "send lightning",
    "pay invoice",
    "pay lnbc",
    "my lightning address",
    "get lightning address",
    "balance",
    "wallet",
    "history",
    "transactions",
    "help",
    "menu",
    "commands",
  ];

  const isBitnobCommand = bitnobCommands.some(cmd => incomingMsg.includes(cmd)) ||
                          incomingMsg.includes("@") && incomingMsg.includes("pay ");

  if (isBitnobCommand) {
    console.log("🔀 Routing to Bitnob handler");
    return bitnobWhatsAppHandler(req, res);
  }

  // ========================================
  // ROUTE TO MAVAPAY (NGN Payouts)
  // ========================================
  
  const mavapayCommands = [
    "send",
    "transfer",
    "pay",
    "ngn",
  ];

  const isMavapayCommand = mavapayCommands.some(cmd => 
    incomingMsg.startsWith(cmd) || incomingMsg.includes(`${cmd} `)
  ) && incomingMsg.match(/\d{10}/); // Has 10-digit account number

  if (isMavapayCommand) {
    console.log("🔀 Routing to Mavapay handler");
    return mavapayHandler(req, res);
  }

  // ========================================
  // DEFAULT: Show help menu
  // ========================================
  
  const responseMsg = `🤖 Welcome to BitBuddy!

━━━ BITCOIN & LIGHTNING ━━━
• receive btc - Get Bitcoin address
• receive lightning [amount] - Create invoice
• send btc [amount] to [address]
• send lightning [invoice]
• pay [user@domain] [amount]
• balance - Check wallet
• history - View transactions

━━━ NIGERIAN NAIRA PAYOUTS ━━━
• send [amount] NGN to [account] [bank]
Example: send 5000 NGN to 1234567890 GTBank

━━━ HELP ━━━
• help - Show this menu

What would you like to do?`;

  res.send(`<Response><Message>${responseMsg}</Message></Response>`);
}