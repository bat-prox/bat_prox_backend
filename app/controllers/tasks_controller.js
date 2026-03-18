// GET /tasks/summary
const getTaskSummary = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    // Count tasks by status for this user
    const [rows] = await db.query(
      `SELECT status, COUNT(*) as count FROM tasks WHERE user_id = ? AND is_deleted = 0 GROUP BY status`,
      [userId]
    );
    // Build summary object with all statuses
    const summary = { pending: 0, processing: 0, completed: 0, canceled: 0 };
    for (const row of rows) {
      const key = row.status && row.status.toLowerCase();
      if (key === 'pending') summary.pending += row.count;
      else if (key === 'processing') summary.processing += row.count;
      else if (key === 'completed') summary.completed += row.count;
      else if (key === 'canceled' || key === 'cancelled') summary.canceled += row.count;
    }
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

const { randomUUID } = require('crypto');
const db = require('../config/db');

// GET /tasks?page=1&limit=20
const getTasks = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      'SELECT SQL_CALC_FOUND_ROWS id, user_id, title, description, status, version, is_deleted, startTaskAt, endTaskAt, created_at, updated_at FROM tasks WHERE is_deleted = 0 AND user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    );
    const [[{ 'FOUND_ROWS()': total }]] = await db.query('SELECT FOUND_ROWS()');

    res.json({ page, limit, total: Number(total), data: rows });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

// helper: combine date + time into DATETIME string
function combineDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  const timeNormalized = timeStr.length === 5 ? timeStr + ':00' : timeStr;
  const timeOk = /^\d{2}:\d{2}:\d{2}$/.test(timeNormalized);
  if (!dateOk || !timeOk) return null;
  return `${dateStr} ${timeNormalized}`;
}

// POST /tasks
const createTask = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const { title, description, startTaskAt, startDate, startTime, endDate, endTime } = req.body || {};
    if (!title) return res.status(400).json({ message: 'Title required' });

    // combine separate date/time if provided
    let start = startTaskAt || null;
    if (!start && startDate && startTime) {
      const combined = combineDateTime(startDate, startTime);
      if (!combined) return res.status(400).json({ message: 'Invalid startDate/startTime format (expected YYYY-MM-DD and HH:MM or HH:MM:SS)' });
      start = combined;
    }

    let end = null;
    if (endDate && endTime) {
      const combinedEnd = combineDateTime(endDate, endTime);
      if (!combinedEnd) return res.status(400).json({ message: 'Invalid endDate/endTime format (expected YYYY-MM-DD and HH:MM or HH:MM:SS)' });
      end = combinedEnd;
    }

    const id = randomUUID();
    await db.query('INSERT INTO tasks (id, user_id, title, description, startTaskAt, endTaskAt) VALUES (?, ?, ?, ?, ?, ?)', [id, userId, title, description || null, start, end]);
    const [rows] = await db.query('SELECT id, user_id, title, description, status, version, is_deleted, startTaskAt, endTaskAt, created_at, updated_at FROM tasks WHERE id = ?', [id]);
    res.status(201).json({ message: 'Task created', task: rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

// PUT /tasks/:id
const updateTask = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const taskId = req.params.id;
    const { title, description, status, startTaskAt, startDate, startTime, endTaskAt, endDate, endTime } = req.body || {};

    const [rows] = await db.query('SELECT user_id, version, startTaskAt, endTaskAt, title, description FROM tasks WHERE id = ? AND is_deleted = 0', [taskId]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Task not found' });
    const task = rows[0];
    if (task.user_id !== userId) return res.status(403).json({ message: 'Forbidden' });

    // prepare updated values
    let newStart = startTaskAt !== undefined ? startTaskAt : task.startTaskAt;
    if (startDate && startTime) {
      const combined = combineDateTime(startDate, startTime);
      if (!combined) return res.status(400).json({ message: 'Invalid startDate/startTime format (expected YYYY-MM-DD and HH:MM or HH:MM:SS)' });
      newStart = combined;
    }

    let newEnd = endTaskAt !== undefined ? endTaskAt : task.endTaskAt;
    if (endDate && endTime) {
      const combinedEnd = combineDateTime(endDate, endTime);
      if (!combinedEnd) return res.status(400).json({ message: 'Invalid endDate/endTime format (expected YYYY-MM-DD and HH:MM or HH:MM:SS)' });
      newEnd = combinedEnd;
    }

    const updates = [];
    const params = [];
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (newStart !== undefined) { updates.push('startTaskAt = ?'); params.push(newStart); }
    if (newEnd !== undefined) { updates.push('endTaskAt = ?'); params.push(newEnd); }
    if (updates.length === 0) return res.status(400).json({ message: 'Nothing to update' });

    updates.push('version = version + 1');
    params.push(taskId);

    await db.query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);
    const [updated] = await db.query('SELECT id, user_id, title, description, status, version, is_deleted, startTaskAt, endTaskAt, created_at, updated_at FROM tasks WHERE id = ?', [taskId]);
    res.json({ message: 'Task updated', task: updated[0] });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

// DELETE /tasks/:id (soft delete)
const deleteTask = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const { id } = req.params;

    const [existing] = await db.query('SELECT user_id FROM tasks WHERE id = ? AND is_deleted = 0', [id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Task not found' });
    if (existing[0].user_id !== userId) return res.status(403).json({ message: 'Forbidden' });

    await db.query('UPDATE tasks SET is_deleted = 1, version = version + 1 WHERE id = ?', [id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

// PATCH /tasks/:id/status/:action
// action: 1 = pending->processing, 2 = processing->completed, 3 = processing->canceled, 4 = pending->canceled
const updateTaskStatus = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const taskId = req.params.id;
    const action = req.params.action;
    const [rows] = await db.query('SELECT user_id, status FROM tasks WHERE id = ? AND is_deleted = 0', [taskId]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Task not found' });
    const task = rows[0];
    if (task.user_id !== userId) return res.status(403).json({ message: 'Forbidden' });
    let newStatus;
    if (action === '1') {
      if (task.status !== 'pending') return res.status(400).json({ message: 'Only pending tasks can be moved to processing' });
      newStatus = 'processing';
    } else if (action === '2') {
      if (task.status !== 'processing') return res.status(400).json({ message: 'Only processing tasks can be completed' });
      newStatus = 'completed';
    } else if (action === '3') {
      if (task.status !== 'processing') return res.status(400).json({ message: 'Only processing tasks can be canceled' });
      newStatus = 'canceled';
    } else if (action === '4') {
      if (task.status !== 'pending') return res.status(400).json({ message: 'Only pending tasks can be canceled' });
      newStatus = 'canceled';
    } else {
      return res.status(400).json({ message: 'Invalid action. Use 1=pending->processing, 2=processing->completed, 3=processing->canceled, 4=pending->canceled.' });
    }
    await db.query('UPDATE tasks SET status = ?, version = version + 1 WHERE id = ?', [newStatus, taskId]);
    const [updated] = await db.query('SELECT id, user_id, title, description, status, version, is_deleted, startTaskAt, endTaskAt, created_at, updated_at FROM tasks WHERE id = ?', [taskId]);
    res.json({ message: `Task status updated to ${newStatus}`, task: updated[0] });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

module.exports = { getTasks, createTask, updateTask, deleteTask, updateTaskStatus, getTaskSummary };
