import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Upload, X, FileText, AlertCircle, Link2, Sparkles, CheckCircle, Users, Globe, Package, ScrollText, Trash2 } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const COUNTRIES = ['UK', 'Germany', 'Netherlands', 'Belgium', 'Austria', 'Switzerland', 'Spain', 'Italy', 'France', 'Poland', 'Czech Republic', 'Nordics'];
const PRODUCTS = ['Parking', 'Hotels', 'Lounges', 'Fast Track', 'Car Hire', 'Transfers'];

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

const cardStyle = {
  background: '#231540',
  border: '1px solid #3d2870',
  borderRadius: 12,
  padding: '28px',
  marginBottom: 20,
};

function Field({ label, required, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}{required && <span style={{ color: '#FDDC06', marginLeft: 3 }}>*</span>}</label>
      {children}
    </div>
  );
}

function focusStyle(e) { e.target.style.borderColor = '#542E91'; }
function blurStyle(e) { e.target.style.borderColor = '#3d2870'; }

export default function ContractForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const [form, setForm] = useState({
    title: '', vendor: '', contract_value: '', start_date: '', end_date: '',
    owner_name: '', owner_email: '', notes: '', contract_link: '',
    partnership_start_date: '',
    partner_name: '', partner_email: '', partner_position: '', partner_phone: '',
    countries: [],
    products: [],
    termination_clause: '', payment_terms: '', commissions: '', special_overrides: '', exclusivity: '',
  });

  const [pdfFile, setPdfFile] = useState(null);
  const [existingPdf, setExistingPdf] = useState(null);
  const [existingDocs, setExistingDocs] = useState([]);
  const [newDocs, setNewDocs] = useState([]); // { file, label }
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [extractingDates, setExtractingDates] = useState(false);
  const [extractingClauses, setExtractingClauses] = useState(false);
  const [dateExtractResult, setDateExtractResult] = useState(null);
  const [clauseExtractResult, setClauseExtractResult] = useState(null);

  useEffect(() => {
    if (user?.role !== 'editor') { navigate('/contracts'); return; }
    if (!isEdit) return;

    Promise.all([
      api.get(`/contracts/${id}`),
      api.get(`/contracts/${id}/documents`),
    ]).then(([cRes, dRes]) => {
      const c = cRes.data;
      setForm({
        title: c.title || '',
        vendor: c.vendor || '',
        contract_value: c.contract_value ?? '',
        start_date: c.start_date || '',
        end_date: c.end_date || '',
        owner_name: c.owner_name || '',
        owner_email: c.owner_email || '',
        notes: c.notes || '',
        contract_link: c.contract_link || '',
        partnership_start_date: c.partnership_start_date || '',
        partner_name: c.partner_name || '',
        partner_email: c.partner_email || '',
        partner_position: c.partner_position || '',
        partner_phone: c.partner_phone || '',
        countries: c.countries ? JSON.parse(c.countries) : [],
        products: c.products ? JSON.parse(c.products) : [],
        termination_clause: c.termination_clause || '',
        payment_terms: c.payment_terms || '',
        commissions: c.commissions || '',
        special_overrides: c.special_overrides || '',
        exclusivity: c.exclusivity || '',
      });
      setExistingPdf(c.pdf_path);
      setExistingDocs(dRes.data);
    })
      .catch(() => navigate('/contracts'))
      .finally(() => setLoading(false));
  }, [id]);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function toggleCountry(country) {
    setForm(f => ({
      ...f,
      countries: f.countries.includes(country)
        ? f.countries.filter(c => c !== country)
        : [...f.countries, country],
    }));
  }

  function toggleProduct(product) {
    setForm(f => ({
      ...f,
      products: f.products.includes(product)
        ? f.products.filter(p => p !== product)
        : [...f.products, product],
    }));
  }

  async function handleExtractDates() {
    if (!pdfFile) return;
    setExtractingDates(true);
    setDateExtractResult(null);
    const data = new FormData();
    data.append('pdf', pdfFile);
    try {
      const res = await api.post('/contracts/extract-dates', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      const { start_date, end_date } = res.data;
      if (start_date || end_date) {
        setForm(f => ({ ...f, ...(start_date ? { start_date } : {}), ...(end_date ? { end_date } : {}) }));
        setDateExtractResult(start_date && end_date ? 'success' : 'partial');
      } else {
        setDateExtractResult('error');
      }
    } catch {
      setDateExtractResult('error');
    } finally {
      setExtractingDates(false);
    }
  }

  async function handleExtractClauses() {
    if (!pdfFile) return;
    setExtractingClauses(true);
    setClauseExtractResult(null);
    const data = new FormData();
    data.append('pdf', pdfFile);
    try {
      const res = await api.post('/contracts/extract-clauses', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      const { termination_clause, payment_terms, commissions, special_overrides, exclusivity } = res.data;
      setForm(f => ({
        ...f,
        ...(termination_clause ? { termination_clause } : {}),
        ...(payment_terms ? { payment_terms } : {}),
        ...(commissions ? { commissions } : {}),
        ...(special_overrides ? { special_overrides } : {}),
        ...(exclusivity ? { exclusivity } : {}),
      }));
      const found = [termination_clause, payment_terms, commissions, special_overrides, exclusivity].filter(Boolean).length;
      setClauseExtractResult(found > 0 ? (found >= 3 ? 'success' : 'partial') : 'error');
    } catch {
      setClauseExtractResult('error');
    } finally {
      setExtractingClauses(false);
    }
  }

  function addNewDoc(file) {
    setNewDocs(d => [...d, { file, label: '' }]);
  }

  function updateNewDocLabel(idx, label) {
    setNewDocs(d => d.map((doc, i) => i === idx ? { ...doc, label } : doc));
  }

  function removeNewDoc(idx) {
    setNewDocs(d => d.filter((_, i) => i !== idx));
  }

  async function deleteExistingDoc(docId) {
    try {
      await api.delete(`/contracts/${id}/documents/${docId}`);
      setExistingDocs(d => d.filter(doc => doc.id !== docId));
    } catch { /* ignore */ }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        if (v.length > 0) data.append(k, JSON.stringify(v));
      } else if (v !== '') {
        data.append(k, v);
      }
    });
    if (pdfFile) data.append('pdf', pdfFile);

    try {
      let contractId = id;
      if (isEdit) {
        await api.put(`/contracts/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        const res = await api.post('/contracts', data, { headers: { 'Content-Type': 'multipart/form-data' } });
        contractId = res.data.id;
      }

      // Upload any new addendum documents
      for (const doc of newDocs) {
        const fd = new FormData();
        fd.append('pdf', doc.file);
        if (doc.label) fd.append('label', doc.label);
        await api.post(`/contracts/${contractId}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      navigate(`/contracts/${contractId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save contract. Please try again.');
      setSaving(false);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  );

  const extractFeedback = (result, successMsg, partialMsg) => result && (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, marginTop: 10,
      background: result === 'error' ? 'rgba(239,68,68,0.08)' : result === 'partial' ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)',
      border: `1px solid ${result === 'error' ? 'rgba(239,68,68,0.3)' : result === 'partial' ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'}`,
      color: result === 'error' ? '#ef4444' : result === 'partial' ? '#f59e0b' : '#22c55e',
    }}>
      {result === 'success' ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
      {result === 'success' ? successMsg : result === 'partial' ? partialMsg : 'Nothing found — document may be scanned or text not present'}
    </div>
  );

  return (
    <div style={{ padding: '32px', maxWidth: 800 }} className="fade-in">
      <Link to={isEdit ? `/contracts/${id}` : '/contracts'}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#b0a0cc', fontSize: 13, fontWeight: 600, marginBottom: 28, textDecoration: 'none' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 24, color: '#ef4444', fontSize: 13 }}>
          <AlertCircle size={14} />{error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ── Contract Details ── */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, color: '#fff' }}>Contract Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Contract Title" required>
                <input name="title" value={form.title} onChange={handleChange} required placeholder="e.g. Amadeus GDS Integration" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
              </Field>
            </div>
            <Field label="Vendor / Supplier" required>
              <input name="vendor" value={form.vendor} onChange={handleChange} required placeholder="e.g. Amadeus IT Group" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
            <Field label="Contract Value (£)">
              <input name="contract_value" type="number" min="0" step="0.01" value={form.contract_value} onChange={handleChange} placeholder="e.g. 125000" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
            <Field label="Partnership Start Date">
              <input name="partnership_start_date" type="date" value={form.partnership_start_date} onChange={handleChange} style={{ ...inputStyle, colorScheme: 'dark' }} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
            <Field label="Contract Start Date" required>
              <input name="start_date" type="date" value={form.start_date} onChange={handleChange} required style={{ ...inputStyle, colorScheme: 'dark' }} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
            <Field label="Contract End Date" required>
              <input name="end_date" type="date" value={form.end_date} onChange={handleChange} required style={{ ...inputStyle, colorScheme: 'dark' }} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
            <Field label="Owner / Responsible Person">
              <input name="owner_name" value={form.owner_name} onChange={handleChange} placeholder="e.g. James Lewis" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
            <Field label="Owner Email">
              <input name="owner_email" type="email" value={form.owner_email} onChange={handleChange} placeholder="e.g. james@holidayextras.com" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Notes">
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} placeholder="Add any relevant notes..." style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} onFocus={focusStyle} onBlur={blurStyle} />
              </Field>
            </div>
          </div>
        </div>

        {/* ── Countries ── */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Globe size={16} color="#FDDC06" />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Countries</h2>
          </div>
          <p style={{ fontSize: 13, color: '#7060a0', marginBottom: 16 }}>Select all countries this contract covers.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {COUNTRIES.map(country => {
              const selected = form.countries.includes(country);
              return (
                <button key={country} type="button" onClick={() => toggleCountry(country)} style={{
                  padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                  background: selected ? '#542E91' : '#2a1a4e',
                  color: selected ? '#FDDC06' : '#b0a0cc',
                  border: selected ? '1px solid #6B3CB5' : '1px solid #3d2870',
                }}>
                  {country}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Products ── */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Package size={16} color="#FDDC06" />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Products</h2>
          </div>
          <p style={{ fontSize: 13, color: '#7060a0', marginBottom: 16 }}>Select all products covered by this contract.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PRODUCTS.map(product => {
              const selected = form.products.includes(product);
              return (
                <button key={product} type="button" onClick={() => toggleProduct(product)} style={{
                  padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                  background: selected ? '#542E91' : '#2a1a4e',
                  color: selected ? '#FDDC06' : '#b0a0cc',
                  border: selected ? '1px solid #6B3CB5' : '1px solid #3d2870',
                }}>
                  {product}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Key Clauses ── */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <ScrollText size={16} color="#FDDC06" />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Key Clauses</h2>
          </div>
          <p style={{ fontSize: 13, color: '#7060a0', marginBottom: 16 }}>Enter manually or extract automatically from the uploaded PDF.</p>

          {pdfFile && (
            <div style={{ marginBottom: 16 }}>
              <button type="button" onClick={handleExtractClauses} disabled={extractingClauses} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                background: extractingClauses ? 'rgba(84,46,145,0.2)' : 'rgba(84,46,145,0.15)',
                border: '1px solid #542E91', borderRadius: 8,
                color: extractingClauses ? '#7060a0' : '#FDDC06',
                fontSize: 13, fontWeight: 700, cursor: extractingClauses ? 'not-allowed' : 'pointer',
              }}>
                <Sparkles size={14} />
                {extractingClauses ? 'Extracting clauses with AI…' : 'Extract key clauses from PDF'}
              </button>
              {extractFeedback(clauseExtractResult, 'Clauses extracted successfully.', 'Some clauses found — check and complete the rest manually.')}
            </div>
          )}

          <div style={{ display: 'grid', gap: '16px' }}>
            <Field label="Termination Clause">
              <textarea name="termination_clause" value={form.termination_clause} onChange={handleChange} rows={3} placeholder="Summary of termination terms..." style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
            <Field label="Payment Terms">
              <textarea name="payment_terms" value={form.payment_terms} onChange={handleChange} rows={2} placeholder="e.g. Net 30 days, invoiced quarterly..." style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
            <Field label="Commissions">
              <textarea name="commissions" value={form.commissions} onChange={handleChange} rows={2} placeholder="e.g. 18% commission on all bookings..." style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
            <Field label="Special Overrides">
              <textarea name="special_overrides" value={form.special_overrides} onChange={handleChange} rows={2} placeholder="Any special overrides or non-standard clauses..." style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
            <Field label="Exclusivity">
              <select name="exclusivity" value={form.exclusivity} onChange={handleChange} style={{ ...inputStyle, cursor: 'pointer' }} onFocus={focusStyle} onBlur={blurStyle}>
                <option value="">Not specified</option>
                <option value="exclusive">Exclusive</option>
                <option value="non-exclusive">Non-exclusive</option>
              </select>
            </Field>
          </div>
        </div>

        {/* ── Partner Contact ── */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Users size={16} color="#FDDC06" />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Partner Contact</h2>
          </div>
          <p style={{ fontSize: 13, color: '#7060a0', marginBottom: 20 }}>The vendor's point of contact for this contract.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <Field label="Contact Name">
              <input name="partner_name" value={form.partner_name} onChange={handleChange} placeholder="e.g. Sarah Jones" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
            <Field label="Position / Title">
              <input name="partner_position" value={form.partner_position} onChange={handleChange} placeholder="e.g. Account Manager" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
            <Field label="Email Address">
              <input name="partner_email" type="email" value={form.partner_email} onChange={handleChange} placeholder="e.g. sarah@vendor.com" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
            <Field label="Phone Number">
              <input name="partner_phone" type="tel" value={form.partner_phone} onChange={handleChange} placeholder="e.g. +44 7700 900123" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
          </div>
        </div>

        {/* ── Contract Documents ── */}
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <FileText size={16} color="#FDDC06" />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Contract Documents</h2>
          </div>
          <p style={{ fontSize: 13, color: '#7060a0', marginBottom: 20 }}>Upload the main contract and any addendums.</p>

          {/* Main contract PDF */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ ...labelStyle, marginBottom: 10 }}>Main Contract</label>

            {/* Contract URL */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ position: 'relative' }}>
                <Link2 size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7060a0', pointerEvents: 'none' }} />
                <input name="contract_link" type="url" value={form.contract_link} onChange={handleChange} placeholder="Contract URL (optional)" style={{ ...inputStyle, paddingLeft: 34 }} onFocus={focusStyle} onBlur={blurStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1, height: 1, background: '#3d2870' }} />
              <span style={{ fontSize: 11, color: '#7060a0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>or upload PDF</span>
              <div style={{ flex: 1, height: 1, background: '#3d2870' }} />
            </div>

            {existingPdf && !pdfFile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(84,46,145,0.15)', border: '1px solid #3d2870', borderRadius: 8, marginBottom: 10 }}>
                <FileText size={16} color="#FDDC06" />
                <span style={{ fontSize: 13, color: '#b0a0cc', flex: 1 }}>Current: {existingPdf}</span>
                <span style={{ fontSize: 11, color: '#7060a0' }}>Upload to replace</span>
              </div>
            )}

            {pdfFile ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, marginBottom: 10 }}>
                  <FileText size={16} color="#22c55e" />
                  <span style={{ fontSize: 13, color: '#22c55e', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdfFile.name}</span>
                  <button type="button" onClick={() => { setPdfFile(null); setDateExtractResult(null); setClauseExtractResult(null); }} style={{ background: 'none', color: '#b0a0cc', cursor: 'pointer', display: 'flex' }}>
                    <X size={14} />
                  </button>
                </div>
                {/* Extract dates */}
                <button type="button" onClick={handleExtractDates} disabled={extractingDates} style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 16px', marginBottom: 8,
                  background: 'rgba(84,46,145,0.15)', border: '1px solid #542E91', borderRadius: 8,
                  color: extractingDates ? '#7060a0' : '#FDDC06', fontSize: 13, fontWeight: 700,
                  cursor: extractingDates ? 'not-allowed' : 'pointer',
                }}>
                  <Sparkles size={14} />
                  {extractingDates ? 'Extracting dates with AI…' : 'Extract start & end dates from PDF'}
                </button>
                {extractFeedback(dateExtractResult, 'Dates extracted.', 'One date found — check the other.')}
              </>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '28px', border: '2px dashed #3d2870', borderRadius: 8, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#542E91'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#3d2870'}>
                <Upload size={22} color="#7060a0" />
                <span style={{ fontSize: 14, color: '#b0a0cc', fontWeight: 600 }}>Click to upload PDF</span>
                <span style={{ fontSize: 12, color: '#7060a0' }}>PDF only, max 20MB</span>
                <input type="file" accept="application/pdf" onChange={e => setPdfFile(e.target.files[0] || null)} style={{ display: 'none' }} />
              </label>
            )}
          </div>

          {/* Addendums */}
          <div>
            <label style={{ ...labelStyle, marginBottom: 10 }}>Addendums</label>

            {existingDocs.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {existingDocs.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(84,46,145,0.1)', border: '1px solid #3d2870', borderRadius: 8, marginBottom: 8 }}>
                    <FileText size={14} color="#FDDC06" />
                    <span style={{ fontSize: 13, color: '#b0a0cc', flex: 1 }}>{doc.label || doc.original_name}</span>
                    <button type="button" onClick={() => deleteExistingDoc(doc.id)} style={{ background: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {newDocs.map((doc, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <FileText size={14} color="#22c55e" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#22c55e', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{doc.file.name}</span>
                <input
                  type="text"
                  placeholder="Label (optional)"
                  value={doc.label}
                  onChange={e => updateNewDocLabel(idx, e.target.value)}
                  style={{ ...inputStyle, fontSize: 12, padding: '7px 10px', flex: 1 }}
                  onFocus={focusStyle} onBlur={blurStyle}
                />
                <button type="button" onClick={() => removeNewDoc(idx)} style={{ background: 'none', color: '#b0a0cc', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                  <X size={14} />
                </button>
              </div>
            ))}

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: '2px dashed #3d2870', borderRadius: 8, cursor: 'pointer', color: '#b0a0cc', fontSize: 13, fontWeight: 600 }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#542E91'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#3d2870'}>
              <Upload size={15} color="#7060a0" />
              Add addendum PDF
              <input type="file" accept="application/pdf" onChange={e => { if (e.target.files[0]) addNewDoc(e.target.files[0]); e.target.value = ''; }} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Link to={isEdit ? `/contracts/${id}` : '/contracts'} style={{ padding: '11px 24px', background: '#2a1a4e', color: '#b0a0cc', borderRadius: 8, fontSize: 14, fontWeight: 700, border: '1px solid #3d2870', textDecoration: 'none' }}>
            Cancel
          </Link>
          <button type="submit" disabled={saving} style={{ padding: '11px 28px', background: saving ? '#3d2070' : '#542E91', color: '#FDDC06', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#6B3CB5'; }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#542E91'; }}>
            {saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create Contract')}
          </button>
        </div>
      </form>
    </div>
  );
}
