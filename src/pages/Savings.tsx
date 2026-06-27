import { useState } from 'react';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import type { AppState, SavingsAccount, MoneyMove } from '../types';
import { fmt, uid, TODAY, ACCOUNT_COLORS, ACCOUNT_ICONS, displayDate } from '../utils';
import { Modal } from '../components/Modal';

interface Props {
  state: AppState;
  update: (partial: Partial<AppState>) => void;
}

type AccForm = { name: string; balance: string; icon: string; color: string; goal: string };
type MvForm  = { fromId: string; toId: string; amount: string; date: string };

function GoalRing({ balance, goal, color }: { balance: number; goal: number; color: string }) {
  const pct = Math.min(balance / goal, 1);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  return (
    <svg width={70} height={70} style={{ flexShrink: 0 }}>
      <circle cx={35} cy={35} r={r} fill="none" stroke="#E2EAF4" strokeWidth={6} />
      <circle cx={35} cy={35} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        transform="rotate(-90 35 35)"
      />
      <text x={35} y={40} textAnchor="middle" fontSize="12" fontWeight="700" fill={color} fontFamily="DM Sans,sans-serif">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

export function Savings({ state, update }: Props) {
  const { accounts, moves, settings } = state;
  const { currency } = settings;
  const [showAdd, setShowAdd]   = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [editing, setEditing]   = useState<SavingsAccount | null>(null);
  const [form, setForm]   = useState<AccForm>({ name: '', balance: '', icon: '🏦', color: ACCOUNT_COLORS[0], goal: '' });
  const [mvForm, setMvForm] = useState<MvForm>({ fromId: '', toId: '', amount: '', date: TODAY });

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  function openAdd() {
    setEditing(null);
    setForm({ name: '', balance: '', icon: '🏦', color: ACCOUNT_COLORS[0], goal: '' });
    setShowAdd(true);
  }

  function openEdit(acc: SavingsAccount) {
    setEditing(acc);
    setForm({ name: acc.name, balance: String(acc.balance), icon: acc.icon, color: acc.color, goal: acc.goal != null ? String(acc.goal) : '' });
    setShowAdd(true);
  }

  function saveAcc() {
    const balance = parseFloat(form.balance) || 0;
    const goal    = form.goal ? parseFloat(form.goal) : undefined;
    if (!form.name.trim()) return;
    if (editing) {
      update({ accounts: accounts.map(a => a.id === editing.id ? { ...a, name: form.name.trim(), balance, icon: form.icon, color: form.color, goal } : a) });
    } else {
      const acc: SavingsAccount = { id: uid(), name: form.name.trim(), balance, icon: form.icon, color: form.color, goal };
      update({ accounts: [...accounts, acc] });
    }
    setShowAdd(false);
  }

  function deleteAcc(id: string) {
    if (!confirm('Delete this account?')) return;
    update({ accounts: accounts.filter(a => a.id !== id) });
  }

  function saveMove() {
    const amount = parseFloat(mvForm.amount);
    if (!amount || !mvForm.fromId || !mvForm.toId || mvForm.fromId === mvForm.toId) return;
    const move: MoneyMove = { id: uid(), fromId: mvForm.fromId, toId: mvForm.toId, amount, date: mvForm.date };
    const updated = accounts.map(a => {
      if (a.id === mvForm.fromId) return { ...a, balance: a.balance - amount };
      if (a.id === mvForm.toId)   return { ...a, balance: a.balance + amount };
      return a;
    });
    update({ accounts: updated, moves: [move, ...moves] });
    setShowMove(false);
    setMvForm({ fromId: '', toId: '', amount: '', date: TODAY });
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="section-title">Savings</h1>
          <p style={{ color: '#64748B', fontSize: '13px' }}>
            Total: <span className="money-text" style={{ fontWeight: 700, fontSize: '15px', color: '#0F172A' }}>{fmt(totalBalance, currency)}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {accounts.length >= 2 && (
            <button className="btn btn-ghost" onClick={() => setShowMove(true)}>
              <ArrowRight size={15} /> Move Money
            </button>
          )}
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={15} /> New Account
          </button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">🏦</div>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>No savings accounts yet</p>
          <p style={{ fontSize: '13px' }}>Create one to start tracking your savings.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {accounts.map(acc => (
            <div key={acc.id} className="card" style={{ borderTop: `4px solid ${acc.color}`, cursor: 'pointer' }} onClick={() => openEdit(acc)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${acc.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                    {acc.icon}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{acc.name}</p>
                    <div className="money-text" style={{ fontSize: '22px', fontWeight: 900, color: acc.color }}>{fmt(acc.balance, currency)}</div>
                    {acc.goal != null && (
                      <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>Goal: {fmt(acc.goal, currency)}</p>
                    )}
                  </div>
                </div>
                {acc.goal != null && acc.goal > 0 && (
                  <GoalRing balance={acc.balance} goal={acc.goal} color={acc.color} />
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
                <button
                  className="btn btn-danger"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  onClick={e => { e.stopPropagation(); deleteAcc(acc.id); }}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent moves */}
      {moves.length > 0 && (
        <div className="card">
          <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Recent Transfers</p>
          {moves.slice(0, 8).map(mv => {
            const from = accounts.find(a => a.id === mv.fromId)?.name ?? 'Unknown';
            const to   = accounts.find(a => a.id === mv.toId)?.name ?? 'Unknown';
            return (
              <div key={mv.id} className="activity-row">
                <div className="activity-icon" style={{ background: '#DBEAFE', fontSize: '18px' }}>🔄</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: 500 }}>{from} → {to}</p>
                  <p style={{ fontSize: '12px', color: '#94A3B8' }}>{displayDate(mv.date)}</p>
                </div>
                <div className="money-text" style={{ fontSize: '15px', fontWeight: 700, color: '#2563EB' }}>
                  {fmt(mv.amount, currency)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit modal */}
      {showAdd && (
        <Modal title={editing ? 'Edit Account' : 'New Savings Account'} onClose={() => setShowAdd(false)}>
          <div className="form-row">
            <div>
              <label className="field-label">Account Name</label>
              <input className="field-input" placeholder="e.g. Emergency Fund" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-row form-row-2">
              <div>
                <label className="field-label">Balance ({currency})</label>
                <input className="field-input" type="number" min="0" placeholder="0" value={form.balance}
                  onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Goal ({currency}) <span style={{ color: '#94A3B8', fontWeight: 400 }}>optional</span></label>
                <input className="field-input" type="number" min="0" placeholder="50 000" value={form.goal}
                  onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="field-label">Icon</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {ACCOUNT_ICONS.map(icon => (
                  <button key={icon} type="button" onClick={() => setForm(f => ({ ...f, icon }))} style={{
                    width: '40px', height: '40px', fontSize: '20px', borderRadius: '10px',
                    border: `2px solid ${form.icon === icon ? '#2563EB' : '#E2EAF4'}`,
                    background: form.icon === icon ? '#DBEAFE' : '#fff',
                    cursor: 'pointer',
                  }}>{icon}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">Colour</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {ACCOUNT_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))} style={{
                    width: '32px', height: '32px', borderRadius: '8px', background: c,
                    border: `3px solid ${form.color === c ? '#0F172A' : 'transparent'}`,
                    cursor: 'pointer',
                  }} />
                ))}
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={saveAcc}>
              {editing ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </Modal>
      )}

      {/* Move money modal */}
      {showMove && (
        <Modal title="Move Money" onClose={() => setShowMove(false)}>
          <div className="form-row">
            <div>
              <label className="field-label">From</label>
              <select className="field-input" value={mvForm.fromId} onChange={e => setMvForm(f => ({ ...f, fromId: e.target.value }))}>
                <option value="">Select account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name} ({fmt(a.balance, currency)})</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">To</label>
              <select className="field-input" value={mvForm.toId} onChange={e => setMvForm(f => ({ ...f, toId: e.target.value }))}>
                <option value="">Select account</option>
                {accounts.filter(a => a.id !== mvForm.fromId).map(a => <option key={a.id} value={a.id}>{a.icon} {a.name} ({fmt(a.balance, currency)})</option>)}
              </select>
            </div>
            <div className="form-row form-row-2">
              <div>
                <label className="field-label">Amount ({currency})</label>
                <input className="field-input" type="number" min="0" placeholder="0" value={mvForm.amount}
                  onChange={e => setMvForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Date</label>
                <input className="field-input" type="date" value={mvForm.date}
                  onChange={e => setMvForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={saveMove}>
              <ArrowRight size={15} /> Move Money
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}