// utils/parser.ts
interface ParsedMessage {
  amount: number;
  accountNumber: string;
  bankName: string;
}

export function parseMessage(message: string): ParsedMessage {
  const normalized = message.trim().toLowerCase();
  
  let cleaned = normalized
    .replace(/^(send|transfer|pay)/i, '')
    .replace(/ngn/gi, '')
    .replace(/to/gi, '')
    .trim();
  
  const tokens = cleaned.split(/\s+/);
  
  if (tokens.length < 3) {
    throw new Error(
      'Invalid format. Use: "send [amount] NGN to [account] [bank]"\n' +
      'Example: send 3000 NGN to 8117312955 OPAY'
    );
  }
  
  const amount = parseFloat(tokens[0]);
  if (isNaN(amount) || amount <= 0) {
    throw new Error(
      `Invalid amount: "${tokens[0]}". Amount must be a positive number.`
    );
  }
  
  const accountNumber = tokens[1];
  if (!/^\d{10}$/.test(accountNumber)) {
    throw new Error(
      `Invalid account number: "${accountNumber}". Must be 10 digits.`
    );
  }
  
  const bankName = tokens.slice(2).join(' ');
  if (!bankName) {
    throw new Error('Bank name is required. Example: OPAY, GTBank, Access Bank');
  }
  
  return {
    amount,
    accountNumber,
    bankName: capitalizeBank(bankName)
  };
}

function capitalizeBank(bankName: string): string {
  const commonBanks: Record<string, string> = {
    'opay': 'OPAY',
    'gtbank': 'GTBank',
    'gtb': 'GTBank',
    'access': 'Access Bank',
    'zenith': 'Zenith Bank',
    'uba': 'UBA',
    'first bank': 'First Bank',
    'firstbank': 'First Bank',
    'fidelity': 'Fidelity Bank',
    'wema': 'Wema Bank',
    'sterling': 'Sterling Bank',
    'stanbic': 'Stanbic IBTC Bank',
    'union': 'Union Bank',
    'unity': 'Unity Bank',
    'keystone': 'Keystone Bank',
    'polaris': 'Polaris Bank',
    'providus': 'Providus Bank',
    'kuda': 'Kuda Bank',
    'palmpay': 'PalmPay',
    'moniepoint': 'Moniepoint'
  };
  
  const normalized = bankName.toLowerCase().trim();
  
  if (commonBanks[normalized]) {
    return commonBanks[normalized];
  }
  
  return bankName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}