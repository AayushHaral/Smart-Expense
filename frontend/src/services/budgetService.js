import API from './api';

export const budgetService = {
  getBudgets: async (month) => {
    const response = await API.get('/budgets', { params: { month } });
    return response.data;
  },

  createOrUpdateBudget: async (data) => {
    const response = await API.post('/budgets', data);
    return response.data;
  },

  updateBudget: async (id, data) => {
    const response = await API.put(`/budgets/${id}`, data);
    return response.data;
  },

  deleteBudget: async (id) => {
    const response = await API.delete(`/budgets/${id}`);
    return response.data;
  }
};
