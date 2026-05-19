const jwt = require('jsonwebtoken');
const config = require('../config');

function requireAuth(req, res, next) {
  const token = req.cookies[config.cookie.name];

  if (!token) {
    return res.status(401).json({ error: { message: 'Authentification requise' } });
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = {
      id: payload.id,
      role: payload.role,
      name: payload.name,
      email: payload.email,
      agency_id: payload.agency_id || null,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: { message: 'Jeton invalide ou expiré' } });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: { message: 'Authentification requise' } });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: { message: 'Accès interdit' } });
    }
    return next();
  };
}

function optionalAuth(req, res, next) {
  const token = req.cookies[config.cookie.name];
  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = {
      id: payload.id,
      role: payload.role,
      name: payload.name,
      email: payload.email,
      agency_id: payload.agency_id || null,
    };
  } catch (err) {
    req.user = null;
  }

  return next();
}

module.exports = {
  requireAuth,
  requireRole,
  optionalAuth,
};
