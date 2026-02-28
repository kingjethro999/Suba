// suba-frontend/src/components/SmartAssistantCard.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SmartAssistantCard({ 
  title, 
  message, 
  icon, 
  onDetails, 
  onDismiss, 
  isAI = false, 
  confidence = null,
  priority = 'medium'
}) {
  // Get icon and color based on priority
  const getPriorityIcon = () => {
    switch (priority) {
      case 'high':
        return { icon: 'warning', color: '#EF4444' };
      case 'medium':
        return { icon: 'information-circle', color: '#F59E0B' };
      case 'low':
        return { icon: 'checkmark-circle', color: '#10B981' };
      default:
        return { icon: 'information-circle', color: '#6B7280' };
    }
  };

  // Get background color based on AI status and priority
  const getCardStyle = () => {
    if (isAI) {
      return [styles.card, styles.aiCard];
    }
    
    switch (priority) {
      case 'high':
        return [styles.card, styles.highPriorityCard];
      case 'medium':
        return [styles.card, styles.mediumPriorityCard];
      case 'low':
        return [styles.card, styles.lowPriorityCard];
      default:
        return [styles.card];
    }
  };

  // Get icon container style based on AI status and priority
  const getIconContainerStyle = () => {
    if (isAI) {
      return [styles.iconContainer, styles.aiIconContainer];
    }
    
    switch (priority) {
      case 'high':
        return [styles.iconContainer, styles.highPriorityIcon];
      case 'medium':
        return [styles.iconContainer, styles.mediumPriorityIcon];
      case 'low':
        return [styles.iconContainer, styles.lowPriorityIcon];
      default:
        return [styles.iconContainer];
    }
  };

  const priorityInfo = getPriorityIcon();
  const cardStyle = getCardStyle();
  const iconContainerStyle = getIconContainerStyle();

  return (
    <View style={cardStyle}>
      {/* Header Row with Icon, Title, and Priority */}
      <View style={styles.headerRow}>
        <View style={iconContainerStyle}>
          <Ionicons 
            name={icon || "analytics-outline"} 
            size={18} 
            color="#fff" 
          />
        </View>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.subtitleContainer}>
            {isAI && (
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={12} color="#fff" />
                <Text style={styles.aiBadgeText}>AI</Text>
              </View>
            )}
            <View style={styles.priorityBadge}>
              <Ionicons 
                name={priorityInfo.icon} 
                size={12} 
                color={priorityInfo.color} 
              />
              <Text style={[styles.priorityText, { color: priorityInfo.color }]}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Confidence Score for AI Insights */}
      {isAI && confidence !== null && (
        <View style={styles.confidenceContainer}>
          <View style={styles.confidenceBar}>
            <View 
              style={[
                styles.confidenceFill, 
                { width: `${confidence * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.confidenceText}>
            Confidence: {Math.round(confidence * 100)}%
          </Text>
        </View>
      )}

      {/* Insight Message */}
      <Text style={styles.message}>{message}</Text>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[
            styles.detailsBtn, 
            isAI ? styles.aiDetailsBtn : styles.localDetailsBtn
          ]} 
          onPress={onDetails}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={isAI ? "sparkles" : "information-circle"} 
            size={16} 
            color={isAI ? "#4B5FFF" : "#6B7280"} 
          />
          <Text style={[
            styles.detailsText,
            isAI ? styles.aiDetailsText : styles.localDetailsText
          ]}>
            {isAI ? 'AI Details' : 'View Details'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.dismissBtn} 
          onPress={onDismiss}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="close" 
            size={18} 
            color={isAI ? "#9CA3AF" : "#6B7280"} 
          />
        </TouchableOpacity>
      </View>

      {/* Footer with Source Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {isAI ? 'AI Analysis' : 'Smart Analysis'} • Just now
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#E5E7EB',
  },
  aiCard: {
    borderLeftColor: '#4B5FFF',
    backgroundColor: '#F8FAFF',
  },
  highPriorityCard: {
    borderLeftColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  mediumPriorityCard: {
    borderLeftColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  lowPriorityCard: {
    borderLeftColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aiIconContainer: {
    backgroundColor: '#4B5FFF',
  },
  highPriorityIcon: {
    backgroundColor: '#EF4444',
  },
  mediumPriorityIcon: {
    backgroundColor: '#F59E0B',
  },
  lowPriorityIcon: {
    backgroundColor: '#10B981',
  },
  titleContainer: {
    flex: 1,
  },
  title: { 
    fontWeight: '700', 
    fontSize: 16, 
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4B5FFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  confidenceContainer: {
    marginBottom: 12,
  },
  confidenceBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  confidenceText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  message: { 
    color: '#4B5563', 
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  buttonRow: { 
    flexDirection: 'row', 
    gap: 12,
    marginBottom: 8,
  },
  detailsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  aiDetailsBtn: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#4B5FFF',
  },
  localDetailsBtn: {
    backgroundColor: '#F3F4F6',
  },
  detailsText: {
    fontWeight: '600',
    fontSize: 14,
  },
  aiDetailsText: {
    color: '#4B5FFF',
  },
  localDetailsText: {
    color: '#6B7280',
  },
  dismissBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});