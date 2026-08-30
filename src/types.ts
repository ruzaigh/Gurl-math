export type Currency = 'ZAR' | 'USD' | 'GBP' | 'EUR' | 'NGN' | 'KES' | 'AUD' | 'CAD';
export type IncomeCategory = 'Gift' | 'Salary' | 'Freelance' | 'Repayment' | 'Sale' | 'Other';
export type ExpenseCategory =
  | 'Food'
  | 'Transport'
  | 'Shopping'
  | 'Entertainment'
  | 'Health'
  | 'Beauty'
  | 'Home'
  | 'Subscriptions'
  | 'Education'
  | 'Other';

export interface SavingsAccount {
  id: string;
  name: string;
  balance: number;
  icon: string;
  color: string;
  goal?: number;
}

export interface MoneyMove {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  date: string;
}

export interface ReceivedEntry {
  id: string;
  amount: number;
  fromWhom: string;
  category: IncomeCategory;
  date: string;
  note: string;
  depositToId?: string;
}

export interface ExpenseEntry {
  id: string;
  amount: number;
  category: ExpenseCategory;
  note: string;
  date: string;
  payFromId?: string;
}

/** 'flexible' = cancel today, money is yours next month.
 *  'contract'  = you are still legally on the hook until endMonth. */
export type Commitment = 'flexible' | 'contract';

export interface RecurringExpense {
  id: string;
  name: string;
  /** What it costs every month. */
  amount: number;
  category: ExpenseCategory;
  commitment: Commitment;
  /** 'YYYY-MM' — the last month you still have to pay. Only for contracts. */
  endMonth?: string;
  /** She has decided this one is going. Drives every projection on the page. */
  markedForCut: boolean;
  /** Savings account the freed money is earmarked for. */
  intoAccountId?: string;
  /** 'YYYY-MM' of the last month this was logged as a real expense. */
  lastLoggedMonth?: string;
}

export interface Asset {
  id: string;
  name: string;
  value: number;
  note: string;
  icon: string;
}

export interface AppSettings {
  ownerName: string;
  currency: Currency;
  geminiApiKey?: string;
}

export interface AppState {
  settings: AppSettings;
  accounts: SavingsAccount[];
  moves: MoneyMove[];
  received: ReceivedEntry[];
  expenses: ExpenseEntry[];
  assets: Asset[];
  recurring: RecurringExpense[];
}

export type Page = 'overview' | 'savings' | 'received' | 'expenses' | 'recurring' | 'assets' | 'settings';