'use strict';

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const {
  TASK_PRIORITIES,
  TASK_CATEGORIES,
  TASK_STATUSES,
  RECURRENCE_TYPES,
} = require('../config/constants');

const taskSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => `task_${Date.now()}_${uuidv4().slice(0, 8)}`,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: 1,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: 'medium',
    },
    category: {
      type: String,
      enum: TASK_CATEGORIES,
      default: 'personal',
    },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: 'pending',
    },
    dueDate: {
      type: String, // stored as YYYY-MM-DD for timezone-safe comparisons
      default: '',
    },
    dueTime: {
      type: String, // HH:MM
      default: '',
    },
    complexity: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    alarm: {
      type: Boolean,
      default: false,
    },
    recurrence: {
      type: String,
      enum: RECURRENCE_TYPES,
      default: 'none',
    },
    recurrenceEnd: {
      type: String, // YYYY-MM-DD
      default: '',
    },
    // Gamification
    score: {
      type: Number,
      default: 0,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    // Recurrence hierarchy
    isRecurringInstance: {
      type: Boolean,
      default: false,
    },
    parentId: {
      type: String,
      ref: 'Task',
      default: null,
    },
    // Soft-delete
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        delete ret.__v;
        delete ret.isDeleted;
        return ret;
      },
    },
  }
);

// ---- Compound indexes ----
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ userId: 1, category: 1 });
taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ parentId: 1 });

// ---- Default query filter: exclude soft-deleted ----
taskSchema.pre(/^find/, function (next) {
  if (this.getFilter().isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);
