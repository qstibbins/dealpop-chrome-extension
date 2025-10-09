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

// Sign in with Google via Dashboard (Chrome extension compatible)
export async function signInWithGoogle(): Promise<{ user: FirebaseUser; token: string }> {
  try {
    console.log('🔄 Opening dashboard for authentication...');
    
    // Open your existing dashboard login page
    const dashboardUrl = 'https://your-dashboard-domain.com/login?extension=true'; // Replace with your actual dashboard URL
    
    return new Promise((resolve, reject) => {
      // Create auth tab
      chrome.tabs.create({ url: dashboardUrl }, (tab) => {
        if (!tab.id) {
          reject(new Error('Failed to create auth tab'));
          return;
        }
        
        // Listen for messages from the dashboard
        const messageListener = (
          message: any,
          sender: chrome.runtime.MessageSender,
          sendResponse: (response?: any) => void
        ) => {
          if (sender.tab?.id === tab.id && message.type === 'EXTENSION_AUTH_SUCCESS') {
            console.log('✅ Dashboard auth successful:', message.user);
            
            // Clean up
            chrome.runtime.onMessage.removeListener(messageListener);
            chrome.tabs.remove(tab.id!);
            
            // Store the auth data
            const firebaseUser: FirebaseUser = {
              uid: message.user.uid,
              email: message.user.email,
              displayName: message.user.displayName,
              photoURL: message.user.photoURL
            };
            
            chrome.storage.local.set({
              firebaseToken: message.token,
              firebaseUser: firebaseUser,
              isAuthenticated: true
            }).then(() => {
              resolve({ user: firebaseUser, token: message.token });
            });
            
            sendResponse({ success: true });
          } else if (sender.tab?.id === tab.id && message.type === 'EXTENSION_AUTH_ERROR') {
            console.error('❌ Dashboard auth failed:', message.error);
            chrome.runtime.onMessage.removeListener(messageListener);
            chrome.tabs.remove(tab.id!);
            reject(new Error(message.error));
          }
        };
        
        chrome.runtime.onMessage.addListener(messageListener);
        
        // Timeout after 10 minutes
        setTimeout(() => {
          chrome.runtime.onMessage.removeListener(messageListener);
          if (tab.id) {
            chrome.tabs.remove(tab.id);
          }
          reject(new Error('Authentication timeout'));
        }, 600000);
      });
    });
    
  } catch (error) {
    console.error('❌ Dashboard auth error:', error);
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

// Listen to auth state changes
export function onAuthStateChange(callback: (authState: AuthState) => void): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const token = await getIdToken(user);
      const firebaseUser: FirebaseUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      };
      
      // Update storage
      await chrome.storage.local.set({
        firebaseToken: token,
        firebaseUser: firebaseUser,
        isAuthenticated: true
      });
      
      callback({
        user: firebaseUser,
        token,
        isAuthenticated: true
      });
    } else {
      // Clear storage
      await chrome.storage.local.remove(['firebaseToken', 'firebaseUser', 'isAuthenticated']);
      
      callback({
        user: null,
        token: null,
        isAuthenticated: false
      });
    }
  });
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
