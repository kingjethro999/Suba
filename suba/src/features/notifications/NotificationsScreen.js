import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getNotifications, markNotificationAsSeen, markAllNotificationsAsSeen } from '../../services/notificationsService';
import { AuthContext } from '../../contexts/AuthContext';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useContext(AuthContext);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMarkAsSeen = async (notificationId) => {
    try {
      await markNotificationAsSeen(notificationId);
      setNotifications(notifications.map(notif => 
        notif.id === notificationId ? { ...notif, seen: true } : notif
      ));
    } catch (error) {
      console.error('Error marking notification as seen:', error);
    }
  };

  const handleMarkAllAsSeen = async () => {
    try {
      await markAllNotificationsAsSeen();
      setNotifications(notifications.map(notif => ({ ...notif, seen: true })));
    } catch (error) {
      console.error('Error marking all notifications as seen:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'reminder': return 'calendar-outline';
      case 'insight': return 'bulb-outline';
      case 'invite': return 'person-add-outline';
      case 'warning': return 'warning-outline';
      default: return 'notifications-outline';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'reminder': return '#3B82F6';
      case 'insight': return '#10B981';
      case 'invite': return '#8B5CF6';
      case 'warning': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const unreadCount = notifications.filter(notif => !notif.seen).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4B5FFF', '#6D7BFF']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSubtitle}>
          {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
        </Text>
        
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllAsSeen}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No notifications</Text>
            <Text style={styles.emptyStateText}>
              You're all caught up! Notifications will appear here for reminders and updates.
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                !notification.seen && styles.unreadNotification
              ]}
              onPress={() => handleMarkAsSeen(notification.id)}
            >
              <View style={styles.notificationHeader}>
                <View style={[styles.iconContainer, { backgroundColor: `${getNotificationColor(notification.type)}20` }]}>
                  <Ionicons name={getNotificationIcon(notification.type)} size={20} color={getNotificationColor(notification.type)} />
                </View>
                <View style={styles.notificationInfo}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.notificationTime}>
                    {new Date(notification.created_at).toLocaleDateString()} • 
                    {new Date(notification.created_at).toLocaleTimeString()}
                  </Text>
                </View>
                {!notification.seen && <View style={styles.unreadDot} />}
              </View>
              
              <Text style={styles.notificationMessage}>{notification.message}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 60, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '500', marginBottom: 12 },
  markAllButton: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  markAllText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  content: { flex: 1 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, margin: 20 },
  emptyStateTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
  emptyStateText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8 },
  notificationCard: { backgroundColor: '#fff', margin: 16, marginBottom: 8, padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  unreadNotification: { borderLeftWidth: 4, borderLeftColor: '#4B5FFF' },
  notificationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  notificationInfo: { flex: 1 },
  notificationTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  notificationTime: { fontSize: 12, color: '#9CA3AF' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4B5FFF' },
  notificationMessage: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
});