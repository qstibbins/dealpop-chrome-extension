/// <reference types="chrome"/>

import { State } from './state.js';
import { extractPrice } from './priceUtils.js';

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
      if (!state.token) {
        sendResponse({ error: 'No authentication token found' });
        return true;
      }
      
      handleTrackProduct(msg.productInfo, msg.priceGoal, msg.trackingPeriod, state.token)
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ error: err.message }));
      return true;
    }

    if (msg.command === 'login') {
      handleLogin(msg.email, msg.password)
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ error: err.message }));
      return true;
    }

    return false;
  });
}

async function handleLogin(email: string, password: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.token) {
      // Store token in chrome storage
      await chrome.storage.local.set({ token: data.token });
      return { success: true, token: data.token };
    } else {
      throw new Error(data.message || "Login failed - no token received");
    }
  } catch (error) {
    console.error('❌ Login failed:', error);
    throw error;
  }
}

async function handleTrackProduct(productInfo: any, priceGoal: number, trackingPeriod: number, token: string) {
  try {
    if (!token) {
      throw new Error("No authentication token found");
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