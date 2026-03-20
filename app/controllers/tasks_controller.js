const { randomUUID } = require('crypto');
const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

// helper: combine date + time into DATETIME string
function combineDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  const timeNormalized = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  const timeOk = /^\d{2}:\d{2}:\d{2}$/.test(timeNormalized);
  if (!dateOk || !timeOk) return null;
  return `${dateStr} ${timeNormalized}`;
}

// GET /tasks/summary
const getTaskSummary = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const [rows] = await db.query(
      'SELECT status, COUNT(*) as count FROM tasks WHERE user_id = ? AND is_deleted = 0 GROUP BY status',
      [userId]
    );

    const summary = { pending: 0, processing: 0, completed: 0, canceled: 0 };
    for (const row of rows) {
      const key = row.status && row.status.toLowerCase();
      if (key === 'pending') summary.pending += row.count;
      else if (key === 'processing') summary.processing += row.count;
      else if (key === 'completed') summary.completed += row.count;
      else if (key === 'canceled' || key === 'cancelled') summary.canceled += row.count;
    }

    return sendSuccess(res, 'Task summary fetched successfully', { summary }, 200);
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

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

    return sendSuccess(res, 'Tasks fetched successfully', {
      page,
      limit,
      total: Number(total),
      items: rows
    }, 200);
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

// POST /tasks
const createTask = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const { title, description, startTaskAt, startDate, startTime, endDate, endTime } = req.body || {};
    if (!title) return sendError(res, 'Title required', 400, 'BAD_REQUEST');

    let start = startTaskAt || null;
    if (!start && startDate && startTime) {
      const combined = combineDateTime(startDate, startTime);
      if (!combined) return sendError(res, 'Invalid startDate/startTime format (expected YYYY-MM-DD and HH:MM or HH:MM:SS)', 400, 'BAD_REQUEST');
      start = combined;
    }

    let end = null;
    if (endDate && endTime) {
      const combinedEnd = combineDateTime(endDate, endTime);
      if (!combinedEnd) return sendError(res, 'Invalid endDate/endTime format (expected YYYY-MM-DD and HH:MM or HH:MM:SS)', 400, 'BAD_REQUEST');
      end = combinedEnd;
    }

    const id = randomUUID();
    await db.query('INSERT INTO tasks (id, user_id, title, description, startTaskAt, endTaskAt) VALUES (?, ?, ?, ?, ?, ?)', [id, userId, title, description || null, start, end]);
    const [rows] = await db.query('SELECT id, user_id, title, description, status, version, is_deleted, startTaskAt, endTaskAt, created_at, updated_at FROM tasks WHERE id = ?', [id]);

    return sendSuccess(res, 'Task created', rows[0], 201);
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

// PUT /tasks/:id
const updateTask = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const taskId = req.params.id;
    const { title, description, status, startTaskAt, startDate, startTime, endTaskAt, endDate, endTime } = req.body || {};

    const [rows] = await db.query('SELECT user_id, version, startTaskAt, endTaskAt, title, description FROM tasks WHERE id = ? AND is_deleted = 0', [taskId]);
    if (!rows || rows.length === 0) return sendError(res, 'Task not found', 404, 'NOT_FOUND');

    const task = rows[0];
    if (task.user_id !== userId) return sendError(res, 'Forbidden', 403, 'FORBIDDEN');

    let newStart = startTaskAt !== undefined ? startTaskAt : task.startTaskAt;
    if (startDate && startTime) {
      const combined = combineDateTime(startDate, startTime);
      if (!combined) return sendError(res, 'Invalid startDate/startTime format (expected YYYY-MM-DD and HH:MM or HH:MM:SS)', 400, 'BAD_REQUEST');
      newStart = combined;
    }

    let newEnd = endTaskAt !== undefined ? endTaskAt : task.endTaskAt;
    if (endDate && endTime) {
      const combinedEnd = combineDateTime(endDate, endTime);
      if (!combinedEnd) return sendError(res, 'Invalid endDate/endTime format (expected YYYY-MM-DD and HH:MM or HH:MM:SS)', 400, 'BAD_REQUEST');
      newEnd = combinedEnd;
    }

    const updates = [];
    const params = [];
    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (newStart !== undefined) {
      updates.push('startTaskAt = ?');
      params.push(newStart);
    }
    if (newEnd !== undefined) {
      updates.push('endTaskAt = ?');
      params.push(newEnd);
    }
    if (updates.length === 0) return sendError(res, 'Nothing to update', 400, 'BAD_REQUEST');

    updates.push('version = version + 1');
    params.push(taskId);

    await db.query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);
    const [updated] = await db.query('SELECT id, user_id, title, description, status, version, is_deleted, startTaskAt, endTaskAt, created_at, updated_at FROM tasks WHERE id = ?', [taskId]);

    return sendSuccess(res, 'Task updated', updated[0], 200);
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

// DELETE /tasks/:id (soft delete)
const deleteTask = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const { id } = req.params;

    const [existing] = await db.query('SELECT user_id FROM tasks WHERE id = ? AND is_deleted = 0', [id]);
    if (existing.length === 0) return sendError(res, 'Task not found', 404, 'NOT_FOUND');
    if (existing[0].user_id !== userId) return sendError(res, 'Forbidden', 403, 'FORBIDDEN');

    await db.query('UPDATE tasks SET is_deleted = 1, version = version + 1 WHERE id = ?', [id]);
    return sendSuccess(res, 'Task deleted', {}, 200);
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
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

    if (!rows || rows.length === 0) return sendError(res, 'Task not found', 404, 'NOT_FOUND');

    const task = rows[0];
    if (task.user_id !== userId) return sendError(res, 'Forbidden', 403, 'FORBIDDEN');

    let newStatus;
    if (action === '1') {
      if (task.status !== 'pending') return sendError(res, 'Only pending tasks can be moved to processing', 400, 'BAD_REQUEST');
      newStatus = 'processing';
    } else if (action === '2') {
      if (task.status !== 'processing') return sendError(res, 'Only processing tasks can be completed', 400, 'BAD_REQUEST');
      newStatus = 'completed';
    } else if (action === '3') {
      if (task.status !== 'processing') return sendError(res, 'Only processing tasks can be canceled', 400, 'BAD_REQUEST');
      newStatus = 'canceled';
    } else if (action === '4') {
      if (task.status !== 'pending') return sendError(res, 'Only pending tasks can be canceled', 400, 'BAD_REQUEST');
      newStatus = 'canceled';
    } else {
      return sendError(res, 'Invalid action. Use 1=pending->processing, 2=processing->completed, 3=processing->canceled, 4=pending->canceled.', 400, 'BAD_REQUEST');
    }

    await db.query('UPDATE tasks SET status = ?, version = version + 1 WHERE id = ?', [newStatus, taskId]);
    const [updated] = await db.query('SELECT id, user_id, title, description, status, version, is_deleted, startTaskAt, endTaskAt, created_at, updated_at FROM tasks WHERE id = ?', [taskId]);

    return sendSuccess(res, `Task status updated to ${newStatus}`, updated[0], 200);
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

module.exports = { getTasks, createTask, updateTask, deleteTask, updateTaskStatus, getTaskSummary };
