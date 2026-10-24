const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'hcm_lite_super_secret_jwt_key_2026_saylani';

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Access token required.' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = query.get('SELECT id, email, role, employee_id, status, must_change_password FROM users WHERE id = ?', [decoded.id]);
    
    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'User account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Forbidden: role '${req.user.role}' is not authorized to access this resource.` 
      });
    }

    next();
  };
}

function scopeEmployee(paramName = 'employee_id') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // Admin and HR have full access across all employees
    if (['admin', 'hr'].includes(req.user.role)) {
      return next();
    }

    // Employee role: only allow their own employee_id
    const requestedEmpId = req.params[paramName] || req.query[paramName] || req.body[paramName];
    if (requestedEmpId && Number(requestedEmpId) !== Number(req.user.employee_id)) {
      return res.status(403).json({ 
        error: 'Forbidden: You are only permitted to access your own employee records.' 
      });
    }

    // Enforce employee_id on req for safe querying
    req.scopedEmployeeId = req.user.employee_id;
    next();
  };
}

module.exports = {
  verifyToken,
  requireRoles,
  scopeEmployee,
  JWT_SECRET
};
