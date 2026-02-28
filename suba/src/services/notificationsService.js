//suba-frontend/src/services/notificationsService.js
import api from '../api/config';

export const getNotifications = async () => {
  try {
    const response = await api.get('/notifications');
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    // Return mock data for development
    return getMockNotifications();
  }
};

export const markNotificationAsSeen = async (notificationId) => {
  try {
    const response = await api.patch(`/notifications/${notificationId}/seen`);
    return response.data;
  } catch (error) {
    console.error('Error marking notification as seen:', error);
    throw error;
  }
};

export const markAllNotificationsAsSeen = async () => {
  try {
    const response = await api.patch('/notifications/mark-all-seen');
    return response.data;
  } catch (error) {
    console.error('Error marking all notifications as seen:', error);
    throw error;
  }
};

// Mock data for development
const getMockNotifications = () => {
  return [
    {
      id: 1,
      type: 'reminder',
      title: 'Payment Due Tomorrow',
      message: 'Your Netflix subscription payment of ₦3,600 is due tomorrow.',
      seen: false,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      type: 'insight',
      title: 'New Cost Saving Tip',
      message: 'Save ₦2,400/month by switching your Netflix plan.',
      seen: true,
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 3,
      type: 'invite',
      title: 'Shared Plan Invitation',
      message: 'You have been invited to join a shared DSTV plan.',
      seen: true,
      created_at: new Date(Date.now() - 172800000).toISOString()
    }
  ];
};