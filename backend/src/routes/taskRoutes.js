'use strict';

const { Router } = require('express');
const { body, query, param } = require('express-validator');
const taskCtrl   = require('../controllers/taskController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  TASK_PRIORITIES,
  TASK_CATEGORIES,
  TASK_STATUSES,
  RECURRENCE_TYPES,
} = require('../config/constants');

const router = Router();

// All task routes require auth
router.use(protect);

// ─── Validators ───────────────────────────────────────────────────────────────

const createTaskValidator = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('priority').optional().isIn(TASK_PRIORITIES).withMessage(`Priority must be one of: ${TASK_PRIORITIES.join(', ')}`),
  body('category').optional().isIn(TASK_CATEGORIES).withMessage(`Category must be one of: ${TASK_CATEGORIES.join(', ')}`),
  body('dueDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('dueDate must be YYYY-MM-DD'),
  body('dueTime').optional().matches(/^\d{2}:\d{2}$/).withMessage('dueTime must be HH:MM'),
  body('complexity').optional().isInt({ min: 1, max: 5 }).withMessage('Complexity must be 1–5'),
  body('alarm').optional().isBoolean(),
  body('recurrence').optional().isIn(RECURRENCE_TYPES),
  body('recurrenceEnd').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
];

const updateTaskValidator = [
  param('id').notEmpty().withMessage('Task ID is required'),
  body('title').optional().trim().notEmpty().isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('priority').optional().isIn(TASK_PRIORITIES),
  body('category').optional().isIn(TASK_CATEGORIES),
  body('status').optional().isIn(TASK_STATUSES),
  body('dueDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  body('dueTime').optional().matches(/^\d{2}:\d{2}$/),
  body('complexity').optional().isInt({ min: 1, max: 5 }),
];

const getTasksValidator = [
  query('status').optional().isIn([...TASK_STATUSES, 'all']),
  query('category').optional().isIn([...TASK_CATEGORIES, 'all']),
  query('priority').optional().isIn(TASK_PRIORITIES),
  query('sort').optional().isIn(['dueDate', 'priority', 'score', 'createdAt']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

router
  .route('/')
  .get(getTasksValidator, validate, taskCtrl.getTasks)
  .post(createTaskValidator, validate, taskCtrl.createTask);

router.get('/stats', taskCtrl.getStats);

router.post('/bulk-delete', taskCtrl.bulkDelete);

router
  .route('/:id')
  .get(taskCtrl.getTask)
  .patch(updateTaskValidator, validate, taskCtrl.updateTask)
  .delete(taskCtrl.deleteTask);

router.patch('/:id/complete',   taskCtrl.completeTask);
router.patch('/:id/uncomplete', taskCtrl.uncompleteTask);

module.exports = router;
