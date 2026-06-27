import type { Currency, ExpenseCategory } from './types';

export const CURRENCIES: { code: Currency; label: string }[] = [
  { code: 'ZAR', label: 'South African Rand (R)' },
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'NGN', label: 'Nigerian Naira (₦)' },
  { code: 'KES', label: 'Kenyan Shilling (KSh)' },
  { code: 'AUD', label: 'Australian Dollar (A$)' },
  { code: 'CAD', label: 'Canadian Dollar (C$)' },
];

export function fmt(amount: number, currency: Currency): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export const TODAY = new Date().toISOString().split('T')[0];

export function displayDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function thisMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function greeting(name: string): string {
  const h = new Date().getHours();
  const time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return name ? `Good ${time}, ${name}` : `Good ${time}`;
}

export const EXPENSE_COLORS: Record<ExpenseCategory, string> = {
  Food: '#0EA5E9',
  Transport: '#8B5CF6',
  Shopping: '#F472B6',
  Entertainment: '#F59E0B',
  Health: '#0D9488',
  Beauty: '#C084FC',
  Home: '#6366F1',
  Subscriptions: '#FB923C',
  Education: '#60A5FA',
  Other: '#94A3B8',
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Food', 'Transport', 'Shopping', 'Entertainment',
  'Health', 'Beauty', 'Home', 'Subscriptions', 'Education', 'Other',
];

export const ACCOUNT_COLORS = [
  '#1B4F8A', '#4338CA', '#7C3AED', '#0891B2',
  '#1D4ED8', '#5B21B6', '#0F766E', '#9333EA',
];

export const ACCOUNT_ICONS = [
  '🏦', '🏖️', '💍', '🏠', '🎓', '🚨', '✈️', '🎁',
  '💻', '🐾', '🚗', '💼', '💰', '🌸', '🎯', '🛍️',
];

export const ASSET_ICONS = [
  '🏠', '🚗', '💍', '💻', '📱', '🎨', '📷',
  '🎸', '💎', '🏊', '🛋️', '🌿', '⌚', '🎬',
];