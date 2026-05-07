import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, CheckCircle, AlertTriangle, XCircle, ChevronRight, TrendingUp } from 'lucide-react';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';

function StatCard({ icon, label, value, color, bg, to }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#231540',
        border: `1px solid ${color}25`,
        borderRadius: 12,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        transition: 'transform 0.15s, border-color 0.15s',
        cursor: 'pointer',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = color + '60'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = color + '25'; }}
      >
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 13, color: '#b0a0cc', fontWeight: 600, marginTop: 3 }}>{label}</div>
        </div>
      </div>
    </Link>
  );
}

function formatValue(val) {
  if (!val) return '—';
  return '£' + Number(val).toLocaleString('en-GB');
}

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([
      api.get('/contracts/stats'),
      api.get('/contracts'),
    ]).then(([statsRes, contractsRes]) => {
      setStats(statsRes.data);
      // Recent = last 5 sorted by created_at desc
      const sorted = [...contractsRes.data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecent(sorted.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  const totalValue = recent.reduce((sum, c) => sum + (c.contract_value || 0), 0);

  return (
    <div style={{ padding: '32px', maxWidth: 1200 }} className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 4 }}>
          Good morning, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: '#b0a0cc', fontSize: 14 }}>
          Here's an overview of your contract portfolio.
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 36,
      }}>
        <StatCard
          icon={<FileText size={22} color="#542E91" />}
          label="Total Contracts"
          value={stats?.total ?? 0}
          color="#542E91"
          bg="rgba(84,46,145,0.2)"
          to="/contracts"
        />
        <StatCard
          icon={<CheckCircle size={22} color="#22c55e" />}
          label="Active"
          value={stats?.active ?? 0}
          color="#22c55e"
          bg="rgba(34,197,94,0.12)"
          to="/contracts?status=active"
        />
        <StatCard
          icon={<AlertTriangle size={22} color="#f59e0b" />}
          label="Expiring Soon"
          value={stats?.expiring_soon ?? 0}
          color="#f59e0b"
          bg="rgba(245,158,11,0.12)"
          to="/contracts?status=expiring_soon"
        />
        <StatCard
          icon={<XCircle size={22} color="#ef4444" />}
          label="Expired"
          value={stats?.expired ?? 0}
          color="#ef4444"
          bg="rgba(239,68,68,0.12)"
          to="/contracts?status=expired"
        />
      </div>

      {/* Portfolio value banner */}
      <div style={{
        background: 'linear-gradient(135deg, #542E91 0%, #3d1f6e 100%)',
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 32,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        border: '1px solid #6B3CB5',
      }}>
        <TrendingUp size={28} color="#FDDC06" />
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Total Portfolio Value (all contracts)
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#FDDC06', marginTop: 2 }}>
            {formatValue(recent.reduce((s, c) => s + (c.contract_value || 0), 0))}
          </div>
        </div>
      </div>

      {/* Recent contracts */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Recent Contracts</h2>
          <Link to="/contracts" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: '#FDDC06',
            fontSize: 13,
            fontWeight: 700,
          }}>
            View all <ChevronRight size={14} />
          </Link>
        </div>

        <div style={{
          background: '#231540',
          border: '1px solid #3d2870',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          {recent.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#7060a0' }}>
              No contracts yet.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #3d2870' }}>
                  {['Contract', 'Vendor', 'Value', 'Expiry', 'Status', ''].map((h) => (
                    <th key={h} style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#7060a0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((c, i) => {
                  const days = daysUntil(c.end_date);
                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: i < recent.length - 1 ? '1px solid #2a1a4e' : 'none',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#2a1a4e'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{c.title}</div>
                        {c.owner_name && <div style={{ fontSize: 12, color: '#7060a0', marginTop: 2 }}>{c.owner_name}</div>}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#b0a0cc' }}>{c.vendor}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#fff', fontWeight: 600 }}>{formatValue(c.contract_value)}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: 13, color: '#b0a0cc' }}>
                          {new Date(c.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        {days >= 0 && days <= 90 && (
                          <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, marginTop: 1 }}>
                            {days === 0 ? 'Expires today' : `${days}d left`}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <StatusBadge status={c.status} size="sm" />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <Link to={`/contracts/${c.id}`} style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          color: '#FDDC06',
                          fontSize: 12,
                          fontWeight: 700,
                        }}>
                          View <ChevronRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
