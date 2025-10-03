import { Request, Response } from "express";
import {
  generateBitcoinAddress,
  getBitcoinBalance,
  sendBitcoinOnChain,
  createLightningInvoice,
  sendLightningPayment,
  decodeLightningInvoice,
  getLightningAddress,
  payToLightningAddress,
  getWalletBalance,
  getOnChainTransactions,
  getLightningTransactions,
} from "../services/bitnob.service";

/**
 * Parse Bitnob commands from WhatsApp
 *
 * Commands:
 * - receive btc / get address
 * - send btc [amount] to [address]
 * - receive lightning / create invoice [amount]
 * - send lightning [invoice]
 * - pay [lightning_address] [amount]
 * - balance
 * - history
 */

export async function bitnobWhatsAppHandler(req: Request, res: Response) {
  const incomingMsg = req.body.Body?.toLowerCase() || "";

  console.log("📨 Bitnob command:", incomingMsg);

  try {
    // ========================================
    // RECEIVING BITCOIN (ON-CHAIN)
    // ========================================

    if (
      incomingMsg.includes("receive btc") ||
      incomingMsg.includes("get address") ||
      incomingMsg.includes("btc address")
    ) {
      // Use the WhatsApp sender's phone number as a unique email
      const fromNumber = req.body.From?.replace("whatsapp:", "") || "unknown";
      const customerEmail = `${fromNumber}@bitbuddy.app`; // 👈 fake but valid email

      const address = await generateBitcoinAddress(customerEmail);

      const responseMsg = `🔗 Bitcoin Address (On-Chain)

📍 Address:
${address.address}

Send Bitcoin to this address to receive payments. Confirmations usually take 10-60 minutes.

💡 Tip: Use Lightning for instant payments!`;

      return res.send(`<Response><Message>${responseMsg}</Message></Response>`);
    }

    // ========================================
    // SENDING BITCOIN (ON-CHAIN)
    // ========================================

    if (
      incomingMsg.includes("send btc") ||
      incomingMsg.includes("send bitcoin")
    ) {
      // Parse: send btc 0.001 to bc1q...
      const amountMatch = incomingMsg.match(/[\d.]+/);
      const addressMatch = incomingMsg.match(
        /(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}/
      );

      if (!amountMatch || !addressMatch) {
        return res.send(`<Response><Message>❌ Invalid format.

Use: send btc [amount] to [address]
Example: send btc 0.001 to bc1q...

Amount should be in BTC.</Message></Response>`);
      }

      const amount = parseFloat(amountMatch[0]);
      const address = addressMatch[0];

      const tx = await sendBitcoinOnChain(address, amount);

      const responseMsg = `✅ Bitcoin Sent!

💰 Amount: ${amount} BTC
📍 To: ${address.substring(0, 20)}...
🔗 TX ID: ${tx.txid.substring(0, 20)}...

⏳ Your transaction is being confirmed on the blockchain. This usually takes 10-60 minutes.`;

      return res.send(`<Response><Message>${responseMsg}</Message></Response>`);
    }

    // ========================================
    // RECEIVING LIGHTNING
    // ========================================

    if (
      incomingMsg.includes("receive lightning") ||
      incomingMsg.includes("create invoice") ||
      incomingMsg.includes("lightning invoice")
    ) {
      // Parse: receive lightning 1000 / create invoice 1000
      const amountMatch = incomingMsg.match(/\d+/);

      if (!amountMatch) {
        return res.send(`<Response><Message>❌ Invalid format.

Use: receive lightning [amount]
Example: receive lightning 1000

Amount should be in sats (satoshis).</Message></Response>`);
      }

      const amount = parseInt(amountMatch[0]);

      const invoice = await createLightningInvoice(
        amount,
        "Payment via WhatsApp Bot"
      );

      const responseMsg = `⚡ Lightning Invoice Created

💰 Amount: ${amount} sats
⏰ Expires: 60 minutes

📱 Invoice:
${invoice.invoice}

Scan this QR code or copy the invoice to receive instant Lightning payments!`;

      return res.send(`<Response><Message>${responseMsg}</Message></Response>`);
    }

    // ========================================
    // SENDING LIGHTNING
    // ========================================

    if (
      incomingMsg.includes("send lightning") ||
      incomingMsg.includes("pay invoice") ||
      incomingMsg.includes("pay lnbc")
    ) {
      // Extract Lightning invoice (starts with lnbc, lntb, lnbcrt)
      const invoiceMatch = incomingMsg.match(/(lnbc|lntb|lnbcrt)[a-z0-9]+/i);

      if (!invoiceMatch) {
        return res.send(`<Response><Message>❌ No Lightning invoice found.

Use: send lightning [invoice]
Example: send lightning lnbc1000n1...

Paste the full Lightning invoice.</Message></Response>`);
      }

      const invoice = invoiceMatch[0];

      // First decode to show user the details
      const decoded = await decodeLightningInvoice(invoice);

      const responseMsg = `⚡ Payment Details

💰 Amount: ${decoded.amount || 0} sats
📝 Description: ${decoded.description || "No description"}
⏰ Expires: ${new Date(decoded.expiry * 1000).toLocaleString()}

Reply with "confirm" to send this payment.`;

      // TODO: Store pending payment in session/database
      // For now, we'll auto-confirm
      const payment = await sendLightningPayment(invoice);

      const confirmMsg = `✅ Lightning Payment Sent!

💰 Amount: ${payment.amount} sats
⚡ Fee: ${payment.fee} sats
🔗 Payment Hash: ${payment.payment_hash.substring(0, 20)}...

Payment delivered instantly!`;

      return res.send(`<Response><Message>${confirmMsg}</Message></Response>`);
    }

    // ========================================
    // PAY TO LIGHTNING ADDRESS
    // ========================================

    if (incomingMsg.includes("pay ") && incomingMsg.includes("@")) {
      // Parse: pay user@bitnob.co 1000
      const addressMatch = incomingMsg.match(/\S+@\S+\.\S+/);
      const amountMatch = incomingMsg.match(/\d+/);

      if (!addressMatch || !amountMatch) {
        return res.send(`<Response><Message>❌ Invalid format.

Use: pay [lightning_address] [amount]
Example: pay user@bitnob.co 1000

Amount should be in sats.</Message></Response>`);
      }

      const lightningAddress = addressMatch[0];
      const amount = parseInt(amountMatch[0]);

      const payment = await payToLightningAddress(lightningAddress, amount);

      const responseMsg = `✅ Paid to Lightning Address!

📧 To: ${lightningAddress}
💰 Amount: ${amount} sats
⚡ Fee: ${payment.fee || 0} sats

Payment delivered instantly!`;

      return res.send(`<Response><Message>${responseMsg}</Message></Response>`);
    }

    // ========================================
    // GET LIGHTNING ADDRESS
    // ========================================

    if (
      incomingMsg.includes("my lightning address") ||
      incomingMsg.includes("get lightning address")
    ) {
      const lightningAddress = await getLightningAddress();

      const responseMsg = `📧 Your Lightning Address

${lightningAddress}

Share this address to receive Lightning payments from anyone!

People can send you sats by typing:
user@domain.com

No invoice needed!`;

      return res.send(`<Response><Message>${responseMsg}</Message></Response>`);
    }

    // ========================================
    // BALANCE
    // ========================================

    if (incomingMsg.includes("balance") || incomingMsg.includes("wallet")) {
      const balance = await getWalletBalance();

      const btcBalance = (balance.total / 100000000).toFixed(8);

      const responseMsg = `💰 Wallet Balance

🔗 On-chain: ${balance.onchain.toLocaleString()} sats
⚡ Lightning: ${balance.lightning.toLocaleString()} sats
━━━━━━━━━━━━━━━
📊 Total: ${balance.total.toLocaleString()} sats
   (${btcBalance} BTC)

Send "history" to see transactions`;

      return res.send(`<Response><Message>${responseMsg}</Message></Response>`);
    }

    // ========================================
    // TRANSACTION HISTORY
    // ========================================

    if (
      incomingMsg.includes("history") ||
      incomingMsg.includes("transactions")
    ) {
      const onChain = await getOnChainTransactions(5);
      const lightning = await getLightningTransactions(5);

      let responseMsg = "📜 Recent Transactions\n\n";

      if (onChain.length > 0) {
        responseMsg += "🔗 On-Chain:\n";
        onChain.forEach((tx, i) => {
          responseMsg += `${i + 1}. ${tx.amount} sats - ${tx.status}\n`;
          responseMsg += `   ${tx.txid.substring(0, 15)}...\n`;
        });
        responseMsg += "\n";
      }

      if (lightning.length > 0) {
        responseMsg += "⚡ Lightning:\n";
        lightning.forEach((tx, i) => {
          responseMsg += `${i + 1}. ${tx.amount} sats - ${tx.status}\n`;
        });
      }

      if (onChain.length === 0 && lightning.length === 0) {
        responseMsg += "No transactions yet.\n\nStart by receiving Bitcoin!";
      }

      return res.send(`<Response><Message>${responseMsg}</Message></Response>`);
    }

    // ========================================
    // HELP / MENU
    // ========================================

    if (
      incomingMsg.includes("help") ||
      incomingMsg.includes("menu") ||
      incomingMsg.includes("commands")
    ) {
      const responseMsg = `🤖 BitBuddy Commands

━━━ RECEIVING ━━━
• receive btc - Get Bitcoin address
• receive lightning [amount] - Create Lightning invoice

━━━ SENDING ━━━
• send btc [amount] to [address]
• send lightning [invoice]
• pay [user@domain] [amount]

━━━ INFO ━━━
• balance - Check wallet balance
• history - View transactions
• my lightning address

━━━ PAYOUTS ━━━
• send [amount] NGN to [account] [bank]

Reply "help" anytime for this menu.`;

      return res.send(`<Response><Message>${responseMsg}</Message></Response>`);
    }

    // ========================================
    // UNKNOWN COMMAND
    // ========================================

    const responseMsg = `❌ Unknown command: "${incomingMsg}"

Send "help" to see all available commands.`;

    res.send(`<Response><Message>${responseMsg}</Message></Response>`);
  } catch (err: any) {
    console.error("❌ Bitnob command error:", err.message);

    const errorMsg = `❌ Error: ${err.message}

Please try again or send "help" for assistance.`;

    res.send(`<Response><Message>${errorMsg}</Message></Response>`);
  }
}
