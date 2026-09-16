import API from './api';

export const reportService = {
  getMonthlyReport: async (year) => {
    const response = await API.get('/reports/monthly', { params: { year } });
    return response.data;
  },

  getCategoryReport: async (params = {}) => {
    const response = await API.get('/reports/category', { params });
    return response.data;
  },

  getIncomeExpenseReport: async (params = {}) => {
    const response = await API.get('/reports/income-expense', { params });
    return response.data;
  }
};
