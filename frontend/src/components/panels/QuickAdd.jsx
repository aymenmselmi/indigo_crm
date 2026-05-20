import { useState, useEffect } from 'react';
import { Icon } from '../UI/Icon';
import { STAGES } from '../../data/seed';
import { api, unwrap } from '../../services/api';

const INDUSTRIES = ['SaaS', 'Finance', 'Healthcare', 'Logistics', 'Biotech', 'Energy', 'Retail', 'Manufacturing', 'Media', 'Other'];
const BE_STAGE = { lead: 'prospecting', qualify: 'qualification', propose: 'proposal', negotiate: 'negotiation', close: 'closed-won' };

export const QuickAdd = ({ onClose, onSaved, addToast, initialType }) => {
  const [type, setType] = useState(initialType || 'deal');
  const [accounts, setAccounts]         = useState([]);
  const [contacts, setContacts]         = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Deal fields
  const [dealName, setDealName]       = useState('');
  const [dealAccount, setDealAccount] = useState('');
  const [dealAmount, setDealAmount]   = useState('');
  const [dealStage, setDealStage]     = useState('lead');
  const [dealClose, setDealClose]     = useState('');

  // Account fields
  const [accName, setAccName]         = useState('');
  const [accIndustry, setAccIndustry] = useState('');
  const [accType, setAccType]         = useState('prospect');
  const [accWebsite, setAccWebsite]   = useState('');

  // Contact fields
  const [conFirst, setConFirst]       = useState('');
  const [conLast, setConLast]         = useState('');
  const [conEmail, setConEmail]       = useState('');
  const [conTitle, setConTitle]       = useState('');
  const [conAccount, setConAccount]   = useState('');

  // Task fields
  const [taskTitle, setTaskTitle]     = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskDue, setTaskDue]         = useState('');

  // Activity fields
  const [actType, setActType]           = useState('call');
  const [actSubject, setActSubject]     = useState('');
  const [actContact, setActContact]     = useState('');
  const [actOpportunity, setActOpportunity] = useState('');

  useEffect(() => {
    api.getAccounts(100).then(res => setAccounts(unwrap(res))).catch(() => {});
    api.getContacts(200).then(res => setContacts(unwrap(res))).catch(() => {});
    api.getOpportunities(200).then(res => setOpportunities(unwrap(res))).catch(() => {});
  }, []);

  const submit = async () => {
    setError('');
    setSaving(true);
    try {
      if (type === 'deal') {
        if (!dealName.trim()) throw new Error('Name is required');
        const payload = {
          name: dealName.trim(),
          stage: BE_STAGE[dealStage] || 'prospecting',
          amount: dealAmount ? Number(dealAmount) : undefined,
          expectedCloseDate: dealClose || undefined,
          accountId: dealAccount || undefined,
        };
        await api.createOpportunity(payload);
        addToast(`Deal "${dealName}" created`);

      } else if (type === 'account') {
        if (!accName.trim()) throw new Error('Name is required');
        const payload = {
          name: accName.trim(),
          industry: accIndustry || undefined,
          type: accType,
          website: accWebsite || undefined,
        };
        await api.createAccount(payload);
        addToast(`Account "${accName}" created`);

      } else if (type === 'contact') {
        if (!conFirst.trim()) throw new Error('First name is required');
        if (!conLast.trim()) throw new Error('Last name is required');
        if (!conAccount) throw new Error('Account is required');
        const payload = {
          firstName: conFirst.trim(),
          lastName: conLast.trim(),
          email: conEmail || undefined,
          title: conTitle || undefined,
          accountId: conAccount,
        };
        await api.createContact(payload);
        addToast(`Contact "${conFirst} ${conLast}" created`);

      } else if (type === 'task') {
        if (!taskTitle.trim()) throw new Error('Title is required');
        const payload = {
          title: taskTitle.trim(),
          priority: taskPriority,
          dueDate: taskDue || undefined,
        };
        await api.createTask(payload);
        addToast(`Task "${taskTitle}" created`);

      } else if (type === 'activity') {
        if (!actSubject.trim()) throw new Error('Subject is required');
        await api.createActivity({
          type: actType,
          subject: actSubject.trim(),
          relatedContactId:     actContact     || undefined,
          relatedOpportunityId: actOpportunity || undefined,
        });
        addToast(`${actType} activity logged`);
      }
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const onKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} onKeyDown={onKey}>
        <div className="modal-head">
          <div style={{ display: 'flex', gap: 4, padding: 2, background: 'var(--bg-sunken)', borderRadius: 6, border: '1px solid var(--line)' }}>
            {['deal', 'account', 'contact', 'task', 'activity'].map(t => (
              <button key={t} className="btn ghost sm" onClick={() => { setType(t); setError(''); }}
                style={{ background: type === t ? 'var(--bg-elev)' : 'transparent', boxShadow: type === t ? 'var(--shadow-1)' : 'none', textTransform: 'capitalize' }}>{t}</button>
            ))}
          </div>
          <button className="btn ghost icon sm" onClick={onClose} style={{ marginLeft: 'auto' }}><Icon name="x" size={14} /></button>
        </div>

        <div className="modal-body">
          <div className="field-stack">
            {type === 'deal' && <>
              <label>Name <span style={{ color: 'var(--danger)' }}>*</span>
                <input autoFocus value={dealName} onChange={e => setDealName(e.target.value)} placeholder="e.g. Annual Renewal — 2026" />
              </label>
              <div className="field-row-2">
                <label>Account
                  <select value={dealAccount} onChange={e => setDealAccount(e.target.value)}>
                    <option value="">— none —</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </label>
                <label>Amount
                  <input type="number" value={dealAmount} onChange={e => setDealAmount(e.target.value)} placeholder="0" min="0" />
                </label>
              </div>
              <div className="field-row-2">
                <label>Stage
                  <select value={dealStage} onChange={e => setDealStage(e.target.value)}>
                    {STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
                <label>Close date
                  <input type="date" value={dealClose} onChange={e => setDealClose(e.target.value)} />
                </label>
              </div>
            </>}

            {type === 'account' && <>
              <label>Name <span style={{ color: 'var(--danger)' }}>*</span>
                <input autoFocus value={accName} onChange={e => setAccName(e.target.value)} placeholder="e.g. Acme Corp" />
              </label>
              <div className="field-row-2">
                <label>Industry
                  <select value={accIndustry} onChange={e => setAccIndustry(e.target.value)}>
                    <option value="">— select —</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </label>
                <label>Type
                  <select value={accType} onChange={e => setAccType(e.target.value)}>
                    <option value="prospect">Prospect</option>
                    <option value="customer">Customer</option>
                    <option value="partner">Partner</option>
                  </select>
                </label>
              </div>
              <label>Website
                <input value={accWebsite} onChange={e => setAccWebsite(e.target.value)} placeholder="example.com" />
              </label>
            </>}

            {type === 'contact' && <>
              <div className="field-row-2">
                <label>First name <span style={{ color: 'var(--danger)' }}>*</span>
                  <input autoFocus value={conFirst} onChange={e => setConFirst(e.target.value)} placeholder="Jane" />
                </label>
                <label>Last name <span style={{ color: 'var(--danger)' }}>*</span>
                  <input value={conLast} onChange={e => setConLast(e.target.value)} placeholder="Smith" />
                </label>
              </div>
              <label>Email
                <input type="email" value={conEmail} onChange={e => setConEmail(e.target.value)} placeholder="jane@example.com" />
              </label>
              <div className="field-row-2">
                <label>Title
                  <input value={conTitle} onChange={e => setConTitle(e.target.value)} placeholder="VP, Operations" />
                </label>
                <label>Account <span style={{ color: 'var(--danger)' }}>*</span>
                  <select value={conAccount} onChange={e => setConAccount(e.target.value)}>
                    <option value="">— select —</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </label>
              </div>
            </>}

            {type === 'task' && <>
              <label>Title <span style={{ color: 'var(--danger)' }}>*</span>
                <input autoFocus value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="e.g. Follow up with procurement" />
              </label>
              <div className="field-row-2">
                <label>Due date
                  <input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} />
                </label>
                <label>Priority
                  <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>
              </div>
            </>}

            {type === 'activity' && <>
              <div className="field-row-2">
                <label>Type
                  <select value={actType} onChange={e => setActType(e.target.value)}>
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="note">Note</option>
                  </select>
                </label>
              </div>
              <label>Subject <span style={{ color: 'var(--danger)' }}>*</span>
                <input autoFocus value={actSubject} onChange={e => setActSubject(e.target.value)} placeholder="e.g. Follow-up call with Jane Smith" />
              </label>
              <div className="field-row-2">
                <label>Link to contact
                  <select value={actContact} onChange={e => setActContact(e.target.value)}>
                    <option value="">— none —</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>
                        {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email}
                      </option>
                    ))}
                  </select>
                </label>
                <label>Link to opportunity
                  <select value={actOpportunity} onChange={e => setActOpportunity(e.target.value)}>
                    <option value="">— none —</option>
                    {opportunities.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </label>
              </div>
            </>}

            {error && (
              <div style={{ fontSize: 12, color: 'var(--danger)', padding: '6px 10px', background: 'color-mix(in oklch, var(--danger) 10%, transparent)', borderRadius: 5 }}>
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="modal-foot">
          <span className="mono muted" style={{ fontSize: 11, marginRight: 'auto' }}>⌘ Enter to save</span>
          <button className="btn sm" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn primary sm" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : `Create ${type}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export const SimpleView = ({ title, sub, hint }) => (
  <div className="page-inner">
    <div className="page-head">
      <div>
        <div className="page-title">{title}</div>
        <div className="page-sub">{sub}</div>
      </div>
    </div>
    <div className="card">
      <div className="card-body">
        <div className="empty" style={{ padding: 60 }}>{hint}</div>
      </div>
    </div>
  </div>
);
