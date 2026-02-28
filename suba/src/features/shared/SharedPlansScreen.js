import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getSharedPlans, acceptSharedPlanInvite, declineSharedPlanInvite } from '../../services/sharedPlansService';
import { AuthContext } from '../../contexts/AuthContext';

export default function SharedPlansScreen({ navigation }) {
  const [sharedPlans, setSharedPlans] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useContext(AuthContext);

  const loadSharedPlans = async () => {
    try {
      if (!user?.id) {
        setSharedPlans([]);
        setInvites([]);
        return;
      }

      const data = await getSharedPlans();
      let plansData = data?.data || data || [];
      if (!Array.isArray(plansData)) plansData = [];

      // Plans the user owns
      const ownedPlans = plansData.filter(plan => plan.user_id === user.id);

      // Plans where the user is an accepted participant
      const acceptedPlans = plansData.filter(plan =>
        plan.participants?.some(p => p.user_id === user.id && p.status === 'accepted')
      );

      // Pending invites for current user
      const planInvites = plansData.flatMap(plan =>
        (plan.participants || [])
          .filter(p => p.user_id === user.id && p.status === 'invited')
          .map(invite => ({
            ...invite,
            plan_name: plan.plan_name,
            owner_name: plan.owner_name,
            owner_email: plan.owner_email,
          }))
      );

      // Combine owned + accepted (avoid duplicates)
      const allMyPlans = [
        ...ownedPlans,
        ...acceptedPlans.filter(plan => !ownedPlans.some(o => o.id === plan.id))
      ];

      setSharedPlans(allMyPlans);
      setInvites(planInvites);
    } catch (error) {
      console.error('Error loading shared plans:', error);
      Alert.alert('Error', 'Failed to load shared plans');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAcceptInvite = async (participantId) => {
    if (!participantId || Number(participantId) <= 0) {
      Alert.alert('Error', 'Invalid invitation. Pull to refresh and try again.');
      return;
    }
    try {
      await acceptSharedPlanInvite(participantId);
      Alert.alert('Success', 'You have joined the shared plan!');
      loadSharedPlans();
    } catch (error) {
      console.error('Error accepting invite:', error);
      Alert.alert('Error', 'Failed to accept invitation');
    }
  };

  const handleDeclineInvite = async (participantId) => {
    if (!participantId || Number(participantId) <= 0) {
      Alert.alert('Error', 'Invalid invitation. Pull to refresh and try again.');
      return;
    }
    try {
      await declineSharedPlanInvite(participantId);
      Alert.alert('Declined', 'Invitation declined');
      loadSharedPlans();
    } catch (error) {
      console.error('Error declining invite:', error);
      Alert.alert('Error', 'Failed to decline invitation');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSharedPlans();
  };

  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      loadSharedPlans();
    } else {
      setLoading(false);
    }
    // re-load when user changes (switch account/login)
  }, [user?.id]);

  const formatCurrency = (amount, currency = 'NGN') => {
    const n = Number(amount || 0);
    return currency === 'NGN' ? `₦${n.toFixed(2)}` : `$${n.toFixed(2)}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading shared plans...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4B5FFF', '#6D7BFF']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Shared Plans</Text>
        <Text style={styles.headerSubtitle}>Split subscription costs with friends</Text>
        
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateSharedPlan')}
        >
          <Ionicons name="add" size={20} color="#4B5FFF" />
          <Text style={styles.createButtonText}>Create Shared Plan</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Pending Invites */}
        {invites.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Invites ({invites.length})</Text>
            {invites.map(invite => (
              <View key={invite.id} style={styles.inviteCard}>
                <View style={styles.inviteInfo}>
                  <Text style={styles.inviteTitle}>
                    Invitation to join {invite.plan_name}
                  </Text>
                  {invite.owner_name ? (
                    <Text style={{ color: '#6B7280', marginBottom: 6 }}>
                      From {invite.owner_name}{invite.owner_email ? ` (${invite.owner_email})` : ''}
                    </Text>
                  ) : null}
                  <Text style={styles.inviteAmount}>
                    Your share: {formatCurrency(invite.split_amount)}
                  </Text>
                </View>
                <View style={styles.inviteActions}>
                  <TouchableOpacity 
                    style={styles.acceptButton}
                    onPress={() => handleAcceptInvite(invite.id)}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.declineButton}
                    onPress={() => handleDeclineInvite(invite.id)}
                  >
                    <Ionicons name="close" size={16} color="#6B7280" />
                    <Text style={styles.declineButtonText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* My Shared Plans */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            My Shared Plans ({sharedPlans.length})
          </Text>
          
          {sharedPlans.length > 0 ? (
            sharedPlans.map(plan => (
              <TouchableOpacity 
                key={plan.id}
                style={styles.planCard}
                onPress={() => navigation.navigate('SharedPlanDetails', { planId: plan.id })}
              >
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{plan.plan_name}</Text>
                  <Text style={styles.planAmount}>{formatCurrency(plan.total_amount)}</Text>
                </View>
                <View style={styles.planDetails}>
                  <View style={styles.participantInfo}>
                    <Ionicons name="people-outline" size={16} color="#6B7280" />
                    <Text style={styles.participantCount}>
                      {(plan.participants?.filter(p => p.status === 'accepted').length || 1)} participants
                    </Text>
                  </View>
                  <Text style={styles.splitType}>{plan.split_type} split</Text>
                </View>
                <View style={styles.planStatus}>
                  <View style={[
                    styles.statusBadge,
                    plan.is_active ? styles.activeBadge : styles.inactiveBadge
                  ]}>
                    <Text style={styles.statusText}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No shared plans yet</Text>
              <Text style={styles.emptyStateText}>
                Create your first shared plan to split subscription costs with friends
              </Text>
            </View>
          )}
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>Benefits of Shared Plans</Text>
          <View style={styles.benefitItem}>
            <Ionicons name="cash-outline" size={20} color="#10B981" />
            <Text style={styles.benefitText}>Save money by splitting costs</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#3B82F6" />
            <Text style={styles.benefitText}>Secure payment tracking</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="notifications-outline" size={20} color="#F59E0B" />
            <Text style={styles.benefitText}>Automatic reminders for participants</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 60, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '500', marginBottom: 16 },
  createButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    alignSelf: 'flex-start',
    backgroundColor: '#fff', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 12,
    gap: 8 
  },
  createButtonText: { color: '#4B5FFF', fontWeight: '600', fontSize: 14 },
  content: { flex: 1 },
  section: { margin: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
  inviteCard: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inviteInfo: { marginBottom: 12 },
  inviteTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  inviteAmount: { fontSize: 14, color: '#4B5FFF', fontWeight: '500' },
  inviteActions: { flexDirection: 'row', gap: 8 },
  acceptButton: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#10B981', 
    padding: 10, 
    borderRadius: 8,
    gap: 4 
  },
  acceptButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  declineButton: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#F3F4F6', 
    padding: 10, 
    borderRadius: 8,
    gap: 4 
  },
  declineButtonText: { color: '#6B7280', fontWeight: '600', fontSize: 14 },
  planCard: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  planName: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  planAmount: { fontSize: 18, fontWeight: '700', color: '#4B5FFF' },
  planDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  participantInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  participantCount: { fontSize: 12, color: '#6B7280' },
  splitType: { fontSize: 12, color: '#6B7280', textTransform: 'capitalize' },
  planStatus: { flexDirection: 'row', justifyContent: 'flex-end' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  activeBadge: { backgroundColor: '#DCFCE7' },
  inactiveBadge: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: 10, fontWeight: '600', color: '#1F2937' },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#fff', borderRadius: 12 },
  emptyStateTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
  emptyStateText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8 },
  benefitsSection: { backgroundColor: '#fff', margin: 16, padding: 20, borderRadius: 12 },
  benefitsTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  benefitText: { fontSize: 14, color: '#6B7280', flex: 1 },
});