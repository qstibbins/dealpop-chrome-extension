/// <reference types="chrome"/>

import { State } from './state.js';
import { extractPrice } from './priceUtils.js';
import { getStoredToken, getFreshToken } from '../services/firebaseAuth.js';
import { API_CONFIG } from '../config/api.js';

// Helper functions for data transformation
const extractVendor = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    // Simply use the domain name as vendor
    return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
  } catch {
    return "Unknown";
  }
};

const transformToApiFormat = (productInfo: any, priceGoal: number, trackingPeriod: number) => {
  const currentPrice = productInfo.price?.value 
    ? parseFloat(productInfo.price.value.replace(/[^0-9.]/g, ''))
    : 0;

  const vendor = extractVendor(productInfo.url);
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + trackingPeriod);

  return {
    productUrl: productInfo.url,
    productName: productInfo.title?.value || "Unknown Product",
    productImageUrl: productInfo.image?.value || productInfo.meta?.image || "",
    vendor: vendor,
    currentPrice: currentPrice,
    targetPrice: priceGoal,
    expiresAt: expiresAt.toISOString()
  };
};

export function registerMessageHandlers(state: State) {
  console.log('🚀 Registering message handlers...');

  // Listen for EXTERNAL messages (from dashboard website)
  chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
    console.log('🔥 EXTERNAL MESSAGE RECEIVED:', {
      type: msg.type,
      senderUrl: sender.url,
      senderTab: sender.tab?.id,
      hasUser: !!msg.user,
      hasToken: !!msg.token,
      fullMessage: msg
    });

    // Handle authentication from dashboard
    if (msg.type === 'EXTENSION_AUTH_SUCCESS') {
      console.log('🎯 Processing EXTENSION_AUTH_SUCCESS...');
      handleAuthSuccess(msg, sender, sendResponse);
      return true;
    }

    if (msg.type === 'EXTENSION_AUTH_ERROR') {
      console.error('❌ Auth error from dashboard:', msg.error);
      sendResponse({ success: false, error: msg.error });
      return true;
    }

    if (msg.type === 'EXTENSION_AUTH_CANCELLED') {
      console.log('⚠️ Auth cancelled by user');
      sendResponse({ success: false, cancelled: true });
      return true;
    }

    console.warn('⚠️ Unknown external message type:', msg.type);
    return false;
  });

  // Also listen for regular messages (in case dashboard is using wrong method)
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'EXTENSION_AUTH_SUCCESS' || 
        msg.type === 'EXTENSION_AUTH_ERROR' || 
        msg.type === 'EXTENSION_AUTH_CANCELLED') {
      console.log('🔥 REGULAR MESSAGE RECEIVED (auth):', {
        type: msg.type,
        senderUrl: sender.url,
        senderTab: sender.tab?.id,
        hasUser: !!msg.user,
        hasToken: !!msg.token,
        fullMessage: msg
      });
      
      if (msg.type === 'EXTENSION_AUTH_SUCCESS') {
        console.log('🎯 Processing EXTENSION_AUTH_SUCCESS via regular message...');
        handleAuthSuccess(msg, sender, sendResponse);
        return true;
      }
      
      if (msg.type === 'EXTENSION_AUTH_ERROR') {
        console.error('❌ Auth error from dashboard (regular):', msg.error);
        sendResponse({ success: false, error: msg.error });
        return true;
      }
      
      if (msg.type === 'EXTENSION_AUTH_CANCELLED') {
        console.log('⚠️ Auth cancelled by user (regular)');
        sendResponse({ success: false, cancelled: true });
        return true;
      }
    }
    
    // Handle other regular messages...
    if (msg.command === 'extractPrice') {
      extractPrice(msg.url, msg.selector)
        .then(price => sendResponse({ price }))
        .catch(err => sendResponse({ error: err.message }));
      return true;
    }

    if (msg.command === 'setToken') {
      state.token = msg.token;
      sendResponse({ status: 'ok' });
    }

    if (msg.command === 'trackProduct') {
      handleTrackProductWithFirebase(msg.productInfo, msg.priceGoal, msg.trackingPeriod)
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ error: err.message }));
      return true;
    }

    if (msg.type === 'GET_AUTH_STATUS') {
      handleGetAuthStatus(sendResponse);
      return true;
    }

    if (msg.type === 'SIGN_OUT') {
      handleSignOut(sendResponse);
      return true;
    }

    return false;
  });
}

async function handleTrackProductWithFirebase(productInfo: any, priceGoal: number, trackingPeriod: number) {
  try {
    // Get Firebase token
    let token = await getStoredToken();
    
    // If no token or token might be expired, try to get a fresh one
    if (!token) {
      token = await getFreshToken();
    }

    if (!token) {
      throw new Error("No Firebase authentication token available");
    }

    const requestBody = transformToApiFormat(productInfo, priceGoal, trackingPeriod);
    
    console.log('🚀 Background script sending product tracking request:', requestBody);

    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS.TRACK}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      // If unauthorized, try to refresh token and retry once
      if (response.status === 401) {
        const freshToken = await getFreshToken();
        if (freshToken) {
          const retryResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS.TRACK}`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${freshToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
          });

          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            console.log('✅ Background script received response after retry:', retryData);
            return { success: true, data: retryData };
          }
        }
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Background script received response:', data);
    
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Background script failed to track product:', error);
    throw error;
  }
}

// Handle successful authentication from dashboard
async function handleAuthSuccess(msg: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) {
  try {
    console.log('🔐 Processing auth from dashboard...');
    console.log('   User:', msg.user?.email);
    console.log('   Has token:', !!msg.token);
    console.log('   Sender tab:', sender.tab?.id);
    console.log('   Sender URL:', sender.tab?.url);
    console.log('   Full message:', msg);
    
    // Validate auth data - reject fake/empty auth
    if (!msg.user || !msg.token) {
      console.error('❌ Invalid auth data - missing user or token');
      sendResponse({ success: false, error: 'Invalid auth data' });
      return;
    }

    // Validate that we have real user data
    if (!msg.user.uid || !msg.user.email || !msg.token || msg.token.length < 10) {
      console.error('❌ Invalid auth data - user or token appears fake:', {
        hasUid: !!msg.user.uid,
        hasEmail: !!msg.user.email,
        tokenLength: msg.token?.length || 0
      });
      sendResponse({ success: false, error: 'Invalid auth data - appears to be fake' });
      return;
    }

    // Store user data and token in Chrome storage
    await chrome.storage.local.set({
      firebaseUser: msg.user,
      firebaseToken: msg.token,
      isAuthenticated: true,
      tokenTimestamp: Date.now()
    });

    console.log('✅ Auth data stored successfully in Chrome storage');

    // Don't close the tab immediately - let dashboard handle it
    // The dashboard will close itself after showing success message
    console.log('✅ Auth complete - dashboard will close itself');

    sendResponse({ success: true });
  } catch (error) {
    console.error('❌ Error handling auth success:', error);
    sendResponse({ success: false, error: (error as Error).message });
  }
}

// Get current authentication status
async function handleGetAuthStatus(sendResponse: (response: any) => void) {
  try {
    const result = await chrome.storage.local.get(['firebaseUser', 'firebaseToken', 'isAuthenticated']);
    
    if (result.isAuthenticated && result.firebaseUser && result.firebaseToken) {
      sendResponse({ 
        success: true, 
        isAuthenticated: true, 
        user: result.firebaseUser,
        token: result.firebaseToken
      });
    } else {
      sendResponse({ 
        success: true, 
        isAuthenticated: false 
      });
    }
  } catch (error) {
    console.error('❌ Error getting auth status:', error);
    sendResponse({ 
      success: false, 
      error: (error as Error).message 
    });
  }
}

// Handle sign out
async function handleSignOut(sendResponse: (response: any) => void) {
  try {
    await chrome.storage.local.remove(['firebaseUser', 'firebaseToken', 'isAuthenticated', 'tokenTimestamp']);
    console.log('✅ Signed out successfully');
    sendResponse({ success: true });
  } catch (error) {
    console.error('❌ Error signing out:', error);
    sendResponse({ success: false, error: (error as Error).message });
  }
}


 