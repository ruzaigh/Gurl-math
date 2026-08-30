import { useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { Plus, Trash2, Pencil, Scissors, Lock, Unlock, Check, CalendarClock, Sparkles } from 'lucide-react';
import type { AppState, RecurringExpense, ExpenseCategory, ExpenseEntry, Commitment } from '../types';
import { fmt, uid, TODAY, EXPENSE_COLORS, EXPENSE_CATEGORIES } from '../utils';
import {
  thisMonthKey, monthLabel, shortMonthLabel, paymentsLeft, lockedInCost, freeFromMonth,
  project, milestones, goalReachedMonth,
} from '../recurring';
import { Modal } from '../components/Modal';

interface Props {
  state: AppState;
  update: (partial: Partial<AppState>) => void;
}

type Form = {
  name: string;
  amount: string;
  category: ExpenseCategory;
  commitment: Commitment;
  endMonth: string;
  intoAccountId: string;
};

const BLANK: Form = {
  name: '', amount: '', category: 'Subscriptions', commitment: 'flexible', endMonth: '', intoAccountId: '',
};

const HORIZONS = [12, 24, 36];

export function CutBack({ state, update }: Props) {
  const { recurring, accounts, expenses, settings } = state;
  const { currency } = settings;
  const now = thisMonthKey();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RecurringExpense | null>(null);
  const [form, setForm] = useState<Form>(BLANK);
  const [horizon, setHorizon] = useState(24);
  const [goalAccountId, setGoalAccountId] = useState(() => accounts.find(a => a.goal)?.id ?? '');

  const cuts = useMemo(() => recurring.filter(r => r.markedForCut), [recurring]);

  const stats = useMemo(() => {
    const recurringTotal = recurring.reduce((s, r) => s + r.amount, 0);
    const cutMonthly = cuts.reduce((s, r) => s + r.amount, 0);
    const freeNow = cuts.filter(r => paymentsLeft(r, now) === 0).reduce((s, r) => s + r.amount, 0);
    const lockedIn = cuts.reduce((s, r) => s + lockedInCost(r, now), 0);
    const points = project(cuts, Math.max(horizon, 12), now);
    const savedInHorizon = points[horizon - 1]?.saved ?? 0;
    const stones = milestones(cuts, now).map(stone => ({ ...stone, label: shortMonthLabel(stone.month) }));
    const freeFrom = stones.length ? stones[stones.length - 1].month : now;
    return { recurringTotal, cutMonthly, freeNow, lockedIn, points: points.slice(0, horizon), savedInHorizon, stones, freeFrom };
  }, [recurring, cuts, horizon, now]);

  const goalAccount = accounts.find(a => a.id === goalAccountId);
  const goalMonth = goalAccount?.goal
    ? goalReachedMonth(cuts, goalAccount.goal - goalAccount.balance, now)
    : null;

  const sorted = useMemo(
    () => [...recurring].sort((a, b) => paymentsLeft(a, now) - paymentsLeft(b, now) || b.amount - a.amount),
    [recurring, now],
  );

  /* ── Actions ───────────────────────────────────────── */

  function openAdd() {
    setEditing(null);
    setForm(BLANK);
    setShowForm(true);
  }

  function openEdit(rec: RecurringExpense) {
    setEditing(rec);
    setForm({
      name: rec.name,
      amount: String(rec.amount),
      category: rec.category,
      commitment: rec.commitment,
      endMonth: rec.endMonth ?? '',
      intoAccountId: rec.intoAccountId ?? '',
    });
    setShowForm(true);
  }

  function save() {
    const amount = parseFloat(form.amount);
    if (!form.name.trim() || !amount) return;
    const isContract = form.commitment === 'contract' && Boolean(form.endMonth);
    const fields = {
      name: form.name.trim(),
      amount,
      category: form.category,
      commitment: form.commitment,
      endMonth: isContract ? form.endMonth : undefined,
      intoAccountId: form.intoAccountId || undefined,
    };
    if (editing) {
      update({ recurring: recurring.map(r => (r.id === editing.id ? { ...r, ...fields } : r)) });
    } else {
      update({ recurring: [...recurring, { id: uid(), markedForCut: false, ...fields }] });
    }
    setShowForm(false);
  }

  function toggleCut(id: string) {
    update({ recurring: recurring.map(r => (r.id === id ? { ...r, markedForCut: !r.markedForCut } : r)) });
  }

  function remove(id: string) {
    if (!confirm('Remove this recurring expense?')) return;
    update({ recurring: recurring.filter(r => r.id !== id) });
  }

  /** Drop this month's payment into the real expense list. */
  function logPayment(rec: RecurringExpense) {
    const entry: ExpenseEntry = {
      id: uid(), amount: rec.amount, category: rec.category, note: rec.name, date: TODAY,
    };
    update({
      expenses: [entry, ...expenses],
      recurring: recurring.map(r => (r.id === rec.id ? { ...r, lastLoggedMonth: now } : r)),
    });
  }

  /* ── Render ────────────────────────────────────────── */

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="section-title">Cut Back</h1>
          <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '460px' }}>
            Every bill that repeats, and what it would really free up. Contracts only start
            saving you money once they run out.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={15} /> Add Recurring
        </button>
      </div>

      {recurring.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">✂️</div>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>No recurring expenses yet</p>
          <p style={{ fontSize: '13px', maxWidth: '380px', margin: '0 auto' }}>
            Add the things that come off every month — phone contract, gym, streaming — and tick
            the ones you'd like to cut to see what you'd save.
          </p>
        </div>
      ) : (
        <>
          {/* Hero */}
          <div className="hero-gradient" style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '12px', opacity: 0.75, marginBottom: '6px', letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 600 }}>
              {cuts.length === 0 ? 'Tick what you want to cut' : 'Once these are gone'}
            </p>
            <div className="money-text" style={{ fontSize: '44px', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.1 }}>
              {fmt(stats.cutMonthly, currency)}<span style={{ fontSize: '20px', fontWeight: 700, opacity: 0.7 }}> /month</span>
            </div>
            {cuts.length > 0 && (
              <div style={{ display: 'flex', gap: '24px', marginTop: '18px', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: '12px', opacity: 0.65 }}>Free right now</p>
                  <p className="money-text" style={{ fontSize: '17px', fontWeight: 700 }}>{fmt(stats.freeNow, currency)}/mo</p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', opacity: 0.65 }}>Fully free from</p>
                  <p className="money-text" style={{ fontSize: '17px', fontWeight: 700 }}>{monthLabel(stats.freeFrom)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', opacity: 0.65 }}>Saved in {horizon} months</p>
                  <p className="money-text" style={{ fontSize: '17px', fontWeight: 700 }}>{fmt(stats.savedInHorizon, currency)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Stat tiles */}
          <div className="stat-grid">
            {([
              { label: 'All recurring', amount: stats.recurringTotal, sub: 'every month', Icon: CalendarClock, color: '#2563EB', bg: '#DBEAFE' },
              { label: 'Marked to cut', amount: stats.cutMonthly, sub: `${cuts.length} of ${recurring.length}`, Icon: Scissors, color: '#16A34A', bg: '#DCFCE7' },
              { label: 'Still locked in', amount: stats.lockedIn, sub: 'left to pay on contracts', Icon: Lock, color: '#BE185D', bg: '#FCE7F3' },
            ] as const).map(({ label, amount, sub, Icon, color, bg }) => (
              <div key={label} className="stat-tile">
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
                  <div style={{ background: bg, borderRadius: '8px', padding: '5px', display: 'flex', color }}>
                    <Icon size={14} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>{label}</span>
                </div>
                <div className="money-text" style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                  {fmt(amount, currency)}
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Runway chart */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600 }}>Your savings runway</p>
              <div style={{ display: 'flex', gap: '6px' }}>
                {HORIZONS.map(h => (
                  <button
                    key={h}
                    onClick={() => setHorizon(h)}
                    className="btn"
                    style={{
                      padding: '5px 12px', fontSize: '12px',
                      background: horizon === h ? '#DBEAFE' : '#F1F5FA',
                      color: horizon === h ? '#1D4ED8' : '#64748B',
                    }}
                  >
                    {h}m
                  </button>
                ))}
              </div>
            </div>
            {cuts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontSize: '13px' }}>
                Tick an expense below to see the money pile up.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={stats.points} margin={{ top: 22, right: 8, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="savedFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#16A34A" stopOpacity={0.32} />
                        <stop offset="100%" stopColor="#16A34A" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="payingFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#BE185D" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#BE185D" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#F1F5FA" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(val, name) => [typeof val === 'number' ? fmt(val, currency) : String(val), name]}
                      labelFormatter={(_, payload) => (payload?.[0] ? monthLabel(payload[0].payload.month) : '')}
                    />
                    {stats.stones
                      .filter(stone => stone.month !== now && stats.points.some(pt => pt.month === stone.month))
                      .map(stone => (
                        <ReferenceLine
                          key={stone.month}
                          x={stone.label}
                          stroke="#B45309"
                          strokeDasharray="4 4"
                          label={{ value: `🔓 +${fmt(stone.amount, currency)}/mo`, position: 'top', fontSize: 10, fill: '#B45309', fontWeight: 600 }}
                        />
                      ))}
                    <Area type="monotone" dataKey="stillPaying" name="Still paid out" stroke="#BE185D" strokeWidth={2} fill="url(#payingFill)" />
                    <Area type="monotone" dataKey="saved" name="Money freed up" stroke="#16A34A" strokeWidth={2.5} fill="url(#savedFill)" />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: '14px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', color: '#64748B' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#16A34A' }} /> Money freed up
                  </span>
                  <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', color: '#64748B' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#BE185D' }} /> Still paid out on contracts
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Unlock dates + goal */}
          {cuts.length > 0 && (
            <div className="chart-grid">
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Unlock size={15} color="#16A34A" />
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>Unlock dates</p>
                </div>
                {stats.stones.map(stone => (
                  <div key={stone.month} className="activity-row">
                    <div className="activity-icon" style={{ background: stone.month === now ? '#DCFCE7' : '#FEF3C7', fontSize: '18px' }}>
                      {stone.month === now ? '🎉' : '🔓'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>
                        {stone.month === now ? 'Available today' : monthLabel(stone.month)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {stone.items.map(r => r.name).join(', ')} · then {fmt(stone.runningMonthly, currency)}/mo total
                      </div>
                    </div>
                    <div className="money-text" style={{ fontSize: '15px', fontWeight: 700, color: '#16A34A', flexShrink: 0 }}>
                      +{fmt(stone.amount, currency)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Sparkles size={15} color="#2563EB" />
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>Put it towards a goal</p>
                </div>
                {accounts.filter(a => a.goal).length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#94A3B8' }}>
                    Set a goal on a savings account and we'll work out when this freed-up money gets you there.
                  </p>
                ) : (
                  <>
                    <select
                      className="field-input"
                      value={goalAccountId}
                      onChange={e => setGoalAccountId(e.target.value)}
                    >
                      <option value="">Choose an account…</option>
                      {accounts.filter(a => a.goal).map(a => (
                        <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                      ))}
                    </select>
                    {goalAccount?.goal != null && (
                      <div style={{ marginTop: '14px' }}>
                        <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6 }}>
                          {goalAccount.balance >= goalAccount.goal ? (
                            <>You've already hit the {fmt(goalAccount.goal, currency)} goal on {goalAccount.name}. 🎉</>
                          ) : goalMonth ? (
                            <>
                              Putting {fmt(stats.cutMonthly, currency)}/month into{' '}
                              <strong>{goalAccount.name}</strong> takes it from{' '}
                              {fmt(goalAccount.balance, currency)} to its{' '}
                              {fmt(goalAccount.goal, currency)} goal by
                            </>
                          ) : (
                            <>At {fmt(stats.cutMonthly, currency)}/month this goal is still more than 10 years out.</>
                          )}
                        </p>
                        {goalMonth && goalAccount.balance < goalAccount.goal && (
                          <p className="money-text" style={{ fontSize: '22px', fontWeight: 900, color: '#2563EB', marginTop: '6px' }}>
                            {monthLabel(goalMonth)}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* The list */}
          <div className="card" style={{ padding: '4px 20px' }}>
            {sorted.map(rec => {
              const color = EXPENSE_COLORS[rec.category];
              const left = paymentsLeft(rec, now);
              const locked = lockedInCost(rec, now);
              const cut = rec.markedForCut;
              const loggedThisMonth = rec.lastLoggedMonth === now;
              return (
                <div key={rec.id} className="activity-row" style={{ alignItems: 'flex-start' }}>
                  <button
                    onClick={() => toggleCut(rec.id)}
                    title={cut ? 'Keep this one' : 'Mark this one to cut'}
                    style={{
                      width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                      border: cut ? '2px solid #16A34A' : '2px solid #E2EAF4',
                      background: cut ? '#DCFCE7' : `${color}12`,
                      color: '#16A34A', transition: 'all 0.15s',
                    }}
                  >
                    {cut ? <Check size={18} /> : categoryEmoji(rec.category)}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{rec.name}</div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '3px' }}>
                      <span style={{ background: `${color}15`, color, padding: '1px 8px', borderRadius: '10px', fontWeight: 600 }}>{rec.category}</span>
                      {left === 0 ? (
                        <span style={{ background: '#DCFCE7', color: '#16A34A', padding: '1px 8px', borderRadius: '10px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Unlock size={10} /> Cancel anytime
                        </span>
                      ) : (
                        <span style={{ background: '#FEF3C7', color: '#B45309', padding: '1px 8px', borderRadius: '10px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Lock size={10} /> {left} {left === 1 ? 'payment' : 'payments'} left · free {monthLabel(freeFromMonth(rec, now))}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: cut ? '#475569' : '#94A3B8', marginTop: '5px', lineHeight: 1.5 }}>
                      {left === 0 ? (
                        <>Cut it and you keep <strong>{fmt(rec.amount, currency)}</strong> a month — {fmt(rec.amount * 12, currency)} a year.</>
                      ) : (
                        <>
                          <strong>{fmt(locked, currency)}</strong> still to pay ({left} × {fmt(rec.amount, currency)}),
                          then <strong>{fmt(rec.amount, currency)}</strong> a month is yours from {monthLabel(freeFromMonth(rec, now))}.
                        </>
                      )}
                    </div>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '4px 10px', fontSize: '11px', marginTop: '7px' }}
                      onClick={() => logPayment(rec)}
                      disabled={loggedThisMonth}
                    >
                      {loggedThisMonth ? '✓ Logged this month' : "Log this month's payment"}
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <div className="money-text" style={{ fontSize: '16px', fontWeight: 700, color: cut ? '#16A34A' : '#BE185D' }}>
                      {fmt(rec.amount, currency)}
                    </div>
                    <button onClick={() => openEdit(rec)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px', display: 'flex' }}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => remove(rec.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', padding: '4px', display: 'flex' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit Recurring Expense' : 'New Recurring Expense'} onClose={() => setShowForm(false)}>
          <div className="form-row">
            <div>
              <label className="field-label">What is it?</label>
              <input className="field-input" placeholder="e.g. Phone contract" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-row form-row-2">
              <div>
                <label className="field-label">Per month ({currency})</label>
                <input className="field-input" type="number" min="0" placeholder="800" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Category</label>
                <select className="field-input" value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))}>
                  {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="field-label">Can you cancel it?</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {([
                  { value: 'flexible' as const, title: 'Cancel anytime', sub: 'Money is yours now', Icon: Unlock },
                  { value: 'contract' as const, title: 'Locked in', sub: 'Contract runs until…', Icon: Lock },
                ]).map(({ value, title, sub, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, commitment: value }))}
                    style={{
                      textAlign: 'left', padding: '11px 13px', borderRadius: '12px', cursor: 'pointer',
                      border: `2px solid ${form.commitment === value ? '#2563EB' : '#E2EAF4'}`,
                      background: form.commitment === value ? '#DBEAFE' : '#F8FAFC',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                      <Icon size={13} /> {title}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>{sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {form.commitment === 'contract' && (
              <div>
                <label className="field-label">Last month you have to pay</label>
                <input className="field-input" type="month" min={thisMonthKey()} value={form.endMonth}
                  onChange={e => setForm(f => ({ ...f, endMonth: e.target.value }))} />
                {form.endMonth && form.amount && (
                  <p style={{ fontSize: '12px', color: '#B45309', marginTop: '6px', lineHeight: 1.5 }}>
                    {(() => {
                      const left = paymentsLeft({ commitment: 'contract', endMonth: form.endMonth } as RecurringExpense, thisMonthKey());
                      const amt = parseFloat(form.amount) || 0;
                      return left === 0
                        ? 'That contract is already done — the money is yours.'
                        : `${left} more ${left === 1 ? 'payment' : 'payments'} (${fmt(left * amt, currency)}), free from ${monthLabel(freeFromMonth({ commitment: 'contract', endMonth: form.endMonth } as RecurringExpense, thisMonthKey()))}.`;
                    })()}
                  </p>
                )}
              </div>
            )}

            {accounts.length > 0 && (
              <div>
                <label className="field-label">
                  Save it into <span style={{ color: '#94A3B8', fontWeight: 400 }}>optional</span>
                </label>
                <select className="field-input" value={form.intoAccountId}
                  onChange={e => setForm(f => ({ ...f, intoAccountId: e.target.value }))}>
                  <option value="">Not earmarked</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                </select>
              </div>
            )}

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={save}>
              {editing ? 'Save Changes' : 'Add Recurring Expense'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function categoryEmoji(cat: ExpenseCategory): string {
  const map: Record<ExpenseCategory, string> = {
    Food: '🍔', Transport: '🚗', Shopping: '🛍️', Entertainment: '🎉',
    Health: '💊', Beauty: '💄', Home: '🏠', Subscriptions: '📱', Education: '📚', Other: '💳',
  };
  return map[cat] ?? '💳';
}
