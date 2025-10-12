import { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged, 
  User,
  getIdToken
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { EXTENSION_CONFIG, debugLog, errorLog, successLog } from '../config/extension';

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface AuthState {
  user: FirebaseUser | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Sign in with Google via Dashboard
 * 
 * Opens your existing dashboard in a new tab, where the user authenticates
 * with Firebase. The dashboard then sends the auth data back to the extension.
 * 
 * Your dashboard's AuthContext.handleExtensionAuth() handles sending the message.
 */
export async function signInWithGoogle(): Promise<{ user: FirebaseUser; token: string }> {
  try {
    debugLog('Opening dashboard for authentication...', EXTENSION_CONFIG.DASHBOARD_URL);
    
    return new Promise((resolve, reject) => {
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
        debugLog('Auth tab created:', tabId);
        
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

          debugLog('Received message from dashboard:', message.type);
          
          if (message.type === 'EXTENSION_AUTH_SUCCESS' && !authCompleted) {
            authCompleted = true;
            successLog('Dashboard auth successful:', message.user?.email);
            
            // Clean up listener
            chrome.runtime.onMessage.removeListener(messageListener);
            
            // Close auth tab
            chrome.tabs.remove(tabId).catch((err) => {
              errorLog('Failed to close auth tab:', err);
            });
            
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
            const firebaseUser: FirebaseUser = {
              uid: message.user.uid,
              email: message.user.email,
              displayName: message.user.displayName,
              photoURL: message.user.photoURL
            };
            
            // Store in Chrome storage
            chrome.storage.local.set({
              firebaseToken: message.token,
              firebaseUser: firebaseUser,
              isAuthenticated: true,
              tokenTimestamp: Date.now() // Track when token was received
            }).then(() => {
              debugLog('Auth data stored in Chrome storage');
              resolve({ user: firebaseUser, token: message.token });
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
            debugLog('User cancelled authentication');
            
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
    
  } catch (error) {
    errorLog('Dashboard auth error:', error);
    throw error;
  }
}

// Sign out
export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
    await chrome.storage.local.remove(['firebaseToken', 'firebaseUser', 'isAuthenticated']);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

// Get current user
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

// Get stored token
export async function getStoredToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(['firebaseToken']);
  return result.firebaseToken || null;
}

// Get stored user
export async function getStoredUser(): Promise<FirebaseUser | null> {
  const result = await chrome.storage.local.get(['firebaseUser']);
  return result.firebaseUser || null;
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const result = await chrome.storage.local.get(['isAuthenticated', 'firebaseToken']);
  return result.isAuthenticated === true && !!result.firebaseToken;
}

// Get fresh token (refreshes if needed)
export async function getFreshToken(): Promise<string | null> {
  const user = getCurrentUser();
  if (user) {
    try {
      const token = await getIdToken(user, true); // Force refresh
      await chrome.storage.local.set({ firebaseToken: token });
      return token;
    } catch (error) {
      console.error('Error getting fresh token:', error);
      return null;
    }
  }
  return null;
}

// Listen to auth state changes (from storage, not Firebase directly)
export function onAuthStateChange(callback: (authState: AuthState) => void): () => void {
  // Set up storage change listener
  const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
    if (areaName === 'local') {
      // Check if auth-related storage changed
      if (changes.firebaseToken || changes.firebaseUser || changes.isAuthenticated) {
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
  const result = await chrome.storage.local.get(['firebaseToken', 'firebaseUser', 'isAuthenticated']);
  
  return {
    user: result.firebaseUser || null,
    token: result.firebaseToken || null,
    isAuthenticated: result.isAuthenticated === true && !!result.firebaseToken
  };
}
