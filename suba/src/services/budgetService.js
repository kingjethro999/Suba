import api from '../api/config';

export const getBudget = async () => {
  const res = await api.get('/budget');
  return res.data; // { budget, currency }
};

export const updateBudget = async (budget) => {
  const res = await api.put('/budget', { budget });
  return res.data; // { message, budget }
};