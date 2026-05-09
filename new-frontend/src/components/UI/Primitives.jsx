export const fmtMoney = (n, opts = {}) => {
  const { compact = false } = opts;
  if (compact && n >= 1000) {
    if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + 'M';
    return '$' + (n / 1000).toFixed(n >= 10_000 ? 0 : 1) + 'k';
  }
  return '$' + n.toLocaleString('en-US');
};

export const Avatar = ({ id, size = 'md', name }) => {
  const initials = id || (name ? name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase() : '?');
  const color = `oklch(0.6 0.14 ${(id || 'X').charCodeAt(0) * 7 % 360})`;
  return <div className={`avatar ${size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : ''}`} style={{ background: color }} title={name || id}>{initials}</div>;
};

export const Chip = ({ children, tone = 'default', dot = false }) => {
  const cls = tone === 'default' ? 'chip' : `chip ${tone}`;
  return <span className={cls}>{dot && <span className="dot"></span>}{children}</span>;
};

export const Spark = ({ data, color = 'var(--accent)', width = 60, height = 18 }) => {
  if (!data || !data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 2) - 1}`);
  const last = pts[pts.length - 1].split(',');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2" fill={color} />
    </svg>
  );
};

export const Donut = ({ data, size = 120, thickness = 18 }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={thickness} />
      {data.map((d, i) => {
        const len = (d.value / total) * c;
        const dash = `${len} ${c - len}`;
        const el = (
          <circle key={i}
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={d.color} strokeWidth={thickness}
            strokeDasharray={dash} strokeDashoffset={-offset}
            strokeLinecap="butt" />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
};

export const BarChart = ({ data }) => {
  const max = Math.max(...data.map(d => Math.max(d.actual, d.target))) * 1.1;
  return (
    <div className="bar-chart">
      {data.map((d, i) => {
        const aH = (d.actual / max) * 100;
        const tH = (d.target / max) * 100;
        return (
          <div className="bar-col" key={i} title={`${d.wk}: $${d.actual}k actual / $${d.target}k target`}>
            <div style={{ position: 'relative', width: '100%', height: 110, display: 'flex', alignItems: 'flex-end' }}>
              <div className="bar" style={{ height: aH + '%', background: d.actual >= d.target ? 'var(--accent)' : 'oklch(0.85 0.04 258)' }}></div>
              <div style={{ position: 'absolute', bottom: tH + '%', left: -2, right: -2, height: 1, borderTop: '1px dashed var(--ink-3)', opacity: 0.6 }}></div>
            </div>
            <div className="bar-label">{d.wk}</div>
          </div>
        );
      })}
    </div>
  );
};

export const KbdInline = ({ k }) => <kbd className="kbd-inline">{k}</kbd>;
