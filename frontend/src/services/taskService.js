import api from '../api/axios';

export const taskService = {
  list: async (params = {}) => {
    const res = await api.get('/tasks', { params });
    return res.data.data;
  },

  get: async (id) => {
    const res = await api.get(`/tasks/${id}`);
    return res.data.data.task;
  },

  create: async (data) => {
    const res = await api.post('/tasks', data);
    return res.data.data.task;
  },

  update: async (id, data) => {
    const res = await api.put(`/tasks/${id}`, data);
    return res.data.data.task;
  },

  updateStatus: async (id, status) => {
    const res = await api.patch(`/tasks/${id}/status`, { status });
    return res.data.data.task;
  },

  delete: async (id) => {
    await api.delete(`/tasks/${id}`);
  },

  getAnalytics: async () => {
    const res = await api.get('/tasks/analytics');
    return res.data.data;
  },
};
