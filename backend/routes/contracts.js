const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb, computeStatus } = require('../db');
const { authenticateToken, requireEditor } = require('../middleware/auth');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
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

// POST extract dates from PDF
router.post('/extract-dates', authenticateToken, extractUpload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF file provided' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured on the server' });
  }

  let text;
  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(req.file.buffer);
    text = data.text;
  } catch (err) {
    return res.status(422).json({ error: 'Could not read PDF — file may be scanned or image-based' });
  }

  if (!text || text.trim().length < 20) {
    return res.status(422).json({ error: 'PDF appears to contain no extractable text (may be a scanned document)' });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `You are a contract analyst. Extract the contract start date and end/expiry date from the text below.

Return ONLY a raw JSON object — no markdown, no explanation — in this exact format:
{"start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"}

If a date cannot be found, use null for that field.
Look for terms like: "commencement date", "effective date", "start date", "term begins", "expiry date", "termination date", "end date", "expires on", "valid until".

CONTRACT TEXT:
${text.slice(0, 12000)}`,
      }],
    });

    const raw = message.content[0].text.trim();
    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = JSON.parse(cleaned);

    res.json({
      start_date: parsed.start_date || null,
      end_date: parsed.end_date || null,
    });
  } catch (err) {
    console.error('Date extraction error:', err);
    res.status(500).json({ error: 'Failed to extract dates from the document' });
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
  const { title, vendor, contract_value, start_date, end_date, notes, owner_name, contract_link } = req.body;

  if (!title || !vendor || !start_date || !end_date) {
    return res.status(400).json({ error: 'title, vendor, start_date and end_date are required' });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO contracts (title, vendor, contract_value, start_date, end_date, status, pdf_path, contract_link, notes, owner_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title, vendor,
    contract_value ? parseFloat(contract_value) : null,
    start_date, end_date,
    computeStatus(end_date),
    req.file ? req.file.filename : null,
    contract_link || null,
    notes || null,
    owner_name || null
  );

  res.status(201).json(db.prepare('SELECT * FROM contracts WHERE id = ?').get(result.lastInsertRowid));
});

// PUT update
router.put('/:id', authenticateToken, requireEditor, upload.single('pdf'), (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contract not found' });

  const { title, vendor, contract_value, start_date, end_date, notes, owner_name, contract_link } = req.body;

  let pdf_path = existing.pdf_path;
  if (req.file) {
    if (existing.pdf_path) {
      const old = path.join(uploadsDir, existing.pdf_path);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    pdf_path = req.file.filename;
  }

  const newEndDate = end_date || existing.end_date;

  db.prepare(`
    UPDATE contracts SET
      title = ?, vendor = ?, contract_value = ?, start_date = ?, end_date = ?,
      status = ?, pdf_path = ?, contract_link = ?, notes = ?, owner_name = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title || existing.title,
    vendor || existing.vendor,
    contract_value !== undefined && contract_value !== '' ? parseFloat(contract_value) : existing.contract_value,
    start_date || existing.start_date,
    newEndDate,
    computeStatus(newEndDate),
    pdf_path,
    contract_link !== undefined ? (contract_link || null) : existing.contract_link,
    notes !== undefined ? notes : existing.notes,
    owner_name !== undefined ? owner_name : existing.owner_name,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id));
});

// DELETE
router.delete('/:id', authenticateToken, requireEditor, (req, res) => {
  const db = getDb();
  const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });

  if (contract.pdf_path) {
    const pdfPath = path.join(uploadsDir, contract.pdf_path);
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
  }

  db.prepare('DELETE FROM contracts WHERE id = ?').run(req.params.id);
  res.json({ message: 'Contract deleted successfully' });
});

module.exports = router;
