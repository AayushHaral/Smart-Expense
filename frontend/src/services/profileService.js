import API from './api';

export const profileService = {
  getProfile: async () => {
    const response = await API.get('/profile');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await API.put('/profile', data);
    return response.data;
  },

  changePassword: async (data) => {
    const response = await API.put('/profile/change-password', data);
    return response.data;
  }
};
