// suba-frontend/src/services/geminiAIService.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

class GeminiAIService {
  constructor() {
    if (GEMINI_API_KEY && GEMINI_API_KEY !== 'your-api-key-here') {
      this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      // Use the correct model - gemini-1.5-pro or gemini-1.0-pro
      this.model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-pro' // or 'gemini-1.0-pro'
      });
      this.ready = true;
    } else {
      this.ready = false;
      this.model = null;
    }
  }

  isReady() {
    return this.ready && this.model !== null;
  }

  async generateSubscriptionInsights(subscriptions) {
    if (!this.isReady()) {
      return this.generateSmartFallbackInsights(subscriptions);
    }

    try {
      const subscriptionData = subscriptions.map(sub => ({
        name: sub.name,
        amount: sub.amount,
        currency: sub.currency || 'NGN',
        billing_cycle: sub.billing_cycle,
        category: sub.category || 'Uncategorized',
        next_billing_date: sub.next_billing_date,
      }));

      const prompt = `
        You are a financial advisor specializing in subscription management. 
        Analyze this user's subscription data and provide 3-5 actionable insights.
        
        Subscription Data:
        ${JSON.stringify(subscriptionData, null, 2)}
        
        Please provide insights in this exact JSON format:
        {
          "insights": [
            {
              "id": "unique-id-1",
              "type": "cost_saving_tip|overlap_detected|alert|suggestion",
              "message": "Clear, actionable insight here",
              "priority": "high|medium|low",
              "confidence_score": 0.85
            }
          ]
        }
        
        Focus on:
        1. Cost optimization opportunities
        2. Service overlaps or duplicates
        3. Spending patterns and trends
        4. Potential cancellations or downgrades
        5. Better alternatives
        
        Make insights specific, actionable, and personalized.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseAIResponse(text) || this.generateSmartFallbackInsights(subscriptions);
    } catch (err) {
      console.error('Gemini AI failed, returning fallback:', err);
      return this.generateSmartFallbackInsights(subscriptions);
    }
  }

  parseAIResponse(text) {
    try {
      // Clean the response and extract JSON
      const cleanText = text.replace(/```json|```/g, '').trim();
      const match = cleanText.match(/\{[\s\S]*\}/);
      if (!match) return null;
      
      const parsed = JSON.parse(match[0]);
      return parsed.insights || null;
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return null;
    }
  }

  // ENHANCED: Make fallback insights much smarter
  generateSmartFallbackInsights(subscriptions) {
    if (!subscriptions || subscriptions.length === 0) {
      return [{
        id: 'no-subscriptions',
        type: 'suggestion',
        message: 'Start by adding your first subscription to get personalized insights',
        priority: 'medium',
        confidence_score: 0.9,
      }];
    }

    const insights = [];
    const currency = subscriptions[0]?.currency || 'NGN';
    
    // Calculate comprehensive metrics
    const metrics = this.calculateSubscriptionMetrics(subscriptions);
    
    // Insight 1: Overall spending
    insights.push({
      id: 'fallback-spending',
      type: 'alert',
      message: `You're spending ${this.formatCurrency(metrics.totalMonthly, currency)} monthly across ${subscriptions.length} subscriptions`,
      priority: 'high',
      confidence_score: 0.95,
    });

    // Insight 2: Most expensive
    if (metrics.mostExpensive) {
      insights.push({
        id: 'fallback-expensive',
        type: 'cost_saving_tip',
        message: `${metrics.mostExpensive.name} is your most expensive subscription at ${this.formatCurrency(metrics.mostExpensive.amount, currency)} - consider if you're getting full value`,
        priority: 'high',
        confidence_score: 0.85,
      });
    }

    // Insight 3: Category optimization
    if (metrics.topCategory && metrics.categorySpending[metrics.topCategory] > metrics.totalMonthly * 0.4) {
      insights.push({
        id: 'fallback-category',
        type: 'suggestion',
        message: `${Math.round((metrics.categorySpending[metrics.topCategory] / metrics.totalMonthly) * 100)}% of your spending is on ${metrics.topCategory} - consider diversifying or finding bundle deals`,
        priority: 'medium',
        confidence_score: 0.8,
      });
    }

    // Insight 4: Upcoming renewals
    const upcomingRenewals = this.getUpcomingRenewals(subscriptions);
    if (upcomingRenewals.length > 0) {
      insights.push({
        id: 'fallback-renewals',
        type: 'alert',
        message: `${upcomingRenewals.length} subscription${upcomingRenewals.length > 1 ? 's' : ''} renewing soon - review before auto-renewal`,
        priority: 'medium',
        confidence_score: 0.9,
      });
    }

    // Insight 5: Potential savings
    if (metrics.expensiveSubscriptions.length > 0) {
      const potentialSavings = metrics.expensiveSubscriptions.reduce((sum, sub) => sum + Number(sub.amount), 0) * 0.3; // Assume 30% savings
      insights.push({
        id: 'fallback-savings',
        type: 'cost_saving_tip',
        message: `You could save ~${this.formatCurrency(potentialSavings, currency)} monthly by optimizing your ${metrics.expensiveSubscriptions.length} most expensive subscriptions`,
        priority: 'high',
        confidence_score: 0.75,
      });
    }

    return insights.slice(0, 5); // Limit to 5 insights
  }

  calculateSubscriptionMetrics(subscriptions) {
    const currency = subscriptions[0]?.currency || 'NGN';
    const expensiveThreshold = currency === 'NGN' ? 5000 : 20;
    
    let totalMonthly = 0;
    let totalYearly = 0;
    const categorySpending = {};
    let mostExpensive = null;

    subscriptions.forEach(sub => {
      let monthlyAmount = Number(sub.amount) || 0;
      
      // Convert to monthly equivalent
      if (sub.billing_cycle === 'yearly') monthlyAmount /= 12;
      if (sub.billing_cycle === 'weekly') monthlyAmount *= 4.33;
      if (sub.billing_cycle === 'daily') monthlyAmount *= 30;
      
      totalMonthly += monthlyAmount;
      totalYearly += monthlyAmount * 12;

      // Track category spending
      const category = sub.category || 'Uncategorized';
      categorySpending[category] = (categorySpending[category] || 0) + monthlyAmount;

      // Track most expensive
      if (!mostExpensive || Number(sub.amount) > Number(mostExpensive.amount)) {
        mostExpensive = sub;
      }
    });

    // Find expensive subscriptions
    const expensiveSubscriptions = subscriptions.filter(sub => 
      Number(sub.amount) > expensiveThreshold
    );

    // Find top category
    const topCategory = Object.keys(categorySpending).reduce((a, b) => 
      categorySpending[a] > categorySpending[b] ? a : b
    );

    return {
      totalMonthly,
      totalYearly,
      categorySpending,
      topCategory,
      mostExpensive,
      expensiveSubscriptions,
    };
  }

  getUpcomingRenewals(subscriptions) {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    return subscriptions.filter(sub => {
      if (!sub.next_billing_date) return false;
      const billingDate = new Date(sub.next_billing_date);
      return billingDate >= today && billingDate <= nextWeek;
    });
  }

  formatCurrency(amount, currency = 'NGN') {
    if (!amount) return currency === 'NGN' ? '₦0.00' : '$0.00';
    const formattedAmount = Number(amount).toFixed(2);
    return currency === 'NGN' ? `₦${formattedAmount}` : `$${formattedAmount}`;
  }
}

export const geminiAIService = new GeminiAIService();