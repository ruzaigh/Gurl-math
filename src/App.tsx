import { useState } from 'react';
import { useAppState } from './store';
import { Overview } from './pages/Overview';
import { Savings } from './pages/Savings';
import { Received } from './pages/Received';
import { Expenses } from './pages/Expenses';
import { Assets } from './pages/Assets';
import { Settings } from './pages/Settings';
import type { Page } from './types';
import {
  LayoutDashboard,
  PiggyBank,
  ArrowDownLeft,
  CreditCard,
  Gem,
  Settings as SettingsIcon,
} from 'lucide-react';

const NAV: { id: Page; label: string; Icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'savings',  label: 'Savings',  Icon: PiggyBank },
  { id: 'received', label: 'Received', Icon: ArrowDownLeft },
  { id: 'expenses', label: 'Expenses', Icon: CreditCard },
  { id: 'assets',   label: 'Assets',   Icon: Gem },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];

export default function App() {
  const { state, update } = useAppState();
  const [page, setPage] = useState<Page>('overview');

  const props = { state, update };

  return (
    <div className="app-shell">
      {/* Sidebar (desktop) */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">✨</div>
          <span className="brand-name">girl math</span>
        </div>
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav-item${page === id ? ' active' : ''}`}
            onClick={() => setPage(id)}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </aside>

      {/* Main content */}
      <main className="main-content">
        {page === 'overview' && <Overview {...props} />}
        {page === 'savings'  && <Savings  {...props} />}
        {page === 'received' && <Received {...props} />}
        {page === 'expenses' && <Expenses {...props} />}
        {page === 'assets'   && <Assets   {...props} />}
        {page === 'settings' && <Settings {...props} />}
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`bottom-nav-item${page === id ? ' active' : ''}`}
              onClick={() => setPage(id)}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}