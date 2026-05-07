require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./db');
const authRoutes = require('./routes/auth');
const contractRoutes = require('./routes/contracts');
const { startCronJob } = require('./cron/expiry');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: true, // reflect request origin — fine for local dev
  credentials: true,
}));

app.use(express.json());

// Serve uploaded PDFs with permissive CORS so react-pdf can load them
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/contracts', contractRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve built frontend
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (require('fs').existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // SPA fallback — serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
}

// Init DB on startup
getDb();

// Start cron job
startCronJob();

app.listen(PORT, () => {
  console.log(`HX Contract Manager backend running on http://localhost:${PORT}`);
  console.log('');
  console.log('Demo accounts:');
  console.log('  Editor: admin@holidayextras.com / editor123');
  console.log('  Viewer: viewer@holidayextras.com / viewer123');
});
