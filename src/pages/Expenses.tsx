import { useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import type { AppState, ExpenseEntry, ExpenseCategory } from '../types';
import { fmt, uid, TODAY, displayDate, thisMonth, EXPENSE_COLORS, EXPENSE_CATEGORIES } from '../utils';
import { Modal } from '../components/Modal';

interface Props {
  state: AppState;
  update: (partial: Partial<AppState>) => void;
}

type Form = { amount: string; category: ExpenseCategory; note: string; date: string; payFromId: string };

const PAGE_SIZE = 8;

export function Expenses({ state, update }: Props) {
  const { expenses, accounts, settings } = state;
  const { currency } = settings;
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Form>({ amount: '', category: 'Food', note: '', date: TODAY, payFromId: '' });

  // Edit state
  const [editing, setEditing] = useState<ExpenseEntry | null>(null);
  const [eAmt, setEAmt] = useState(0);
  const [eDate, setEDate] = useState(TODAY);
  const [eCat, setECat] = useState<ExpenseCategory>('Food');
  const [eNote, setENote] = useState('');
  const [ePayFrom, setEPayFrom] = useState('');

  // Pagination
  const [page, setPage] = useState(1);

  const month = thisMonth();
  const monthTotal = expenses.filter(e => e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0);
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const visible = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function openAdd() {
    setForm({ amount: '', category: 'Food', note: '', date: TODAY, payFromId: '' });
    setShowAdd(true);
  }

  function save() {
    const amount = parseFloat(form.amount);
    if (!amount) return;
    const entry: ExpenseEntry = {
      id: uid(), amount, category: form.category, note: form.note.trim(), date: form.date, payFromId: form.payFromId || undefined,
    };
    let updatedAccounts = accounts;
    if (form.payFromId) {
      updatedAccounts = accounts.map(a => a.id === form.payFromId ? { ...a, balance: a.balance - amount } : a);
    }
    update({ expenses: [entry, ...expenses], accounts: updatedAccounts });
    setShowAdd(false);
    setPage(1);
  }

  function remove(id: string) {
    if (!confirm('Remove this expense?')) return;
    update({ expenses: expenses.filter(e => e.id !== id) });
    setPage(1);
  }

  function openEdit(ex: ExpenseEntry) {
    setEditing(ex);
    setEAmt(ex.amount);
    setEDate(ex.date);
    setECat(ex.category);
    setENote(ex.note);
    setEPayFrom(ex.payFromId ?? '');
  }

  function saveEdit() {
    if (!editing) return;
    let updatedAccounts = [...accounts];
    // Reverse old payFromId effect
    if (editing.payFromId) {
      updatedAccounts = updatedAccounts.map(a =>
        a.id === editing.payFromId ? { ...a, balance: a.balance + editing.amount } : a
      );
    }
    // Apply new payFromId effect
    if (ePayFrom) {
      updatedAccounts = updatedAccounts.map(a =>
        a.id === ePayFrom ? { ...a, balance: a.balance - eAmt } : a
      );
    }
    update({
      expenses: state.expenses.map(e =>
        e.id === editing.id
          ? { ...editing, amount: eAmt, date: eDate, category: eCat, note: eNote, payFromId: ePayFrom || undefined }
          : e
      ),
      accounts: updatedAccounts,
    });
    setEditing(null);
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="section-title">Expenses</h1>
          <p style={{ fontSize: '13px', color: '#64748B' }}>
            This month: <span className="money-text" style={{ fontWeight: 700, fontSize: '15px', color: '#BE185D' }}>{fmt(monthTotal, currency)}</span>
          </p>
        </div>
        <button className="btn" style={{ background: '#FCE7F3', color: '#BE185D' }} onClick={openAdd}>
          <Plus size={15} /> Log Expense
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">💸</div>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>No expenses yet</p>
          <p style={{ fontSize: '13px' }}>Track your spending here.</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: '4px 20px' }}>
            {visible.map(entry => {
              const color = EXPENSE_COLORS[entry.category];
              return (
                <div key={entry.id} className="activity-row">
                  <div className="activity-icon" style={{ background: `${color}18`, fontSize: '18px' }}>
                    {categoryEmoji(entry.category)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{entry.note || entry.category}</div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                      <span style={{ background: `${color}15`, color, padding: '1px 8px', borderRadius: '10px', fontWeight: 600 }}>{entry.category}</span>
                      <span>{displayDate(entry.date)}</span>
                      {entry.payFromId && <span>· {accounts.find(a => a.id === entry.payFromId)?.name ?? 'account'}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <div className="money-text" style={{ fontSize: '16px', fontWeight: 700, color: '#BE185D' }}>
                      −{fmt(entry.amount, currency)}
                    </div>
                    <button onClick={() => openEdit(entry)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px', display: 'flex' }}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => remove(entry.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', padding: '4px', display: 'flex' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 4px 0' }}>
              <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>← Prev</button>
              <span style={{ fontSize: '13px', color: '#64748B' }}>Page {safePage} of {totalPages}</span>
              <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>Next →</button>
            </div>
          )}
        </>
      )}

      {showAdd && (
        <Modal title="Log Expense" onClose={() => setShowAdd(false)}>
          <div className="form-row">
            <div className="form-row form-row-2">
              <div>
                <label className="field-label">Amount ({currency})</label>
                <input className="field-input" type="number" min="0" placeholder="0" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Date</label>
                <input className="field-input" type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="field-label">Category</label>
              <select className="field-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))}>
                {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Note <span style={{ color: '#94A3B8', fontWeight: 400 }}>optional</span></label>
              <input className="field-input" placeholder="What was this for?" value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </div>
            {accounts.length > 0 && (
              <div>
                <label className="field-label">Pay From Account <span style={{ color: '#94A3B8', fontWeight: 400 }}>optional</span></label>
                <select className="field-input" value={form.payFromId} onChange={e => setForm(f => ({ ...f, payFromId: e.target.value }))}>
                  <option value="">Don't deduct from account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name} ({fmt(a.balance, currency)})</option>)}
                </select>
              </div>
            )}
            <button className="btn" style={{ width: '100%', justifyContent: 'center', background: '#BE185D', color: '#fff' }} onClick={save}>
              Log Expense
            </button>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Expense" onClose={() => setEditing(null)}>
          <div className="form-row">
            <div className="form-row form-row-2">
              <div>
                <label className="field-label">Amount ({currency})</label>
                <input className="field-input" type="number" min="0" placeholder="0" value={eAmt}
                  onChange={e => setEAmt(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="field-label">Date</label>
                <input className="field-input" type="date" value={eDate}
                  onChange={e => setEDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="field-label">Category</label>
              <select className="field-input" value={eCat} onChange={e => setECat(e.target.value as ExpenseCategory)}>
                {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Note <span style={{ color: '#94A3B8', fontWeight: 400 }}>optional</span></label>
              <input className="field-input" placeholder="What was this for?" value={eNote}
                onChange={e => setENote(e.target.value)} />
            </div>
            {accounts.length > 0 && (
              <div>
                <label className="field-label">Pay From Account <span style={{ color: '#94A3B8', fontWeight: 400 }}>optional</span></label>
                <select className="field-input" value={ePayFrom} onChange={e => setEPayFrom(e.target.value)}>
                  <option value="">Don't deduct from account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name} ({fmt(a.balance, currency)})</option>)}
                </select>
              </div>
            )}
            <button className="btn" style={{ width: '100%', justifyContent: 'center', background: '#BE185D', color: '#fff' }} onClick={saveEdit}>
              Save Changes
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
