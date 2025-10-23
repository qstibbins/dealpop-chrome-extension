# Firebase Integration Setup Guide

This guide will help you complete the Firebase integration for your DealPop Chrome extension.

## 🔧 Required Setup Steps

### 1. Firebase Console Configuration

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: `deal-pop`
3. **Enable Authentication**:
   - Go to Authentication > Sign-in method
   - Enable "Google" as a sign-in provider
   - Add your domain to authorized domains if needed

### 2. Get Firebase Web SDK Configuration

1. **Go to Project Settings**:
   - Click the gear icon → Project settings
   - Scroll down to "Your apps" section
   - Click "Add app" → Web app (</>) if you haven't already
   - Register your app with a nickname (e.g., "DealPop Extension")

2. **Copy Configuration**:
   - Copy the `firebaseConfig` object
   - Replace the placeholder values in `src/config/firebase.ts`

### 3. Update Dashboard URL

Edit `src/services/firebaseAuth.ts` and update the dashboard URL (line 31):

```typescript
// Replace this with your actual dashboard URL
const dashboardUrl = 'https://your-dashboard-domain.com/login?extension=true';
```

The `?extension=true` parameter tells your dashboard to send auth data back to the extension.

### 4. Update API Configuration

Edit `src/config/api.ts` and update the production URL:

```typescript
export const API_CONFIG = {
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://your-actual-api-domain.com'  // Replace with your production API URL
    : 'http://localhost:3000',
  // ... rest of config
};
```

### 5. Configure Dashboard Messaging

Your dashboard needs to send a message back to the extension after successful authentication:

```javascript
// In your dashboard after Firebase auth success
chrome.runtime.sendMessage(EXTENSION_ID, {
  type: 'EXTENSION_AUTH_SUCCESS',
  user: {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL
  },
  token: await user.getIdToken()
});
```

### 6. Update Manifest CSP (if needed)

If you're using a different API domain, update the `content_security_policy` in `manifest.json`:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' https://www.gstatic.com https://apis.google.com https://accounts.google.com; object-src 'self'; connect-src 'self' https://*.googleapis.com https://accounts.google.com https://deal-pop.firebaseapp.com http://localhost:3000 https://your-actual-api-domain.com"
  }
}
```

## 🚀 How It Works

### Authentication Flow (Dashboard-Based)

1. **User clicks "Sign in with Google"** in the extension popup
2. **Extension opens your dashboard** in a new Chrome tab
3. **Dashboard handles Firebase Google OAuth** (standard web flow)
4. **User signs in with Google** and grants permissions on the dashboard
5. **Dashboard sends auth success message** to extension via Chrome messaging API
6. **Extension receives user info and ID token** from the dashboard
7. **Extension stores token** in Chrome storage and closes the dashboard tab
8. **Token is used for API calls** to your backend

**Why this approach?**
- Chrome extensions have limitations with Firebase popup authentication
- Dashboard provides a more reliable and familiar OAuth experience
- Consistent authentication across your extension and web application
- Better error handling and user feedback

### API Communication

1. **Extension makes API calls** using the Firebase ID token
2. **Backend verifies the token** using Firebase Admin SDK
3. **Backend processes the request** and returns response
4. **Token auto-refreshes** when needed

### Token Management

- **Automatic refresh**: Firebase handles token refresh automatically
- **Storage**: Tokens stored in Chrome's local storage
- **Security**: Tokens are scoped to your Firebase project
- **Expiration**: Tokens expire after 1 hour and auto-refresh

## 🔒 Security Features

### Content Security Policy
- Restricts script sources to trusted domains
- Allows connections to Firebase and Google APIs
- Prevents XSS attacks

### Token Validation
- Backend validates Firebase ID tokens
- Tokens are project-specific
- Automatic token refresh prevents expiration issues

### Permissions
- Extension only requests necessary permissions
- Firebase handles OAuth securely
- No sensitive data stored in extension

## 🧪 Testing

### Development Testing
1. **Build the extension**: `npm run build`
2. **Load in Chrome**: Go to `chrome://extensions/` → Load unpacked
3. **Test authentication**: Click the extension icon and sign in
4. **Test product tracking**: Navigate to a product page and track it

### Production Testing
1. **Update API URLs** to production endpoints
2. **Test with real Firebase project**
3. **Verify backend token validation**
4. **Test on different websites**

## 🐛 Troubleshooting

### Common Issues

**"Failed to create auth tab"**
- Chrome couldn't open the dashboard tab
- Check if tabs permission is granted in manifest.json
- Verify dashboard URL is correct

**"Authentication timeout"**
- User didn't complete auth within 10 minutes
- Dashboard tab was closed before auth completed
- This is normal if user cancels the flow

**"No authentication token available"**
- User not signed in
- Token expired and refresh failed
- Check Firebase configuration

**"HTTP error! status: 401"**
- Token invalid or expired
- Backend not properly configured for Firebase
- Check backend Firebase Admin SDK setup

**CSP errors in console**
- Update manifest.json CSP for your domains
- Ensure all required domains are whitelisted

### Debug Steps

1. **Check browser console** for error messages
2. **Verify Firebase config** matches your project
3. **Test API endpoints** directly with Postman
4. **Check backend logs** for token validation errors
5. **Verify Chrome extension permissions**

## 📋 Checklist

- [ ] Firebase project created and configured
- [ ] Google authentication enabled in Firebase
- [ ] Firebase Web SDK config added to extension
- [ ] API configuration updated with production URLs
- [ ] Manifest CSP updated for your domains
- [ ] Backend configured to validate Firebase tokens
- [ ] Extension tested in development
- [ ] Extension tested in production

## 🔄 Migration from Old Auth

The extension now uses Firebase authentication instead of the old email/password system:

- **Old**: Email/password login through background script
- **New**: Dashboard-based Google OAuth through Firebase
- **Benefits**: More secure, better UX, automatic token management, consistent with web app

The old authentication code has been removed and replaced with Firebase integration.

## 📝 Dashboard Requirements

Your dashboard must:
1. Have Firebase Web SDK initialized
2. Implement Google sign-in
3. Detect `?extension=true` URL parameter
4. Send auth success message to extension via `chrome.runtime.sendMessage()`
5. Handle the extension's tab close after successful auth

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all configuration steps are completed
3. Test with a fresh Chrome profile
4. Check Firebase Console for authentication logs
5. Review backend logs for API errors

## 🎉 Next Steps

Once Firebase integration is complete:

1. **Deploy your backend** with Firebase Admin SDK
2. **Test the full flow** end-to-end
3. **Monitor authentication** in Firebase Console
4. **Set up error tracking** for production issues
5. **Consider adding more auth providers** (Facebook, Twitter, etc.)
