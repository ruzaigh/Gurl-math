import { useState } from 'react';
import { Plus, Trash2, ArrowDownLeft } from 'lucide-react';
import type { AppState, ReceivedEntry, IncomeCategory } from '../types';
import { fmt, uid, TODAY, displayDate, thisMonth } from '../utils';
import { Modal } from '../components/Modal';

interface Props {
  state: AppState;
  update: (partial: Partial<AppState>) => void;
}

const CATEGORIES: IncomeCategory[] = ['Gift', 'Salary', 'Freelance', 'Repayment', 'Sale', 'Other'];

const CAT_COLORS: Record<IncomeCategory, string> = {
  Gift: '#15803D', Salary: '#166534', Freelance: '#16A34A',
  Repayment: '#22C55E', Sale: '#4ADE80', Other: '#86EFAC',
};

type Form = { amount: string; fromWhom: string; category: IncomeCategory; date: string; note: string; depositToId: string };

export function Received({ state, update }: Props) {
  const { received, accounts, settings } = state;
  const { currency } = settings;
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Form>({ amount: '', fromWhom: '', category: 'Gift', date: TODAY, note: '', depositToId: '' });

  const month = thisMonth();
  const monthTotal = received.filter(r => r.date.startsWith(month)).reduce((s, r) => s + r.amount, 0);
  const sorted = [...received].sort((a, b) => b.date.localeCompare(a.date));

  function openAdd() {
    setForm({ amount: '', fromWhom: '', category: 'Gift', date: TODAY, note: '', depositToId: '' });
    setShowAdd(true);
  }

  function save() {
    const amount = parseFloat(form.amount);
    if (!amount || !form.fromWhom.trim()) return;
    const entry: ReceivedEntry = {
      id: uid(), amount, fromWhom: form.fromWhom.trim(), category: form.category,
      date: form.date, note: form.note.trim(), depositToId: form.depositToId || undefined,
    };
    let updatedAccounts = accounts;
    if (form.depositToId) {
      updatedAccounts = accounts.map(a => a.id === form.depositToId ? { ...a, balance: a.balance + amount } : a);
    }
    update({ received: [entry, ...received], accounts: updatedAccounts });
    setShowAdd(false);
  }

  function remove(id: string) {
    if (!confirm('Remove this entry?')) return;
    update({ received: received.filter(r => r.id !== id) });
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="section-title">Money Received</h1>
          <p style={{ fontSize: '13px', color: '#64748B' }}>
            This month: <span className="money-text" style={{ fontWeight: 700, fontSize: '15px', color: '#16A34A' }}>{fmt(monthTotal, currency)}</span>
          </p>
        </div>
        <button className="btn btn-green" onClick={openAdd}>
          <Plus size={15} /> Log Income
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">💚</div>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>Nothing logged yet</p>
          <p style={{ fontSize: '13px' }}>Tap "Log Income" to record money you receive.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: '4px 20px' }}>
          {sorted.map(entry => (
            <div key={entry.id} className="activity-row">
              <div className="activity-icon" style={{ background: '#DCFCE7' }}>
                <ArrowDownLeft size={18} color="#16A34A" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>From {entry.fromWhom}</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                  <span style={{
                    background: `${CAT_COLORS[entry.category]}18`,
                    color: CAT_COLORS[entry.category],
                    padding: '1px 8px', borderRadius: '10px', fontWeight: 600,
                  }}>{entry.category}</span>
                  <span>{displayDate(entry.date)}</span>
                  {entry.note && <span>· {entry.note}</span>}
                  {entry.depositToId && (
                    <span>· → {accounts.find(a => a.id === entry.depositToId)?.name ?? 'account'}</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <div className="money-text" style={{ fontSize: '16px', fontWeight: 700, color: '#16A34A' }}>
                  +{fmt(entry.amount, currency)}
                </div>
                <button onClick={() => remove(entry.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', padding: '4px', display: 'flex' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Log Income" onClose={() => setShowAdd(false)}>
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
              <label className="field-label">From Whom</label>
              <input className="field-input" placeholder="e.g. Mom, Employer, Client" value={form.fromWhom}
                onChange={e => setForm(f => ({ ...f, fromWhom: e.target.value }))} />
            </div>
            <div>
              <label className="field-label">Category</label>
              <select className="field-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as IncomeCategory }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Note <span style={{ color: '#94A3B8', fontWeight: 400 }}>optional</span></label>
              <input className="field-input" placeholder="Any extra details" value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </div>
            {accounts.length > 0 && (
              <div>
                <label className="field-label">Deposit Into Account <span style={{ color: '#94A3B8', fontWeight: 400 }}>optional</span></label>
                <select className="field-input" value={form.depositToId} onChange={e => setForm(f => ({ ...f, depositToId: e.target.value }))}>
                  <option value="">Don't deposit</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                </select>
              </div>
            )}
            <button className="btn btn-green" style={{ width: '100%', justifyContent: 'center' }} onClick={save}>
              Log Income
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}