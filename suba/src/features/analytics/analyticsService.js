import api from '../../api/config';

// Normalize and fetch spending (supports expected/actual modes)
export const getSpendingData = async (period = 'monthly', currency, mode = 'expected') => {
  try {
    const response = await api.get('/analytics/spending', {
      params: { period, currency, mode },
    });
    const d = response.data || {};
    return {
      totalSpent: Number(d.totalSpent ?? d.total_spent ?? d.total ?? 0),
      totalSubscriptions: Number(d.totalSubscriptions ?? d.subscription_count ?? 0),
      currency: (d.currency || currency || 'NGN').toUpperCase(),
      period: d.period ?? period,
      mode: d.mode ?? mode,
    };
  } catch (error) {
    console.error('Error fetching spending data:', error);
    if (error.response?.status === 404) {
      return getMockSpendingData(period, currency);
    }
    throw error;
  }
};

export const getCategoryBreakdown = async (period = 'monthly', currency) => {
  try {
    const response = await api.get('/analytics/categories', {
      params: { period, currency },
    });
    // Ensure numbers
    return (response.data || []).map((row) => ({
      ...row,
      total_amount: Number(row.total_amount ?? row.total ?? 0),
      subscription_count: Number(row.subscription_count ?? 0),
    }));
  } catch (error) {
    console.error('Error fetching category breakdown:', error);
    if (error.response?.status === 404) {
      return getMockCategoryData(period, currency);
    }
    throw error;
  }
};

export const getMonthlyTrends = async (period = 'monthly', currency) => {
  try {
    const response = await api.get('/analytics/trends', {
      params: { period, currency },
    });
    return (response.data || []).map((row) => ({
      ...row,
      total_amount: Number(row.total_amount ?? row.total ?? 0),
      label: row.label || row.month_name || row.year || row.week,
    }));
  } catch (error) {
    console.error('Error fetching monthly trends:', error);
    if (error.response?.status === 404) {
      return getMockTrendsData(period, currency);
    }
    throw error;
  }
};

// Mock data respecting the selected period
const getMockSpendingData = (period, currency = 'NGN') => {
  const baseAmount = 19400; // base monthly
  const mult = period === 'weekly' ? 0.25 : period === 'yearly' ? 12 : 1;
  return {
    totalSpent: Math.round(baseAmount * mult),
    totalSubscriptions: 3,
    currency: (currency || 'NGN').toUpperCase(),
    period
  };
};

const getMockCategoryData = (period, currency = 'NGN') => {
  const baseEntertainment = 3600;
  const baseTV = 15800;
  const mult = period === 'weekly' ? 0.25 : period === 'yearly' ? 12 : 1;

  return [
    { category: 'Entertainment', total_amount: Math.round(baseEntertainment * mult), subscription_count: 1, currency: currency.toUpperCase() },
    { category: 'TV',            total_amount: Math.round(baseTV * mult),          subscription_count: 2, currency: currency.toUpperCase() },
  ];
};

const getMockTrendsData = (period, currency = 'NGN') => {
  const baseMonthly = [19400, 15800, 7900, 12000, 22000, 17000];
  const mult = period === 'weekly' ? 0.25 : period === 'yearly' ? 12 : 1;

  if (period === 'weekly') {
    return Array.from({ length: 8 }, (_, i) => ({
      week: `wk-${i + 1}`,
      label: `W${i + 1}`,
      total_amount: Math.round((baseMonthly[i % baseMonthly.length] * mult) / 4),
      currency: currency.toUpperCase(),
      subscription_count: 3,
    }));
  }

  if (period === 'yearly') {
    const y = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => {
      const idx = i % baseMonthly.length;
      return {
        year: `${y - (4 - i)}`,
        label: `${y - (4 - i)}`,
        total_amount: Math.round(baseMonthly[idx] * mult),
        currency: currency.toUpperCase(),
        subscription_count: 3,
      };
    });
  }

  const labels = ['Sep', 'Aug', 'Jul', 'Jun', 'May', 'Apr'];
  return labels.map((mn, i) => ({
    month: `2024-${String(9 - i).padStart(2, '0')}`,
    month_name: mn,
    label: mn,
    total_amount: Math.round(baseMonthly[i % baseMonthly.length] * mult),
    currency: currency.toUpperCase(),
    subscription_count: 3,
  }));
};