import axios from "axios";
import { ENV } from "../config/env";

const bitnobApi = axios.create({
  baseURL: ENV.BITNOB_BASE_URL || "https://sandboxapi.bitnob.co/api/v1",
  headers: {
    "Authorization": `Bearer ${ENV.BITNOB_API_KEY}`,
    "Content-Type": "application/json",
  },
});

// ========================================
// INTERFACES
// ========================================

interface BitcoinAddress {
  address: string;
  label?: string;
}

interface LightningInvoice {
  invoice: string;
  payment_hash: string;
  expires_at: string;
  amount: number;
  description?: string;
}

interface OnChainTransaction {
  txid: string;
  amount: number;
  confirmations: number;
  address: string;
  status: string;
}

interface LightningPayment {
  payment_hash: string;
  invoice: string;
  amount: number;
  fee: number;
  status: string;
}

// ========================================
// ON-CHAIN BITCOIN FUNCTIONS
// ========================================

/**
 * Generate a new Bitcoin address to receive on-chain payments
 */
export async function generateBitcoinAddress(
  customerEmail: string
): Promise<BitcoinAddress> {
  try {
    console.log("🔗 Generating Bitcoin address for:", customerEmail);
    
    const response = await bitnobApi.post("/addresses/generate", {
      customerEmail, // 👈 required by Bitnob
    });

    console.log("✅ Bitcoin address generated:", response.data.data.address);
    return response.data.data;
  } catch (err: any) {
    console.error("❌ Generate address error:", err.response?.data || err.message);
    throw new Error(
      `Failed to generate Bitcoin address: ${
        err.response?.data?.message || err.message
      }`
    );
  }
}

/**
 * Get Bitcoin address balance
 */
export async function getBitcoinBalance(address: string): Promise<number> {
  try {
    console.log("💰 Checking Bitcoin balance for:", address);
    
    const response = await bitnobApi.get(`/addresses/${address}/balance`);
    
    const balance = response.data.data.balance || 0;
    console.log("✅ Balance:", balance, "BTC");
    return balance;
  } catch (err: any) {
    console.error("❌ Get balance error:", err.response?.data || err.message);
    throw new Error(
      `Failed to get balance: ${err.response?.data?.message || err.message}`
    );
  }
}

/**
 * Send Bitcoin on-chain
 */
export async function sendBitcoinOnChain(
  address: string,
  amount: number,
  memo?: string
): Promise<OnChainTransaction> {
  try {
    console.log("📤 Sending Bitcoin on-chain...");
    console.log("   To:", address);
    console.log("   Amount:", amount, "BTC");

    const response = await bitnobApi.post("/wallets/send_bitcoin", {
      address,
      satoshis: Math.floor(amount * 100000000), // Convert BTC to sats
      description: memo || "Payment via WhatsApp Bot",
      priority: "medium", // low, medium, high
    });

    console.log("✅ Bitcoin sent! TXID:", response.data.data.txid);
    return response.data.data;
  } catch (err: any) {
    console.error("❌ Send Bitcoin error:", err.response?.data || err.message);
    throw new Error(
      `Failed to send Bitcoin: ${err.response?.data?.message || err.message}`
    );
  }
}

/**
 * Get on-chain transaction history
 */
export async function getOnChainTransactions(
  limit = 10
): Promise<OnChainTransaction[]> {
  try {
    console.log("📜 Fetching on-chain transactions...");
    
    const response = await bitnobApi.get("/wallets/transactions", {
      params: {
        limit,
        type: "bitcoin", // on-chain only
      },
    });

    console.log(`✅ Found ${response.data.data.length} transactions`);
    return response.data.data;
  } catch (err: any) {
    console.error("❌ Get transactions error:", err.response?.data || err.message);
    throw new Error(
      `Failed to get transactions: ${err.response?.data?.message || err.message}`
    );
  }
}

// ========================================
// LIGHTNING NETWORK FUNCTIONS
// ========================================

/**
 * Create a Lightning invoice to receive payment
 */
export async function createLightningInvoice(
  amount: number,
  description?: string,
  expiryMinutes = 60
): Promise<LightningInvoice> {
  try {
    console.log("⚡ Creating Lightning invoice...");
    console.log("   Amount:", amount, "sats");
    console.log("   Description:", description);

    const response = await bitnobApi.post("/wallets/ln/createinvoice", {
      amount, // in satoshis
      description: description || "Payment via WhatsApp Bot",
      expiry: expiryMinutes * 60, // convert to seconds
    });

    const invoice = response.data.data;
    console.log("✅ Lightning invoice created");
    console.log("   Invoice:", invoice.invoice.substring(0, 50) + "...");
    console.log("   Payment Hash:", invoice.payment_hash);
    console.log("   Expires:", invoice.expires_at);

    return invoice;
  } catch (err: any) {
    console.error("❌ Create invoice error:", err.response?.data || err.message);
    throw new Error(
      `Failed to create Lightning invoice: ${err.response?.data?.message || err.message}`
    );
  }
}

/**
 * Check Lightning invoice status
 */
export async function checkInvoiceStatus(
  paymentHash: string
): Promise<{ paid: boolean; amount?: number; paid_at?: string }> {
  try {
    console.log("🔍 Checking invoice status:", paymentHash);

    const response = await bitnobApi.get(`/wallets/ln/invoice/${paymentHash}`);

    const invoice = response.data.data;
    console.log("✅ Invoice status:", invoice.status);

    return {
      paid: invoice.status === "paid" || invoice.settled === true,
      amount: invoice.amount,
      paid_at: invoice.settled_at || invoice.paid_at,
    };
  } catch (err: any) {
    console.error("❌ Check invoice error:", err.response?.data || err.message);
    throw new Error(
      `Failed to check invoice: ${err.response?.data?.message || err.message}`
    );
  }
}

/**
 * Decode a Lightning invoice to see details
 */
export async function decodeLightningInvoice(invoice: string): Promise<any> {
  try {
    console.log("🔍 Decoding Lightning invoice...");

    const response = await bitnobApi.post("/wallets/ln/decodeinvoice", {
      invoice,
    });

    const decoded = response.data.data;
    console.log("✅ Invoice decoded:");
    console.log("   Amount:", decoded.amount, "sats");
    console.log("   Description:", decoded.description);
    console.log("   Expires:", decoded.expiry);

    return decoded;
  } catch (err: any) {
    console.error("❌ Decode invoice error:", err.response?.data || err.message);
    throw new Error(
      `Failed to decode invoice: ${err.response?.data?.message || err.message}`
    );
  }
}

/**
 * Send Lightning payment
 * First initiate, then confirm if you want two-step process
 */
export async function sendLightningPayment(
  invoice: string,
  autoConfirm = true
): Promise<LightningPayment> {
  try {
    console.log("⚡ Initiating Lightning payment...");

    // Step 1: Initiate (to check fees and route)
    const initiateResponse = await bitnobApi.post("/wallets/ln/initiatepayment", {
      invoice,
    });

    const paymentDetails = initiateResponse.data.data;
    console.log("💰 Payment details:");
    console.log("   Amount:", paymentDetails.amount, "sats");
    console.log("   Fee:", paymentDetails.fee, "sats");
    console.log("   Total:", paymentDetails.total, "sats");

    if (!autoConfirm) {
      // Return details for user confirmation
      return {
        ...paymentDetails,
        status: "pending_confirmation",
      };
    }

    // Step 2: Confirm payment
    console.log("✅ Confirming payment...");
    const confirmResponse = await bitnobApi.post("/wallets/ln/paybolt11", {
      invoice,
    });

    const payment = confirmResponse.data.data;
    console.log("✅ Payment sent!");
    console.log("   Payment Hash:", payment.payment_hash);
    console.log("   Status:", payment.status);

    return payment;
  } catch (err: any) {
    console.error("❌ Send Lightning error:", err.response?.data || err.message);
    throw new Error(
      `Failed to send Lightning payment: ${err.response?.data?.message || err.message}`
    );
  }
}

/**
 * Get Lightning transaction history
 */
export async function getLightningTransactions(
  limit = 10
): Promise<LightningPayment[]> {
  try {
    console.log("📜 Fetching Lightning transactions...");

    const response = await bitnobApi.get("/wallets/transactions", {
      params: {
        limit,
        type: "lightning",
      },
    });

    console.log(`✅ Found ${response.data.data.length} Lightning transactions`);
    return response.data.data;
  } catch (err: any) {
    console.error("❌ Get Lightning transactions error:", err.response?.data || err.message);
    throw new Error(
      `Failed to get Lightning transactions: ${err.response?.data?.message || err.message}`
    );
  }
}

// ========================================
// LIGHTNING ADDRESS (LNURL)
// ========================================

/**
 * Create/Get Lightning Address (like user@bitnob.co)
 */
export async function getLightningAddress(): Promise<string> {
  try {
    console.log("📧 Getting Lightning Address...");

    const response = await bitnobApi.get("/lightning-address");

    const lightningAddress = response.data.data.lightning_address;
    console.log("✅ Lightning Address:", lightningAddress);

    return lightningAddress;
  } catch (err: any) {
    console.error("❌ Get Lightning Address error:", err.response?.data || err.message);
    throw new Error(
      `Failed to get Lightning Address: ${err.response?.data?.message || err.message}`
    );
  }
}

/**
 * Pay to a Lightning Address
 */
export async function payToLightningAddress(
  lightningAddress: string,
  amount: number
): Promise<LightningPayment> {
  try {
    console.log("⚡ Paying to Lightning Address:", lightningAddress);
    console.log("   Amount:", amount, "sats");

    const response = await bitnobApi.post("/lightning-address/pay", {
      lightning_address: lightningAddress,
      amount,
    });

    console.log("✅ Payment sent to Lightning Address!");
    return response.data.data;
  } catch (err: any) {
    console.error("❌ Pay Lightning Address error:", err.response?.data || err.message);
    throw new Error(
      `Failed to pay Lightning Address: ${err.response?.data?.message || err.message}`
    );
  }
}

// ========================================
// WALLET INFO
// ========================================

/**
 * Get wallet balance (both on-chain and Lightning)
 */
export async function getWalletBalance(): Promise<{
  onchain: number;
  lightning: number;
  total: number;
}> {
  try {
    console.log("💰 Fetching wallet balance...");

    const response = await bitnobApi.get("/wallets/balance");

    const balance = response.data.data;
    console.log("✅ Wallet Balance:");
    console.log("   On-chain:", balance.onchain_balance || 0, "sats");
    console.log("   Lightning:", balance.lightning_balance || 0, "sats");
    console.log("   Total:", balance.total_balance || 0, "sats");

    return {
      onchain: balance.onchain_balance || 0,
      lightning: balance.lightning_balance || 0,
      total: balance.total_balance || 0,
    };
  } catch (err: any) {
    console.error("❌ Get wallet balance error:", err.response?.data || err.message);
    throw new Error(
      `Failed to get wallet balance: ${err.response?.data?.message || err.message}`
    );
  }
}