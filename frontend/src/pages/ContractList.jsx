import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Plus, FileText, Calendar, User, ChevronRight, Briefcase, ArrowUpDown } from 'lucide-react';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'expiring_soon', label: 'Expiring Soon' },
  { value: 'expired', label: 'Expired' },
];

const SORT_OPTIONS = [
  { value: 'expiry_asc', label: 'Expiry date (soonest first)' },
  { value: 'expiry_desc', label: 'Expiry date (latest first)' },
  { value: 'title_asc', label: 'A → Z' },
  { value: 'title_desc', label: 'Z → A' },
  { value: 'value_desc', label: 'Value (highest first)' },
  { value: 'value_asc', label: 'Value (lowest first)' },
];

function sortContracts(contracts, sort) {
  const sorted = [...contracts];
  switch (sort) {
    case 'expiry_asc':
      return sorted.sort((a, b) => new Date(a.end_date) - new Date(b.end_date));
    case 'expiry_desc':
      return sorted.sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
    case 'title_asc':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'title_desc':
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case 'value_desc':
      return sorted.sort((a, b) => (b.contract_value || 0) - (a.contract_value || 0));
    case 'value_asc':
      return sorted.sort((a, b) => (a.contract_value || 0) - (b.contract_value || 0));
    default:
      return sorted;
  }
}

function formatValue(val) {
  if (!val) return null;
  return '£' + Number(val).toLocaleString('en-GB');
}

function daysUntilLabel(dateStr, status) {
  if (status === 'expired') {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end = new Date(dateStr); end.setHours(0, 0, 0, 0);
    const d = Math.abs(Math.ceil((end - today) / (1000 * 60 * 60 * 24)));
    return `Expired ${d}d ago`;
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(dateStr); end.setHours(0, 0, 0, 0);
  const d = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  if (d === 0) return 'Expires today';
  if (d <= 90) return `${d} days left`;
  return null;
}

export default function ContractList() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('expiry_asc');
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const activeFilter = searchParams.get('status') || 'all';

  const sortedContracts = useMemo(() => sortContracts(contracts, sort), [contracts, sort]);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (activeFilter !== 'all') params.status = activeFilter;
    if (search) params.search = search;
    api.get('/contracts', { params })
      .then((res) => setContracts(res.data))
      .finally(() => setLoading(false));
  }, [activeFilter, search]);

  function setFilter(val) {
    if (val === 'all') setSearchParams({});
    else setSearchParams({ status: val });
  }

  return (
    <div style={{ padding: '32px', maxWidth: 1200 }} className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 4 }}>All Contracts</h1>
          <p style={{ color: '#b0a0cc', fontSize: 14 }}>
            {sortedContracts.length} contract{sortedContracts.length !== 1 ? 's' : ''} found
          </p>
        </div>
        {user?.role === 'editor' && (
          <Link to="/contracts/new" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            background: '#542E91',
            color: '#FDDC06',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 800,
            transition: 'background 0.15s',
            textDecoration: 'none',
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#6B3CB5'}
            onMouseLeave={e => e.currentTarget.style.background = '#542E91'}
          >
            <Plus size={16} />
            Add Contract
          </Link>
        )}
      </div>

      {/* Search + Filters + Sort */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
          <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#7060a0' }} />
          <input
            type="text"
            placeholder="Search by title, vendor or owner..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              background: '#231540',
              border: '1px solid #3d2870',
              borderRadius: 8,
              color: '#fff',
              fontSize: 13,
              fontFamily: 'Nunito, sans-serif',
            }}
          />
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                background: activeFilter === f.value ? '#542E91' : '#231540',
                color: activeFilter === f.value ? '#FDDC06' : '#b0a0cc',
                border: activeFilter === f.value ? '1px solid #6B3CB5' : '1px solid #3d2870',
                transition: 'all 0.15s',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <ArrowUpDown size={14} color="#7060a0" />
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{
              padding: '8px 32px 8px 12px',
              background: '#231540',
              border: '1px solid #3d2870',
              borderRadius: 8,
              color: '#b0a0cc',
              fontSize: 13,
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 700,
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237060a0' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
            }}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" />
        </div>
      ) : contracts.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 60,
          background: '#231540',
          borderRadius: 12,
          border: '1px solid #3d2870',
        }}>
          <FileText size={40} color="#3d2870" style={{ marginBottom: 12 }} />
          <p style={{ color: '#7060a0', fontSize: 15, fontWeight: 600 }}>No contracts found</p>
          <p style={{ color: '#4a3480', fontSize: 13, marginTop: 4 }}>Try adjusting your search or filter</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 16,
        }}>
          {sortedContracts.map((c) => {
            const daysLabel = daysUntilLabel(c.end_date, c.status);
            return (
              <Link
                key={c.id}
                to={`/contracts/${c.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  background: '#231540',
                  border: '1px solid #3d2870',
                  borderRadius: 12,
                  padding: '20px',
                  height: '100%',
                  transition: 'transform 0.15s, border-color 0.15s',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#542E91'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#3d2870'; }}
                >
                  {/* Top row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#b0a0cc', fontSize: 12 }}>
                        <Briefcase size={11} />
                        {c.vendor}
                      </div>
                    </div>
                    <StatusBadge status={c.status} size="sm" />
                  </div>

                  {/* Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#b0a0cc' }}>
                      <Calendar size={12} color="#7060a0" />
                      <span>
                        Expires {new Date(c.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {daysLabel && (
                          <span style={{
                            marginLeft: 6,
                            color: c.status === 'expired' ? '#ef4444' : c.status === 'expiring_soon' ? '#f59e0b' : '#22c55e',
                            fontWeight: 700,
                          }}>
                            · {daysLabel}
                          </span>
                        )}
                      </span>
                    </div>
                    {c.owner_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#b0a0cc' }}>
                        <User size={12} color="#7060a0" />
                        {c.owner_name}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 10, borderTop: '1px solid #2a1a4e' }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: c.contract_value ? '#fff' : '#4a3480' }}>
                      {formatValue(c.contract_value) || 'No value set'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#FDDC06', fontSize: 12, fontWeight: 700 }}>
                      View <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
