import React, { useEffect, useState, useCallback, useContext } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BudgetCard from "../components/BudgetCard";
import SubscriptionCard from "../components/SubscriptionCard";
import SmartAssistantCard from "../components/SmartAssistantCard";
import SectionHeader from "../components/SectionHeader";
import ReminderCard from "../components/ReminderCard";
import { getSubscriptions } from "../features/subscriptions/subscriptionService";
import { AuthContext } from "../contexts/AuthContext";
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from "../config/api";

// NEW
import BudgetEditModal from "../components/BudgetEditModal";
import { getBudget, updateBudget } from "../services/budgetService";

export default function HomeScreen({ navigation }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [smartInsights, setSmartInsights] = useState([]);

  // NEW: budget state
  const [budget, setBudget] = useState(0);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);

  // Get user data from AuthContext
  const { user } = useContext(AuthContext);

  // Normalize stored user to a safe shape
  const getSafeUserData = () => {
    if (user && typeof user === "object") {
      const avatar =
        typeof user.avatar_url === "string"
          ? user.avatar_url
          : user.avatar_url && typeof user.avatar_url === "object" && typeof user.avatar_url.uri === "string"
          ? user.avatar_url.uri
          : null;

      return {
        full_name: user.full_name || "",
        email: user.email || "",
        avatar_url: avatar,
        default_currency: user.default_currency || "NGN",
      };
    }
    return {
      full_name: "",
      email: "",
      avatar_url: null,
      default_currency: "NGN",
    };
  };

  const safeUser = getSafeUserData();

  // Build absolute URL for server paths (/uploads/...)
  const stripApi = (url) => (url || "").replace(/\/api\/?$/, "");
  const buildAvatarUri = (val) => {
    if (!val) return null;
    if (/^https?:\/\//i.test(val)) return val;
    const baseHost = stripApi(API_URL || "");
    const normalized = val.startsWith("/") ? val : `/${val}`;
    return `${baseHost}${normalized}`;
  };

  // Generate smart insights based on real subscription data
  const generateSmartInsights = (subscriptions) => {
    const insights = [];
    const currency = safeUser.default_currency;

    if (subscriptions.length === 0) {
      return [
        {
          id: "welcome-insight",
          title: "👋 Welcome to Suba!",
          message: "Add your first subscription to start tracking and optimizing your recurring payments.",
          icon: "rocket-outline",
          priority: "medium",
          isAI: false,
        },
      ];
    }

    // Calculate metrics
    const totalMonthly = subscriptions.reduce((sum, sub) => {
      let multiplier = 1;
      if (sub.billing_cycle === "yearly") multiplier = 1 / 12;
      if (sub.billing_cycle === "weekly") multiplier = 4.33;
      return sum + (Number(sub.amount) || 0) * multiplier;
    }, 0);

    const totalYearly = totalMonthly * 12;

    // Insight 1: Total spending overview
    insights.push({
      id: "total-spending",
      title: "💰 Monthly Overview",
      message: `You're spending ${formatCurrency(totalMonthly, currency)} monthly (${formatCurrency(
        totalYearly,
        currency
      )} yearly) across ${subscriptions.length} subscriptions`,
      icon: "analytics-outline",
      priority: "medium",
      isAI: false,
    });

    // Insight 2: Most expensive subscription
    if (subscriptions.length > 0) {
      const mostExpensive = subscriptions.reduce((max, sub) => (Number(sub.amount) > Number(max.amount) ? sub : max));
      const expensiveRatio = totalMonthly > 0 ? (Number(mostExpensive.amount) / totalMonthly) * 100 : 0;

      let expensiveMessage = `${mostExpensive.name} is your most expensive at ${formatCurrency(
        mostExpensive.amount,
        currency
      )}`;
      if (expensiveRatio > 50) {
        expensiveMessage += ` - that's ${Math.round(expensiveRatio)}% of your total budget!`;
      }

      insights.push({
        id: "most-expensive",
        title: "🏆 Top Subscription",
        message: expensiveMessage,
        icon: "trending-up-outline",
        priority: "high",
        isAI: false,
        subscription: mostExpensive,
      });
    }

    // Insight 3: Upcoming renewals
    const upcomingRenewals = subscriptions.filter((sub) => {
      if (!sub.next_billing_date) return false;
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      const billingDate = new Date(sub.next_billing_date);
      return billingDate >= today && billingDate <= nextWeek;
    });

    if (upcomingRenewals.length > 0) {
      insights.push({
        id: "upcoming-renewals",
        title: "⏰ Renewals Due",
        message: `${upcomingRenewals.length} subscription${upcomingRenewals.length > 1 ? "s" : ""} renewing this week. Review before auto-renewal.`,
        icon: "calendar-outline",
        priority: "high",
        isAI: false,
      });
    }

    // Insight 4: Potential savings
    const expensiveThreshold = currency === "NGN" ? 5000 : 20;
    const expensiveSubs = subscriptions.filter((sub) => Number(sub.amount) > expensiveThreshold);

    if (expensiveSubs.length > 0) {
      const potentialSavings = expensiveSubs.reduce((sum, sub) => {
        const monthlyAmount = getMonthlyAmount(sub);
        return sum + monthlyAmount * 0.2; // Assume 20% savings potential
      }, 0);

      insights.push({
        id: "savings-opportunity",
        title: "💡 Savings Tip",
        message: `You could save ~${formatCurrency(potentialSavings, currency)}/month by optimizing your ${
          expensiveSubs.length
        } premium subscriptions`,
        icon: "cash-outline",
        priority: "medium",
        isAI: false,
      });
    }

    // Insight 5: Free trial detection
    const freeTrials = subscriptions.filter(
      (sub) => sub.name.toLowerCase().includes("trial") || Number(sub.amount) === 0
    );

    if (freeTrials.length > 0) {
      insights.push({
        id: "free-trials",
        title: "🎁 Active Trials",
        message: `You have ${freeTrials.length} free trial${freeTrials.length > 1 ? "s" : ""}. Remember to cancel before they convert to paid.`,
        icon: "gift-outline",
        priority: "high",
        isAI: false,
      });
    }

    return insights.slice(0, 3); // Show top 3 insights
  };

  // Helper function to format currency
  const formatCurrency = (amount, currency = "NGN") => {
    if (!amount) return currency === "NGN" ? "₦0.00" : "$0.00";
    const formattedAmount = Number(amount).toFixed(2);
    return currency === "NGN" ? `₦${formattedAmount}` : `$${formattedAmount}`;
  };

  // Helper function to get monthly amount
  const getMonthlyAmount = (subscription) => {
    let amount = Number(subscription.amount) || 0;
    if (subscription.billing_cycle === "yearly") amount /= 12;
    if (subscription.billing_cycle === "weekly") amount *= 4.33;
    return amount;
  };

  const loadSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSubscriptions();
      setSubscriptions(data || []);

      // Calculate total spent
      const sum = (data || []).reduce((acc, sub) => acc + (Number(sub.amount) || 0), 0);
      setTotalSpent(sum);

      // Generate smart insights
      const insights = generateSmartInsights(data || []);
      setSmartInsights(insights);

      // Find upcoming payments (within next 7 days)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      nextWeek.setHours(23, 59, 59, 999);

      const upcoming = (data || []).filter((sub) => {
        if (!sub.next_billing_date) return false;

        try {
          const billingDate = new Date(sub.next_billing_date);
          billingDate.setHours(12, 0, 0, 0);
          return billingDate >= today && billingDate <= nextWeek;
        } catch (error) {
          console.error("Error parsing date:", sub.next_billing_date);
          return false;
        }
      });

      setUpcomingPayments(upcoming);
    } catch (error) {
      console.error("Error loading subscriptions:", error);
      Alert.alert("Error", "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }, [safeUser.default_currency]);

  // NEW: load budget
  const loadBudget = useCallback(async () => {
    try {
      const res = await getBudget();
      setBudget(Number(res?.budget || 0));
    } catch (e) {
      console.warn('Failed to load budget', e?.response?.data || e?.message);
      setBudget(0);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadSubscriptions(), loadBudget()]);
    setRefreshing(false);
  }, [loadSubscriptions, loadBudget]);

  useEffect(() => {
    loadSubscriptions();
    loadBudget();

    const unsubscribe = navigation.addListener("focus", () => {
      loadSubscriptions();
      loadBudget();
    });

    return unsubscribe;
  }, [navigation, loadSubscriptions, loadBudget]);

  // Handle insight actions
  const handleInsightAction = (insight) => {
    if (insight.subscription) {
      navigation.navigate("SubscriptionDetails", { subscription: insight.subscription });
    } else if (insight.id === "upcoming-renewals") {
      navigation.navigate("UpcomingPayments");
    } else if (insight.id === "savings-opportunity") {
      navigation.navigate("Subscriptions", { filter: "expensive" });
    } else if (insight.id === "free-trials") {
      navigation.navigate("Subscriptions");
    } else {
      Alert.alert(insight.title, insight.message);
    }
  };

  // Handle dismiss insight
  const handleDismissInsight = (insightId) => {
    setSmartInsights((prev) => prev.filter((insight) => insight.id !== insightId));
  };

  // Get user's first name or default to "User"
  const getUserFirstName = () => {
    return safeUser.full_name.split(" ")[0] || "User";
  };

  // Get greeting based on time of day
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Avatar element for header (always returns a React element)
  const getUserAvatar = () => {
    const uri = buildAvatarUri(safeUser.avatar_url);

    if (uri) {
      return <Image source={{ uri }} style={styles.avatarImage} />;
    }

    if (safeUser.full_name) {
      const initials = safeUser.full_name
        .split(" ")
        .map((name) => name[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      return (
        <View style={styles.avatarInitials}>
          <Text style={styles.avatarInitialsText}>{initials}</Text>
        </View>
      );
    }

    return (
      <View style={styles.avatarInitials}>
        <Ionicons name="person" size={20} color="#4B5FFF" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Enhanced Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>
              {getTimeBasedGreeting()}, {getUserFirstName()} 👋
            </Text>
            <Text style={styles.subText}>
              {subscriptions.length > 0
                ? `You have ${subscriptions.length} active subscription${subscriptions.length !== 1 ? "s" : ""}`
                : "Welcome to your subscription manager"}
            </Text>

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <View style={styles.statItem}>
                <Ionicons name="wallet-outline" size={16} color="#4B5FFF" />
                <Text style={styles.statText}>
                  {subscriptions.length} sub{subscriptions.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="calendar-outline" size={16} color="#10B981" />
                <Text style={styles.statText}>{upcomingPayments.length} due soon</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate("Profile")} style={styles.avatarContainer}>
            {getUserAvatar()}
          </TouchableOpacity>
        </View>

        {/* Budget Overview */}
        <BudgetCard
          total={totalSpent}
          budget={budget}
          currency={safeUser.default_currency}
          onEdit={() => setBudgetModalVisible(true)}
        />

        {/* Upcoming Payments Section (only real data) */}
        {upcomingPayments.length > 0 && (
          <>
            <SectionHeader title="Upcoming Payments" actionLabel="View All" onAction={() => navigation.navigate("UpcomingPayments")} />

            {upcomingPayments.slice(0, 2).map((sub) => (
              <ReminderCard
                key={sub.id}
                logo_url={sub.logo_url}
                logo={sub.logo}
                name={sub.name}
                price={sub.amount}
                currency={sub.currency}
                dueDate={sub.next_billing_date}
                billingCycle={sub.billing_cycle}
                category={sub.category}
                subscriptionId={sub.id}
                onSkip={() => console.log("Skipped payment")}
                onPayNow={() => console.log("Pay now clicked")}
                navigation={navigation}
                onStatusUpdate={loadSubscriptions}
              />
            ))}
          </>
        )}

        {/* Smart Assistant Section */}
        {smartInsights.length > 0 && (
          <>
            <SectionHeader title="Smart Assistant" actionLabel="See all" onAction={() => navigation.navigate("Insights")} />
            {smartInsights.map((insight) => (
              <SmartAssistantCard
                key={insight.id}
                title={insight.title}
                message={insight.message}
                icon={insight.icon}
                onDetails={() => handleInsightAction(insight)}
                onDismiss={() => handleDismissInsight(insight.id)}
                isAI={insight.isAI || false}
                priority={insight.priority}
              />
            ))}
          </>
        )}

        {/* Subscriptions */}
        <SectionHeader title="Your Subscriptions" actionLabel="All" onAction={() => navigation.navigate("Subscriptions")} />
        {subscriptions.length > 0 ? (
          subscriptions.slice(0, 3).map((sub) => (
            <SubscriptionCard key={sub.id} subscription={sub} onPress={() => navigation.navigate("SubscriptionDetails", { subscription: sub })} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#CCD0D5" />
            <Text style={styles.emptyStateText}>No subscriptions yet</Text>
            <Text style={styles.emptyStateSubtext}>Add your first subscription to get started</Text>
          </View>
        )}

        {/* Add Subscription */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddSubscription", { refreshSubscriptions: loadSubscriptions })}
        >
          <Ionicons name="add-circle" size={20} color="#4B5FFF" />
          <Text style={styles.addButtonText}>Add subscription</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* NEW: Budget edit modal */}
      <BudgetEditModal
        visible={budgetModalVisible}
        onClose={() => setBudgetModalVisible(false)}
        initialBudget={budget}
        currency={safeUser.default_currency}
        onSave={async (newBudget) => {
          try {
            const res = await updateBudget(newBudget);
            setBudget(Number(res?.budget ?? newBudget));
            setBudgetModalVisible(false);
          } catch (e) {
            Alert.alert('Error', e?.response?.data?.error || 'Failed to update budget');
          }
        }}
      />
    </SafeAreaView>
  );
}

// ... keep all your existing styles exactly the same
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerContent: {
    flex: 1,
    marginRight: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 4,
  },
  subText: {
    color: "#6B7280",
    fontSize: 14,
    marginBottom: 12,
  },
  quickStats: {
    flexDirection: "row",
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarInitials: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#4B5FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitialsText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  addButton: {
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    color: "#4B5FFF",
    fontWeight: "600",
    fontSize: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
});