import React from 'react';
import {
  STATUS_COLORS,
  STATUS_LABELS,
  PRIORITY_COLORS,
  PRIORITY_DOT_COLORS,
  ROLE_BADGE_COLORS,
} from '../../utils/constants';

export const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
    {STATUS_LABELS[status] || status}
  </span>
);

export const PriorityBadge = ({ priority }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[priority]}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT_COLORS[priority]}`} />
    {priority}
  </span>
);

export const RoleBadge = ({ role }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE_COLORS[role]}`}>
    {role}
  </span>
);
