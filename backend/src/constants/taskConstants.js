const TASK_STATUS = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
  BLOCKED: 'BLOCKED',
};

const TASK_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
};

/**
 * Valid status transitions map.
 * Key = current status, Value = array of valid next statuses.
 */
const STATUS_TRANSITIONS = {
  [TASK_STATUS.TODO]: [TASK_STATUS.IN_PROGRESS, TASK_STATUS.BLOCKED],
  [TASK_STATUS.IN_PROGRESS]: [TASK_STATUS.IN_REVIEW, TASK_STATUS.BLOCKED],
  [TASK_STATUS.IN_REVIEW]: [TASK_STATUS.DONE, TASK_STATUS.BLOCKED],
  [TASK_STATUS.DONE]: [], // Terminal state
  [TASK_STATUS.BLOCKED]: [], // Must be manually resolved by re-assigning
};

module.exports = { TASK_STATUS, TASK_PRIORITY, STATUS_TRANSITIONS };
