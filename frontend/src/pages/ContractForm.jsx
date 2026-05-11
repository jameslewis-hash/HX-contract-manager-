import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Upload, X, FileText, AlertCircle, Link2, Sparkles, CheckCircle, Users } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  color: '#b0a0cc',
  marginBottom: 6,
};

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  background: '#2a1a4e',
  border: '1px solid #3d2870',
  borderRadius: 8,
  color: '#fff',
  fontSize: 14,
  fontFamily: 'Nunito, sans-serif',
  transition: 'border-color 0.15s',
};

function Field({ label, required, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}{required && <span style={{ color: '#FDDC06', marginLeft: 3 }}>*</span>}</label>
      {children}
    </div>
  );
}

export default function ContractForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const [form, setForm] = useState({
    title: '',
    vendor: '',
    contract_value: '',
    start_date: '',
    end_date: '',
    owner_name: '',
    notes: '',
    contract_link: '',
    partner_name: '',
    partner_email: '',
    partner_position: '',
    partner_phone: '',
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [existingPdf, setExistingPdf] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState(null); // 'success' | 'partial' | 'error'
  const [extractMessage, setExtractMessage] = useState('');

  useEffect(() => {
    if (user?.role !== 'editor') {
      navigate('/contracts');
      return;
    }
    if (!isEdit) return;

    api.get(`/contracts/${id}`)
      .then((res) => {
        const c = res.data;
        setForm({
          title: c.title || '',
          vendor: c.vendor || '',
          contract_value: c.contract_value ?? '',
          start_date: c.start_date || '',
          end_date: c.end_date || '',
          owner_name: c.owner_name || '',
          notes: c.notes || '',
          contract_link: c.contract_link || '',
          partner_name: c.partner_name || '',
          partner_email: c.partner_email || '',
          partner_position: c.partner_position || '',
          partner_phone: c.partner_phone || '',
        });
        setExistingPdf(c.pdf_path);
      })
      .catch(() => navigate('/contracts'))
      .finally(() => setLoading(false));
  }, [id]);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleExtractDates() {
    if (!pdfFile) return;
    setExtracting(true);
    setExtractResult(null);
    setExtractMessage('');

    const data = new FormData();
    data.append('pdf', pdfFile);

    try {
      const res = await api.post('/contracts/extract-dates', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { start_date, end_date } = res.data;

      if (start_date || end_date) {
        setForm(f => ({
          ...f,
          ...(start_date ? { start_date } : {}),
          ...(end_date ? { end_date } : {}),
        }));
        if (start_date && end_date) {
          setExtractResult('success');
          setExtractMessage('Start date and end date extracted successfully.');
        } else {
          setExtractResult('partial');
          setExtractMessage(
            start_date ? 'Start date found; end date not detected.' : 'End date found; start date not detected.'
          );
        }
      } else {
        setExtractResult('error');
        setExtractMessage('No dates found in the document. Please enter them manually.');
      }
    } catch (err) {
      setExtractResult('error');
      setExtractMessage(err.response?.data?.error || 'Failed to extract dates. Please enter them manually.');
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== '') data.append(k, v);
    });
    if (pdfFile) data.append('pdf', pdfFile);

    try {
      if (isEdit) {
        await api.put(`/contracts/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
        navigate(`/contracts/${id}`);
      } else {
        const res = await api.post('/contracts', data, { headers: { 'Content-Type': 'multipart/form-data' } });
        navigate(`/contracts/${res.data.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save contract. Please try again.');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: 800 }} className="fade-in">
      {/* Back */}
      <Link
        to={isEdit ? `/contracts/${id}` : '/contracts'}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#b0a0cc', fontSize: 13, fontWeight: 600, marginBottom: 28, textDecoration: 'none' }}
      >
        <ArrowLeft size={15} />
        {isEdit ? 'Back to contract' : 'Back to contracts'}
      </Link>

      <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 6 }}>
        {isEdit ? 'Edit Contract' : 'New Contract'}
      </h1>
      <p style={{ color: '#b0a0cc', fontSize: 14, marginBottom: 32 }}>
        {isEdit ? 'Update the contract details below.' : 'Fill in the details to add a new contract.'}
      </p>

      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 24,
          color: '#ef4444',
          fontSize: 13,
        }}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{
          background: '#231540',
          border: '1px solid #3d2870',
          borderRadius: 12,
          padding: '28px',
          marginBottom: 20,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, color: '#fff' }}>Contract Details</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Contract Title" required>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Amadeus GDS Integration"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#542E91'}
                  onBlur={e => e.target.style.borderColor = '#3d2870'}
                />
              </Field>
            </div>

            <Field label="Vendor / Supplier" required>
              <input
                name="vendor"
                value={form.vendor}
                onChange={handleChange}
                required
                placeholder="e.g. Amadeus IT Group"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#542E91'}
                onBlur={e => e.target.style.borderColor = '#3d2870'}
              />
            </Field>

            <Field label="Contract Value (£)">
              <input
                name="contract_value"
                type="number"
                min="0"
                step="0.01"
                value={form.contract_value}
                onChange={handleChange}
                placeholder="e.g. 125000"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#542E91'}
                onBlur={e => e.target.style.borderColor = '#3d2870'}
              />
            </Field>

            <Field label="Start Date" required>
              <input
                name="start_date"
                type="date"
                value={form.start_date}
                onChange={handleChange}
                required
                style={{ ...inputStyle, colorScheme: 'dark' }}
                onFocus={e => e.target.style.borderColor = '#542E91'}
                onBlur={e => e.target.style.borderColor = '#3d2870'}
              />
            </Field>

            <Field label="End Date" required>
              <input
                name="end_date"
                type="date"
                value={form.end_date}
                onChange={handleChange}
                required
                style={{ ...inputStyle, colorScheme: 'dark' }}
                onFocus={e => e.target.style.borderColor = '#542E91'}
                onBlur={e => e.target.style.borderColor = '#3d2870'}
              />
            </Field>

            <Field label="Owner / Responsible Person">
              <input
                name="owner_name"
                value={form.owner_name}
                onChange={handleChange}
                placeholder="e.g. James Lewis"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#542E91'}
                onBlur={e => e.target.style.borderColor = '#3d2870'}
              />
            </Field>

            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Notes">
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Add any relevant notes about this contract..."
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                  onFocus={e => e.target.style.borderColor = '#542E91'}
                  onBlur={e => e.target.style.borderColor = '#3d2870'}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Partner Contact */}
        <div style={{
          background: '#231540',
          border: '1px solid #3d2870',
          borderRadius: 12,
          padding: '28px',
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Users size={16} color="#FDDC06" />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Partner Contact</h2>
          </div>
          <p style={{ fontSize: 13, color: '#7060a0', marginBottom: 20 }}>The vendor's point of contact for this contract.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <Field label="Contact Name">
              <input
                name="partner_name"
                value={form.partner_name}
                onChange={handleChange}
                placeholder="e.g. Sarah Jones"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#542E91'}
                onBlur={e => e.target.style.borderColor = '#3d2870'}
              />
            </Field>

            <Field label="Position / Title">
              <input
                name="partner_position"
                value={form.partner_position}
                onChange={handleChange}
                placeholder="e.g. Account Manager"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#542E91'}
                onBlur={e => e.target.style.borderColor = '#3d2870'}
              />
            </Field>

            <Field label="Email Address">
              <input
                name="partner_email"
                type="email"
                value={form.partner_email}
                onChange={handleChange}
                placeholder="e.g. sarah@vendor.com"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#542E91'}
                onBlur={e => e.target.style.borderColor = '#3d2870'}
              />
            </Field>

            <Field label="Phone Number">
              <input
                name="partner_phone"
                type="tel"
                value={form.partner_phone}
                onChange={handleChange}
                placeholder="e.g. +44 7700 900123"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#542E91'}
                onBlur={e => e.target.style.borderColor = '#3d2870'}
              />
            </Field>
          </div>
        </div>

        {/* Contract Document */}
        <div style={{
          background: '#231540',
          border: '1px solid #3d2870',
          borderRadius: 12,
          padding: '28px',
          marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6, color: '#fff' }}>Contract Document</h2>
          <p style={{ fontSize: 13, color: '#7060a0', marginBottom: 20 }}>Upload a PDF and/or add a link to the contract document.</p>

          {/* Contract URL */}
          <div style={{ marginBottom: 20 }}>
            <Field label="Contract URL / Link">
              <div style={{ position: 'relative' }}>
                <Link2 size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7060a0', pointerEvents: 'none' }} />
                <input
                  name="contract_link"
                  type="url"
                  value={form.contract_link}
                  onChange={handleChange}
                  placeholder="https://drive.google.com/..."
                  style={{ ...inputStyle, paddingLeft: 34 }}
                  onFocus={e => e.target.style.borderColor = '#542E91'}
                  onBlur={e => e.target.style.borderColor = '#3d2870'}
                />
              </div>
            </Field>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: '#3d2870' }} />
            <span style={{ fontSize: 11, color: '#7060a0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>or upload PDF</span>
            <div style={{ flex: 1, height: 1, background: '#3d2870' }} />
          </div>

          {existingPdf && !pdfFile && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              background: 'rgba(84,46,145,0.15)',
              border: '1px solid #3d2870',
              borderRadius: 8,
              marginBottom: 12,
            }}>
              <FileText size={16} color="#FDDC06" />
              <span style={{ fontSize: 13, color: '#b0a0cc', flex: 1 }}>Current PDF: {existingPdf}</span>
              <span style={{ fontSize: 11, color: '#7060a0' }}>Upload a new file to replace</span>
            </div>
          )}

          {pdfFile ? (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: 8,
                marginBottom: 12,
              }}>
                <FileText size={16} color="#22c55e" />
                <span style={{ fontSize: 13, color: '#22c55e', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pdfFile.name}
                </span>
                <button
                  type="button"
                  onClick={() => { setPdfFile(null); setExtractResult(null); setExtractMessage(''); }}
                  style={{ background: 'none', color: '#b0a0cc', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Extract dates button */}
              <button
                type="button"
                onClick={handleExtractDates}
                disabled={extracting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '11px 16px',
                  background: extracting ? 'rgba(84,46,145,0.2)' : 'rgba(84,46,145,0.15)',
                  border: '1px solid #542E91',
                  borderRadius: 8,
                  color: extracting ? '#7060a0' : '#FDDC06',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: extracting ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                  marginBottom: extractResult ? 10 : 0,
                }}
                onMouseEnter={e => { if (!extracting) e.currentTarget.style.background = 'rgba(84,46,145,0.3)'; }}
                onMouseLeave={e => { if (!extracting) e.currentTarget.style.background = 'rgba(84,46,145,0.15)'; }}
              >
                <Sparkles size={14} />
                {extracting ? 'Extracting dates with AI…' : 'Extract start & end dates from PDF'}
              </button>

              {/* Extract result feedback */}
              {extractResult && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  background: extractResult === 'error'
                    ? 'rgba(239,68,68,0.08)'
                    : extractResult === 'partial'
                    ? 'rgba(245,158,11,0.08)'
                    : 'rgba(34,197,94,0.08)',
                  border: `1px solid ${extractResult === 'error' ? 'rgba(239,68,68,0.3)' : extractResult === 'partial' ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'}`,
                  color: extractResult === 'error' ? '#ef4444' : extractResult === 'partial' ? '#f59e0b' : '#22c55e',
                }}>
                  {extractResult === 'success' ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                  {extractMessage}
                </div>
              )}
            </>
          ) : (
            <label style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '32px',
              border: '2px dashed #3d2870',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#542E91'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#3d2870'}
            >
              <Upload size={24} color="#7060a0" />
              <span style={{ fontSize: 14, color: '#b0a0cc', fontWeight: 600 }}>Click to upload PDF</span>
              <span style={{ fontSize: 12, color: '#7060a0' }}>PDF only, max 20MB</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files[0] || null)}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Link
            to={isEdit ? `/contracts/${id}` : '/contracts'}
            style={{
              padding: '11px 24px',
              background: '#2a1a4e',
              color: '#b0a0cc',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              border: '1px solid #3d2870',
              textDecoration: 'none',
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '11px 28px',
              background: saving ? '#3d2070' : '#542E91',
              color: '#FDDC06',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 800,
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#6B3CB5'; }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#542E91'; }}
          >
            {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Contract')}
          </button>
        </div>
      </form>
    </div>
  );
}
