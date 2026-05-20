import { useState, useEffect } from 'react';
import { Icon } from '../components/UI/Icon';
import { Avatar, Chip } from '../components/UI/Primitives';
import { api, unwrap } from '../services/api';
import { normalizeContact } from '../utils/normalize';

const inp = {
  height: 32, padding: '0 10px', border: '1px solid var(--line)', borderRadius: 7,
  background: 'var(--bg)', fontFamily: 'var(--font)', fontSize: 12.5,
  color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', width: '100%',
  transition: 'border-color 120ms',
};
const focus = e => (e.target.style.borderColor = 'var(--accent)');
const blur  = e => (e.target.style.borderColor = 'var(--line)');

const Row = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>
);
const Field = ({ label, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontSize: 11.5, fontWeight: 550, color: 'var(--ink-2)' }}>{label}</span>
    {children}
  </label>
);

const EMPTY = {
  firstName: '', lastName: '', email: '', phone: '', mobilePhone: '',
  title: '', department: '', address: '', status: 'active', accountId: '',
};

function ContactModal({ contact, accounts, onSave, onClose }) {
  const editing = !!contact;
  const [form, setForm]     = useState(contact ? {
    firstName:   contact.firstName   || '',
    lastName:    contact.lastName    || '',
    email:       contact.email       || '',
    phone:       contact.phone       || '',
    mobilePhone: contact.mobilePhone || '',
    title:       contact.title       || '',
    department:  contact.department  || '',
    address:     contact.address     || '',
    status:      contact.status      || 'active',
    accountId:   contact._accountId  || '',
  } : { ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim()) { setError('First name is required'); return; }
    if (!form.lastName.trim())  { setError('Last name is required');  return; }
    if (!form.accountId)        { setError('Account is required');    return; }
    setError(''); setSaving(true);
    try {
      const payload = {
        firstName:   form.firstName.trim(),
        lastName:    form.lastName.trim(),
        accountId:   form.accountId,
        email:       form.email       || undefined,
        phone:       form.phone       || undefined,
        mobilePhone: form.mobilePhone || undefined,
        title:       form.title       || undefined,
        department:  form.department  || undefined,
        address:     form.address     || undefined,
        status:      form.status,
      };
      if (editing) await api.updateContact(contact._id, payload);
      else         await api.createContact(payload);
      onSave();
    } catch (e) {
      setError(e.message || 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500, width: '100%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div style={{ fontWeight: 600, fontSize: 14 }}>{editing ? 'Edit contact' : 'New contact'}</div>
          <button className="btn ghost icon sm" onClick={onClose} style={{ marginLeft: 'auto' }}><Icon name="x" size={14} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: 'calc(90vh - 60px)' }}>
          <Row>
            <Field label="First name *">
              <input style={inp} value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Jane" onFocus={focus} onBlur={blur} />
            </Field>
            <Field label="Last name *">
              <input style={inp} value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Smith" onFocus={focus} onBlur={blur} />
            </Field>
          </Row>
          <Field label="Account *">
            <select style={inp} value={form.accountId} onChange={e => set('accountId', e.target.value)}>
              <option value="">Select account…</option>
              {accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
          </Field>
          <Row>
            <Field label="Email">
              <input style={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@company.com" onFocus={focus} onBlur={blur} />
            </Field>
            <Field label="Phone">
              <input style={inp} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 555 000 0000" onFocus={focus} onBlur={blur} />
            </Field>
          </Row>
          <Row>
            <Field label="Title">
              <input style={inp} value={form.title} onChange={e => set('title', e.target.value)} placeholder="VP of Sales" onFocus={focus} onBlur={blur} />
            </Field>
            <Field label="Department">
              <input style={inp} value={form.department} onChange={e => set('department', e.target.value)} placeholder="Sales" onFocus={focus} onBlur={blur} />
            </Field>
          </Row>
          <Row>
            <Field label="Status">
              <select style={inp} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="prospect">Prospect</option>
              </select>
            </Field>
            <Field label="Mobile phone">
              <input style={inp} value={form.mobilePhone} onChange={e => set('mobilePhone', e.target.value)} placeholder="+1 555 000 0001" onFocus={focus} onBlur={blur} />
            </Field>
          </Row>

          {error && (
            <div style={{ fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon name="flag" size={11} />{error}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button type="button" className="btn sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary sm" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const STATUS_CHIP = {
  active:   <Chip tone="success" dot>Active</Chip>,
  inactive: <Chip dot>Inactive</Chip>,
  prospect: <Chip tone="accent">Prospect</Chip>,
};

export const ContactsView = ({ openDetail, addToast }) => {
  const [contacts, setContacts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all');
  const [modal, setModal]       = useState(null);

  const load = () => {
    setLoading(true);
    Promise.allSettled([
      api.getContacts(200),
      api.getAccounts(200),
    ]).then(([cRes, aRes]) => {
      if (cRes.status === 'fulfilled') setContacts(unwrap(cRes.value).map(normalizeContact));
      if (aRes.status === 'fulfilled') setAccounts(unwrap(aRes.value).map(a => ({ _id: a.id, name: a.name })));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = () => {
    setModal(null);
    load();
    addToast && addToast('Contact saved');
  };

  const handleDelete = async (c, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete contact "${c.name}"?`)) return;
    try {
      await api.deleteContact(c._id);
      addToast && addToast(`"${c.name}" deleted`);
      load();
    } catch (err) {
      addToast && addToast(`Error: ${err.message}`);
    }
  };

  const rows = contacts.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <div className="filters">
        <button className={`filter-pill ${filter === 'all'      ? 'active' : ''}`} onClick={() => setFilter('all')}>
          All <span className="mono muted">{contacts.length}</span>
        </button>
        <button className={`filter-pill ${filter === 'active'   ? 'active' : ''}`} onClick={() => setFilter('active')}>
          Active <span className="mono muted">{contacts.filter(c => c.status === 'active').length}</span>
        </button>
        <button className={`filter-pill ${filter === 'inactive' ? 'active' : ''}`} onClick={() => setFilter('inactive')}>
          Inactive <span className="mono muted">{contacts.filter(c => c.status === 'inactive').length}</span>
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search contacts"
              style={{ height: 24, padding: '0 8px 0 26px', border: '1px solid var(--line)', borderRadius: 5, background: 'var(--bg-elev)', fontFamily: 'inherit', fontSize: 11.5, outline: 'none', width: 200, color: 'var(--ink)' }}
            />
          </div>
          <button className="btn accent sm" onClick={() => setModal('create')}>
            <Icon name="plus" size={13} />New contact
          </button>
        </div>
      </div>

      <div style={{ overflow: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>Loading contacts…</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Contact</th><th>Title</th><th>Account</th>
                <th>Email</th><th>Status</th><th>Last contact</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id} onClick={() => openDetail && openDetail({ kind: 'contact', data: c })}>
                  <td>
                    <div className="cell-stack">
                      <Avatar id={c.id.slice(-2)} name={c.name} size="md" />
                      <div>
                        <div className="cell-name">{c.name}</div>
                        <div className="cell-sub">{c.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="muted">{c.title || '—'}</td>
                  <td>{c.account || '—'}</td>
                  <td className="mono" style={{ fontSize: 11.5 }}>{c.email || '—'}</td>
                  <td>{STATUS_CHIP[c.status] || <Chip>{c.status}</Chip>}</td>
                  <td className="mono muted" style={{ fontSize: 11 }}>{c.last}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn ghost icon sm" title="Edit"
                        onClick={e => { e.stopPropagation(); setModal(c); }}>
                        <Icon name="note" size={13} />
                      </button>
                      <button className="btn ghost icon sm" title="Delete"
                        style={{ color: 'var(--danger)' }} onClick={e => handleDelete(c, e)}>
                        <Icon name="x" size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-4)', padding: 32, fontSize: 12 }}>
                    {search ? 'No contacts match your search.' : (
                      <div>No contacts yet.{' '}
                        <button className="btn primary sm" style={{ marginLeft: 8 }} onClick={() => setModal('create')}>
                          <Icon name="plus" size={13} />Add first contact
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <ContactModal
          contact={modal === 'create' ? null : modal}
          accounts={accounts}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
};
