import Tesseract from 'tesseract.js';
import type { ExpenseCategory } from './types';
import { TODAY } from './utils';

export interface ScannedReceipt {
  amount?: number;
  date?: string;
  note?: string;
  category?: ExpenseCategory;
}

export async function scanReceiptImage(file: File): Promise<ScannedReceipt> {
  const result = await Tesseract.recognize(file, 'eng');
  return parseReceiptText(result.data.text);
}

function parseReceiptText(raw: string): ScannedReceipt {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  // Amount — priority 1: line labelled TOTAL / TOTAAL / AMOUNT DUE
  let amount: number | undefined;
  const totalLine = lines.find(l =>
    /\b(total|totaal|amount\s*due|balance\s*due|subtotal)\b/i.test(l)
  );
  if (totalLine) {
    const m = totalLine.match(/(\d[\d\s]*[.,]\d{2})/);
    if (m) amount = parseFloat(m[1].replace(/\s/g, '').replace(',', '.'));
  }
  // Amount — priority 2: largest currency-formatted number in the text
  if (!amount) {
    const nums: number[] = [];
    for (const m of raw.matchAll(/(\d{1,6}[.,]\d{2})/g)) {
      if (m[1]) nums.push(parseFloat(m[1].replace(',', '.')));
    }
    if (nums.length) amount = Math.max(...nums);
  }

  // Date — DD/MM/YYYY common on SA receipts, fallback YYYY-MM-DD
  let date: string | undefined;
  const d1 = raw.match(/\b(\d{2})[/\-.](\d{2})[/\-.](\d{4})\b/);
  if (d1) {
    const candidate = `${d1[3]}-${d1[2]}-${d1[1]}`;
    if (!isNaN(Date.parse(candidate))) date = candidate;
  }
  if (!date) {
    const d2 = raw.match(/\b(\d{4})[/-](\d{2})[/-](\d{2})\b/);
    if (d2) {
      const candidate = `${d2[1]}-${d2[2]}-${d2[3]}`;
      if (!isNaN(Date.parse(candidate))) date = candidate;
    }
  }

  // Note — first non-numeric line (likely the store / merchant name)
  const note = lines.find(l => l.length >= 3 && !/^\d/.test(l));

  // Category — keyword match on the note
  let category: ExpenseCategory | undefined;
  const kw = (note ?? '').toLowerCase();
  if (/pick\s*n\s*pay|woolworths|checkers|spar|shoprite|food|grocer|bakery|butcher|kfc|mcdonald|steers|nandos|spur|wimpy|pizza|sushi|restaurant|cafe/.test(kw))
    category = 'Food';
  else if (/uber|bolt|taxi|petrol|engen|shell|bp|caltex|fuel|motor|garage|park/.test(kw))
    category = 'Transport';
  else if (/clicks|dis.?chem|pharmacy|hospital|clinic|dentist|doctor|medic/.test(kw))
    category = 'Health';
  else if (/edgars|h&m|zara|mr\s*price|woolies|fashion|clothing|shoes|sport/.test(kw))
    category = 'Shopping';
  else if (/netflix|spotify|dstv|showmax|amazon|google|apple|microsoft|subscription/.test(kw))
    category = 'Subscriptions';
  else if (/salon|barber|nails|spa|beauty|lush/.test(kw))
    category = 'Beauty';

  return { amount, date: date ?? TODAY, note, category };
}
