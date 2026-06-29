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
  // Use a worker directly so we can pass rotateAuto — fixes sideways/upside-down photos
  const worker = await Tesseract.createWorker('eng');
  try {
    const result = await worker.recognize(file, { rotateAuto: true });
    return parseReceiptText(result.data.text);
  } finally {
    await worker.terminate();
  }
}

function parseReceiptText(raw: string): ScannedReceipt {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  // Amount — priority 1: TOTAL / TOTAAL / AMOUNT DUE labelled line
  let amount: number | undefined;
  const totalLine = lines.find(l =>
    /\b(total|totaal|amount\s*due|balance\s*due|subtotal)\b/i.test(l)
  );
  if (totalLine) {
    // Match R-prefixed (SA Rand) or bare decimal amounts
    const m = totalLine.match(/R\s*(\d[\d\s]*[.,]\d{2})|(\d[\d\s]*[.,]\d{2})/i);
    if (m) {
      const raw = (m[1] ?? m[2]).replace(/\s/g, '').replace(',', '.');
      amount = parseFloat(raw);
    }
  }
  // Amount — priority 2: largest R-prefixed amount anywhere in the text
  if (!amount) {
    const rNums: number[] = [];
    for (const m of raw.matchAll(/R\s*(\d{1,6}[.,]\d{2})/gi)) {
      if (m[1]) rNums.push(parseFloat(m[1].replace(',', '.')));
    }
    if (rNums.length) amount = Math.max(...rNums);
  }
  // Amount — priority 3: largest bare decimal number in the text
  if (!amount) {
    const nums: number[] = [];
    for (const m of raw.matchAll(/(\d{1,6}[.,]\d{2})/g)) {
      if (m[1]) nums.push(parseFloat(m[1].replace(',', '.')));
    }
    if (nums.length) amount = Math.max(...nums);
  }

  // Date — DD/MM/YYYY or DD-MM-YYYY (common on SA receipts)
  let date: string | undefined;
  const d1 = raw.match(/\b(\d{2})[/\-.](\d{2})[/\-.](\d{4})\b/);
  if (d1) {
    const candidate = `${d1[3]}-${d1[2]}-${d1[1]}`;
    if (!isNaN(Date.parse(candidate))) date = candidate;
  }
  // Date — DD Mon YYYY (e.g. "19 Jun 2026")
  if (!date) {
    const d2 = raw.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})\b/i);
    if (d2) {
      const candidate = new Date(`${d2[2]} ${d2[1]} ${d2[3]}`).toISOString().slice(0, 10);
      if (!isNaN(Date.parse(candidate))) date = candidate;
    }
  }
  // Date — YYYY-MM-DD ISO fallback
  if (!date) {
    const d3 = raw.match(/\b(\d{4})[/-](\d{2})[/-](\d{2})\b/);
    if (d3) {
      const candidate = `${d3[1]}-${d3[2]}-${d3[3]}`;
      if (!isNaN(Date.parse(candidate))) date = candidate;
    }
  }

  // Note — first "clean" line: mostly letters/digits, < 30% special chars
  const note = lines.find(l => {
    if (l.length < 3 || /^\d/.test(l)) return false;
    const specials = (l.match(/[^a-zA-Z0-9\s&'.,-]/g) ?? []).length;
    return specials / l.length < 0.3;
  });

  // Category — search all text for keywords, not just the note
  const kw = raw.toLowerCase();
  let category: ExpenseCategory | undefined;
  if (/pick\s*n\s*pay|woolworths|checkers|spar|shoprite|steers|kfc|mcdonald|nandos|spur|wimpy|pizza|sushi|restaurant|cafe|bakery|butcher|grocer|food\s*court/.test(kw))
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
