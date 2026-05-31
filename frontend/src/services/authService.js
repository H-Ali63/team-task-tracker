import api from '../api/axios';

export const authService = {
  register: async (data) => {
    const res = await api.post('/auth/register', data);
    return res.data.data;
  },

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data.data;
  },

  logout: async (refreshToken) => {
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Fail silently — client-side state is cleared regardless
    }
  },

  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data.data.user;
  },
};
