I'll analyze the authentication setup in your frontend application so you can replicate it in the Chrome extension. Let me examine the auth-related files to understand the current implementation.

[4 tools called]

Now let me check the auth adapter and mock services to understand the complete authentication flow:

[3 tools called]

Now let me check how the extension popup handles authentication:

[3 tools called]

Perfect! Now I have a complete understanding of how authentication is set up in your frontend application. Let me explain the authentication architecture and how you can replicate it in your Chrome extension.

## Authentication Architecture Overview

Your frontend uses a **layered authentication system** with Firebase Auth as the primary provider and a fallback mock system. Here's how it's structured:

### 1. **Core Authentication Layers**

**Firebase Service (`src/services/firebase.ts`)**
- Primary authentication provider using Firebase Auth
- Supports Google, Facebook, and email/password authentication
- Handles token management and user state

**Auth Adapter (`src/services/authAdapter.ts`)**
- Abstraction layer that switches between Firebase and mock auth
- Automatically detects Firebase availability
- Provides consistent API regardless of backend

**Mock Auth Service (`src/services/mockAuthService.ts`)**
- Fallback authentication for development/demo
- Simulates real auth behavior with realistic user objects

### 2. **React Integration**

**Auth Context (`src/contexts/AuthContext.tsx`)**
- React Context Provider for global auth state
- Manages user state and loading states
- **Extension Integration**: Handles communication with Chrome extension via `handleExtensionAuth()`

**Protected Routes (`src/auth/ProtectedRoute.tsx`)**
- Route guards that redirect unauthenticated users
- Shows loading states during auth checks

### 3. **Chrome Extension Integration**

Your extension already has a sophisticated auth flow:

**Background Script (`chrome-extension/background.js`)**
- Handles auth messages from the web app
- Stores user data and tokens in Chrome storage
- Manages token expiration validation
- Opens dashboard for authentication

**Popup (`chrome-extension/popup.js` & `popup.html`)**
- Checks auth status on startup
- Redirects to web dashboard for login
- Displays user info when authenticated

## How to Set Up the Same Auth in Chrome Extension

### **Current Extension Auth Flow (Already Implemented!)**

Your Chrome extension already implements the same authentication pattern:

1. **User clicks "Sign in" in extension popup**
2. **Extension opens web dashboard** with `?extension=true` parameter
3. **User authenticates on web dashboard** using Firebase Auth
4. **Web app detects extension context** and sends auth data back via `chrome.runtime.sendMessage()`
5. **Extension stores auth data** in Chrome storage
6. **Extension validates tokens** and manages session state

### **Key Components Already in Place:**

```javascript
// Background script handles auth success from web app
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXTENSION_AUTH_SUCCESS') {
    // Store user data and token
    chrome.storage.local.set({
      user: request.user,
      token: request.token,
      isAuthenticated: true
    });
  }
});
```

```javascript
// Web app detects extension and sends auth data
const handleExtensionAuth = async (user) => {
  const urlParams = new URLSearchParams(window.location.search);
  const isFromExtension = urlParams.get('extension') === 'true';
  
  if (isFromExtension && window.chrome?.runtime) {
    const token = await user.getIdToken();
    chrome.runtime.sendMessage({
      type: 'EXTENSION_AUTH_SUCCESS',
      user: { uid, email, displayName, photoURL },
      token: token
    });
  }
};
```

### **What You Need to Complete:**

1. **Environment Variables**: Set up the same Firebase config in your extension
2. **Token Refresh**: Implement token refresh logic
3. **API Integration**: Use stored tokens for API calls

### **Firebase Configuration for Extension**

Create a `config.js` file in your extension:

```javascript
// chrome-extension/config.js
const FIREBASE_CONFIG = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  // ... other config
};

// Dashboard URL (update this to your deployed URL)
const DASHBOARD_URL = "https://your-domain.com/login?extension=true";
```

### **API Integration Pattern**

Your extension should use the stored Firebase token for API calls:

```javascript
// chrome-extension/api.js
async function makeAuthenticatedRequest(endpoint, options = {}) {
  const { token } = await chrome.storage.local.get(['token']);
  
  return fetch(endpoint, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
}
```

## Summary

**Your authentication is already properly set up!** The extension follows the same pattern as your web app:

- ✅ **Unified Firebase Auth**: Same Firebase project and tokens
- ✅ **Secure Token Storage**: Chrome storage with expiration validation  
- ✅ **Seamless UX**: Opens web dashboard for authentication
- ✅ **State Management**: Proper auth state tracking
- ✅ **Error Handling**: Comprehensive error management

The only missing pieces are:
1. **Firebase config constants** (environment variables)
2. **API integration** using stored tokens
3. **Token refresh logic** (optional but recommended)

Your extension architecture perfectly mirrors your web app's auth system - it's a solid, production-ready implementation!