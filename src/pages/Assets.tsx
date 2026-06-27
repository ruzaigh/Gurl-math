import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { AppState, Asset } from '../types';
import { fmt, uid, ASSET_ICONS } from '../utils';
import { Modal } from '../components/Modal';

interface Props {
  state: AppState;
  update: (partial: Partial<AppState>) => void;
}

type Form = { name: string; value: string; note: string; icon: string };

export function Assets({ state, update }: Props) {
  const { assets, settings } = state;
  const { currency } = settings;
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState<Form>({ name: '', value: '', note: '', icon: '🏠' });

  const totalValue = assets.reduce((s, a) => s + a.value, 0);

  function openAdd() {
    setEditing(null);
    setForm({ name: '', value: '', note: '', icon: '🏠' });
    setShowAdd(true);
  }

  function openEdit(asset: Asset) {
    setEditing(asset);
    setForm({ name: asset.name, value: String(asset.value), note: asset.note, icon: asset.icon });
    setShowAdd(true);
  }

  function save() {
    const value = parseFloat(form.value);
    if (!form.name.trim() || !value) return;
    if (editing) {
      update({ assets: assets.map(a => a.id === editing.id ? { ...a, name: form.name.trim(), value, note: form.note.trim(), icon: form.icon } : a) });
    } else {
      const asset: Asset = { id: uid(), name: form.name.trim(), value, note: form.note.trim(), icon: form.icon };
      update({ assets: [...assets, asset] });
    }
    setShowAdd(false);
  }

  function remove(id: string) {
    if (!confirm('Delete this asset?')) return;
    update({ assets: assets.filter(a => a.id !== id) });
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="section-title">Assets</h1>
          <p style={{ fontSize: '13px', color: '#64748B' }}>
            Total value: <span className="money-text" style={{ fontWeight: 700, fontSize: '15px', color: '#4338CA' }}>{fmt(totalValue, currency)}</span>
          </p>
        </div>
        <button className="btn" style={{ background: '#EEF2FF', color: '#4338CA' }} onClick={openAdd}>
          <Plus size={15} /> Add Asset
        </button>
      </div>

      {assets.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">💎</div>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>No assets yet</p>
          <p style={{ fontSize: '13px' }}>Add things of value — car, jewellery, equipment — to include them in your net worth.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          {assets.map(asset => (
            <div key={asset.id} className="card" style={{ borderTop: '4px solid #4338CA', cursor: 'pointer' }} onClick={() => openEdit(asset)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                    {asset.icon}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.name}</p>
                    <div className="money-text" style={{ fontSize: '20px', fontWeight: 900, color: '#4338CA' }}>{fmt(asset.value, currency)}</div>
                    {asset.note && <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>{asset.note}</p>}
                  </div>
                </div>
                <button
                  className="btn btn-danger"
                  style={{ padding: '6px 10px', fontSize: '12px', flexShrink: 0 }}
                  onClick={e => { e.stopPropagation(); remove(asset.id); }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title={editing ? 'Edit Asset' : 'Add Asset'} onClose={() => setShowAdd(false)}>
          <div className="form-row">
            <div>
              <label className="field-label">Name</label>
              <input className="field-input" placeholder="e.g. Car, Ring, MacBook" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="field-label">Estimated Value ({currency})</label>
              <input className="field-input" type="number" min="0" placeholder="0" value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
            </div>
            <div>
              <label className="field-label">Note <span style={{ color: '#94A3B8', fontWeight: 400 }}>optional</span></label>
              <input className="field-input" placeholder="Any details" value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </div>
            <div>
              <label className="field-label">Icon</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {ASSET_ICONS.map(icon => (
                  <button key={icon} type="button" onClick={() => setForm(f => ({ ...f, icon }))} style={{
                    width: '40px', height: '40px', fontSize: '20px', borderRadius: '10px',
                    border: `2px solid ${form.icon === icon ? '#4338CA' : '#E2EAF4'}`,
                    background: form.icon === icon ? '#EEF2FF' : '#fff',
                    cursor: 'pointer',
                  }}>{icon}</button>
                ))}
              </div>
            </div>
            <button className="btn" style={{ width: '100%', justifyContent: 'center', background: '#4338CA', color: '#fff' }} onClick={save}>
              {editing ? 'Save Changes' : 'Add Asset'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}