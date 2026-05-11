import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Calendar, User, Briefcase, DollarSign, FileText, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ExternalLink, Users, Mail, Phone, BadgeCheck } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import api, { UPLOADS_BASE } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7060a0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{value || '—'}</div>
    </div>
  );
}

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.0);

  useEffect(() => {
    api.get(`/contracts/${id}`)
      .then((res) => setContract(res.data))
      .catch(() => navigate('/contracts'))
      .finally(() => setLoading(false));
  }, [id]);

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

  function formatDate(d) {
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
    if (d <= 90) return `Expires in ${d} days`;
    return `${d} days remaining`;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!contract) return null;

  const pdfUrl = contract.pdf_path ? `${UPLOADS_BASE}/${contract.pdf_path}` : null;

  return (
    <div style={{ padding: '32px', maxWidth: 1200 }} className="fade-in">
      {/* Back + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <Link to="/contracts" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b0a0cc', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          <ArrowLeft size={15} />
          Back to contracts
        </Link>

        {user?.role === 'editor' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <Link
              to={`/contracts/${id}/edit`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 18px',
                background: '#542E91',
                color: '#FDDC06',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 800,
                textDecoration: 'none',
                transition: 'background 0.15s',
              }}
            >
              <Edit size={14} />
              Edit
            </Link>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 18px',
                background: 'rgba(239,68,68,0.1)',
                color: '#ef4444',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 800,
                border: '1px solid rgba(239,68,68,0.3)',
                transition: 'background 0.15s',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ background: '#231540', border: '1px solid #3d2870', borderRadius: 16, padding: 32, maxWidth: 400, width: '90%' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Delete contract?</h3>
            <p style={{ color: '#b0a0cc', fontSize: 14, marginBottom: 24 }}>
              "<strong style={{ color: '#fff' }}>{contract.title}</strong>" will be permanently removed. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, padding: '10px', background: '#2a1a4e', color: '#b0a0cc', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', border: '1px solid #3d2870' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ flex: 1, padding: '10px', background: '#ef4444', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', border: 'none' }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contract header */}
      <div style={{
        background: '#231540',
        border: '1px solid #3d2870',
        borderRadius: 12,
        padding: '24px',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 6 }}>{contract.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b0a0cc', fontSize: 14 }}>
              <Briefcase size={14} />
              {contract.vendor}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <StatusBadge status={contract.status} size="lg" />
            <span style={{
              fontSize: 12,
              color: contract.status === 'expired' ? '#ef4444' : contract.status === 'expiring_soon' ? '#f59e0b' : '#22c55e',
              fontWeight: 700,
            }}>
              {daysLabel()}
            </span>
          </div>
        </div>

        {/* Info grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '20px',
          paddingTop: 16,
          borderTop: '1px solid #3d2870',
        }}>
          <InfoRow
            icon={<Calendar size={11} />}
            label="Start Date"
            value={formatDate(contract.start_date)}
          />
          <InfoRow
            icon={<Calendar size={11} />}
            label="End Date"
            value={formatDate(contract.end_date)}
          />
          <InfoRow
            icon={<DollarSign size={11} />}
            label="Contract Value"
            value={formatValue(contract.contract_value)}
          />
          <InfoRow
            icon={<User size={11} />}
            label="Owner"
            value={contract.owner_name}
          />
        </div>

        {contract.notes && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #3d2870' }}>
            <div style={{ fontSize: 11, color: '#7060a0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Notes</div>
            <p style={{ fontSize: 14, color: '#b0a0cc', lineHeight: 1.6 }}>{contract.notes}</p>
          </div>
        )}
      </div>

      {/* Partner Contact */}
      {(contract.partner_name || contract.partner_email || contract.partner_position || contract.partner_phone) && (
        <div style={{
          background: '#231540',
          border: '1px solid #3d2870',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Users size={15} color="#FDDC06" />
            <span style={{ fontWeight: 800, fontSize: 15 }}>Partner Contact</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            {contract.partner_name && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7060a0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <User size={11} />
                  Name
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{contract.partner_name}</div>
              </div>
            )}
            {contract.partner_position && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7060a0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <BadgeCheck size={11} />
                  Position
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{contract.partner_position}</div>
              </div>
            )}
            {contract.partner_email && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7060a0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <Mail size={11} />
                  Email
                </div>
                <a
                  href={`mailto:${contract.partner_email}`}
                  style={{ fontSize: 14, fontWeight: 600, color: '#FDDC06', textDecoration: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                >
                  {contract.partner_email}
                </a>
              </div>
            )}
            {contract.partner_phone && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7060a0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <Phone size={11} />
                  Phone
                </div>
                <a
                  href={`tel:${contract.partner_phone}`}
                  style={{ fontSize: 14, fontWeight: 600, color: '#FDDC06', textDecoration: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                >
                  {contract.partner_phone}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contract Link */}
      {contract.contract_link && (
        <div style={{
          background: '#231540',
          border: '1px solid #3d2870',
          borderRadius: 12,
          padding: '20px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExternalLink size={16} color="#FDDC06" />
            <div>
              <div style={{ fontSize: 11, color: '#7060a0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Contract Link</div>
              <span style={{ fontSize: 13, color: '#b0a0cc', wordBreak: 'break-all' }}>{contract.contract_link}</span>
            </div>
          </div>
          <a
            href={contract.contract_link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 18px',
              background: '#542E91',
              color: '#FDDC06',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 800,
              textDecoration: 'none',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#6B3CB5'}
            onMouseLeave={e => e.currentTarget.style.background = '#542E91'}
          >
            <ExternalLink size={14} />
            Open Link
          </a>
        </div>
      )}

      {/* PDF Viewer */}
      <div style={{
        background: '#231540',
        border: '1px solid #3d2870',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #3d2870',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} color="#FDDC06" />
            <span style={{ fontWeight: 800, fontSize: 15 }}>Contract Document</span>
          </div>

          {pdfUrl && numPages && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setPdfScale(s => Math.max(0.5, s - 0.2))}
                style={{ padding: '4px 8px', background: '#2a1a4e', border: '1px solid #3d2870', borderRadius: 6, color: '#b0a0cc', cursor: 'pointer' }}
              >
                <ZoomOut size={14} />
              </button>
              <span style={{ fontSize: 12, color: '#b0a0cc', minWidth: 36, textAlign: 'center' }}>{Math.round(pdfScale * 100)}%</span>
              <button
                onClick={() => setPdfScale(s => Math.min(2.5, s + 0.2))}
                style={{ padding: '4px 8px', background: '#2a1a4e', border: '1px solid #3d2870', borderRadius: 6, color: '#b0a0cc', cursor: 'pointer' }}
              >
                <ZoomIn size={14} />
              </button>

              <div style={{ width: 1, height: 20, background: '#3d2870' }} />

              <button
                onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
                style={{ padding: '4px 8px', background: '#2a1a4e', border: '1px solid #3d2870', borderRadius: 6, color: pageNumber <= 1 ? '#3d2870' : '#b0a0cc', cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer' }}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 12, color: '#b0a0cc', minWidth: 60, textAlign: 'center' }}>
                {pageNumber} / {numPages}
              </span>
              <button
                onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                disabled={pageNumber >= numPages}
                style={{ padding: '4px 8px', background: '#2a1a4e', border: '1px solid #3d2870', borderRadius: 6, color: pageNumber >= numPages ? '#3d2870' : '#b0a0cc', cursor: pageNumber >= numPages ? 'not-allowed' : 'pointer' }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: 20 }}>
          {!pdfUrl ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              color: '#7060a0',
              border: '2px dashed #3d2870',
              borderRadius: 8,
              gap: 10,
            }}>
              <FileText size={36} color="#3d2870" />
              <p style={{ fontWeight: 600, fontSize: 14 }}>No PDF document attached</p>
              {user?.role === 'editor' && (
                <Link to={`/contracts/${id}/edit`} style={{ color: '#FDDC06', fontSize: 13, fontWeight: 700 }}>
                  Edit contract to upload a PDF
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', overflow: 'auto' }}>
              <Document
                file={pdfUrl}
                onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPageNumber(1); }}
                onLoadError={(err) => console.error('PDF load error:', err)}
                loading={
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <div className="spinner" />
                  </div>
                }
                error={
                  <div style={{ color: '#ef4444', padding: 20, textAlign: 'center', fontSize: 13 }}>
                    Failed to load PDF. Please check the file is valid.
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={pdfScale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
