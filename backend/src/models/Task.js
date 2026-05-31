const mongoose = require('mongoose');
const { TASK_STATUS, TASK_PRIORITY } = require('../constants/taskConstants');

const taskSchema = new mongoose.Schema(
  {
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
    },
    priority: {
      type: String,
      enum: Object.values(TASK_PRIORITY),
      default: TASK_PRIORITY.MEDIUM,
    },
    status: {
      type: String,
      enum: Object.values(TASK_STATUS),
      default: TASK_STATUS.TODO,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Auto-set completedAt when task moves to DONE
taskSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === TASK_STATUS.DONE && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== TASK_STATUS.DONE) {
      this.completedAt = null;
    }
  }
  next();
});

// --- Indexes ---
// Single field indexes on frequently queried fields
taskSchema.index({ status: 1 });
taskSchema.index({ assignee: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ priority: 1 });

// Compound indexes for common query patterns
// LIST tasks for an org filtered by status
taskSchema.index({ organizationId: 1, status: 1 });
// LIST tasks by assignee within an org (most common query for MEMBER role)
taskSchema.index({ organizationId: 1, assignee: 1, status: 1 });
// Overdue analytics: org + dueDate + status
taskSchema.index({ organizationId: 1, dueDate: 1, status: 1 });
// Sorting by creation date within an org
taskSchema.index({ organizationId: 1, createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
