import Tesseract from 'tesseract.js';
import type { ExpenseCategory } from './types';
import { TODAY } from './utils';

export interface ScannedReceipt {
  amount?: number;
  date?: string;
  note?: string;
  category?: ExpenseCategory;
}

// Phone photos of receipts on a table are usually landscape — rotate 90° CW
// so the receipt text reads top-to-bottom before Tesseract sees it.
async function prepareImage(file: File): Promise<File | Blob> {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.naturalWidth <= img.naturalHeight) { resolve(file); return; }
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
      const ctx = canvas.getContext('2d')!;
      ctx.translate(canvas.width, 0);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => resolve(blob ?? file), 'image/jpeg', 0.92);
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
}

export async function scanReceiptImage(file: File): Promise<ScannedReceipt> {
  const image = await prepareImage(file);
  const worker = await Tesseract.createWorker('eng');
  try {
    const result = await worker.recognize(image, { rotateAuto: true });
    return parseReceiptText(result.data.text);
  } finally {
    await worker.terminate();
  }
}

function parseReceiptText(raw: string): ScannedReceipt {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  // Amount — priority 1: find TOTAL / AMOUNT DUE line, grab number on same line
  let amount: number | undefined;
  const totalLine = lines.find(l =>
    /\b(total|totaal|amount\s*due|balance\s*due)\b/i.test(l)
  );
  if (totalLine) {
    const m = totalLine.match(/R\s*(\d[\d\s]*[.,]\d{2})|(\d[\d\s]*[.,]\d{2})/i);
    if (m) amount = parseFloat((m[1] ?? m[2]).replace(/\s/g, '').replace(',', '.'));
  }
  // Amount — priority 2: number on the line immediately after TOTAL
  if (!amount && totalLine) {
    const idx = lines.indexOf(totalLine);
    if (idx >= 0 && idx + 1 < lines.length) {
      const m = lines[idx + 1].match(/R\s*(\d[\d\s]*[.,]\d{2})|(\d[\d\s]*[.,]\d{2})/i);
      if (m) amount = parseFloat((m[1] ?? m[2]).replace(/\s/g, '').replace(',', '.'));
    }
  }
  // Amount — priority 3: largest R-prefixed amount in the whole text (SA Rand)
  if (!amount) {
    const rNums: number[] = [];
    for (const m of raw.matchAll(/R\s*(\d{1,6}[.,]\d{2})/gi)) {
      if (m[1]) rNums.push(parseFloat(m[1].replace(',', '.')));
    }
    if (rNums.length) amount = Math.max(...rNums);
  }
  // Amount — priority 4: largest bare decimal number
  if (!amount) {
    const nums: number[] = [];
    for (const m of raw.matchAll(/(\d{1,6}[.,]\d{2})/g)) {
      if (m[1]) nums.push(parseFloat(m[1].replace(',', '.')));
    }
    if (nums.length) amount = Math.max(...nums);
  }

  // Date — DD/MM/YYYY or DD-MM-YYYY
  let date: string | undefined;
  const d1 = raw.match(/\b(\d{2})[/\-.](\d{2})[/\-.](\d{4})\b/);
  if (d1) {
    const c = `${d1[3]}-${d1[2]}-${d1[1]}`;
    if (!isNaN(Date.parse(c))) date = c;
  }
  // Date — "19 Jun 2026" style (common on SA receipts)
  if (!date) {
    const d2 = raw.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})\b/i);
    if (d2) {
      const c = new Date(`${d2[2]} ${d2[1]} ${d2[3]}`).toISOString().slice(0, 10);
      if (!isNaN(Date.parse(c))) date = c;
    }
  }
  // Date — YYYY-MM-DD ISO
  if (!date) {
    const d3 = raw.match(/\b(\d{4})[/-](\d{2})[/-](\d{2})\b/);
    if (d3) {
      const c = `${d3[1]}-${d3[2]}-${d3[3]}`;
      if (!isNaN(Date.parse(c))) date = c;
    }
  }

  // Note — only fill if we find a genuinely readable line; leave empty rather than show garbage
  const note = lines.find(l => {
    if (l.length < 4 || /^\d/.test(l)) return false;
    const specials = (l.match(/[^a-zA-Z0-9\s&'.,-]/g) ?? []).length;
    if (specials / l.length >= 0.25) return false;
    return /[a-zA-Z]{4,}/.test(l); // must contain at least one real word (4+ letters)
  });

  // Category — scan full OCR text so it works even if note is empty
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
