// suba-frontend/src/services/budgetReportsService.js
import api from '../api/config';

export const getBudgetReports = async () => {
  try {
    const response = await api.get('/budget-reports');
    return response.data;
  } catch (error) {
    console.error('Error fetching budget reports:', error);
    // Return mock data for development
    return getMockBudgetReports();
  }
};

export const generateBudgetReport = async (month) => {
  try {
    const response = await api.post('/budget-reports/generate', { month });
    return response.data;
  } catch (error) {
    console.error('Error generating budget report:', error);
    throw error;
  }
};

// Mock data for development
const getMockBudgetReports = () => {
  return [
    {
      id: 1,
      report_month: '2024-09',
      total_spent: 19400,
      recurring_services: 3,
      new_subscriptions: 1,
      canceled_subscriptions: 0,
      most_expensive_service: 'DSTV',
      category_breakdown: JSON.stringify({
        'Entertainment': 3600,
        'TV': 15800
      }),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      report_month: '2024-08',
      total_spent: 15800,
      recurring_services: 2,
      new_subscriptions: 0,
      canceled_subscriptions: 0,
      most_expensive_service: 'DSTV',
      category_breakdown: JSON.stringify({
        'TV': 15800
      }),
      updated_at: new Date(Date.now() - 2592000000).toISOString()
    }
  ];
};