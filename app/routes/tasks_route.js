const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth_middleware');
const { getTasks, createTask, updateTask, deleteTask, updateTaskStatus, getTaskSummary } = require('../controllers/tasks_controller');
// Task summary for home screen
router.get('/summary', verifyToken, getTaskSummary);


router.get('/tasks', verifyToken, getTasks);
router.post('/tasks/create', verifyToken, createTask);
router.put('/tasks/:id', verifyToken, updateTask);
router.delete('/tasks/:id', verifyToken, deleteTask);
// PATCH endpoint for status update with action
router.patch('/tasks/:id/status/:action', verifyToken, updateTaskStatus);

module.exports = router;
