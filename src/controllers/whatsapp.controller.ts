import { Request, Response } from "express";
import { parseMessage } from "../utils/parser";
import {
  validateAccount,
  createQuote,
  getBanks,
  simulatePayment,
  getTransactionStatus,
} from "../services/mavapay.service";
import { ENV } from "../config/env";

export async function whatsappWebhook(req: Request, res: Response) {
  const incomingMsg = req.body.Body;

  console.log("📨 Incoming WhatsApp message:", incomingMsg);

  try {
    // Parse the message (e.g., "send 3000 NGN to 8117312955 OPAY")
    const { amount, accountNumber, bankName } = parseMessage(incomingMsg);
    console.log("✅ Parsed:", { amount, accountNumber, bankName });

    // Validate minimum amount
    if (amount < 2000) {
      throw new Error("Minimum transfer amount is 2000 NGN");
    }

    // Fetch all supported Nigerian banks
    const banks = await getBanks();
    console.log(`📋 Fetched ${banks.length} banks from Mavapay`);

    // Find the bank (case-insensitive, partial match)
    const bank = banks.find(
      (b: any) =>
        b.bankName.toLowerCase().includes(bankName.toLowerCase()) ||
        bankName.toLowerCase().includes(b.bankName.toLowerCase())
    );

    if (!bank) {
      // List some popular banks to help user
      const popularBanks = banks
        .slice(0, 5)
        .map((b: any) => b.bankName)
        .join(", ");
      throw new Error(
        `Bank "${bankName}" not found. Try: ${popularBanks}... (${banks.length} banks available)`
      );
    }

    const bankCode = bank.nipBankCode;
    console.log("🏦 Found bank:", { name: bank.bankName, code: bankCode });

    // Step 1: Validate the account
    // Step 1: Try to validate the account (optional)
    console.log("🔍 Validating account...");
    let accountInfo;
    try {
      accountInfo = await validateAccount(accountNumber, bankCode);
      console.log("✅ Account valid:", accountInfo.accountName);
    } catch (validationError: any) {
      console.warn("⚠️  Account validation failed:", validationError.message);

      // If validation not available, proceed without it
      if (validationError.message === "VALIDATION_NOT_AVAILABLE") {
        console.log("ℹ️  Proceeding without account validation...");
        accountInfo = {
          accountName: "Account holder (unverified)",
          accountNumber: accountNumber,
          bankCode: bankCode,
        };
      } else {
        // For other errors, throw them
        throw validationError;
      }
    }

    // Step 2: Create quote and get Lightning invoice
    console.log("💰 Creating quote...");
    const quote = await createQuote(
      amount,
      accountNumber,
      bankCode,
      bank.bankName,
      accountInfo.accountName // Pass the validated account name
    );
    console.log("✅ Quote created:", quote.id);

    // Auto-simulate payment in staging environment
if (ENV.MAVAPAY_BASE_URL.includes("staging")) {
  console.log("🧪 Staging environment detected - auto-simulating payment...");
  
  try {
    await simulatePayment(quote.id);
    console.log("✅ Payment simulation triggered");
    
    // Add note to response message
    const simulationNote = "\n\n🧪 STAGING MODE: Payment auto-simulated for testing.";
    
    // Modify the response message to include simulation note
  } catch (simErr: any) {
    console.error("⚠️ Payment simulation failed:", simErr.message);
    // Continue anyway - user can still pay manually
  }
}


    // Calculate fees
    const feeInNGN = (quote.transactionFeesInTargetCurrency / 100).toFixed(2);
    const totalInNGN = (quote.amountInTargetCurrency / 100).toFixed(2);
    const amountInSATS = quote.amountInSourceCurrency;
    const feeInSATS = quote.transactionFeesInSourceCurrency;

    // The invoice might be in different field names
    const lightningInvoice = quote.invoice || "Invoice not available";

    // Format the response message
    const responseMsg = `✅ Transfer Initiated

💳 Recipient: ${accountInfo.accountName}
🏦 Bank: ${bank.bankName}
💵 Amount: ${amount} NGN
⚡ Fee: ${feeInNGN} NGN
📦 Total: ${totalInNGN} NGN

⚡ Lightning Invoice:
${lightningInvoice}

🔢 Amount to Pay: ${amountInSATS} SATS (${feeInSATS} SATS fee)
⏰ Valid for: 5 minutes
🆔 Order ID: ${quote.orderId}

Pay this Lightning invoice to complete the transfer. The recipient will receive the funds within minutes.`;

    res.send(`<Response><Message>${responseMsg}</Message></Response>`);
  } catch (err: any) {
    console.error("❌ Error processing request:", err.message);
    console.error("Stack:", err.stack);

    // Format error message for WhatsApp
    let errorMsg = "❌ Transfer Failed\n\n";

    if (err.response?.data) {
      console.error("API Error:", err.response.data);
      errorMsg += err.response.data.message || err.message;
    } else {
      errorMsg += err.message;
    }

    errorMsg += "\n\n💡 Make sure:\n";
    errorMsg += "• Amount is at least 2000 NGN\n";
    errorMsg += "• Account number is correct\n";
    errorMsg += "• Bank name is spelled correctly";

    res.send(`<Response><Message>${errorMsg}</Message></Response>`);
  }
}
