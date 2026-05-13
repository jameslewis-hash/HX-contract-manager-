const JWT_SECRET = process.env.JWT_SECRET || 'hx-contract-manager-dev-secret-key';

// Auth disabled — all users have full editor access
function authenticateToken(req, res, next) {
  req.user = { role: 'editor' };
  next();
}

function requireEditor(req, res, next) {
  next();
}

module.exports = { authenticateToken, requireEditor, JWT_SECRET };
