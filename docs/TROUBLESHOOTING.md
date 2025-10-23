# Chrome Extension Troubleshooting Guide

## Common Issues and Solutions

This guide covers the most common issues encountered during Chrome Extension development, deployment, and usage, based on real-world experience with the DealPop extension.

## Build and Development Issues

### 1. Extension Won't Build

**Symptoms:**
- `npm run build` fails with errors
- TypeScript compilation errors
- Missing dependencies

**Solutions:**
```bash
# Check for TypeScript errors
npm run type-check

# Clean and reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Clean build directory and rebuild
npm run clean
npm run build
```

**Common Causes:**
- TypeScript errors in source code
- Missing or outdated dependencies
- Corrupted node_modules

### 2. Content Script Not Loading

**Symptoms:**
- Extension loads but doesn't extract product data
- No console logs from content script
- Product extraction fails

**Solutions:**
1. **Check Build Output:**
   ```bash
   # Verify content script was built
   ls -la dist/content.js
   ```

2. **Check Manifest Configuration:**
   ```json
   // manifest.json should have:
   "content_scripts": [
     {
       "matches": ["<all_urls>"],
       "js": ["content.js"],
       "run_at": "document_idle"
     }
   ]
   ```

3. **Debug in Chrome DevTools:**
   - Open any webpage
   - Press F12 to open DevTools
   - Check Console tab for content script errors
   - Look for `content.js` in Sources tab

4. **Reload Extension:**
   - Go to `chrome://extensions/`
   - Click reload button on your extension

### 3. Popup Not Showing or Blank

**Symptoms:**
- Clicking extension icon shows blank popup
- Popup doesn't open at all
- React app not loading

**Solutions:**
1. **Check HTML Path:**
   ```bash
   # Verify popup HTML exists
   ls -la dist/src/popup/index.html
   ```

2. **Check Manifest Configuration:**
   ```json
   // manifest.json should have:
   "action": {
     "default_popup": "src/popup/index.html"
   }
   ```

3. **Debug Popup:**
   - Right-click extension icon
   - Select "Inspect popup"
   - Check Console tab for errors
   - Look for script loading errors

4. **Check Build Output:**
   ```bash
   # Verify popup bundle was created
   ls -la dist/popup.js
   ```

### 4. Background Script Errors

**Symptoms:**
- Extension doesn't respond to messages
- API calls fail
- Authentication doesn't work

**Solutions:**
1. **Debug Background Script:**
   - Go to `chrome://extensions/`
   - Find your extension
   - Click "Inspect views: service worker"
   - Check Console tab for errors

2. **Check Service Worker Registration:**
   ```json
   // manifest.json should have:
   "background": {
     "service_worker": "background.js",
     "type": "module"
   }
   ```

3. **Verify Background Script Exists:**
   ```bash
   ls -la dist/background.js
   ```

## Chrome Web Store Compliance Issues

### 1. Manifest V3 Requirements

**Common Violations:**
- Using Manifest V2 syntax
- Missing required fields
- Incorrect permissions

**Solutions:**
```json
{
  "manifest_version": 3,
  "name": "DealPop Tracker",
  "version": "1.0.0",
  "description": "Track product prices and get notified when they drop",
  "permissions": ["activeTab", "scripting", "storage", "tabs"],
  "host_permissions": [
    "https://deal-pop.firebaseapp.com/*",
    "https://*.googleapis.com/*",
    "https://accounts.google.com/*"
  ]
}
```

### 2. Content Security Policy (CSP) Issues

**Common Violations:**
- Inline scripts in HTML
- Unsafe eval() usage
- Remote code execution

**Solutions:**
1. **Remove Inline Scripts:**
   ```html
   <!-- ❌ Bad -->
   <script>console.log('inline script');</script>
   
   <!-- ✅ Good -->
   <script src="popup.js"></script>
   ```

2. **Configure CSP in Manifest:**
   ```json
   "content_security_policy": {
     "extension_pages": "script-src 'self'; object-src 'self'"
   }
   ```

3. **No Remote Code:**
   - All code must be bundled in extension
   - No dynamic script loading
   - No eval() or similar functions

### 3. Permission Issues

**Common Problems:**
- Requesting unnecessary permissions
- Missing required permissions
- Incorrect permission syntax

**Solutions:**
```json
{
  "permissions": [
    "activeTab",    // Access current tab
    "scripting",    // Inject content scripts
    "storage",      // Store data locally
    "tabs"          // Manage tabs
  ],
  "host_permissions": [
    "https://deal-pop.firebaseapp.com/*",  // Firebase
    "https://*.googleapis.com/*",          // Google APIs
    "https://accounts.google.com/*"        // Google Auth
  ]
}
```

## Authentication Issues

### 1. Dashboard Not Sending Auth Message

**Symptoms:**
- User signs in on dashboard but extension doesn't receive auth
- Extension shows "Not signed in" after dashboard auth
- Auth tab doesn't close automatically

**Solutions:**
1. **Check Extension ID:**
   ```bash
   # Get extension ID after loading
   # Go to chrome://extensions/
   # Copy the ID and add to dashboard config
   ```

2. **Verify Dashboard Configuration:**
   ```javascript
   // Dashboard must have extension ID in externally_connectable
   "externally_connectable": {
     "matches": [
       "chrome-extension://YOUR_EXTENSION_ID/*"
     ]
   }
   ```

3. **Check Message Format:**
   ```javascript
   // Dashboard must send this exact message format:
   chrome.runtime.sendMessage(extensionId, {
     type: 'EXTENSION_AUTH_SUCCESS',
     user: userData,
     token: firebaseToken
   });
   ```

4. **Debug Message Passing:**
   - Check browser console for message errors
   - Verify extension ID matches
   - Check if dashboard is using correct messaging API

### 2. Token Not Being Stored

**Symptoms:**
- Auth succeeds but token not saved
- API calls fail with 401 errors
- User has to sign in repeatedly

**Solutions:**
1. **Check Chrome Storage:**
   ```javascript
   // Debug storage in background script
   chrome.storage.local.get(null, (items) => {
     console.log('Storage contents:', items);
   });
   ```

2. **Verify Storage Permissions:**
   ```json
   // manifest.json must include storage permission
   "permissions": ["storage"]
   ```

3. **Check Token Format:**
   ```javascript
   // Token should be a valid Firebase JWT
   if (token && token.length > 100) {
     // Token looks valid
   } else {
     console.error('Invalid token format');
   }
   ```

### 3. API Calls Failing with 401

**Symptoms:**
- Extension can't communicate with backend
- All API calls return 401 Unauthorized
- Token refresh not working

**Solutions:**
1. **Check Token in Request:**
   ```javascript
   // Verify token is included in headers
   const headers = {
     'Authorization': `Bearer ${token}`,
     'Content-Type': 'application/json'
   };
   ```

2. **Verify Backend CORS:**
   - Backend must allow extension origins
   - Check CORS configuration in backend
   - Verify preflight requests are handled

3. **Test Token Validity:**
   ```javascript
   // Test token with backend health endpoint
   fetch(`${API_BASE_URL}/health`, {
     headers: { 'Authorization': `Bearer ${token}` }
   });
   ```

## Data Extraction Issues

### 1. Product Data Not Extracted

**Symptoms:**
- Extension shows "No product found"
- Price/title extraction fails
- Image not detected

**Solutions:**
1. **Check Content Script Injection:**
   - Verify content script is running on page
   - Check console for extraction errors
   - Test on different retailer sites

2. **Update Selectors:**
   ```javascript
   // Amazon price selectors (example)
   const amazonSelectors = [
     '.a-price-whole',
     '.a-price .a-offscreen',
     '[data-a-color="price"] .a-offscreen'
   ];
   ```

3. **Test Extraction Manually:**
   ```javascript
   // Test in browser console
   document.querySelector('.a-price-whole')?.textContent
   ```

### 2. Variant Detection Failures

**Symptoms:**
- Extension doesn't detect product variants
- Wrong variant information extracted
- Variant selection not working

**Solutions:**
1. **Check Variant Selectors:**
   ```javascript
   // Test variant detection
   const selectedElements = document.querySelectorAll('[aria-selected="true"]');
   console.log('Selected variants:', selectedElements);
   ```

2. **Update Variant Logic:**
   - Check `src/content/content.ts` for variant detection
   - Add new selectors for different retailers
   - Test on products with variants

3. **Debug Variant Extraction:**
   ```javascript
   // Enable debug logging
   if (EXTENSION_CONFIG.DEBUG) {
     console.log('Variant info:', variantInfo);
   }
   ```

### 3. Dynamic Content Issues

**Symptoms:**
- Product data loads after extension runs
- Price updates not detected
- SPA navigation issues

**Solutions:**
1. **Wait for Content Load:**
   ```javascript
   // Wait for dynamic content
   const waitForElement = (selector) => {
     return new Promise((resolve) => {
       const element = document.querySelector(selector);
       if (element) {
         resolve(element);
       } else {
         setTimeout(() => waitForElement(selector), 100);
       }
     });
   };
   ```

2. **Use MutationObserver:**
   ```javascript
   // Watch for DOM changes
   const observer = new MutationObserver((mutations) => {
     // Check for new product data
   });
   observer.observe(document.body, { childList: true, subtree: true });
   ```

## Integration Issues

### 1. Backend API Not Reachable

**Symptoms:**
- Extension can't connect to backend
- Network errors in console
- CORS errors

**Solutions:**
1. **Check API URL Configuration:**
   ```typescript
   // Verify API URL in config
   const API_BASE_URL = 'https://bzu99jbwnr.us-east-2.awsapprunner.com';
   ```

2. **Test API Connectivity:**
   ```bash
   # Test API health endpoint
   curl https://bzu99jbwnr.us-east-2.awsapprunner.com/health
   ```

3. **Check CORS Configuration:**
   - Backend must allow extension origins
   - Verify preflight requests
   - Check browser network tab for CORS errors

### 2. Dashboard Integration Issues

**Symptoms:**
- Extension can't open dashboard
- Dashboard doesn't recognize extension
- Auth flow doesn't work

**Solutions:**
1. **Check Dashboard URL:**
   ```typescript
   // Verify dashboard URL in config
   const DASHBOARD_URL = 'https://d13kgequzx7lkd.cloudfront.net/beta/login?extension=true';
   ```

2. **Verify Extension ID:**
   - Get extension ID from Chrome Extensions page
   - Add to dashboard's externally_connectable
   - Update dashboard configuration

3. **Test Dashboard Accessibility:**
   ```bash
   # Test dashboard URL
   curl -I https://d13kgequzx7lkd.cloudfront.net/beta/login?extension=true
   ```

## Performance Issues

### 1. Extension Slow to Load

**Symptoms:**
- Extension takes long time to start
- Popup opens slowly
- Content script injection delayed

**Solutions:**
1. **Optimize Bundle Size:**
   ```bash
   # Check bundle sizes
   ls -la dist/*.js
   ```

2. **Reduce Dependencies:**
   - Remove unused imports
   - Use dynamic imports for large libraries
   - Optimize React bundle

3. **Improve Content Script:**
   - Minimize DOM queries
   - Use efficient selectors
   - Avoid blocking operations

### 2. Memory Leaks

**Symptoms:**
- Extension memory usage grows over time
- Browser becomes slow
- Extension crashes

**Solutions:**
1. **Clean Up Event Listeners:**
   ```javascript
   // Remove listeners when done
   chrome.runtime.onMessage.removeListener(messageListener);
   ```

2. **Clear Intervals/Timeouts:**
   ```javascript
   // Clear timers
   clearInterval(intervalId);
   clearTimeout(timeoutId);
   ```

3. **Monitor Memory Usage:**
   - Use Chrome Task Manager
   - Check extension memory usage
   - Profile with Chrome DevTools

## Deployment Issues

### 1. Chrome Web Store Rejection

**Common Rejection Reasons:**
- Manifest V3 compliance issues
- CSP violations
- Permission misuse
- Privacy policy missing

**Solutions:**
1. **Review Store Policies:**
   - Read Chrome Web Store policies
   - Check manifest compliance
   - Verify all permissions are necessary

2. **Test Before Submission:**
   - Load extension in Chrome
   - Test all functionality
   - Check for console errors
   - Verify CSP compliance

3. **Prepare Required Assets:**
   - Extension icons (16x16, 48x48, 128x128)
   - Screenshots (1280x800 or 640x400)
   - Privacy policy
   - Store description

### 2. Extension Not Updating

**Symptoms:**
- Users don't receive updates
- Old version still running
- Update mechanism not working

**Solutions:**
1. **Increment Version:**
   ```json
   // Update version in manifest.json
   "version": "1.0.1"
   ```

2. **Test Update Process:**
   - Submit new version to store
   - Wait for review and approval
   - Test auto-update mechanism

3. **Monitor Update Status:**
   - Check Chrome Web Store dashboard
   - Monitor user feedback
   - Track update adoption

## Debugging Tools and Techniques

### 1. Chrome DevTools
- **Popup Debugging**: Right-click extension icon → "Inspect popup"
- **Content Script**: Open DevTools on any webpage
- **Background Script**: chrome://extensions/ → "Inspect views: service worker"

### 2. Console Logging
```javascript
// Use consistent logging format
console.log('🔍 Debug info:', data);
console.error('❌ Error:', error);
console.log('✅ Success:', result);
```

### 3. Network Monitoring
- Monitor API calls in Network tab
- Check request/response headers
- Verify CORS configuration
- Monitor response times

### 4. Storage Inspection
```javascript
// Check Chrome storage
chrome.storage.local.get(null, (items) => {
  console.log('Storage contents:', items);
});
```

## Getting Help

### 1. Check Documentation
- [Chrome Extension Developer Guide](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration](https://developer.chrome.com/docs/extensions/migrating/)
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/)

### 2. Community Resources
- [Chrome Extensions Google Group](https://groups.google.com/a/chromium.org/forum/#!forum/chromium-extensions)
- [Stack Overflow - Chrome Extensions](https://stackoverflow.com/questions/tagged/google-chrome-extension)

### 3. Debugging Checklist
- [ ] Check browser console for errors
- [ ] Verify extension loads without errors
- [ ] Test on different websites
- [ ] Check network connectivity
- [ ] Verify configuration settings
- [ ] Test with fresh Chrome profile
- [ ] Check Chrome Extensions page for errors

---

*This troubleshooting guide covers the most common issues encountered with the DealPop Chrome Extension. For additional help, see the other documentation files or contact the development team.*
