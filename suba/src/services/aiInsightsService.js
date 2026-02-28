// suba-frontend/src/services/aiInsightsService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/config';

const CACHE_KEY = 'ai_insights_cache_v2';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

const ensureArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.insights)) return data.insights;
  return [];
};

export const getAIInsights = async (options = {}) => {
  const { forceRefresh = false } = options;

  try {
    if (!forceRefresh) {
      const cached = await getCached();
      if (cached && !isExpired(cached.timestamp)) {
        return ensureArray(cached.insights);
      }
    }

    let insights = [];
    try {
      const res = await api.get('/ai/insights');
      insights = ensureArray(res.data);
    } catch {}

    if (!insights.length) {
      await api.post('/ai/insights/generate');
      const res2 = await api.get('/ai/insights');
      insights = ensureArray(res2.data);
    }

    await saveCache(insights);
    return insights;
  } catch (err) {
    console.error('getAIInsights error:', err?.response?.data || err.message);
    const cached = await getCached();
    if (cached?.insights) return ensureArray(cached.insights);
    return [];
  }
};

export const markInsightAsResolved = async (insightId) => {
  try {
    await api.put(`/ai/insights/${insightId}/resolve`);
    const cached = await getCached();
    if (cached?.insights) {
      const updated = ensureArray(cached.insights).filter(i => String(i.id) !== String(insightId));
      await saveCache(updated);
    }
    return true;
  } catch (err) {
    console.error('markInsightAsResolved error:', err?.response?.data || err.message);
    throw new Error('Failed to resolve insight');
  }
};

export const refreshAIInsights = async () => {
  await clearCache();
  return getAIInsights({ forceRefresh: true });
};

// Cache utils
const getCached = async () => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveCache = async (insights) => {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ insights: ensureArray(insights), timestamp: Date.now() }));
  } catch {}
};

export const clearCache = async () => {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {}
};

const isExpired = (ts) => Date.now() - ts > CACHE_TTL_MS;

export default {
  getAIInsights,
  markInsightAsResolved,
  refreshAIInsights,
  clearCache,
};