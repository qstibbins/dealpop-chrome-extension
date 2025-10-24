// Simple token-based authentication without Firebase
// This service handles authentication by communicating with the dashboard
import { EXTENSION_CONFIG, debugLog, errorLog, successLog } from '../config/extension';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Sign in via Dashboard - Opens dashboard for authentication
 * Dashboard sends back auth data via chrome.runtime.sendMessage
 */
export async function signInWithGoogle(): Promise<{ user: AuthUser; token: string }> {
  try {
    console.log('🔍 Dashboard URL being opened:', EXTENSION_CONFIG.DASHBOARD_URL);
    
    return new Promise((resolve, reject) => {
      // Get the current active tab before creating auth tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const originalTab = tabs[0];
        const originalTabId = originalTab?.id;
        
        // Store original tab ID in Chrome storage for background script to use
        chrome.storage.local.set({ originalTabId: originalTabId });
        
        // Create auth tab
        chrome.tabs.create({ url: EXTENSION_CONFIG.DASHBOARD_URL }, (tab) => {
        if (!tab || !tab.id) {
          const error: AuthError = {
            code: 'TAB_CREATION_FAILED',
            message: 'Failed to create authentication tab'
          };
          errorLog('Failed to create auth tab');
          reject(error);
          return;
        }

        const tabId = tab.id;
        
        // Track if auth is complete to prevent double-handling
        let authCompleted = false;
        
        // Listen for messages from the dashboard
        const messageListener = (
          message: any,
          sender: chrome.runtime.MessageSender,
          sendResponse: (response?: any) => void
        ) => {
          // Only handle messages from our auth tab
          if (sender.tab?.id !== tabId) {
            return;
          }
          
          if (message.type === 'EXTENSION_AUTH_SUCCESS' && !authCompleted) {
            authCompleted = true;
            successLog('Dashboard auth successful:', message.user?.email);
            
            // Clean up listener
            chrome.runtime.onMessage.removeListener(messageListener);
            
            // Validate message data
            if (!message.user || !message.token) {
              const error: AuthError = {
                code: 'INVALID_AUTH_DATA',
                message: 'Dashboard sent invalid auth data',
                details: message
              };
              errorLog('Invalid auth data received from dashboard');
              reject(error);
              return;
            }
            
            // Store the auth data
            const authUser: AuthUser = {
              uid: message.user.uid,
              email: message.user.email,
              displayName: message.user.displayName,
              photoURL: message.user.photoURL
            };
            
            // Store in Chrome storage
            chrome.storage.local.set({
              authToken: message.token,
              authUser: authUser,
              isAuthenticated: true,
              tokenTimestamp: Date.now() // Track when token was received
            }).then(() => {
              resolve({ user: authUser, token: message.token });
            }).catch((err) => {
              const error: AuthError = {
                code: 'STORAGE_ERROR',
                message: 'Failed to store auth data',
                details: err
              };
              errorLog('Storage error:', err);
              reject(error);
            });
            
            // Send acknowledgment
            sendResponse({ success: true });
            
          } else if (message.type === 'EXTENSION_AUTH_ERROR' && !authCompleted) {
            authCompleted = true;
            errorLog('Dashboard auth failed:', message.error);
            
            // Clean up
            chrome.runtime.onMessage.removeListener(messageListener);
            chrome.tabs.remove(tabId).catch((err) => {
              errorLog('Failed to close auth tab:', err);
            });
            
            const error: AuthError = {
              code: 'DASHBOARD_AUTH_ERROR',
              message: message.error || 'Authentication failed on dashboard',
              details: message
            };
            reject(error);
            
            // Send acknowledgment
            sendResponse({ success: false, error: message.error });
          } else if (message.type === 'EXTENSION_AUTH_CANCELLED' && !authCompleted) {
            authCompleted = true;
            
            // Clean up
            chrome.runtime.onMessage.removeListener(messageListener);
            chrome.tabs.remove(tabId).catch((err) => {
              errorLog('Failed to close auth tab:', err);
            });
            
            const error: AuthError = {
              code: 'USER_CANCELLED',
              message: 'User cancelled authentication'
            };
            reject(error);
            
            // Send acknowledgment
            sendResponse({ success: false, error: 'cancelled' });
          }
          
          return true; // Keep channel open for async response
        };
        
        chrome.runtime.onMessage.addListener(messageListener);
        
        // Set up timeout
        const timeoutId = setTimeout(() => {
          if (!authCompleted) {
            errorLog('Authentication timeout');
            chrome.runtime.onMessage.removeListener(messageListener);
            
            // Check if tab still exists before trying to close it
            chrome.tabs.get(tabId, (tab) => {
              if (!chrome.runtime.lastError && tab) {
                chrome.tabs.remove(tabId);
              }
            });
            
            const error: AuthError = {
              code: 'TIMEOUT',
              message: `Authentication timeout after ${EXTENSION_CONFIG.AUTH_TIMEOUT / 1000} seconds`
            };
            reject(error);
          }
        }, EXTENSION_CONFIG.AUTH_TIMEOUT);
        
        // Clean up timeout if auth completes
        chrome.runtime.onMessage.addListener((message) => {
          if (message.type === 'EXTENSION_AUTH_SUCCESS' || 
              message.type === 'EXTENSION_AUTH_ERROR' ||
              message.type === 'EXTENSION_AUTH_CANCELLED') {
            clearTimeout(timeoutId);
          }
        });
      });
    });
  });
    
  } catch (error) {
    errorLog('Dashboard auth error:', error);
    throw error;
  }
}

// Sign out
export async function signOutUser(): Promise<void> {
  try {
    // Clear extension's auth state
    await chrome.storage.local.remove(['authToken', 'authUser', 'isAuthenticated', 'tokenTimestamp']);
    
    successLog('Extension logout completed successfully');
    
  } catch (error) {
    errorLog('Sign out error:', error);
    throw error;
  }
}

// Clear all auth data (useful for debugging/troubleshooting)
export async function clearAllAuthData(): Promise<void> {
  try {
    // Clear all auth-related storage
    await chrome.storage.local.remove([
      'authToken', 
      'authUser', 
      'isAuthenticated', 
      'tokenTimestamp',
      'authState',
      'userData'
    ]);
    
    successLog('Authentication data cleared successfully');
    
  } catch (error) {
    errorLog('Clear auth data error:', error);
    throw error;
  }
}

// Get stored token
export async function getStoredToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(['authToken']);
  console.log('🔍 getStoredToken result:', result);
  return result.authToken || null;
}

// Get fresh token (for compatibility with existing code)
export async function getFreshToken(): Promise<string | null> {
  // For now, just return the stored token
  // In the future, you could implement token refresh logic here
  return await getStoredToken();
}

// Get stored user
export async function getStoredUser(): Promise<AuthUser | null> {
  const result = await chrome.storage.local.get(['authUser']);
  return result.authUser || null;
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const result = await chrome.storage.local.get(['isAuthenticated', 'authToken']);
  return result.isAuthenticated === true && !!result.authToken;
}


// Listen to auth state changes (from storage, not Firebase directly)
export function onAuthStateChange(callback: (authState: AuthState) => void): () => void {
  // Set up storage change listener
  const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
    if (areaName === 'local') {
      // Check if auth-related storage changed
      if (changes.authToken || changes.authUser || changes.isAuthenticated) {
        // Re-read auth state and notify callback
        initializeAuthState().then(callback);
      }
    }
  };

  chrome.storage.onChanged.addListener(storageListener);

  // Return cleanup function
  return () => {
    chrome.storage.onChanged.removeListener(storageListener);
  };
}

// Initialize auth state from storage
export async function initializeAuthState(): Promise<AuthState> {
  const result = await chrome.storage.local.get(['authToken', 'authUser', 'isAuthenticated']);
  
  return {
    user: result.authUser || null,
    token: result.authToken || null,
    isAuthenticated: result.isAuthenticated === true && !!result.authToken
  };
}

// Compatibility exports for existing code
export type FirebaseUser = AuthUser;
