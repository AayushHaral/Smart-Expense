import API from './api';

export const dashboardService = {
  getSummary: async () => {
    const response = await API.get('/dashboard/summary');
    return response.data;
  }
};
