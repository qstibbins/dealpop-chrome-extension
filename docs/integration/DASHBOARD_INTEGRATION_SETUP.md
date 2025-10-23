# Dashboard Integration Setup Guide

## Overview

Your Chrome extension uses your existing dashboard's Firebase authentication. The auth flow is already implemented in your dashboard's `AuthContext.tsx` with the `handleExtensionAuth()` function.

This guide will help you connect the two systems.

---

## Quick Setup Checklist

- [ ] **Step 1:** Update extension config with your dashboard URL
- [ ] **Step 2:** Get your extension ID
- [ ] **Step 3:** Add extension ID to your dashboard config  
- [ ] **Step 4:** Verify dashboard message format matches extension expectations
- [ ] **Step 5:** Test the complete auth flow
- [ ] **Step 6:** Deploy and validate

---

## Step 1: Update Extension Configuration

### 1.1 Configure Dashboard URL

Update `/Users/quinton/Desktop/srccode/deal-pop/chrome-extension/src/config/extension.ts`:

```typescript
export const EXTENSION_CONFIG = {
  DASHBOARD_URL: process.env.NODE_ENV === 'production'
    ? 'https://YOUR_PRODUCTION_DOMAIN.com/login?extension=true'  // <-- Update this
    : 'http://localhost:5173/login?extension=true',  // <-- Update port if different
  // ... rest of config
};
```

**Development:**
- If your dev server runs on a different port (e.g., 3000, 4000), update `localhost:5173`
- The `?extension=true` parameter is required to trigger extension auth flow

**Production:**
- Replace with your actual deployed dashboard URL
- Must include `?extension=true` parameter

---

## Step 2: Get Your Extension ID

### During Development (Unpacked Extension)

1. Build the extension:
   ```bash
   npm run build
   ```

2. Load extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top right)
   - Click **Load unpacked**
   - Select the `dist/` folder

3. Copy the Extension ID:
   - You'll see an ID like: `abcdefghijklmnopqrstuvwxyz123456`
   - This ID **changes each time you reload** the unpacked extension
   - Copy it for use in development

### After Publishing (Chrome Web Store)

1. After you publish to Chrome Web Store
2. The extension ID becomes permanent
3. Find it in your Chrome Web Store Developer Dashboard
4. Update your dashboard config with the permanent ID

---

## Step 3: Configure Your Dashboard

### 3.1 Add Extension ID to Dashboard Config

In your dashboard repository, update the extension ID:

**If you have an environment variable:**
```bash
# .env.local (for development)
VITE_EXTENSION_ID=abcdefghijklmnopqrstuvwxyz123456

# .env.production (for production - use permanent ID after publishing)
VITE_EXTENSION_ID=your-permanent-extension-id
```

**Or update directly in your config file:**
```typescript
// In your dashboard's config file
export const EXTENSION_ID = process.env.VITE_EXTENSION_ID || 'your-extension-id-here';
```

### 3.2 Verify Dashboard Auth Code

Your dashboard's `AuthContext.tsx` should have the `handleExtensionAuth()` function. Verify it sends the correct message format:

```typescript
// In your AuthContext.tsx (already implemented)
const handleExtensionAuth = async (user: User) => {
  const urlParams = new URLSearchParams(window.location.search);
  const isFromExtension = urlParams.get('extension') === 'true';
  
  if (isFromExtension && window.chrome?.runtime) {
    try {
      const token = await user.getIdToken();
      
      // Send to extension - THIS IS THE KEY MESSAGE
      chrome.runtime.sendMessage(
        EXTENSION_ID,  // Your extension ID from config
        {
          type: 'EXTENSION_AUTH_SUCCESS',  // Must be exactly this
          user: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          },
          token: token  // Firebase ID token
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Extension message error:', chrome.runtime.lastError);
          } else {
            console.log('Auth sent to extension successfully');
            // Optionally close the tab
            window.close();
          }
        }
      );
    } catch (error) {
      console.error('Extension auth error:', error);
      // Send error message
      chrome.runtime.sendMessage(
        EXTENSION_ID,
        {
          type: 'EXTENSION_AUTH_ERROR',
          error: error.message
        }
      );
    }
  }
};
```

**Important:** The message format must match exactly:
- `type: 'EXTENSION_AUTH_SUCCESS'` - exact string
- `user` object with: `uid`, `email`, `displayName`, `photoURL`
- `token` - Firebase ID token from `user.getIdToken()`

---

## Step 4: Test the Flow

### Local Testing (Development)

1. **Start your dashboard:**
   ```bash
   cd /path/to/your/dashboard
   npm run dev
   # Should start on http://localhost:5173 or similar
   ```

2. **Build and load extension:**
   ```bash
   cd /path/to/chrome-extension
   npm run build
   # Load unpacked extension from dist/ folder in Chrome
   ```

3. **Get extension ID:**
   - From `chrome://extensions/`
   - Copy the ID

4. **Update dashboard with extension ID:**
   - Add to `.env.local`: `VITE_EXTENSION_ID=<your-copied-id>`
   - Restart dashboard dev server

5. **Test authentication:**
   - Click extension icon in Chrome toolbar
   - Click "Sign in with Google"
   - Dashboard should open in new tab
   - Sign in with Google
   - Dashboard should send message to extension
   - Extension popup should show logged-in state
   - Dashboard tab should close automatically

### Debugging

**Open Chrome DevTools:**

1. **For Extension Popup:**
   - Right-click extension icon → Inspect popup
   - Check Console tab for logs

2. **For Dashboard:**
   - Open DevTools on dashboard tab (F12)
   - Check Console for messages

3. **For Background Script:**
   - Go to `chrome://extensions/`
   - Find your extension
   - Click "Inspect views: service worker"
   - Check Console

**Common Issues:**

| Issue | Cause | Solution |
|-------|-------|----------|
| "Failed to create auth tab" | Extension lacks tabs permission | Check `manifest.json` has `"tabs"` in permissions |
| Dashboard doesn't send message | Wrong extension ID | Verify extension ID matches in dashboard config |
| "Authentication timeout" | Dashboard not detecting extension param | Check URL has `?extension=true` |
| Message not received | Dashboard sends to wrong ID | Update dashboard with correct extension ID |
| Invalid auth data error | Message format mismatch | Verify dashboard sends correct message structure |

---

## Step 5: Verify Message Flow

### Test Checklist

Use this checklist to verify each step of the auth flow:

**Extension Side:**
- [ ] Extension opens dashboard URL with `?extension=true`
- [ ] Dashboard tab is created successfully
- [ ] Extension logs: "Opening dashboard for authentication..."
- [ ] Extension logs: "Auth tab created: [tab-id]"

**Dashboard Side:**
- [ ] Dashboard detects `?extension=true` parameter
- [ ] Dashboard shows appropriate UI for extension auth
- [ ] User can sign in with Google
- [ ] Dashboard logs: "Extension auth detected"
- [ ] Dashboard calls `handleExtensionAuth()`
- [ ] Dashboard sends message with `chrome.runtime.sendMessage()`
- [ ] Dashboard logs: "Auth sent to extension successfully"

**Extension Receipt:**
- [ ] Extension logs: "Received message from dashboard: EXTENSION_AUTH_SUCCESS"
- [ ] Extension logs: "Dashboard auth successful: [user-email]"
- [ ] Extension logs: "Auth data stored in Chrome storage"
- [ ] Extension popup updates to show logged-in state
- [ ] Dashboard tab closes automatically

---

## Step 6: Production Deployment

### Before Publishing to Chrome Web Store

1. **Update production dashboard URL:**
   ```typescript
   // src/config/extension.ts
   DASHBOARD_URL: process.env.NODE_ENV === 'production'
     ? 'https://app.dealpop.com/login?extension=true'  // Your actual domain
     : 'http://localhost:5173/login?extension=true',
   ```

2. **Build production version:**
   ```bash
   npm run build
   ```

3. **Test with production dashboard:**
   - Use your staging/production dashboard URL
   - Test complete flow before submitting

### After Publishing to Chrome Web Store

1. **Get permanent extension ID** from Chrome Web Store

2. **Update dashboard production config:**
   ```bash
   # .env.production
   VITE_EXTENSION_ID=your-permanent-extension-id-from-store
   ```

3. **Deploy dashboard update:**
   - Deploy with new extension ID
   - Test auth flow from published extension

4. **Verify:**
   - Install extension from Chrome Web Store
   - Test authentication flow
   - Verify tokens work with your API

---

## Troubleshooting

### Extension ID Issues

**Problem:** Dashboard can't send message to extension

**Debug Steps:**
1. Check extension ID in dashboard matches actual ID
2. In dashboard console, run: `chrome.runtime.sendMessage('EXTENSION_ID', {test: true})`
3. Check for errors in console

**Solution:**
- Verify extension ID is correct
- Make sure extension is installed and enabled
- Check no typos in ID

### Message Not Received

**Problem:** Extension doesn't receive auth success message

**Debug Steps:**
1. Check extension background script console
2. Look for message listener errors
3. Verify tab ID matches

**Solution:**
- Check message format exactly matches expected structure
- Verify `type` field is exactly 'EXTENSION_AUTH_SUCCESS'
- Ensure all required fields are present

### Authentication Timeout

**Problem:** Extension shows "Authentication timeout" error

**Possible Causes:**
1. Dashboard not detecting `?extension=true`
2. User didn't complete auth within 10 minutes
3. Dashboard error prevented message sending

**Solution:**
1. Check dashboard URL includes `?extension=true`
2. Check dashboard console for errors
3. Verify `handleExtensionAuth()` is being called

---

## Configuration Summary

### What You Need to Configure

**In Extension:**
- `src/config/extension.ts` → `DASHBOARD_URL`

**In Dashboard:**
- Extension ID (via environment variable or config)
- Verify `handleExtensionAuth()` function exists
- Verify message format matches extension expectations

**During Development:**
- Use unpacked extension ID
- Update dashboard `.env.local` with dev extension ID
- Remember: extension ID changes when you reload unpacked extension

**For Production:**
- Use permanent extension ID from Chrome Web Store
- Update dashboard production environment variable
- Deploy dashboard with production extension ID

---

## Next Steps

After completing auth setup:

1. ✅ Test product tracking with authenticated user
2. ✅ Verify API calls use Firebase token
3. ✅ Test token refresh (wait 1+ hour, make API call)
4. ✅ Test sign out functionality
5. ✅ Update `MVP_OUTSTANDING_TASKS.md` - mark auth tasks as complete

---

## Support & Resources

**Extension Files:**
- Config: `src/config/extension.ts`
- Auth Service: `src/services/firebaseAuth.ts`
- Firebase Config: `src/config/firebase.ts`
- API Client: `src/services/apiClient.ts`

**Dashboard Files** (in your dashboard repo):
- Auth Context: `src/contexts/AuthContext.tsx`
- Firebase Service: `src/services/firebase.ts`

**Documentation:**
- `FIREBASE_SETUP_GUIDE.md` - General Firebase setup
- `API_INTEGRATION_README.md` - API integration details
- `MVP_OUTSTANDING_TASKS.md` - Task tracking

---

## Testing Script

Use this to verify everything is working:

```javascript
// Run in extension background script console (chrome://extensions/ → Inspect service worker)

// 1. Check config
console.log('Dashboard URL:', EXTENSION_CONFIG.DASHBOARD_URL);

// 2. Check storage
chrome.storage.local.get(['firebaseToken', 'firebaseUser', 'isAuthenticated'], (result) => {
  console.log('Stored auth data:', result);
});

// 3. Test token
chrome.storage.local.get(['firebaseToken'], async (result) => {
  if (result.firebaseToken) {
    console.log('Token exists:', result.firebaseToken.substring(0, 20) + '...');
    // Test API call
    const response = await fetch('http://localhost:3000/health', {
      headers: {
        'Authorization': `Bearer ${result.firebaseToken}`
      }
    });
    console.log('API test:', response.status);
  }
});
```

```javascript
// Run in dashboard console when ?extension=true

// 1. Check extension detection
const urlParams = new URLSearchParams(window.location.search);
console.log('Extension param:', urlParams.get('extension'));

// 2. Check Chrome API available
console.log('Chrome runtime available:', !!window.chrome?.runtime);

// 3. Check extension ID
console.log('Extension ID configured:', EXTENSION_ID);

// 4. Test sending message
chrome.runtime.sendMessage(
  EXTENSION_ID,
  { type: 'TEST', message: 'Hello from dashboard' },
  (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error:', chrome.runtime.lastError);
    } else {
      console.log('Success:', response);
    }
  }
);
```

