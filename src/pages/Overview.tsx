import { useMemo, useState } from 'react';

const ACT_PAGE_SIZE = 5;
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis,
} from 'recharts';
import type { AppState } from '../types';
import { fmt, greeting, thisMonth, displayDate, EXPENSE_COLORS } from '../utils';
import { ArrowDownLeft, ArrowUpRight, Wallet, TrendingUp } from 'lucide-react';

interface Props {
  state: AppState;
  update: (partial: Partial<AppState>) => void;
}

export function Overview({ state }: Props) {
  const { settings, accounts, assets, received, expenses, moves } = state;
  const { currency } = settings;
  const month = thisMonth();
  const [actPage, setActPage] = useState(1);

  const stats = useMemo(() => {
    const totalSavings = accounts.reduce((s, a) => s + a.balance, 0);
    const totalAssets = assets.reduce((s, a) => s + a.value, 0);
    const netWorth = totalSavings + totalAssets;

    const monthRec = received.filter(r => r.date.startsWith(month));
    const monthExp = expenses.filter(e => e.date.startsWith(month));
    const totalReceived = monthRec.reduce((s, r) => s + r.amount, 0);
    const totalSpent = monthExp.reduce((s, e) => s + e.amount, 0);
    const leftOver = totalReceived - totalSpent;

    // Donut data
    const byCat: Record<string, number> = {};
    monthExp.forEach(e => { byCat[e.category] = (byCat[e.category] ?? 0) + e.amount; });
    const donutData = Object.entries(byCat).map(([name, value]) => ({ name, value }));

    // Bar chart — last 6 months
    const barData = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const m = d.toISOString().slice(0, 7);
      return {
        month: d.toLocaleDateString('en-ZA', { month: 'short' }),
        Received: received.filter(r => r.date.startsWith(m)).reduce((s, r) => s + r.amount, 0),
        Spent: expenses.filter(e => e.date.startsWith(m)).reduce((s, e) => s + e.amount, 0),
      };
    });

    // Activity feed — newest 12
    type Item = { id: string; date: string; type: 'received' | 'expense' | 'move'; label: string; sub: string; amount: number };
    const activity: Item[] = [
      ...received.map(r => ({ id: r.id, date: r.date, type: 'received' as const, label: `From ${r.fromWhom}`, sub: r.category, amount: r.amount })),
      ...expenses.map(e => ({ id: e.id, date: e.date, type: 'expense' as const, label: e.category, sub: e.note || 'Expense', amount: e.amount })),
      ...moves.map(mv => {
        const from = accounts.find(a => a.id === mv.fromId)?.name ?? '?';
        const to   = accounts.find(a => a.id === mv.toId)?.name ?? '?';
        return { id: mv.id, date: mv.date, type: 'move' as const, label: `${from} → ${to}`, sub: 'Transfer', amount: mv.amount };
      }),
    ].sort((a, b) => b.date.localeCompare(a.date));

    return { netWorth, totalSavings, totalAssets, totalReceived, totalSpent, leftOver, donutData, barData, activity };
  }, [accounts, assets, received, expenses, moves, month]);

  return (
    <div className="fade-in">
      {/* Greeting */}
      <div style={{ marginBottom: '24px' }}>
        <h1 className="money-text" style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A' }}>
          {greeting(settings.ownerName)} ✨
        </h1>
        <p style={{ color: '#64748B', marginTop: '4px', fontSize: '14px' }}>
          {new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Net worth hero */}
      <div className="hero-gradient" style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '12px', opacity: 0.75, marginBottom: '6px', letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 600 }}>
          Net Worth
        </p>
        <div className="money-text" style={{ fontSize: '44px', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.1 }}>
          {fmt(stats.netWorth, currency)}
        </div>
        <div style={{ display: 'flex', gap: '24px', marginTop: '18px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '12px', opacity: 0.65 }}>Savings</p>
            <p className="money-text" style={{ fontSize: '17px', fontWeight: 700 }}>{fmt(stats.totalSavings, currency)}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', opacity: 0.65 }}>Assets</p>
            <p className="money-text" style={{ fontSize: '17px', fontWeight: 700 }}>{fmt(stats.totalAssets, currency)}</p>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="stat-grid">
        {([
          { label: 'Received',  amount: stats.totalReceived, Icon: ArrowDownLeft, color: '#16A34A', bg: '#DCFCE7' },
          { label: 'Spent',     amount: stats.totalSpent,    Icon: ArrowUpRight,  color: '#BE185D', bg: '#FCE7F3' },
          { label: 'Left Over', amount: stats.leftOver,      Icon: Wallet,        color: '#2563EB', bg: '#DBEAFE' },
        ] as const).map(({ label, amount, Icon, color, bg }) => (
          <div key={label} className="stat-tile">
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
              <div style={{ background: bg, borderRadius: '8px', padding: '5px', display: 'flex', color }}>
                <Icon size={14} />
              </div>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>{label}</span>
            </div>
            <div
              className="money-text"
              style={{ fontSize: '17px', fontWeight: 700, color: label === 'Left Over' && stats.leftOver < 0 ? '#BE185D' : '#0F172A', lineHeight: 1.2 }}
            >
              {fmt(amount, currency)}
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>this month</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="chart-grid">
        {/* Donut */}
        <div className="card">
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', marginBottom: '12px' }}>Spending by Category</p>
          {stats.donutData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#CBD5E1', fontSize: '13px' }}>No expenses this month</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={stats.donutData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                    {stats.donutData.map((entry, i) => (
                      <Cell key={i} fill={EXPENSE_COLORS[entry.name as keyof typeof EXPENSE_COLORS] ?? '#94A3B8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => typeof val === 'number' ? fmt(val, currency) : String(val)} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {stats.donutData.map(entry => (
                  <span key={entry.name} style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: '#64748B' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: EXPENSE_COLORS[entry.name as keyof typeof EXPENSE_COLORS] ?? '#94A3B8', display: 'inline-block', flexShrink: 0 }} />
                    {entry.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bar chart */}
        <div className="card">
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', marginBottom: '12px' }}>Received vs Spent</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stats.barData} barGap={2} barCategoryGap="30%">
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={(val) => typeof val === 'number' ? fmt(val, currency) : String(val)} />
              <Bar dataKey="Received" fill="#16A34A" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Spent"    fill="#BE185D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: '#64748B' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#16A34A', display: 'inline-block' }} /> Received
            </span>
            <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: '#64748B' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#BE185D', display: 'inline-block' }} /> Spent
            </span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <TrendingUp size={15} color="#2563EB" />
          <p style={{ fontSize: '14px', fontWeight: 600 }}>Recent Activity</p>
        </div>
        {stats.activity.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Nothing here yet</p>
            <p style={{ fontSize: '13px' }}>Start by logging some income or expenses.</p>
          </div>
        ) : (() => {
          const actTotal = Math.ceil(stats.activity.length / ACT_PAGE_SIZE);
          const safePage = Math.min(actPage, actTotal);
          const visible = stats.activity.slice((safePage - 1) * ACT_PAGE_SIZE, safePage * ACT_PAGE_SIZE);
          return (
            <>
              {visible.map(item => (
                <div key={item.id} className="activity-row">
                  <div
                    className="activity-icon"
                    style={{ background: item.type === 'received' ? '#DCFCE7' : item.type === 'expense' ? '#FCE7F3' : '#DBEAFE', fontSize: '18px' }}
                  >
                    {item.type === 'received' ? '💚' : item.type === 'expense' ? '💸' : '🔄'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>{item.sub} · {displayDate(item.date)}</div>
                  </div>
                  <div
                    className="money-text"
                    style={{ fontSize: '15px', fontWeight: 700, flexShrink: 0, color: item.type === 'received' ? '#16A34A' : item.type === 'expense' ? '#BE185D' : '#2563EB' }}
                  >
                    {item.type === 'received' ? '+' : item.type === 'expense' ? '−' : ''}{fmt(item.amount, currency)}
                  </div>
                </div>
              ))}
              {actTotal > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #F1F5FA' }}>
                  <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => setActPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>← Prev</button>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Page {safePage} of {actTotal}</span>
                  <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => setActPage(p => Math.min(actTotal, p + 1))} disabled={safePage === actTotal}>Next →</button>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}