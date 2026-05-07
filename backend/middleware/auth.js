const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'hx-contract-manager-dev-secret-key';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function requireEditor(req, res, next) {
  if (req.user.role !== 'editor') {
    return res.status(403).json({ error: 'Editor role required for this action' });
  }
  next();
}

module.exports = { authenticateToken, requireEditor, JWT_SECRET };
