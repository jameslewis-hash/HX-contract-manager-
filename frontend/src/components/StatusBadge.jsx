const STATUS = {
  active: { label: 'Active', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', dot: '#22c55e' },
  expiring_soon: { label: 'Expiring Soon', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', dot: '#f59e0b' },
  expired: { label: 'Expired', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', dot: '#ef4444' },
};

export default function StatusBadge({ status, size = 'md' }) {
  const cfg = STATUS[status] || STATUS.active;
  const fontSize = size === 'sm' ? '11px' : size === 'lg' ? '14px' : '12px';
  const padding = size === 'sm' ? '3px 8px' : size === 'lg' ? '6px 14px' : '4px 10px';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      background: cfg.bg,
      color: cfg.color,
      padding,
      borderRadius: '20px',
      fontSize,
      fontWeight: 700,
      letterSpacing: '0.02em',
      border: `1px solid ${cfg.color}30`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: size === 'sm' ? 5 : 6,
        height: size === 'sm' ? 5 : 6,
        borderRadius: '50%',
        background: cfg.dot,
        flexShrink: 0,
      }} />
      {cfg.label}
    </span>
  );
}
