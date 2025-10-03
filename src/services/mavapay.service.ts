import axios from "axios";
import { ENV } from "../config/env";

const api = axios.create({
  baseURL: ENV.MAVAPAY_BASE_URL,
  headers: {
    "x-api-key": ENV.MAVAPAY_API_KEY, // lowercase 'x-api-key'
    "Content-Type": "application/json",
  },
});

const api2 = axios.create({
  baseURL: ENV.MAVAPAY_BASE_URL,
  headers: {
    "X-API-KEY": ENV.MAVAPAY_API_KEY, // lowercase 'x-api-key'
    "Content-Type": "application/json",
  },
});

// Response type interfaces based on docs
interface BankInfo {
  bankName: string;
  nipBankCode: string;
}

interface AccountValidation {
  accountName: string;
  accountNumber: string;
  bankCode: string;
}

interface QuoteResponse {
  id: string;
  orderId: string;
  amount: number;
  amountInSourceCurrency: number;
  amountInTargetCurrency: number;
  transactionFeesInSourceCurrency: number;
  transactionFeesInTargetCurrency: number;
  invoice: string;  // ← Correct field name
  hash: string;
  expiry: string;
  exchangeRate: number;
  usdToTargetCurrencyRate: number;
  isValid: boolean;
  totalAmountInSourceCurrency: number;
  customerInternalFee: number;
}

export async function getBanks(): Promise<BankInfo[]> {
  try {
    const response = await api.get("/bank/bankcode?country=NG");
    console.log("📋 Banks fetched:", response.data.data?.length || 0);
    return response.data.data || [];
  } catch (err: any) {
    console.error("❌ Get banks error:", err.response?.data || err.message);
    throw new Error(
      `Failed to fetch banks: ${err.response?.data?.message || err.message}`
    );
  }
}

export async function validateAccount(
  accountNumber: string,
  bankCode: string
): Promise<AccountValidation> {
  try {
    // Try different endpoint variations
    let response;
    let lastError;

    // Try 1: POST with query params (as per docs)
    try {
      console.log(
        `🔍 Trying: POST /bank/name-enquiry?accountNumber=${accountNumber}&bankCode=${bankCode}`
      );
      response = await api2.post(
        `/bank/name-enquiry?accountNumber=${accountNumber}&bankCode=${bankCode}`,
        {}
      );
    } catch (err: any) {
      lastError = err;
      console.log(
        `⚠️  POST failed (${err.response?.status}), trying with body...`
      );

      // Try 2: POST with body instead of query params
      try {
        console.log(`🔍 Trying: POST /bank/name-enquiry with body`);
        response = await api2.post("/bank/name-enquiry", {
          accountNumber,
          bankCode,
        });
      } catch (err2: any) {
        lastError = err2;
        console.log(
          `⚠️  POST with body failed (${err2.response?.status}), trying GET...`
        );

        // Try 3: GET request
        try {
          console.log(`🔍 Trying: GET /bank/name-enquiry`);
          response = await api2.get(
            `/bank/name-enquiry?accountNumber=${accountNumber}&bankCode=${bankCode}`
          );
        } catch (err3: any) {
          lastError = err3;
          // All attempts failed - this is OK, we'll skip validation
          throw new Error("VALIDATION_NOT_AVAILABLE");
        }
      }
    }

    if (!response) {
      throw new Error("VALIDATION_NOT_AVAILABLE");
    }

    console.log("✅ Account validated:", response.data.data || response.data);
    return response.data.data || response.data;
  } catch (err: any) {
    console.error(
      "❌ Validate account error:",
      err.response?.data || err.message
    );

    if (
      err.message === "VALIDATION_NOT_AVAILABLE" ||
      err.response?.status === 404
    ) {
      // This is expected - validation endpoint doesn't exist
      throw new Error("VALIDATION_NOT_AVAILABLE");
    }

    if (err.response?.status === 400) {
      throw new Error("Invalid account number or bank code");
    }

    throw new Error(
      `Account validation failed: ${err.response?.data?.message || err.message}`
    );
  }
}

export async function createQuote(
  amount: number,
  accountNumber: string,
  bankCode: string,
  bankName: string,
  accountName?: string
): Promise<QuoteResponse> {
  try {
    // Convert NGN to Kobo (multiply by 100)
    // Minimum is 2000 NGN = 200000 Kobo
    const amountInKobo = amount * 100;

    if (amountInKobo < 200000) {
      throw new Error("Minimum payout amount is 2000 NGN");
    }

    const payload = {
      amount: amountInKobo,
      sourceCurrency: "BTCSAT",
      targetCurrency: "NGNKOBO",
      paymentMethod: "LIGHTNING",
      paymentCurrency: "NGNKOBO", // Must be NGNKOBO as per docs
      autopayout: true,
      beneficiary: {
        bankAccountNumber: accountNumber,
        bankAccountName: accountName || "Account Holder", // Required!
        bankCode: bankCode,
        bankName: bankName,
      },
    };

    console.log("📤 Creating quote:", JSON.stringify(payload, null, 2));

    const response = await api2.post("/quote", payload);

    console.log(
      "✅ Full quote response:",
      JSON.stringify(response.data, null, 2)
    );

    console.log("✅ Quote created:", {
      id: response.data.data.id,
      orderId: response.data.data.orderId,
      amountInKobo: response.data.data.amountInTargetCurrency,
      feeInKobo: response.data.data.transactionFeesInTargetCurrency,
      expiry: response.data.data.expiry,
      invoice:
        response.data.data.invoice ||
        response.data.data.lightningInvoice ||
        "NOT FOUND",
    });

    return response.data.data;
  } catch (err: any) {
    console.error("❌ Create quote error:", err.response?.data || err.message);

    if (err.response?.status === 404) {
      throw new Error("Quote endpoint not found. Verify base URL is correct.");
    }

    if (err.response?.status === 400) {
      throw new Error(
        `Invalid quote parameters: ${
          err.response?.data?.message || "Check amount and beneficiary details"
        }`
      );
    }

    throw new Error(
      `Quote creation failed: ${err.response?.data?.message || err.message}`
    );
  }
}


/**
 * Simulate Lightning payment in staging environment
 * This pays a quote automatically for testing purposes
 */
export async function simulatePayment(
  quoteId: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log("🧪 Simulating payment for quote:", quoteId);

    const response = await api2.post("/simulation/pay-in", {
      currency: "BTC",
      quoteId: quoteId,
    });

    console.log("✅ Payment simulated:", response.data);
    return {
      success: true,
      message: response.data.message || "Payment simulated successfully",
    };
  } catch (err: any) {
    console.error("❌ Simulate payment error:", err.response?.data || err.message);
    throw new Error(
      `Failed to simulate payment: ${err.response?.data?.message || err.message}`
    );
  }
}

export async function getTransactionStatus(orderId: string) {
  try {
    const response = await api.get(`/transaction/${orderId}`);
    return response.data.data;
  } catch (err: any) {
    console.error(
      "❌ Get transaction error:",
      err.response?.data || err.message
    );
    throw new Error(
      `Failed to get transaction: ${err.response?.data?.message || err.message}`
    );
  }
}
