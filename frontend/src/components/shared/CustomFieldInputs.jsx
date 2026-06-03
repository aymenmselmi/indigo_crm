import { useState, useEffect } from 'react';
import { api } from '../../services/api';

export function useCustomFields(entityType, existingValues = {}) {
  const [schemas, setSchemas]   = useState([]);
  const [cfValues, setCfValues] = useState(existingValues || {});

  useEffect(() => {
    if (!entityType) return;
    api.getCustomFieldSchemas(entityType)
      .then(res => setSchemas(Array.isArray(res) ? res : []))
      .catch(() => setSchemas([]));
  }, [entityType]);

  const setCfValue = (name, value) => setCfValues(v => ({ ...v, [name]: value }));

  const customFieldsPayload = Object.keys(cfValues).length ? cfValues : undefined;

  return { schemas, cfValues, setCfValue, customFieldsPayload };
}

export function CustomFieldInputs({ schemas, values, onChange, inp }) {
  if (!schemas.length) return null;

  const inputStyle = inp || {
    height: 32, padding: '0 10px', border: '1px solid var(--line)', borderRadius: 7,
    background: 'var(--bg)', fontFamily: 'var(--font)', fontSize: 12.5,
    color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', width: '100%',
  };

  return (
    <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 10.5, color: 'var(--ink-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Custom fields
      </div>
      {schemas.map(s => (
        <label key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11.5, fontWeight: 550, color: 'var(--ink-2)' }}>
            {s.label}{s.required && <span style={{ color: 'var(--danger)' }}> *</span>}
          </span>
          {s.fieldType === 'text' && (
            <input style={inputStyle} value={values[s.name] || ''} onChange={e => onChange(s.name, e.target.value)} placeholder={s.label} />
          )}
          {s.fieldType === 'number' && (
            <input style={inputStyle} type="number" value={values[s.name] || ''} onChange={e => onChange(s.name, e.target.value)} placeholder="0" />
          )}
          {s.fieldType === 'date' && (
            <input style={inputStyle} type="date" value={values[s.name] || ''} onChange={e => onChange(s.name, e.target.value)} />
          )}
          {s.fieldType === 'boolean' && (
            <label style={{ flexDirection: 'row', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 400 }}>
              <input type="checkbox" checked={!!values[s.name]} onChange={e => onChange(s.name, e.target.checked)} />
              {s.label}
            </label>
          )}
          {s.fieldType === 'dropdown' && (
            <select style={inputStyle} value={values[s.name] || ''} onChange={e => onChange(s.name, e.target.value)}>
              <option value="">— select —</option>
              {(s.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          )}
        </label>
      ))}
    </div>
  );
}
