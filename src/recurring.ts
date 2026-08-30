import type { RecurringExpense } from './types';

/* ── Month-key helpers ('YYYY-MM') ───────────────────── */

export function thisMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

export function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty * 12 + tm) - (fy * 12 + fm);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' });
}

export function shortMonthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' });
}

/* ── The core of the feature ─────────────────────────── */

/**
 * Payments you are still committed to, counting this month.
 * 0 means you can cut it today and keep the money from next month.
 *
 * A phone contract ending Feb 2027, looked at in Aug 2026, returns 7:
 * Aug, Sep, Oct, Nov, Dec, Jan, Feb.
 */
export function paymentsLeft(rec: RecurringExpense, from: string = thisMonthKey()): number {
  if (rec.commitment !== 'contract' || !rec.endMonth) return 0;
  return Math.max(0, monthDiff(from, rec.endMonth) + 1);
}

/** What the rest of the contract still costs you, in total. */
export function lockedInCost(rec: RecurringExpense, from: string = thisMonthKey()): number {
  return rec.amount * paymentsLeft(rec, from);
}

/** The first month the money is genuinely yours. */
export function freeFromMonth(rec: RecurringExpense, from: string = thisMonthKey()): string {
  return addMonths(from, paymentsLeft(rec, from));
}

export interface ProjectionPoint {
  month: string;
  label: string;
  /** Cumulative money freed up by this month. */
  saved: number;
  /** Cumulative contract payments you still have to hand over. */
  stillPaying: number;
  /** Per-month saving that has kicked in by this point. */
  monthly: number;
}

/**
 * Month-by-month runway for the expenses she has marked to cut.
 * Each one only starts contributing once its contract is done.
 */
export function project(
  cuts: RecurringExpense[],
  horizon: number,
  from: string = thisMonthKey(),
): ProjectionPoint[] {
  const left = cuts.map(r => ({ amount: r.amount, left: paymentsLeft(r, from) }));
  const points: ProjectionPoint[] = [];
  let saved = 0;
  let stillPaying = 0;

  for (let i = 0; i < horizon; i++) {
    let monthly = 0;
    let owed = 0;
    for (const r of left) {
      if (i >= r.left) monthly += r.amount;
      else owed += r.amount;
    }
    saved += monthly;
    stillPaying += owed;
    const month = addMonths(from, i);
    points.push({ month, label: shortMonthLabel(month), saved, stillPaying, monthly });
  }
  return points;
}

export interface Milestone {
  month: string;
  items: RecurringExpense[];
  /** Extra per-month freed at this milestone. */
  amount: number;
  /** Total per-month freed once this milestone lands. */
  runningMonthly: number;
}

/** 'Feb 2027 — phone contract ends, +R800/month' */
export function milestones(cuts: RecurringExpense[], from: string = thisMonthKey()): Milestone[] {
  const grouped = new Map<string, RecurringExpense[]>();
  for (const r of cuts) {
    const key = freeFromMonth(r, from);
    const list = grouped.get(key);
    if (list) list.push(r);
    else grouped.set(key, [r]);
  }
  let running = 0;
  return [...grouped.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, items]) => {
      const amount = items.reduce((s, r) => s + r.amount, 0);
      running += amount;
      return { month, items, amount, runningMonthly: running };
    });
}

/**
 * The month a savings target is reached on freed money alone.
 * null when it is still out of reach inside `max` months.
 */
export function goalReachedMonth(
  cuts: RecurringExpense[],
  needed: number,
  from: string = thisMonthKey(),
  max = 120,
): string | null {
  if (needed <= 0) return from;
  const left = cuts.map(r => ({ amount: r.amount, left: paymentsLeft(r, from) }));
  let saved = 0;
  for (let i = 0; i < max; i++) {
    for (const r of left) if (i >= r.left) saved += r.amount;
    if (saved >= needed) return addMonths(from, i);
  }
  return null;
}
