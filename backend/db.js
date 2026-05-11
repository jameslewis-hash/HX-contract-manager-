const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Use DB_PATH env var so Railway Volume can provide a persistent path
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'contract-manager.db');

// Ensure the directory exists (important when DB_PATH points to a volume)
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initDb();
  }
  return db;
}

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('viewer', 'editor')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      vendor TEXT NOT NULL,
      contract_value REAL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      pdf_path TEXT,
      notes TEXT,
      owner_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrations — safe to run on every start, errors are ignored if column exists
  const migrations = [
    'ALTER TABLE contracts ADD COLUMN contract_link TEXT',
    'ALTER TABLE contracts ADD COLUMN partner_name TEXT',
    'ALTER TABLE contracts ADD COLUMN partner_email TEXT',
    'ALTER TABLE contracts ADD COLUMN partner_position TEXT',
    'ALTER TABLE contracts ADD COLUMN partner_phone TEXT',
  ];
  for (const m of migrations) {
    try { db.exec(m); } catch {}
  }

  // Seed default users only — no dummy contract data
  seedUsers();
}

function seedUsers() {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count > 0) return;

  const editorHash = bcrypt.hashSync('editor123', 10);
  const viewerHash = bcrypt.hashSync('viewer123', 10);

  db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(
    'James Lewis', 'admin@holidayextras.com', editorHash, 'editor'
  );
  db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(
    'Sarah Mitchell', 'viewer@holidayextras.com', viewerHash, 'viewer'
  );
}

function computeStatus(endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'expired';
  if (diffDays <= 90) return 'expiring_soon';
  return 'active';
}

module.exports = { getDb, computeStatus };
