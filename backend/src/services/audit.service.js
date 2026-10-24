const { query } = require('../config/db');

function logAudit({ actor_id, actor_name, actor_role, action, entity, entity_id, before_json, after_json, ip_address }) {
  try {
    const beforeStr = before_json ? (typeof before_json === 'string' ? before_json : JSON.stringify(before_json)) : null;
    const afterStr = after_json ? (typeof after_json === 'string' ? after_json : JSON.stringify(after_json)) : null;

    query.run(`
      INSERT INTO audit_logs (actor_id, actor_name, actor_role, action, entity, entity_id, before_json, after_json, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      actor_id || null,
      actor_name || 'System',
      actor_role || 'system',
      action,
      entity,
      entity_id ? String(entity_id) : null,
      beforeStr,
      afterStr,
      ip_address || null
    ]);
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

module.exports = {
  logAudit
};
