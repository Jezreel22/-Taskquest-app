'use strict';

// ---- Task constants ----
const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const TASK_CATEGORIES = ['work', 'personal', 'health', 'learning', 'creative'];
const TASK_STATUSES   = ['pending', 'completed', 'archived'];
const RECURRENCE_TYPES = ['none', 'daily', 'weekly', 'biweekly', 'monthly'];

// ---- Gamification constants (must mirror frontend gamification.js) ----
const RANKS = [
  { name: 'Novice',     iconClass: 'fa-seedling',  minXP: 0,    color: '#95a5a6' },
  { name: 'Apprentice', iconClass: 'fa-book-open', minXP: 100,  color: '#3498db' },
  { name: 'Achiever',   iconClass: 'fa-star',      minXP: 350,  color: '#f39c12' },
  { name: 'Expert',     iconClass: 'fa-fire',      minXP: 800,  color: '#e74c3c' },
  { name: 'Legend',     iconClass: 'fa-crown',     minXP: 1500, color: '#9b59b6' },
];

const PRIORITY_SCORES = {
  low:    5,
  medium: 10,
  high:   20,
  urgent: 35,
};

// index 1–5 maps to complexity 1–5
const COMPLEXITY_MULTIPLIER = [0, 1, 1.25, 1.5, 2, 3];

const STREAK_BONUS = (streak) => {
  if (streak >= 30) return 2.0;
  if (streak >= 14) return 1.5;
  if (streak >= 7)  return 1.25;
  if (streak >= 3)  return 1.1;
  return 1.0;
};

// ---- Achievements ----
const ACHIEVEMENT_DEFINITIONS = [
  { id: 'first_task',        name: 'Getting Started',   description: 'Complete your first task',         icon: '🎯' },
  { id: 'task_master',       name: 'Task Master',        description: 'Complete 10 tasks',                icon: '⭐' },
  { id: 'productivity_pro',  name: 'Productivity Pro',   description: 'Complete 50 tasks',                icon: '🚀' },
  { id: 'streak_warrior',    name: 'Streak Warrior',     description: 'Reach a 7-day streak',             icon: '🔥' },
  { id: 'week_warrior',      name: 'Week Warrior',       description: 'Reach a 30-day streak',            icon: '💪' },
  { id: 'speed_demon',       name: 'Speed Demon',        description: 'Complete 3 tasks in 1 hour',       icon: '⚡' },
  { id: 'morning_person',    name: 'Morning Person',     description: 'Complete a task before 9 AM',      icon: '🌅' },
  { id: 'night_owl',         name: 'Night Owl',          description: 'Complete a task after 9 PM',       icon: '🌙' },
  { id: 'rank_up',           name: 'First Rank Up',      description: 'Reach Apprentice rank',            icon: '📚' },
  { id: 'legend',            name: 'Legend',             description: 'Reach Legend rank',                icon: '👑' },
];

// ---- JWT / Auth ----
const JWT_EXPIRES_IN  = '7d';
const REFRESH_EXPIRES_IN = '30d';

// ---- Rate limiting ----
const RATE_LIMIT_WINDOW_MS  = 15 * 60 * 1000; // 15 min
const RATE_LIMIT_MAX_REQUESTS = 100;           // per window
const AUTH_RATE_LIMIT_MAX    = 10;             // stricter for auth routes

module.exports = {
  TASK_PRIORITIES,
  TASK_CATEGORIES,
  TASK_STATUSES,
  RECURRENCE_TYPES,
  RANKS,
  PRIORITY_SCORES,
  COMPLEXITY_MULTIPLIER,
  STREAK_BONUS,
  ACHIEVEMENT_DEFINITIONS,
  JWT_EXPIRES_IN,
  REFRESH_EXPIRES_IN,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  AUTH_RATE_LIMIT_MAX,
};
