const { query } = require('../config/db');
const { logAudit } = require('../services/audit.service');

// Announcements
async function listAnnouncements(req, res, next) {
  try {
    const userRole = req.user.role;
    const announcements = query.all(`
      SELECT a.*, u.email as author_email
      FROM announcements a
      JOIN users u ON a.author_id = u.id
      WHERE a.target_role = 'all' OR a.target_role = ?
      ORDER BY a.id DESC
    `, [userRole]);

    res.json({ announcements });
  } catch (err) {
    next(err);
  }
}

async function createAnnouncement(req, res, next) {
  try {
    const { title, content, priority = 'normal', target_role = 'all' } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }

    const result = query.run(`
      INSERT INTO announcements (title, content, priority, target_role, author_id, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `, [title.trim(), content.trim(), priority, target_role, req.user.id]);

    const created = query.get('SELECT * FROM announcements WHERE id = ?', [result.lastInsertRowid]);

    logAudit({
      actor_id: req.user.id,
      actor_name: req.user.email,
      actor_role: req.user.role,
      action: 'CREATE_ANNOUNCEMENT',
      entity: 'Announcement',
      entity_id: created.id,
      after_json: created
    });

    res.status(201).json({ announcement: created, message: 'Announcement broadcasted.' });
  } catch (err) {
    next(err);
  }
}

// Notifications
async function listNotifications(req, res, next) {
  try {
    const notifications = query.all(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 50
    `, [req.user.id]);

    const unreadCount = query.get('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0', [req.user.id]).count;

    res.json({ notifications, unread_count: unreadCount });
  } catch (err) {
    next(err);
  }
}

async function markNotificationAsRead(req, res, next) {
  try {
    const { id } = req.params;
    query.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    query.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
}

// Audit Logs (Admin only)
async function listAuditLogs(req, res, next) {
  try {
    const { action, entity, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = 'WHERE 1=1';
    const params = [];

    if (action) {
      where += ' AND action = ?';
      params.push(action);
    }
    if (entity) {
      where += ' AND entity = ?';
      params.push(entity);
    }

    const total = query.get(`SELECT COUNT(*) as count FROM audit_logs ${where}`, params).count;
    const logs = query.all(`
      SELECT * FROM audit_logs
      ${where}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `, [...params, Number(limit), offset]);

    res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listAnnouncements,
  createAnnouncement,
  listNotifications,
  markNotificationAsRead,
  markAllNotificationsRead,
  listAuditLogs
};
