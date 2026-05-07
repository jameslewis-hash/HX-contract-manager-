const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'contract-manager.db');

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

  seedUsers();
  seedContracts();
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

function seedContracts() {
  const count = db.prepare('SELECT COUNT(*) as c FROM contracts').get().c;
  if (count > 0) return;

  const contracts = [
    {
      title: 'Amadeus GDS Integration',
      vendor: 'Amadeus IT Group',
      contract_value: 125000,
      start_date: '2024-01-15',
      end_date: '2027-01-15',
      notes: 'Global distribution system integration for flight and hotel bookings. Auto-renewal clause at 5% uplift.',
      owner_name: 'James Lewis',
    },
    {
      title: 'BDC Partnership Agreement',
      vendor: 'Booking.com',
      contract_value: 85000,
      start_date: '2024-06-01',
      end_date: '2026-10-30',
      notes: 'White-label hotel inventory access and commission structure. 18% commission rate agreed.',
      owner_name: 'Sarah Mitchell',
    },
    {
      title: 'Microsoft Enterprise License',
      vendor: 'Microsoft UK',
      contract_value: 42000,
      start_date: '2024-07-01',
      end_date: '2027-06-30',
      notes: 'Microsoft 365, Azure, and Power Platform enterprise agreement. Covers 350 seats.',
      owner_name: 'Tom Richards',
    },
    {
      title: 'HotelBeds API License',
      vendor: 'HotelBeds Group',
      contract_value: 36000,
      start_date: '2023-07-01',
      end_date: '2026-07-05',
      notes: 'Access to HotelBeds accommodation inventory across Europe. Rate parity clause included.',
      owner_name: 'Emily Torres',
    },
    {
      title: 'Travel Insurance Services',
      vendor: 'Allianz Global Assistance',
      contract_value: 195000,
      start_date: '2023-01-01',
      end_date: '2026-06-20',
      notes: 'White-label travel insurance products for Holiday Extras customers. Includes medical, cancellation and baggage cover.',
      owner_name: 'James Lewis',
    },
    {
      title: 'Legacy Payment Gateway',
      vendor: 'WorldPay',
      contract_value: 28000,
      start_date: '2022-01-01',
      end_date: '2025-12-01',
      notes: 'Legacy payment processing contract — fully migrated to Stripe in Q4 2025. No renewal required.',
      owner_name: 'Tom Richards',
    },
  ];

  const insert = db.prepare(`
    INSERT INTO contracts (title, vendor, contract_value, start_date, end_date, status, pdf_path, notes, owner_name)
    VALUES (@title, @vendor, @contract_value, @start_date, @end_date, @status, @pdf_path, @notes, @owner_name)
  `);

  for (const c of contracts) {
    insert.run({ ...c, status: computeStatus(c.end_date), pdf_path: null });
  }
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
