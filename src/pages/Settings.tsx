import type { AppState, Currency } from '../types';
import { CURRENCIES } from '../utils';
import { APP_VERSION, BUILD_DATE } from '../version';

interface Props {
  state: AppState;
  update: (partial: Partial<AppState>) => void;
}

export function Settings({ state, update }: Props) {
  const { settings } = state;

  function set(key: keyof typeof settings, value: string) {
    update({ settings: { ...settings, [key]: value } });
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `girl-math-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text) as Partial<AppState>;
        if (data.settings && Array.isArray(data.accounts)) {
          update(data);
          alert('Data imported successfully!');
        } else {
          alert('Invalid backup file.');
        }
      } catch {
        alert('Could not read file.');
      }
    };
    input.click();
  }

  return (
    <div className="fade-in">
      <h1 className="section-title" style={{ marginBottom: '24px' }}>Settings</h1>

      <div className="card" style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>Preferences</p>

        <div style={{ marginBottom: '16px' }}>
          <label className="field-label">Your Name</label>
          <input
            className="field-input"
            placeholder="Your name (shown on the home screen)"
            value={settings.ownerName}
            onChange={e => set('ownerName', e.target.value)}
          />
        </div>

        <div>
          <label className="field-label">Currency</label>
          <select
            className="field-input"
            value={settings.currency}
            onChange={e => set('currency', e.target.value as Currency)}
          >
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Data & Backup</p>
        <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
          Your data lives privately on this device. Export a backup regularly so you never lose it.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={exportData}>⬇️ Export Backup</button>
          <button className="btn btn-ghost" onClick={importData}>⬆️ Import Backup</button>
        </div>
      </div>

      <div style={{ marginTop: '32px', textAlign: 'center', color: '#94A3B8', fontSize: '13px', lineHeight: 1.6 }}>
        <p style={{ fontFamily: 'Fraunces, serif', fontSize: '16px', color: '#64748B', marginBottom: '4px' }}>girl math ✨</p>
        <p>Manual-first. No bank linking. No ads. No subscription.</p>
        <p>Your data never leaves this device.</p>
        <p style={{ marginTop: '12px', fontSize: '11px', color: '#CBD5E1' }}>{APP_VERSION} · {BUILD_DATE}</p>
      </div>
    </div>
  );
}