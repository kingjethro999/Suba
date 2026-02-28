import api from '../api/config';

export const getSharedPlans = async () => {
  const response = await api.get('/shared-plans');
  return response.data ?? [];
};

export const createSharedPlan = async (planData) => {
  try {
    const response = await api.post('/shared-plans', planData, { timeout: 45000 });
    return response.data;
  } catch (error) {
    console.error('Error creating shared plan:', error?.response?.data || error.message);
    throw error;
  }
};

export const acceptSharedPlanInvite = async (participantId) => {
  try {
    const response = await api.patch(`/shared-plans/participants/${participantId}/accept`);
    return response.data;
  } catch (error) {
    console.error('Error accepting shared plan invite:', error?.response?.data || error.message);
    throw error;
  }
};

export const declineSharedPlanInvite = async (participantId) => {
  try {
    const response = await api.patch(`/shared-plans/participants/${participantId}/decline`);
    return response.data;
  } catch (error) {
    console.error('Error declining shared plan invite:', error?.response?.data || error.message);
    throw error;
  }
};