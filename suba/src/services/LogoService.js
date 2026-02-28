// suba-frontend/src/services/LogoService.js
import { Image } from 'react-native';

// Import local logos
import NetflixLogo from "../assets/icons/Netflix.jpeg";
import SpotifyLogo from "../assets/icons/Spotify.jpeg";
import YouTubeLogo from "../assets/icons/YouTube.jpeg";
import AppleMusicLogo from "../assets/icons/Apple Music.jpeg";
import DSTVLogo from "../assets/icons/Assistant.jpeg";

export class LogoService {
  // Local logo mappings
  static localLogoMap = {
    'netflix': NetflixLogo,
    'spotify': SpotifyLogo,
    'youtube': YouTubeLogo,
    'youtube premium': YouTubeLogo,
    'apple music': AppleMusicLogo,
    'dstv': DSTVLogo,
    'gotv': DSTVLogo, // Fallback for similar services
    'startimes': DSTVLogo, // Fallback for similar services
  };

  // Common service mappings for popular subscription services
  static serviceMap = {
    // Streaming Services
    'netflix': { domain: 'netflix.com', category: 'Entertainment', localLogo: 'netflix' },
    'spotify': { domain: 'spotify.com', category: 'Music', localLogo: 'spotify' },
    'youtube premium': { domain: 'youtube.com', category: 'Entertainment', localLogo: 'youtube' },
    'youtube': { domain: 'youtube.com', category: 'Entertainment', localLogo: 'youtube' },
    'apple music': { domain: 'apple.com', category: 'Music', localLogo: 'apple music' },
    'apple tv': { domain: 'apple.com', category: 'Entertainment', localLogo: null },
    'disney+': { domain: 'disneyplus.com', category: 'Entertainment', localLogo: null },
    'amazon prime': { domain: 'amazon.com', category: 'Entertainment', localLogo: null },
    'hbo max': { domain: 'hbomax.com', category: 'Entertainment', localLogo: null },
    
    // Productivity & Software
    'microsoft 365': { domain: 'microsoft.com', category: 'Productivity', localLogo: null },
    'adobe creative cloud': { domain: 'adobe.com', category: 'Creative', localLogo: null },
    'figma': { domain: 'figma.com', category: 'Design', localLogo: null },
    'notion': { domain: 'notion.so', category: 'Productivity', localLogo: null },
    'slack': { domain: 'slack.com', category: 'Communication', localLogo: null },
    'zoom': { domain: 'zoom.us', category: 'Communication', localLogo: null },
    
    // Nigerian Services
    'dstv': { domain: 'dstv.com', category: 'Entertainment', localLogo: 'dstv' },
    'gotv': { domain: 'gotv.com', category: 'Entertainment', localLogo: 'dstv' },
    'startimes': { domain: 'startimes.com', category: 'Entertainment', localLogo: 'dstv' },
    'mtn': { domain: 'mtn.com', category: 'Telecom', localLogo: null },
    'airtel': { domain: 'airtel.com', category: 'Telecom', localLogo: null },
    'glo': { domain: 'glo.com', category: 'Telecom', localLogo: null },
    '9mobile': { domain: '9mobile.com.ng', category: 'Telecom', localLogo: null },
    
    // Banking & Financial
    'paystack': { domain: 'paystack.com', category: 'Finance', localLogo: null },
    'flutterwave': { domain: 'flutterwave.com', category: 'Finance', localLogo: null },
    'moniepoint': { domain: 'moniepoint.com', category: 'Finance', localLogo: null },
    
    // Utilities
    'ikeja electric': { domain: 'ikejaelectric.com', category: 'Utilities', localLogo: null },
    'eedc': { domain: 'enugudisco.com', category: 'Utilities', localLogo: null },
    'phed': { domain: 'phed.com.ng', category: 'Utilities', localLogo: null },
  };

  // Extract domain from subscription name
  static extractServiceInfo = (subscriptionName) => {
    const name = subscriptionName.toLowerCase().trim();
    
    // Check exact matches first
    if (this.serviceMap[name]) {
      return this.serviceMap[name];
    }
    
    // Check partial matches
    for (const [serviceName, serviceInfo] of Object.entries(this.serviceMap)) {
      if (name.includes(serviceName) || serviceName.includes(name)) {
        return serviceInfo;
      }
    }
    
    // Check common patterns
    if (name.includes('tv') || name.includes('television')) {
      return { domain: null, category: 'Entertainment', localLogo: null };
    }
    if (name.includes('music') || name.includes('audio')) {
      return { domain: null, category: 'Music', localLogo: null };
    }
    if (name.includes('cloud') || name.includes('storage')) {
      return { domain: null, category: 'Productivity', localLogo: null };
    }
    if (name.includes('bank') || name.includes('finance')) {
      return { domain: null, category: 'Finance', localLogo: null };
    }
    
    return { domain: null, category: 'Other', localLogo: null };
  };

  // Get local logo if available
  static getLocalLogo = (serviceInfo) => {
    if (!serviceInfo || !serviceInfo.localLogo) return null;
    return this.localLogoMap[serviceInfo.localLogo] || null;
  };

  // Generate logo URL using Clearbit API
  static getClearbitLogo = (domain) => {
    if (!domain) return null;
    return `https://logo.clearbit.com/${domain}?size=128`;
  };

  // Generate Google favicon as fallback
  static getGoogleFavicon = (domain) => {
    if (!domain) return null;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  };

  // Check if image URL exists
  static checkImageExists = (url) => {
    return new Promise((resolve) => {
      if (!url) {
        resolve(false);
        return;
      }
      
      Image.getSize(
        url,
        () => resolve(true),
        () => resolve(false)
      );
    });
  };

  // Get best available logo for a subscription
  static getLogoForSubscription = async (subscriptionName) => {
    try {
      const serviceInfo = this.extractServiceInfo(subscriptionName);
      
      // First priority: Local logo
      const localLogo = this.getLocalLogo(serviceInfo);
      if (localLogo) {
        return localLogo; // This is a local image resource
      }

      // Second priority: Clearbit (higher quality)
      if (serviceInfo.domain) {
        const clearbitUrl = this.getClearbitLogo(serviceInfo.domain);
        const clearbitExists = await this.checkImageExists(clearbitUrl);
        
        if (clearbitExists) {
          return { uri: clearbitUrl }; // Return as URI object
        }

        // Third priority: Google favicon
        const faviconUrl = this.getGoogleFavicon(serviceInfo.domain);
        const faviconExists = await this.checkImageExists(faviconUrl);
        
        if (faviconExists) {
          return { uri: faviconUrl }; // Return as URI object
        }
      }
      
      return null; // No logo found
      
    } catch (error) {
      console.error('Error fetching logo:', error);
      return null;
    }
  };

  // Get category for subscription name
  static getCategoryForSubscription = (subscriptionName) => {
    const serviceInfo = this.extractServiceInfo(subscriptionName);
    return serviceInfo.category;
  };

  // Get suggested category options based on subscription name
  static getSuggestedCategories = (subscriptionName) => {
    const serviceInfo = this.extractServiceInfo(subscriptionName);
    const baseCategories = [
      'Entertainment', 'Music', 'Productivity', 'Creative', 
      'Design', 'Communication', 'Finance', 'Utilities', 
      'Telecom', 'Health', 'Education', 'Shopping', 'Other'
    ];
    
    // Move the detected category to the top
    const categories = [...baseCategories];
    if (serviceInfo.category && categories.includes(serviceInfo.category)) {
      const index = categories.indexOf(serviceInfo.category);
      categories.splice(index, 1);
      categories.unshift(serviceInfo.category);
    }
    
    return categories;
  };
}

export default LogoService;