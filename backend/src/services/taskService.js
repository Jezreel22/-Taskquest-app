'use strict';

/**
 * TaskService — handles task CRUD, recurrence generation, and scoring.
 * All DB access goes through Mongoose models; no Express objects here.
 */

const Task = require('../models/Task');
const { calculateTaskScore } = require('./gamificationService');
const AppError = require('../utils/AppError');

// ─── Create ───────────────────────────────────────────────────────────────────

async function createTask(userId, data) {
  const score = calculateTaskScore(data.priority, data.complexity || 3);

  const task = await Task.create({
    userId,
    title:       data.title,
    description: data.description || '',
    priority:    data.priority    || 'medium',
    category:    data.category    || 'personal',
    dueDate:     data.dueDate     || '',
    dueTime:     data.dueTime     || '',
    complexity:  parseInt(data.complexity) || 3,
    alarm:       data.alarm       || false,
    recurrence:  data.recurrence  || 'none',
    recurrenceEnd: data.recurrenceEnd || '',
    score,
  });

  // Generate recurring instances if applicable
  if (task.recurrence !== 'none' && task.dueDate) {
    await generateRecurringInstances(userId, task);
  }

  return task;
}

async function generateRecurringInstances(userId, parentTask) {
  const startDate = new Date(parentTask.dueDate);
  const endDate   = parentTask.recurrenceEnd
    ? new Date(parentTask.recurrenceEnd)
    : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 90-day default

  let current   = new Date(startDate);
  const instances = [];

  while (current <= endDate) {
    if (current > startDate) {
      instances.push({
        userId,
        title:               parentTask.title,
        description:         parentTask.description,
        priority:            parentTask.priority,
        category:            parentTask.category,
        dueDate:             current.toISOString().split('T')[0],
        dueTime:             parentTask.dueTime,
        complexity:          parentTask.complexity,
        alarm:               parentTask.alarm,
        recurrence:          'none',
        score:               parentTask.score,
        isRecurringInstance: true,
        parentId:            parentTask._id,
      });
    }
    switch (parentTask.recurrence) {
      case 'daily':     current.setDate(current.getDate() + 1);       break;
      case 'weekly':    current.setDate(current.getDate() + 7);       break;
      case 'biweekly':  current.setDate(current.getDate() + 14);      break;
      case 'monthly':   current.setMonth(current.getMonth() + 1);     break;
      default:          current = new Date(endDate.getTime() + 1);    break; // exit loop
    }
  }

  if (instances.length > 0) {
    await Task.insertMany(instances);
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

async function getTaskById(taskId, userId) {
  const task = await Task.findOne({ _id: taskId, userId });
  if (!task) throw new AppError('Task not found.', 404);
  return task;
}

async function getTasks(userId, filters = {}) {
  const query = { userId };

  if (filters.status && filters.status !== 'all') {
    query.status = filters.status;
  }
  if (filters.category && filters.category !== 'all') {
    query.category = filters.category;
  }
  if (filters.priority) {
    query.priority = filters.priority;
  }
  if (filters.search) {
    const re = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ title: re }, { description: re }];
  }

  // Sorting
  const sortMap = {
    dueDate:   { dueDate: 1, createdAt: -1 },
    priority:  { priority: 1, createdAt: -1 }, // handled below via aggregate
    score:     { score: -1 },
    createdAt: { createdAt: -1 },
  };
  const sort = sortMap[filters.sort] || { createdAt: -1 };

  // Pagination
  const page  = Math.max(parseInt(filters.page)  || 1, 1);
  const limit = Math.min(parseInt(filters.limit) || 50, 100);
  const skip  = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    Task.find(query).sort(sort).skip(skip).limit(limit).lean(),
    Task.countDocuments(query),
  ]);

  return { tasks, total, page, limit, pages: Math.ceil(total / limit) };
}

// ─── Update ───────────────────────────────────────────────────────────────────

async function updateTask(taskId, userId, data) {
  const task = await Task.findOne({ _id: taskId, userId });
  if (!task) throw new AppError('Task not found.', 404);

  const score = calculateTaskScore(data.priority || task.priority, data.complexity || task.complexity || 3);
  const updates = { ...data, score };
  delete updates.userId; // Never allow changing ownership

  Object.assign(task, updates);
  await task.save();
  return task;
}

// ─── Delete (soft) ────────────────────────────────────────────────────────────

async function deleteTask(taskId, userId) {
  const task = await Task.findOne({ _id: taskId, userId });
  if (!task) throw new AppError('Task not found.', 404);

  task.isDeleted = true;
  await task.save({ validateBeforeSave: false });
  return task;
}

// ─── Status transitions ───────────────────────────────────────────────────────

async function markTaskComplete(taskId, userId) {
  const task = await Task.findOne({ _id: taskId, userId });
  if (!task) throw new AppError('Task not found.', 404);
  if (task.status === 'completed') throw new AppError('Task is already completed.', 400);

  task.status      = 'completed';
  task.completedAt = new Date();
  await task.save();
  return task;
}

async function markTaskPending(taskId, userId) {
  const task = await Task.findOne({ _id: taskId, userId });
  if (!task) throw new AppError('Task not found.', 404);

  task.status      = 'pending';
  task.completedAt = null;
  await task.save();
  return task;
}

// ─── Bulk operations ──────────────────────────────────────────────────────────

async function bulkDeleteTasks(taskIds, userId) {
  const result = await Task.updateMany(
    { _id: { $in: taskIds }, userId },
    { isDeleted: true }
  );
  return result.modifiedCount;
}

async function getStats(userId) {
  const today    = new Date().toISOString().split('T')[0];
  const weekAgo  = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [total, pending, completed, completedToday, completedWeek, overdueCount] = await Promise.all([
    Task.countDocuments({ userId }),
    Task.countDocuments({ userId, status: 'pending' }),
    Task.countDocuments({ userId, status: 'completed' }),
    Task.countDocuments({ userId, status: 'completed', completedAt: { $gte: new Date(`${today}T00:00:00`) } }),
    Task.countDocuments({ userId, status: 'completed', completedAt: { $gte: weekAgo } }),
    Task.countDocuments({ userId, status: 'pending', dueDate: { $lt: today, $ne: '' } }),
  ]);

  return { total, pending, completed, completedToday, completedWeek, overdueCount };
}

module.exports = {
  createTask,
  getTaskById,
  getTasks,
  updateTask,
  deleteTask,
  markTaskComplete,
  markTaskPending,
  bulkDeleteTasks,
  getStats,
};
