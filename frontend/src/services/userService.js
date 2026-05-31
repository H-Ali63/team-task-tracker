import api from '../api/axios';

export const userService = {
  list: async () => {
    const res = await api.get('/users');
    return res.data.data.users;
  },

  get: async (id) => {
    const res = await api.get(`/users/${id}`);
    return res.data.data.user;
  },

  updateRole: async (id, role) => {
    const res = await api.patch(`/users/${id}/role`, { role });
    return res.data.data.user;
  },

  deactivate: async (id) => {
    await api.delete(`/users/${id}`);
  },

  getProfile: async () => {
    const res = await api.get('/users/profile');
    return res.data.data.user;
  },
};
