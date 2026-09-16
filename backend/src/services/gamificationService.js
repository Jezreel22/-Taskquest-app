'use strict';

/**
 * GamificationService — pure business logic, no Express references.
 * Mirrors the frontend gamification.js rules exactly.
 */

const {
  RANKS,
  PRIORITY_SCORES,
  COMPLEXITY_MULTIPLIER,
  STREAK_BONUS,
  ACHIEVEMENT_DEFINITIONS,
} = require('../config/constants');

// ─── Score calculation ────────────────────────────────────────────────────────

function calculateTaskScore(priority, complexity) {
  const base = PRIORITY_SCORES[priority] || 10;
  const mult = COMPLEXITY_MULTIPLIER[complexity] || 1;
  return Math.round(base * mult);
}

// ─── Rank helpers ─────────────────────────────────────────────────────────────

function getRank(xp) {
  let rankIndex = 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].minXP) {
      rankIndex = i;
      break;
    }
  }
  return { ...RANKS[rankIndex], index: rankIndex };
}

function getNextRank(currentRankIndex) {
  if (currentRankIndex >= RANKS.length - 1) return null;
  return RANKS[currentRankIndex + 1];
}

function getRankProgress(xp, currentRankIndex) {
  const current = RANKS[currentRankIndex];
  const next    = RANKS[currentRankIndex + 1];
  if (!next) return 100;
  const progress = ((xp - current.minXP) / (next.minXP - current.minXP)) * 100;
  return Math.min(Math.max(progress, 0), 100);
}

// ─── Streak management ────────────────────────────────────────────────────────

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

/**
 * Updates streak on the gamification object (mutates in place).
 * @param {Object} gam  User's embedded gamification doc
 */
function updateStreak(gam) {
  const today = getToday();
  const yesterday = getYesterday();

  if (gam.lastCompletionDate === today) {
    return gam; // already credited today
  }
  if (gam.lastCompletionDate === yesterday) {
    gam.streak += 1;
  } else {
    gam.streak = 1; // reset
  }
  gam.lastCompletionDate = today;
  gam.longestStreak = Math.max(gam.longestStreak, gam.streak);
  return gam;
}

/**
 * Check and possibly reset a broken streak.
 * @param {Object} gam
 */
function checkStreak(gam) {
  const today     = getToday();
  const yesterday = getYesterday();
  if (
    gam.lastCompletionDate &&
    gam.lastCompletionDate !== today &&
    gam.lastCompletionDate !== yesterday
  ) {
    gam.streak = 0;
  }
  return gam;
}

// ─── On-time bonus ───────────────────────────────────────────────────────────

function isOnTime(task) {
  if (!task.dueDate || !task.dueTime) return false;
  const due  = new Date(`${task.dueDate}T${task.dueTime}`);
  const now  = new Date();
  const mins = (now - due) / (1000 * 60);
  return mins >= -60 && mins <= 30;
}

// ─── Complete-task side-effects ───────────────────────────────────────────────

/**
 * Compute all gamification side-effects when a task is completed.
 * Returns the updated gamification object and result metadata — no DB writes.
 *
 * @param {Object} task   Mongoose Task document (or plain object)
 * @param {Object} gam    User's embedded gamification subdoc
 * @returns {{ gam, score, streakBonus, onTimeBonus, rankUp }}
 */
function processTaskCompletion(task, gam) {
  const today     = getToday();
  const score     = calculateTaskScore(task.priority, task.complexity || 3);
  const streakBonus    = STREAK_BONUS(gam.streak);
  const onTimeBonus    = isOnTime(task);
  const onTimeMult     = onTimeBonus ? 1.5 : 1;
  const finalScore     = Math.round(score * streakBonus * onTimeMult);

  gam.totalScore    += finalScore;
  gam.xp            += finalScore;
  gam.tasksCompleted += 1;

  // Streak
  gam = updateStreak(gam);

  // Daily history — Map stored in Mongo as a plain JS Map object
  const dayKey = today;
  const existing = gam.dailyHistory instanceof Map
    ? (gam.dailyHistory.get(dayKey) || { tasksCompleted: 0, score: 0 })
    : (gam.dailyHistory?.[dayKey]   || { tasksCompleted: 0, score: 0 });

  existing.tasksCompleted += 1;
  existing.score          += finalScore;

  if (gam.dailyHistory instanceof Map) {
    gam.dailyHistory.set(dayKey, existing);
  } else {
    if (!gam.dailyHistory) gam.dailyHistory = {};
    gam.dailyHistory[dayKey] = existing;
  }

  // Rank check
  const oldRankIndex = gam.rankIndex;
  const newRank      = getRank(gam.xp);
  gam.rankIndex      = newRank.index;

  return {
    gam,
    score:       finalScore,
    streakBonus,
    onTimeBonus,
    rankUp: newRank.index > oldRankIndex ? newRank : null,
  };
}

// ─── Achievements ─────────────────────────────────────────────────────────────

/**
 * Determine which new achievements should be unlocked after a task completion.
 *
 * @param {Object} gam             Updated gamification data
 * @param {string[]} unlockedIds   Currently unlocked achievement IDs
 * @param {Object[]} recentTasks   Recent completed tasks (for speed-demon check)
 * @returns {string[]}  IDs of newly unlocked achievements
 */
function checkNewAchievements(gam, unlockedIds, recentTasks = []) {
  const newlyUnlocked = [];
  const set = new Set(unlockedIds);

  const conditions = {
    first_task:       () => gam.tasksCompleted >= 1,
    task_master:      () => gam.tasksCompleted >= 10,
    productivity_pro: () => gam.tasksCompleted >= 50,
    streak_warrior:   () => gam.streak >= 7,
    week_warrior:     () => gam.streak >= 30,
    speed_demon:      () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return recentTasks.filter(
        (t) => t.status === 'completed' && new Date(t.completedAt) >= oneHourAgo
      ).length >= 3;
    },
    morning_person: () => {
      const h = new Date().getHours();
      return h < 9;
    },
    night_owl: () => {
      const h = new Date().getHours();
      return h >= 21;
    },
    rank_up: () => getRank(gam.xp).name !== 'Novice',
    legend:  () => getRank(gam.xp).name === 'Legend',
  };

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (!set.has(def.id) && conditions[def.id] && conditions[def.id]()) {
      newlyUnlocked.push(def.id);
    }
  }

  return newlyUnlocked;
}

// ─── Weekly activity ─────────────────────────────────────────────────────────

function getWeeklyActivity(gam) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result   = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayData = (gam.dailyHistory instanceof Map
      ? gam.dailyHistory.get(dateStr)
      : gam.dailyHistory?.[dateStr]) || { tasksCompleted: 0, score: 0 };

    result.push({
      date: dateStr,
      dayName: dayNames[d.getDay()],
      tasksCompleted: dayData.tasksCompleted,
      score: dayData.score,
      isToday: i === 0,
    });
  }
  return result;
}

function getStreakCalendar(gam) {
  const result = [];
  for (let i = 20; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr   = d.toISOString().split('T')[0];
    const dayData   = (gam.dailyHistory instanceof Map
      ? gam.dailyHistory.get(dateStr)
      : gam.dailyHistory?.[dateStr]);
    const hasActivity = dayData && dayData.tasksCompleted > 0;
    result.push({ date: dateStr, active: hasActivity, isToday: i === 0 });
  }
  return result;
}

module.exports = {
  calculateTaskScore,
  getRank,
  getNextRank,
  getRankProgress,
  updateStreak,
  checkStreak,
  processTaskCompletion,
  checkNewAchievements,
  getWeeklyActivity,
  getStreakCalendar,
};
