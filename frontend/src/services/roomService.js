import API from './api';

export const roomService = {
  createRoom: async (name) => {
    const response = await API.post('/rooms', { name });
    return response.data;
  },

  joinRoom: async (invite_code) => {
    const response = await API.post('/rooms/join', { invite_code });
    return response.data;
  },

  getMyRooms: async () => {
    const response = await API.get('/rooms/my-rooms');
    return response.data;
  },

  getRoomDetails: async (roomId) => {
    const response = await API.get(`/rooms/${roomId}`);
    return response.data;
  },

  leaveRoom: async (roomId) => {
    const response = await API.post(`/rooms/${roomId}/leave`);
    return response.data;
  },

  removeMember: async (roomId, targetUserId) => {
    const response = await API.delete(`/rooms/${roomId}/members/${targetUserId}`);
    return response.data;
  },

  getSharedExpenses: async (roomId) => {
    const response = await API.get(`/rooms/${roomId}/expenses`);
    return response.data;
  },

  createSharedExpense: async (roomId, formData) => {
    const response = await API.post(`/rooms/${roomId}/expenses`, formData);
    return response.data;
  },

  deleteSharedExpense: async (roomId, expenseId) => {
    const response = await API.delete(`/rooms/${roomId}/expenses/${expenseId}`);
    return response.data;
  },

  getRoomBalances: async (roomId) => {
    const response = await API.get(`/rooms/${roomId}/balances`);
    return response.data;
  },

  recordSettlement: async (roomId, data) => {
    const response = await API.post(`/rooms/${roomId}/settle`, data);
    return response.data;
  },

  getSharedBudgets: async (roomId, month) => {
    const response = await API.get(`/rooms/${roomId}/budgets`, { params: { month } });
    return response.data;
  },

  createOrUpdateSharedBudget: async (roomId, data) => {
    const response = await API.post(`/rooms/${roomId}/budgets`, data);
    return response.data;
  },

  getNotifications: async () => {
    const response = await API.get('/rooms/notifications');
    return response.data;
  }
};
