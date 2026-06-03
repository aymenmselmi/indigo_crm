import { useState, useEffect } from 'react';
import { Icon } from '../components/UI/Icon';
import { api } from '../services/api';

const ENTITY_TYPES = [
  { id: 'lead',        label: 'Leads'         },
  { id: 'account',     label: 'Accounts'      },
  { id: 'contact',     label: 'Contacts'      },
  { id: 'opportunity', label: 'Opportunities' },
];

const FIELD_TYPES = [
  { id: 'text',     label: 'Text'     },
  { id: 'number',   label: 'Number'   },
  { id: 'date',     label: 'Date'     },
  { id: 'boolean',  label: 'Checkbox' },
  { id: 'dropdown', label: 'Dropdown' },
];

function FieldTypeTag({ type }) {
  const colors = { text: 'var(--ink-4)', number: 'var(--accent)', date: 'oklch(0.6 0.14 158)', boolean: 'oklch(0.6 0.18 12)', dropdown: 'oklch(0.68 0.16 60)' };
  return (
    <span style={{ fontSize: 10.5, padding: '1px 6px', borderRadius: 4, background: 'var(--bg-sunken)', color: colors[type] || 'var(--ink-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {type}
    </span>
  );
}

function AddFieldForm({ entityType, onSaved, onCancel }) {
  const [label, setLabel]         = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [options, setOptions]     = useState('');
  const [required, setRequired]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!label.trim()) return setError('Label is required');
    setSaving(true);
    setError('');
    try {
      await api.createCustomFieldSchema({
        entityType,
        label: label.trim(),
        name: label.trim(),
        fieldType,
        required,
        options: fieldType === 'dropdown'
          ? options.split(',').map(s => s.trim()).filter(Boolean)
          : undefined,
      });
      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--ink-2)', marginBottom: 2 }}>New custom field</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--ink-3)', display: 'block', marginBottom: 3 }}>Label *</label>
          <input
            className="input"
            placeholder="e.g. LinkedIn URL"
            value={label}
            onChange={e => setLabel(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--ink-3)', display: 'block', marginBottom: 3 }}>Type</label>
          <select className="input" value={fieldType} onChange={e => setFieldType(e.target.value)} style={{ width: '100%' }}>
            {FIELD_TYPES.map(ft => <option key={ft.id} value={ft.id}>{ft.label}</option>)}
          </select>
        </div>
      </div>

      {fieldType === 'dropdown' && (
        <div>
          <label style={{ fontSize: 11, color: 'var(--ink-3)', display: 'block', marginBottom: 3 }}>Options <span style={{ color: 'var(--ink-4)' }}>(comma-separated)</span></label>
          <input className="input" placeholder="Option A, Option B, Option C" value={options} onChange={e => setOptions(e.target.value)} style={{ width: '100%' }} />
        </div>
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer' }}>
        <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} />
        Required field
      </label>

      {error && <div style={{ fontSize: 11.5, color: 'var(--danger)' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button type="button" className="btn ghost sm" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn primary sm" disabled={saving}>{saving ? 'Saving…' : 'Add field'}</button>
      </div>
    </form>
  );
}

export const CustomFieldsView = ({ addToast }) => {
  const [tab, setTab]           = useState('lead');
  const [schemas, setSchemas]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    setLoading(true);
    api.getCustomFieldSchemas(tab)
      .then(res => setSchemas(Array.isArray(res) ? res : []))
      .catch(() => setSchemas([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setShowForm(false); load(); }, [tab]);

  const handleDelete = async (schema) => {
    if (!window.confirm(`Delete field "${schema.label}"? Any stored data will remain in records but won't be displayed.`)) return;
    setDeleting(schema.id);
    try {
      await api.deleteCustomFieldSchema(schema.id);
      addToast?.(`Field "${schema.label}" deleted`);
      load();
    } catch {
      addToast?.('Failed to delete field');
    } finally {
      setDeleting(null);
    }
  };

  const currentEntity = ENTITY_TYPES.find(e => e.id === tab);

  return (
    <div className="page-inner" style={{ maxWidth: 760 }}>
      <div className="page-head">
        <div>
          <div className="page-title">Custom fields</div>
          <div className="page-sub">Add extra fields to your CRM records — per entity type</div>
        </div>
        {!showForm && (
          <button className="btn primary sm" onClick={() => setShowForm(true)}>
            <Icon name="plus" size={13} /> Add field
          </button>
        )}
      </div>

      {/* Entity tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--line)' }}>
        {ENTITY_TYPES.map(et => (
          <button key={et.id} onClick={() => setTab(et.id)}
            className="btn ghost sm"
            style={{
              borderRadius: '6px 6px 0 0',
              borderBottom: tab === et.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === et.id ? 'var(--accent-ink)' : 'var(--ink-3)',
              fontWeight: tab === et.id ? 600 : 400,
            }}>
            {et.label}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ marginBottom: 16 }}>
          <AddFieldForm
            entityType={tab}
            onSaved={() => { setShowForm(false); load(); addToast?.('Field added'); }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Fields list */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">{currentEntity?.label} fields</div>
          <span className="card-sub">{schemas.length} custom {schemas.length === 1 ? 'field' : 'fields'}</span>
        </div>
        <div className="card-body flush">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>Loading…</div>
          ) : schemas.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>
              No custom fields yet for {currentEntity?.label.toLowerCase()}.<br />
              <span style={{ fontSize: 11 }}>Click "Add field" to create one.</span>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Key (slug)</th>
                  <th>Type</th>
                  <th>Options</th>
                  <th>Required</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {schemas.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>{s.label}</td>
                    <td className="mono muted" style={{ fontSize: 11 }}>{s.name}</td>
                    <td><FieldTypeTag type={s.fieldType} /></td>
                    <td className="muted" style={{ fontSize: 11.5 }}>
                      {s.options?.length ? s.options.join(', ') : '—'}
                    </td>
                    <td>
                      {s.required
                        ? <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>Yes</span>
                        : <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>No</span>}
                    </td>
                    <td>
                      <button
                        className="btn ghost icon sm"
                        title="Delete field"
                        disabled={deleting === s.id}
                        onClick={() => handleDelete(s)}
                        style={{ color: 'var(--danger)' }}
                      >
                        <Icon name="x" size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
