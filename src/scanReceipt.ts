import type { ExpenseCategory } from './types';
import { TODAY } from './utils';

export interface ScannedReceipt {
  amount?: number;
  date?: string;
  note?: string;
  category?: ExpenseCategory;
}

export async function scanReceiptImage(file: File, apiKey: string): Promise<ScannedReceipt> {
  const base64 = await toBase64(file);
  const mime = file.type || 'image/jpeg';

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mime, data: base64 } },
            { text: `Extract from this receipt image:
1. The final total amount paid (number only, e.g. 141.80 — use the TOTAL line, not subtotal or excl VAT)
2. The transaction date in YYYY-MM-DD format
3. The store or merchant name (short, e.g. "Steers Canal Walk")
4. The best category from: Food, Transport, Health, Shopping, Subscriptions, Beauty, Entertainment, Home, Education, Other

Respond with ONLY valid JSON — no explanation, no markdown:
{"amount": 141.80, "date": "2026-06-19", "note": "Steers Canal Walk", "category": "Food"}

Omit any field you cannot determine.` }
          ]
        }]
      })
    }
  );

  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) throw new Error('No JSON in response');
  const parsed = JSON.parse(match[0]);

  return {
    amount: typeof parsed.amount === 'number' ? parsed.amount : undefined,
    date: typeof parsed.date === 'string' && !isNaN(Date.parse(parsed.date)) ? parsed.date : TODAY,
    note: typeof parsed.note === 'string' && parsed.note.length > 0 ? parsed.note : undefined,
    category: parsed.category as ExpenseCategory | undefined,
  };
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
