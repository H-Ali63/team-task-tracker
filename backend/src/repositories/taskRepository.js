const BaseRepository = require('./BaseRepository');
const Task = require('../models/Task');

class TaskRepository extends BaseRepository {
  constructor() {
    super(Task);
  }

  /**
   * Find tasks with pagination, filtering, and sorting.
   */
  async findTasks({ filter, page, limit, skip, sort }) {
    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('assignee', 'name email role')
        .populate('createdBy', 'name email')
        .sort(sort || { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      Task.countDocuments(filter),
    ]);
    return { tasks, total };
  }

  async findByIdPopulated(id) {
    return Task.findById(id)
      .populate('assignee', 'name email role')
      .populate('createdBy', 'name email')
      .populate('organizationId', 'name')
      .exec();
  }

  /**
   * Aggregation for analytics: overdue count and avg completion time.
   */
  async getAnalytics(organizationId) {
    const now = new Date();

    const [overdueResult, avgCompletionResult] = await Promise.all([
      // Overdue tasks per user
      Task.aggregate([
        {
          $match: {
            organizationId,
            dueDate: { $lt: now },
            status: { $nin: ['DONE'] },
          },
        },
        {
          $group: {
            _id: '$assignee',
            overdueCount: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'assigneeInfo',
          },
        },
        {
          $project: {
            assigneeId: '$_id',
            name: { $arrayElemAt: ['$assigneeInfo.name', 0] },
            email: { $arrayElemAt: ['$assigneeInfo.email', 0] },
            overdueCount: 1,
          },
        },
      ]),
      // Average completion time in hours for DONE tasks
      Task.aggregate([
        {
          $match: {
            organizationId,
            status: 'DONE',
            completedAt: { $ne: null },
          },
        },
        {
          $project: {
            durationMs: { $subtract: ['$completedAt', '$createdAt'] },
          },
        },
        {
          $group: {
            _id: null,
            avgCompletionMs: { $avg: '$durationMs' },
            totalCompleted: { $sum: 1 },
          },
        },
        {
          $project: {
            avgCompletionHours: {
              $round: [{ $divide: ['$avgCompletionMs', 3600000] }, 2],
            },
            totalCompleted: 1,
          },
        },
      ]),
    ]);

    return {
      overdueByUser: overdueResult,
      avgCompletionHours: avgCompletionResult[0]?.avgCompletionHours || 0,
      totalCompleted: avgCompletionResult[0]?.totalCompleted || 0,
    };
  }
}

module.exports = new TaskRepository();
