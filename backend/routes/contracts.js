const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb, computeStatus } = require('../db');
const { authenticateToken, requireEditor } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDF files allowed'));
    cb(null, true);
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

// Memory-only multer for date extraction (no file saved to disk)
const extractUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDF files allowed'));
    cb(null, true);
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

function refreshAllStatuses(db) {
  const contracts = db.prepare('SELECT id, end_date FROM contracts').all();
  const update = db.prepare('UPDATE contracts SET status = ? WHERE id = ?');
  for (const c of contracts) update.run(computeStatus(c.end_date), c.id);
}

// ── Shared Gemini PDF extraction helper ──────────────────────────────────────
// Sends the PDF buffer directly to Gemini (works on scanned/image PDFs too)
async function extractAllFromBuffer(buffer) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const result = await model.generateContent([
    {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: 'application/pdf',
      },
    },
    `You are a contract analyst. Read the contract document above and extract all of the following.

Return ONLY a raw JSON object — no markdown, no code fences, no explanation:
{
  "start_date": "YYYY-MM-DD or null",
  "end_date": "YYYY-MM-DD or null",
  "termination_clause": "Brief plain-English summary of termination terms, or null",
  "payment_terms": "Brief summary of payment terms and schedule, or null",
  "commissions": "Commission rates and structure, or null",
  "special_overrides": "Any special overrides, exceptions or non-standard clauses, or null",
  "exclusivity": "exclusive" or "non-exclusive" or null
}

For dates look for: commencement date, effective date, start date, expiry date, termination date, end date, expires on, valid until.
For exclusivity look for: exclusive, non-exclusive, sole, exclusivity clause.`,
  ]);

  const raw = result.response.text().trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  const parsed = JSON.parse(raw);

  return {
    start_date: parsed.start_date || null,
    end_date: parsed.end_date || null,
    termination_clause: parsed.termination_clause || null,
    payment_terms: parsed.payment_terms || null,
    commissions: parsed.commissions || null,
    special_overrides: parsed.special_overrides || null,
    exclusivity: ['exclusive', 'non-exclusive'].includes(parsed.exclusivity) ? parsed.exclusivity : null,
  };
}

// POST extract-all from an uploaded PDF (used when creating a new contract)
router.post('/extract-all-upload', authenticateToken, extractUpload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF file provided' });
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'GEMINI_API_KEY is not configured. Add it in Railway → Variables.' });
  }
  try {
    res.json(await extractAllFromBuffer(req.file.buffer));
  } catch (err) {
    console.error('extract-all-upload error:', err);
    res.status(500).json({ error: 'AI extraction failed — ' + (err.message || 'unknown error') });
  }
});

// GET all contracts
router.get('/', authenticateToken, (req, res) => {
  const db = getDb();
  refreshAllStatuses(db);

  const { status, search } = req.query;
  let query = 'SELECT * FROM contracts';
  const params = [];
  const conditions = [];

  if (status && status !== 'all') {
    conditions.push('status = ?');
    params.push(status);
  }

  if (search) {
    conditions.push('(title LIKE ? OR vendor LIKE ? OR owner_name LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY end_date ASC';

  res.json(db.prepare(query).all(...params));
});

// GET stats
router.get('/stats', authenticateToken, (req, res) => {
  const db = getDb();
  refreshAllStatuses(db);

  const total = db.prepare('SELECT COUNT(*) as c FROM contracts').get().c;
  const active = db.prepare("SELECT COUNT(*) as c FROM contracts WHERE status = 'active'").get().c;
  const expiring = db.prepare("SELECT COUNT(*) as c FROM contracts WHERE status = 'expiring_soon'").get().c;
  const expired = db.prepare("SELECT COUNT(*) as c FROM contracts WHERE status = 'expired'").get().c;

  res.json({ total, active, expiring_soon: expiring, expired });
});

// GET single contract
router.get('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });

  const freshStatus = computeStatus(contract.end_date);
  db.prepare('UPDATE contracts SET status = ? WHERE id = ?').run(freshStatus, contract.id);

  res.json({ ...contract, status: freshStatus });
});

// POST create
router.post('/', authenticateToken, requireEditor, upload.single('pdf'), (req, res) => {
  const {
    title, vendor, contract_value, start_date, end_date, notes, owner_name, owner_email, contract_link,
    partner_name, partner_email, partner_position, partner_phone,
    partnership_start_date, countries, products,
    termination_clause, payment_terms, commissions, special_overrides, exclusivity,
  } = req.body;

  if (!title || !vendor || !start_date || !end_date) {
    return res.status(400).json({ error: 'title, vendor, start_date and end_date are required' });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO contracts (
      title, vendor, contract_value, start_date, end_date, status, pdf_path, contract_link, notes,
      owner_name, owner_email, partner_name, partner_email, partner_position, partner_phone,
      partnership_start_date, countries, products,
      termination_clause, payment_terms, commissions, special_overrides, exclusivity
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title, vendor,
    contract_value ? parseFloat(contract_value) : null,
    start_date, end_date,
    computeStatus(end_date),
    req.file ? req.file.filename : null,
    contract_link || null,
    notes || null,
    owner_name || null,
    owner_email || null,
    partner_name || null,
    partner_email || null,
    partner_position || null,
    partner_phone || null,
    partnership_start_date || null,
    countries || null,
    products || null,
    termination_clause || null,
    payment_terms || null,
    commissions || null,
    special_overrides || null,
    exclusivity || null,
  );

  res.status(201).json(db.prepare('SELECT * FROM contracts WHERE id = ?').get(result.lastInsertRowid));
});

// PUT update
router.put('/:id', authenticateToken, requireEditor, upload.single('pdf'), (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contract not found' });

  const {
    title, vendor, contract_value, start_date, end_date, notes, owner_name, owner_email, contract_link,
    partner_name, partner_email, partner_position, partner_phone,
    partnership_start_date, countries, products,
    termination_clause, payment_terms, commissions, special_overrides, exclusivity,
  } = req.body;

  let pdf_path = existing.pdf_path;
  if (req.file) {
    if (existing.pdf_path) {
      const old = path.join(uploadsDir, existing.pdf_path);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    pdf_path = req.file.filename;
  }

  const newEndDate = end_date || existing.end_date;

  const str = (val, fallback) => val !== undefined ? (val || null) : fallback;

  db.prepare(`
    UPDATE contracts SET
      title = ?, vendor = ?, contract_value = ?, start_date = ?, end_date = ?,
      status = ?, pdf_path = ?, contract_link = ?, notes = ?,
      owner_name = ?, owner_email = ?,
      partner_name = ?, partner_email = ?, partner_position = ?, partner_phone = ?,
      partnership_start_date = ?, countries = ?, products = ?,
      termination_clause = ?, payment_terms = ?, commissions = ?, special_overrides = ?, exclusivity = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title || existing.title,
    vendor || existing.vendor,
    contract_value !== undefined && contract_value !== '' ? parseFloat(contract_value) : existing.contract_value,
    start_date || existing.start_date,
    newEndDate,
    computeStatus(newEndDate),
    pdf_path,
    str(contract_link, existing.contract_link),
    str(notes, existing.notes),
    str(owner_name, existing.owner_name),
    str(owner_email, existing.owner_email),
    str(partner_name, existing.partner_name),
    str(partner_email, existing.partner_email),
    str(partner_position, existing.partner_position),
    str(partner_phone, existing.partner_phone),
    str(partnership_start_date, existing.partnership_start_date),
    str(countries, existing.countries),
    str(products, existing.products),
    str(termination_clause, existing.termination_clause),
    str(payment_terms, existing.payment_terms),
    str(commissions, existing.commissions),
    str(special_overrides, existing.special_overrides),
    str(exclusivity, existing.exclusivity),
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id));
});

// DELETE contract (and its documents)
router.delete('/:id', authenticateToken, requireEditor, (req, res) => {
  const db = getDb();
  const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });

  // Delete main PDF
  if (contract.pdf_path) {
    const pdfPath = path.join(uploadsDir, contract.pdf_path);
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
  }

  // Delete addendum files
  const docs = db.prepare('SELECT * FROM contract_documents WHERE contract_id = ?').all(req.params.id);
  for (const doc of docs) {
    const fp = path.join(uploadsDir, doc.filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  db.prepare('DELETE FROM contract_documents WHERE contract_id = ?').run(req.params.id);

  db.prepare('DELETE FROM contracts WHERE id = ?').run(req.params.id);
  res.json({ message: 'Contract deleted successfully' });
});

// --- Addendum document routes ---

// GET documents for a contract
router.get('/:id/documents', authenticateToken, (req, res) => {
  const db = getDb();
  const docs = db.prepare('SELECT * FROM contract_documents WHERE contract_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json(docs);
});

// POST upload addendum
router.post('/:id/documents', authenticateToken, requireEditor, upload.single('pdf'), (req, res) => {
  const db = getDb();
  const contract = db.prepare('SELECT id FROM contracts WHERE id = ?').get(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const result = db.prepare(
    'INSERT INTO contract_documents (contract_id, filename, original_name, label) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, req.file.filename, req.file.originalname, req.body.label || null);

  res.status(201).json(db.prepare('SELECT * FROM contract_documents WHERE id = ?').get(result.lastInsertRowid));
});

// DELETE addendum
router.delete('/:id/documents/:docId', authenticateToken, requireEditor, (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT * FROM contract_documents WHERE id = ? AND contract_id = ?').get(req.params.docId, req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const fp = path.join(uploadsDir, doc.filename);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  db.prepare('DELETE FROM contract_documents WHERE id = ?').run(req.params.docId);
  res.json({ message: 'Document deleted' });
});

// POST extract-clauses (kept for backwards compatibility — now uses Claude native PDF)
router.post('/extract-clauses', authenticateToken, extractUpload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF file provided' });
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
  try {
    res.json(await extractAllFromBuffer(req.file.buffer));
  } catch (err) {
    console.error('extract-clauses error:', err);
    res.status(500).json({ error: 'AI extraction failed — ' + (err.message || 'unknown error') });
  }
});

// POST extract all fields from a contract's already-stored PDF
router.post('/:id/extract-all', authenticateToken, async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'GEMINI_API_KEY is not configured. Add it in Railway → Variables.' });
  }

  const db = getDb();
  const contract = db.prepare('SELECT pdf_path FROM contracts WHERE id = ?').get(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  if (!contract.pdf_path) return res.status(422).json({ error: 'No PDF uploaded for this contract' });

  const filePath = path.join(uploadsDir, contract.pdf_path);
  if (!fs.existsSync(filePath)) return res.status(422).json({ error: 'PDF file not found on disk' });

  try {
    res.json(await extractAllFromBuffer(fs.readFileSync(filePath)));
  } catch (err) {
    console.error('extract-all error:', err);
    res.status(500).json({ error: 'AI extraction failed — ' + (err.message || 'unknown error') });
  }
});

module.exports = router;
