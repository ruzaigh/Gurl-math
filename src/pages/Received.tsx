import { useState } from 'react';
import { Plus, Trash2, Pencil, ArrowDownLeft } from 'lucide-react';
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

const PAGE_SIZE = 8;

export function Received({ state, update }: Props) {
  const { received, accounts, settings } = state;
  const { currency } = settings;
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Form>({ amount: '', fromWhom: '', category: 'Gift', date: TODAY, note: '', depositToId: '' });

  // Edit state
  const [editing, setEditing] = useState<ReceivedEntry | null>(null);
  const [eAmt, setEAmt] = useState(0);
  const [eDate, setEDate] = useState(TODAY);
  const [eFrom, setEFrom] = useState('');
  const [eCat, setECat] = useState<IncomeCategory>('Gift');
  const [eNote, setENote] = useState('');
  const [eDepositTo, setEDepositTo] = useState('');

  // Pagination
  const [page, setPage] = useState(1);

  const month = thisMonth();
  const monthTotal = received.filter(r => r.date.startsWith(month)).reduce((s, r) => s + r.amount, 0);
  const sorted = [...received].sort((a, b) => b.date.localeCompare(a.date));
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const visible = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
    setPage(1);
  }

  function remove(id: string) {
    if (!confirm('Remove this entry?')) return;
    update({ received: received.filter(r => r.id !== id) });
    setPage(1);
  }

  function openEdit(r: ReceivedEntry) {
    setEditing(r);
    setEAmt(r.amount);
    setEDate(r.date);
    setEFrom(r.fromWhom);
    setECat(r.category);
    setENote(r.note);
    setEDepositTo(r.depositToId ?? '');
  }

  function saveEdit() {
    if (!editing) return;
    let updatedAccounts = [...accounts];
    // Reverse old depositToId effect
    if (editing.depositToId) {
      updatedAccounts = updatedAccounts.map(a =>
        a.id === editing.depositToId ? { ...a, balance: a.balance - editing.amount } : a
      );
    }
    // Apply new depositToId effect
    if (eDepositTo) {
      updatedAccounts = updatedAccounts.map(a =>
        a.id === eDepositTo ? { ...a, balance: a.balance + eAmt } : a
      );
    }
    update({
      received: state.received.map(r =>
        r.id === editing.id
          ? { ...editing, amount: eAmt, date: eDate, fromWhom: eFrom, category: eCat, note: eNote, depositToId: eDepositTo || undefined }
          : r
      ),
      accounts: updatedAccounts,
    });
    setEditing(null);
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
        <>
          <div className="card" style={{ padding: '4px 20px' }}>
            {visible.map(entry => (
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  <div className="money-text" style={{ fontSize: '16px', fontWeight: 700, color: '#16A34A' }}>
                    +{fmt(entry.amount, currency)}
                  </div>
                  <button onClick={() => openEdit(entry)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px', display: 'flex' }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => remove(entry.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', padding: '4px', display: 'flex' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
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

      {editing && (
        <Modal title="Edit Income" onClose={() => setEditing(null)}>
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
              <label className="field-label">From Whom</label>
              <input className="field-input" placeholder="e.g. Mom, Employer, Client" value={eFrom}
                onChange={e => setEFrom(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Category</label>
              <select className="field-input" value={eCat} onChange={e => setECat(e.target.value as IncomeCategory)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Note <span style={{ color: '#94A3B8', fontWeight: 400 }}>optional</span></label>
              <input className="field-input" placeholder="Any extra details" value={eNote}
                onChange={e => setENote(e.target.value)} />
            </div>
            {accounts.length > 0 && (
              <div>
                <label className="field-label">Deposit Into Account <span style={{ color: '#94A3B8', fontWeight: 400 }}>optional</span></label>
                <select className="field-input" value={eDepositTo} onChange={e => setEDepositTo(e.target.value)}>
                  <option value="">Don't deposit</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                </select>
              </div>
            )}
            <button className="btn btn-green" style={{ width: '100%', justifyContent: 'center' }} onClick={saveEdit}>
              Save Changes
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
