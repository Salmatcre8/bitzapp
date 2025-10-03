import { getBanks } from "../services/mavapay.service";

let cachedBanks: { bankName: string; bankCode: string }[] = [];

/**
 * Map user-entered bank name to bankCode
 */
export async function resolveBankCode(bankName: string): Promise<string> {
  // Fetch banks only once (cache them)
  if (cachedBanks.length === 0) {
    const banks = await getBanks();
    cachedBanks = banks.data || banks; // depends on Mavapay response format
  }

  const found = cachedBanks.find(
    (b) => b.bankName.toLowerCase() === bankName.toLowerCase()
  );

  if (!found) throw new Error(`Bank "${bankName}" not found`);
  return found.bankCode;
}
