/// <reference types="chrome"/>

import { State } from './state.js';
import { extractPrice } from './priceUtils.js';
import { getStoredToken, getFreshToken } from '../services/firebaseAuth.js';

// API Configuration
const API_BASE_URL = 'http://localhost:3000';

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
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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

    // Note: Login is now handled directly in the popup with Firebase
    // The background script no longer needs to handle login

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

    const response = await fetch(`${API_BASE_URL}/v1/products`, {
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
          const retryResponse = await fetch(`${API_BASE_URL}/v1/products`, {
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

 