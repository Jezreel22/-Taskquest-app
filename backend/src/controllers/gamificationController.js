'use strict';

const User       = require('../models/User');
const Task       = require('../models/Task');
const gamService = require('../services/gamificationService');
const { ACHIEVEMENT_DEFINITIONS, RANKS } = require('../config/constants');
const catchAsync = require('../utils/catchAsync');
const { successResponse } = require('../utils/response');

// ─── Get full gamification profile ───────────────────────────────────────────

exports.getGamification = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  const gam  = user.gamification;

  const rank     = gamService.getRank(gam.xp);
  const nextRank = gamService.getNextRank(rank.index);
  const progress = gamService.getRankProgress(gam.xp, rank.index);

  // Check + sync streak status
  gamService.checkStreak(gam);
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Gamification data retrieved.', {
    gamification: {
      ...gam.toObject(),
      rank,
      nextRank,
      rankProgress: progress,
      ranks: RANKS,
    },
  });
});

// ─── Weekly activity ──────────────────────────────────────────────────────────

exports.getWeeklyActivity = catchAsync(async (req, res) => {
  const user   = await User.findById(req.user._id);
  const weekly = gamService.getWeeklyActivity(user.gamification);
  successResponse(res, 200, 'Weekly activity.', { weekly });
});

// ─── Streak calendar ─────────────────────────────────────────────────────────

exports.getStreakCalendar = catchAsync(async (req, res) => {
  const user     = await User.findById(req.user._id);
  const calendar = gamService.getStreakCalendar(user.gamification);
  successResponse(res, 200, 'Streak calendar.', { calendar });
});

// ─── Achievements ─────────────────────────────────────────────────────────────

exports.getAchievements = catchAsync(async (req, res) => {
  const user      = await User.findById(req.user._id);
  const unlockedSet = new Set(user.achievements || []);

  const all = ACHIEVEMENT_DEFINITIONS.map((def) => ({
    ...def,
    unlocked: unlockedSet.has(def.id),
  }));

  successResponse(res, 200, 'Achievements retrieved.', { achievements: all });
});

// ─── Leaderboard (top users by XP) ───────────────────────────────────────────

exports.getLeaderboard = catchAsync(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  const users = await User.find({ isActive: true })
    .select('username displayName avatar gamification.xp gamification.streak gamification.rankIndex')
    .sort({ 'gamification.xp': -1 })
    .limit(limit)
    .lean();

  const leaderboard = users.map((u, i) => ({
    rank:      i + 1,
    username:  u.username,
    displayName: u.displayName,
    avatar:    u.avatar,
    xp:        u.gamification?.xp || 0,
    streak:    u.gamification?.streak || 0,
    rankInfo:  gamService.getRank(u.gamification?.xp || 0),
  }));

  successResponse(res, 200, 'Leaderboard retrieved.', { leaderboard });
});
