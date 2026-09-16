'use strict';

const Task         = require('../models/Task');
const User         = require('../models/User');
const taskService  = require('../services/taskService');
const gamService   = require('../services/gamificationService');
const AppError     = require('../utils/AppError');
const catchAsync   = require('../utils/catchAsync');
const { successResponse, paginatedResponse } = require('../utils/response');

// ─── Create Task ──────────────────────────────────────────────────────────────

exports.createTask = catchAsync(async (req, res) => {
  const task = await taskService.createTask(req.user._id, req.body);
  successResponse(res, 201, 'Task created successfully.', { task });
});

// ─── Get all tasks (with filters/sort/pagination) ─────────────────────────────

exports.getTasks = catchAsync(async (req, res) => {
  const { tasks, total, page, limit, pages } = await taskService.getTasks(
    req.user._id,
    req.query
  );
  paginatedResponse(res, 'Tasks retrieved.', { tasks }, { total, page, limit, pages });
});

// ─── Get single task ──────────────────────────────────────────────────────────

exports.getTask = catchAsync(async (req, res) => {
  const task = await taskService.getTaskById(req.params.id, req.user._id);
  successResponse(res, 200, 'Task retrieved.', { task });
});

// ─── Update task ──────────────────────────────────────────────────────────────

exports.updateTask = catchAsync(async (req, res) => {
  const task = await taskService.updateTask(req.params.id, req.user._id, req.body);
  successResponse(res, 200, 'Task updated.', { task });
});

// ─── Delete task (soft) ───────────────────────────────────────────────────────

exports.deleteTask = catchAsync(async (req, res) => {
  await taskService.deleteTask(req.params.id, req.user._id);
  successResponse(res, 200, 'Task deleted.');
});

// ─── Complete task (+ gamification) ──────────────────────────────────────────

exports.completeTask = catchAsync(async (req, res, next) => {
  const task = await taskService.markTaskComplete(req.params.id, req.user._id);

  // Pull latest gamification state
  const user = await User.findById(req.user._id);
  if (!user) return next(new AppError('User not found.', 404));

  const gam = user.gamification.toObject ? user.gamification.toObject() : { ...user.gamification };

  // Process side-effects
  const { gam: updatedGam, score, streakBonus, onTimeBonus, rankUp } = gamService.processTaskCompletion(task, gam);

  // Check recent tasks for Speed Demon achievement
  const recentTasks = await Task.find({
    userId: req.user._id,
    status: 'completed',
    completedAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
  }).lean();

  const newAchievements = gamService.checkNewAchievements(
    updatedGam,
    user.achievements || [],
    recentTasks
  );

  // Persist changes atomically
  user.gamification = updatedGam;
  if (newAchievements.length > 0) {
    user.achievements = [...(user.achievements || []), ...newAchievements];
  }
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Task completed! Great work 🎉', {
    task,
    gamification: {
      score,
      streakBonus,
      onTimeBonus,
      rankUp,
      totalScore: updatedGam.totalScore,
      xp:         updatedGam.xp,
      streak:     updatedGam.streak,
      rankIndex:  updatedGam.rankIndex,
    },
    newAchievements,
  });
});

// ─── Uncomplete task ──────────────────────────────────────────────────────────

exports.uncompleteTask = catchAsync(async (req, res) => {
  const task = await taskService.markTaskPending(req.params.id, req.user._id);
  successResponse(res, 200, 'Task marked as pending.', { task });
});

// ─── Bulk delete ──────────────────────────────────────────────────────────────

exports.bulkDelete = catchAsync(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('Provide an array of task IDs to delete.', 400);
  }
  const count = await taskService.bulkDeleteTasks(ids, req.user._id);
  successResponse(res, 200, `${count} task(s) deleted.`, { deleted: count });
});

// ─── Stats ────────────────────────────────────────────────────────────────────

exports.getStats = catchAsync(async (req, res) => {
  const stats = await taskService.getStats(req.user._id);
  successResponse(res, 200, 'Stats retrieved.', { stats });
});
