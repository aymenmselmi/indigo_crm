import { Icon } from './UI/Icon';
import { fmtMoney, Chip, Avatar } from './UI/Primitives';
import { STAGES } from '../data/seed';

export const DetailPanel = ({ item, onClose }) => {
  if (!item) return null;
  const { kind, data } = item;

  let head, fields, related;

  if (kind === 'account') {
    const a = data;
    head = (
      <>
        <div className="avatar lg" style={{ background: 'var(--bg-sunken)', color: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 14 }}>{a.name[0]}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>{a.name}</div>
          <div className="mono muted" style={{ fontSize: 11 }}>{a.domain} · {a.id}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {a.tier === 'Strategic' ? <Chip tone="accent">Strategic</Chip> : <Chip>{a.tier}</Chip>}
            {a.health === 'good' ? <Chip tone="success" dot>Healthy</Chip> : a.health === 'at-risk' ? <Chip tone="warn" dot>At-risk</Chip> : <Chip tone="danger" dot>Churn risk</Chip>}
            {a.tags.map(t => <span className="tag" key={t}>{t}</span>)}
          </div>
        </div>
      </>
    );
    fields = [
      ['Industry', a.industry],
      ['Size', a.size + ' employees'],
      ['MRR', `$${a.mrr.toLocaleString()} / mo`],
      ['ARR', `$${(a.mrr * 12).toLocaleString()}`],
      ['Owner', <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Avatar id={a.owner} size="sm" />{a.owner}</span>],
    ];
    related = (
      <>
        <div className="detail-section">
          <div className="detail-label">Open deals</div>
          <div className="empty" style={{ padding: 16 }}>No open deals</div>
        </div>
        <div className="detail-section">
          <div className="detail-label">Recent activity</div>
          <div className="empty" style={{ padding: 16 }}>No activity recorded</div>
        </div>
      </>
    );
  } else if (kind === 'deal') {
    const d = data;
    const st = STAGES.find(s => s.id === d.stage);
    head = (
      <>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
          <Icon name="trend" size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{d.name}</div>
          <div className="mono muted" style={{ fontSize: 11 }}>{d.company} · {d.id}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            <span className="chip" style={{ background: 'transparent' }}><span className="dot" style={{ background: st.color }}></span>{st.name}</span>
            <Chip>{d.prob}% prob</Chip>
          </div>
        </div>
      </>
    );
    fields = [
      ['Amount', <strong style={{ fontSize: 14 }}>{fmtMoney(d.amount)}</strong>],
      ['Weighted', fmtMoney(Math.round(d.amount * d.prob / 100))],
      ['Close date', d.close],
      ['Age', d.age + ' days'],
      ['Owner', <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Avatar id={d.owner} size="sm" />{d.owner}</span>],
      ['Source', 'Inbound — Web'],
    ];
    related = (
      <div className="detail-section">
        <div className="detail-label">Stage history</div>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {STAGES.map((s, i) => {
            const passed = STAGES.findIndex(x => x.id === d.stage) >= i;
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: passed ? s.color : 'var(--line)', border: passed ? 'none' : '1px solid var(--line-strong)' }}></span>
                <span style={{ color: passed ? 'var(--ink)' : 'var(--ink-3)', fontWeight: passed ? 550 : 400 }}>{s.name}</span>
                <span className="mono muted" style={{ marginLeft: 'auto', fontSize: 10.5 }}>{passed ? `Apr ${5 + i * 4}` : '—'}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  } else if (kind === 'task') {
    const t = data;
    head = (
      <>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-sunken)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)', border: '1px solid var(--line)' }}>
          <Icon name="task" size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{t.title}</div>
          <div className="mono muted" style={{ fontSize: 11, marginTop: 2 }}>{t.id} · linked to {t.linked}</div>
        </div>
      </>
    );
    fields = [
      ['Status', t.done ? <Chip tone="success" dot>Done</Chip> : <Chip dot>Open</Chip>],
      ['Due', <span className={`mono due ${t.dueState}`}>{t.due}</span>],
      ['Priority', t.priority === 'high' ? <Chip tone="danger" dot>High</Chip> : t.priority === 'med' ? <Chip>Med</Chip> : <Chip>Low</Chip>],
      ['Owner', <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Avatar id={t.owner} size="sm" />{t.owner}</span>],
    ];
  } else {
    head = <div style={{ fontSize: 15, fontWeight: 600 }}>Detail</div>;
    fields = [];
  }

  return (
    <>
      <div className="detail-overlay" onClick={onClose}></div>
      <div className="detail-panel">
        <div className="detail-head">
          {head}
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="detail-body">
          <div className="detail-section">
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              <button className="btn sm"><Icon name="mail" size={12} />Email</button>
              <button className="btn sm"><Icon name="phone" size={12} />Call</button>
              <button className="btn sm"><Icon name="cal" size={12} />Meet</button>
              <button className="btn sm"><Icon name="note" size={12} />Note</button>
              <button className="btn ghost icon sm" style={{ marginLeft: 'auto' }}><Icon name="more" size={13} /></button>
            </div>
            <div className="detail-label">Properties</div>
            <div style={{ marginTop: 6 }}>
              {fields.map(([k, v]) => (
                <div className="field-row" key={k}>
                  <div className="field-key">{k}</div>
                  <div className="field-value">{v}</div>
                </div>
              ))}
            </div>
          </div>
          {related}
        </div>
      </div>
    </>
  );
};
