import API from './api';

export const authService = {
  login: async (credentials) => {
    const response = await API.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await API.post('/auth/register', userData);
    return response.data;
  },

  resetPassword: async (data) => {
    const response = await API.post('/auth/reset-password', data);
    return response.data;
  },

  getMe: async () => {
    const response = await API.get('/auth/me');
    return response.data;
  }
};

