'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const AVATARS = ['🦊', '🐺', '🦁', '🐯', '🐻', '🦄', '🐉', '🦅', '🦋', '🌟'];

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-z0-9_-]+$/, 'Username may only contain letters, numbers, underscores and hyphens'],
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // never returned in queries by default
    },
    avatar: {
      type: String,
      default: AVATARS[0],
      enum: AVATARS,
    },
    // Gamification — embedded for single-doc atomic updates
    gamification: {
      totalScore:        { type: Number, default: 0 },
      xp:                { type: Number, default: 0 },
      streak:            { type: Number, default: 0 },
      longestStreak:     { type: Number, default: 0 },
      lastCompletionDate:{ type: String, default: null }, // YYYY-MM-DD
      tasksCompleted:    { type: Number, default: 0 },
      rankIndex:         { type: Number, default: 0 },
      dailyHistory: {
        type: Map,
        of: new mongoose.Schema({
          tasksCompleted: { type: Number, default: 0 },
          score:          { type: Number, default: 0 },
        }, { _id: false }),
        default: {},
      },
    },
    // Achievements — array of unlocked achievement IDs
    achievements: {
      type: [String],
      default: [],
    },
    // User settings
    settings: {
      notificationsEnabled: { type: Boolean, default: false },
      alarmSound:           { type: String, default: 'default' },
      alarmVolume:          { type: Number, default: 0.7 },
    },
    // Soft-delete / account state
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    refreshTokens: {
      type: [String],
      select: false,
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ---- Indexes ----
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

// ---- Pre-save: hash password ----
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ---- Instance methods ----
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.updateLastSeen = function () {
  this.lastSeenAt = new Date();
  return this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model('User', userSchema);
