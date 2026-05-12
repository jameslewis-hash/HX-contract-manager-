import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit, Trash2, Calendar, User, Briefcase, DollarSign, FileText,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ExternalLink, Users, Mail,
  Phone, BadgeCheck, Globe, Package, ScrollText, Search, Download, X, Paperclip,
  Sparkles, CheckCircle, AlertCircle,
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import api, { UPLOADS_BASE } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const cardStyle = {
  background: '#231540',
  border: '1px solid #3d2870',
  borderRadius: 12,
  padding: '20px 24px',
  marginBottom: 20,
};

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7060a0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {icon}{label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{value || '—'}</div>
    </div>
  );
}

function Tag({ label, color = '#542E91' }) {
  return (
    <span style={{
      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      background: `${color}22`, border: `1px solid ${color}55`, color: '#e0d0ff',
    }}>{label}</span>
  );
}

function ClauseRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid #2a1a4e' }}>
      <div style={{ fontSize: 11, color: '#7060a0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
      <p style={{ fontSize: 14, color: '#b0a0cc', lineHeight: 1.6, margin: 0 }}>{value}</p>
    </div>
  );
}

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [contract, setContract] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [pdfDocument, setPdfDocument] = useState(null);

  const [aiExtracting, setAiExtracting] = useState(false);
  const [aiResult, setAiResult] = useState(null); // { ok, message }

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null); // null = not searched, [] = no results, [n,...] = pages
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/contracts/${id}`),
      api.get(`/contracts/${id}/documents`),
    ])
      .then(([cRes, dRes]) => {
        setContract(cRes.data);
        setDocuments(dRes.data);
      })
      .catch(() => navigate('/contracts'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAiExtract() {
    setAiExtracting(true);
    setAiResult(null);
    try {
      const extractRes = await api.post(`/contracts/${id}/extract-all`);
      const data = extractRes.data;

      // Build update payload with only non-null extracted values
      const updates = {};
      const fieldMap = { start_date: 'start_date', end_date: 'end_date', termination_clause: 'termination_clause', payment_terms: 'payment_terms', commissions: 'commissions', special_overrides: 'special_overrides', exclusivity: 'exclusivity' };
      Object.entries(fieldMap).forEach(([k]) => { if (data[k]) updates[k] = data[k]; });

      if (Object.keys(updates).length === 0) {
        setAiResult({ ok: false, message: 'No data could be extracted. The PDF may be a scanned image.' });
        return;
      }

      await api.put(`/contracts/${id}`, updates);
      const refreshed = await api.get(`/contracts/${id}`);
      setContract(refreshed.data);
      setAiResult({ ok: true, message: `${Object.keys(updates).length} field${Object.keys(updates).length !== 1 ? 's' : ''} updated from PDF.` });
    } catch (err) {
      setAiResult({ ok: false, message: err.response?.data?.error || 'AI extraction failed.' });
    } finally {
      setAiExtracting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/contracts/${id}`);
      navigate('/contracts');
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!pdfDocument || !searchTerm.trim()) return;
    setSearching(true);
    setSearchResults(null);
    const term = searchTerm.toLowerCase();
    const results = [];
    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map(item => item.str).join(' ').toLowerCase();
      if (text.includes(term)) results.push(i);
    }
    setSearchResults(results);
    if (results.length > 0) setPageNumber(results[0]);
    setSearching(false);
  }

  function clearSearch() {
    setSearchTerm('');
    setSearchResults(null);
  }

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function formatValue(val) {
    if (!val) return '—';
    return '£' + Number(val).toLocaleString('en-GB');
  }

  function daysLabel() {
    if (!contract) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end = new Date(contract.end_date); end.setHours(0, 0, 0, 0);
    const d = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    if (d < 0) return `Expired ${Math.abs(d)} days ago`;
    if (d === 0) return 'Expires today';
    return `${d} days remaining`;
  }

  if (loading) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  );

  if (!contract) return null;

  const pdfUrl = contract.pdf_path ? `${UPLOADS_BASE}/${contract.pdf_path}` : null;
  const countries = contract.countries ? JSON.parse(contract.countries) : [];
  const products = contract.products ? JSON.parse(contract.products) : [];
  const hasPartner = contract.partner_name || contract.partner_email || contract.partner_position || contract.partner_phone;
  const hasClauses = contract.termination_clause || contract.payment_terms || contract.commissions || contract.special_overrides || contract.exclusivity;

  return (
    <div style={{ padding: '32px', maxWidth: 1200 }} className="fade-in">
      {/* Back + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <Link to="/contracts" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b0a0cc', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          <ArrowLeft size={15} />Back to contracts
        </Link>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {contract.pdf_path && (
            <button
              onClick={handleAiExtract}
              disabled={aiExtracting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'rgba(84,46,145,0.2)', color: aiExtracting ? '#7060a0' : '#FDDC06', borderRadius: 8, fontSize: 13, fontWeight: 800, border: '1px solid #542E91', cursor: aiExtracting ? 'not-allowed' : 'pointer' }}
            >
              <Sparkles size={14} />
              {aiExtracting ? 'Extracting…' : 'AI Extract from PDF'}
            </button>
          )}
          {user?.role === 'editor' && (
            <>
              <Link to={`/contracts/${id}/edit`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#542E91', color: '#FDDC06', borderRadius: 8, fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>
                <Edit size={14} />Edit
              </Link>
              <button onClick={() => setShowDeleteConfirm(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 8, fontSize: 13, fontWeight: 800, border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer' }}>
                <Trash2 size={14} />Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* AI extract result banner */}
      {aiResult && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600,
          background: aiResult.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${aiResult.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: aiResult.ok ? '#22c55e' : '#ef4444',
        }}>
          {aiResult.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {aiResult.message}
          <button onClick={() => setAiResult(null)} style={{ marginLeft: 'auto', background: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.6 }}><X size={14} /></button>
        </div>
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#231540', border: '1px solid #3d2870', borderRadius: 16, padding: 32, maxWidth: 400, width: '90%' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Delete contract?</h3>
            <p style={{ color: '#b0a0cc', fontSize: 14, marginBottom: 24 }}>
              "<strong style={{ color: '#fff' }}>{contract.title}</strong>" will be permanently removed. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: '10px', background: '#2a1a4e', color: '#b0a0cc', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', border: '1px solid #3d2870' }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '10px', background: '#ef4444', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', border: 'none' }}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main info card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 6 }}>{contract.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b0a0cc', fontSize: 14 }}>
              <Briefcase size={14} />{contract.vendor}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <StatusBadge status={contract.status} size="lg" />
            <span style={{ fontSize: 12, color: contract.status === 'expired' ? '#ef4444' : contract.status === 'expiring_soon' ? '#f59e0b' : '#22c55e', fontWeight: 700 }}>
              {daysLabel()}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', paddingTop: 16, borderTop: '1px solid #3d2870' }}>
          {contract.partnership_start_date && (
            <InfoRow icon={<Calendar size={11} />} label="Partnership Since" value={formatDate(contract.partnership_start_date)} />
          )}
          <InfoRow icon={<Calendar size={11} />} label="Contract Start" value={formatDate(contract.start_date)} />
          <InfoRow icon={<Calendar size={11} />} label="Contract End" value={formatDate(contract.end_date)} />
          <InfoRow icon={<DollarSign size={11} />} label="Value" value={formatValue(contract.contract_value)} />
          <InfoRow icon={<User size={11} />} label="Owner" value={contract.owner_name} />
        </div>

        {contract.notes && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #3d2870' }}>
            <div style={{ fontSize: 11, color: '#7060a0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Notes</div>
            <p style={{ fontSize: 14, color: '#b0a0cc', lineHeight: 1.6 }}>{contract.notes}</p>
          </div>
        )}
      </div>

      {/* Countries + Products */}
      {(countries.length > 0 || products.length > 0) && (
        <div style={cardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {countries.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Globe size={14} color="#FDDC06" />
                  <span style={{ fontWeight: 800, fontSize: 14 }}>Countries</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {countries.map(c => <Tag key={c} label={c} color="#542E91" />)}
                </div>
              </div>
            )}
            {products.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Package size={14} color="#FDDC06" />
                  <span style={{ fontWeight: 800, fontSize: 14 }}>Products</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {products.map(p => <Tag key={p} label={p} color="#1a6b42" />)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Key Clauses */}
      {hasClauses && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <ScrollText size={15} color="#FDDC06" />
            <span style={{ fontWeight: 800, fontSize: 15 }}>Key Clauses</span>
            {contract.exclusivity && (
              <span style={{
                marginLeft: 'auto', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                background: contract.exclusivity === 'exclusive' ? 'rgba(253,220,6,0.15)' : 'rgba(84,46,145,0.2)',
                color: contract.exclusivity === 'exclusive' ? '#FDDC06' : '#b0a0cc',
                border: `1px solid ${contract.exclusivity === 'exclusive' ? 'rgba(253,220,6,0.3)' : '#3d2870'}`,
              }}>
                {contract.exclusivity}
              </span>
            )}
          </div>
          <ClauseRow label="Termination Clause" value={contract.termination_clause} />
          <ClauseRow label="Payment Terms" value={contract.payment_terms} />
          <ClauseRow label="Commissions" value={contract.commissions} />
          <ClauseRow label="Special Overrides" value={contract.special_overrides} />
        </div>
      )}

      {/* Partner Contact */}
      {hasPartner && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Users size={15} color="#FDDC06" />
            <span style={{ fontWeight: 800, fontSize: 15 }}>Partner Contact</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            {contract.partner_name && <InfoRow icon={<User size={11} />} label="Name" value={contract.partner_name} />}
            {contract.partner_position && <InfoRow icon={<BadgeCheck size={11} />} label="Position" value={contract.partner_position} />}
            {contract.partner_email && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7060a0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}><Mail size={11} />Email</div>
                <a href={`mailto:${contract.partner_email}`} style={{ fontSize: 14, fontWeight: 600, color: '#FDDC06', textDecoration: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                  {contract.partner_email}
                </a>
              </div>
            )}
            {contract.partner_phone && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7060a0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}><Phone size={11} />Phone</div>
                <a href={`tel:${contract.partner_phone}`} style={{ fontSize: 14, fontWeight: 600, color: '#FDDC06', textDecoration: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                  {contract.partner_phone}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contract Link */}
      {contract.contract_link && (
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExternalLink size={16} color="#FDDC06" />
            <div>
              <div style={{ fontSize: 11, color: '#7060a0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Contract Link</div>
              <span style={{ fontSize: 13, color: '#b0a0cc', wordBreak: 'break-all' }}>{contract.contract_link}</span>
            </div>
          </div>
          <a href={contract.contract_link} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#542E91', color: '#FDDC06', borderRadius: 8, fontSize: 13, fontWeight: 800, textDecoration: 'none', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = '#6B3CB5'}
            onMouseLeave={e => e.currentTarget.style.background = '#542E91'}>
            <ExternalLink size={14} />Open Link
          </a>
        </div>
      )}

      {/* Addendum documents list */}
      {documents.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Paperclip size={15} color="#FDDC06" />
            <span style={{ fontWeight: 800, fontSize: 15 }}>Addendums</span>
          </div>
          {documents.map(doc => (
            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(84,46,145,0.1)', border: '1px solid #3d2870', borderRadius: 8, marginBottom: 8 }}>
              <FileText size={14} color="#FDDC06" />
              <span style={{ fontSize: 13, color: '#b0a0cc', flex: 1 }}>{doc.label || doc.original_name}</span>
              <a href={`${UPLOADS_BASE}/${doc.filename}`} download={doc.original_name}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: '#2a1a4e', border: '1px solid #3d2870', borderRadius: 6, color: '#b0a0cc', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#542E91'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#3d2870'}>
                <Download size={12} />Download
              </a>
            </div>
          ))}
        </div>
      )}

      {/* PDF Viewer */}
      <div style={{ background: '#231540', border: '1px solid #3d2870', borderRadius: 12, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #3d2870', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} color="#FDDC06" />
            <span style={{ fontWeight: 800, fontSize: 15 }}>Contract Document</span>
          </div>

          {pdfUrl && (
            <a href={pdfUrl} download={`${contract.title}.pdf`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: '#2a1a4e', border: '1px solid #3d2870', borderRadius: 6, color: '#b0a0cc', fontSize: 12, fontWeight: 700, textDecoration: 'none', marginLeft: 4 }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#542E91'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#3d2870'}>
              <Download size={12} />Download
            </a>
          )}

          {pdfUrl && numPages && (
            <>
              {/* Search */}
              <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 200px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#7060a0', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Search PDF…"
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); if (!e.target.value) setSearchResults(null); }}
                    style={{ width: '100%', padding: '6px 28px 6px 28px', background: '#2a1a4e', border: '1px solid #3d2870', borderRadius: 6, color: '#fff', fontSize: 12, fontFamily: 'Nunito, sans-serif' }}
                  />
                  {searchTerm && (
                    <button type="button" onClick={clearSearch} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', color: '#7060a0', cursor: 'pointer', display: 'flex' }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button type="submit" disabled={searching || !searchTerm} style={{ padding: '6px 12px', background: '#542E91', color: '#FDDC06', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap' }}>
                  {searching ? '…' : 'Search'}
                </button>
              </form>

              {/* Search results nav */}
              {searchResults !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  {searchResults.length === 0 ? (
                    <span style={{ color: '#7060a0' }}>No results</span>
                  ) : (
                    <>
                      <span style={{ color: '#22c55e', fontWeight: 700 }}>Found on {searchResults.length === 1 ? 'page' : 'pages'}: {searchResults.join(', ')}</span>
                      {searchResults.map(p => (
                        <button key={p} onClick={() => setPageNumber(p)} style={{ padding: '3px 8px', background: pageNumber === p ? '#542E91' : '#2a1a4e', border: '1px solid #3d2870', borderRadius: 4, color: pageNumber === p ? '#FDDC06' : '#b0a0cc', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          {p}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Zoom + pagination */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                <button onClick={() => setPdfScale(s => Math.max(0.5, s - 0.2))} style={{ padding: '4px 8px', background: '#2a1a4e', border: '1px solid #3d2870', borderRadius: 6, color: '#b0a0cc', cursor: 'pointer' }}><ZoomOut size={14} /></button>
                <span style={{ fontSize: 12, color: '#b0a0cc', minWidth: 36, textAlign: 'center' }}>{Math.round(pdfScale * 100)}%</span>
                <button onClick={() => setPdfScale(s => Math.min(2.5, s + 0.2))} style={{ padding: '4px 8px', background: '#2a1a4e', border: '1px solid #3d2870', borderRadius: 6, color: '#b0a0cc', cursor: 'pointer' }}><ZoomIn size={14} /></button>
                <div style={{ width: 1, height: 20, background: '#3d2870' }} />
                <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1} style={{ padding: '4px 8px', background: '#2a1a4e', border: '1px solid #3d2870', borderRadius: 6, color: pageNumber <= 1 ? '#3d2870' : '#b0a0cc', cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer' }}><ChevronLeft size={14} /></button>
                <span style={{ fontSize: 12, color: '#b0a0cc', minWidth: 60, textAlign: 'center' }}>{pageNumber} / {numPages}</span>
                <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages} style={{ padding: '4px 8px', background: '#2a1a4e', border: '1px solid #3d2870', borderRadius: 6, color: pageNumber >= numPages ? '#3d2870' : '#b0a0cc', cursor: pageNumber >= numPages ? 'not-allowed' : 'pointer' }}><ChevronRight size={14} /></button>
              </div>
            </>
          )}
        </div>

        <div style={{ padding: 20 }}>
          {!pdfUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#7060a0', border: '2px dashed #3d2870', borderRadius: 8, gap: 10 }}>
              <FileText size={36} color="#3d2870" />
              <p style={{ fontWeight: 600, fontSize: 14 }}>No PDF document attached</p>
              {user?.role === 'editor' && (
                <Link to={`/contracts/${id}/edit`} style={{ color: '#FDDC06', fontSize: 13, fontWeight: 700 }}>Edit contract to upload a PDF</Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', overflow: 'auto' }}>
              <Document
                file={pdfUrl}
                onLoadSuccess={(pdf) => { setNumPages(pdf.numPages); setPageNumber(1); setPdfDocument(pdf); }}
                onLoadError={err => console.error('PDF load error:', err)}
                loading={<div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>}
                error={<div style={{ color: '#ef4444', padding: 20, textAlign: 'center', fontSize: 13 }}>Failed to load PDF. Please check the file is valid.</div>}
              >
                <Page pageNumber={pageNumber} scale={pdfScale} renderTextLayer={true} renderAnnotationLayer={true} />
              </Document>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
