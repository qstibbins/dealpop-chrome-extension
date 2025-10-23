# Chrome Extension Developer Setup Guide

## Prerequisites

### Required Software
- **Node.js 18+**: [Download from nodejs.org](https://nodejs.org/)
- **npm**: Comes with Node.js
- **Chrome Browser**: Latest version recommended
- **Git**: For version control

### Required Accounts
- **Google Account**: For Chrome Web Store (future deployment)
- **Firebase Account**: For authentication
- **AWS Account**: For backend services (if testing integration)

## Quick Start

### 1. Clone and Install
```bash
# Clone the repository
git clone <repository-url>
cd chrome-extension

# Install dependencies
npm install
```

### 2. Environment Configuration
Create a `.env` file in the project root:
```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3000
VITE_DASHBOARD_URL=http://localhost:5173/beta/login?extension=true

# Debug Mode
VITE_EXTENSION_DEBUG=true
```

### 3. Build and Load Extension
```bash
# Build the extension
npm run build

# Load in Chrome:
# 1. Go to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the 'dist/' folder
```

## Development Workflow

### 1. Watch Mode Development
```bash
# Start watch mode for auto-rebuild
npm run build:watch

# Make changes to source files
# Extension automatically rebuilds
# Reload extension in Chrome Extensions page
```

### 2. Development Commands
```bash
# Development build with source maps
npm run build

# Production build (minified)
npm run build:prod

# Type checking only
npm run type-check

# Run tests
npm test

# Clean build directory
npm run clean
```

### 3. Testing Workflow
1. **Make Code Changes**: Edit files in `src/`
2. **Auto-rebuild**: Watch mode rebuilds automatically
3. **Reload Extension**: Click reload in Chrome Extensions page
4. **Test Changes**: Test functionality in browser
5. **Debug**: Use Chrome DevTools for debugging

## Project Structure

```
chrome-extension/
├── src/                    # Source code
│   ├── background/         # Service worker
│   │   ├── index.ts       # Main background script
│   │   ├── messageHandlers.ts # Message handling
│   │   ├── priceUtils.ts  # Price processing
│   │   └── state.ts       # State management
│   ├── content/           # Content script
│   │   └── content.ts     # Product extraction
│   ├── popup/             # User interface
│   │   ├── App.tsx        # Main React component
│   │   ├── index.html     # HTML template
│   │   ├── index.css      # Global styles
│   │   └── main.tsx       # React entry point
│   ├── services/          # Business logic
│   │   ├── apiClient.ts   # API communication
│   │   └── auth.ts        # Authentication
│   └── config/            # Configuration
│       ├── api.ts         # API endpoints
│       ├── extension.ts   # Extension settings
│       └── firebase.ts    # Firebase config
├── dist/                  # Built extension (generated)
├── docs/                  # Documentation
├── tests/                 # Test files
├── manifest.json          # Extension manifest
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Build configuration
└── tailwind.config.js     # Tailwind CSS configuration
```

## Configuration Files

### 1. Environment Variables (.env)
```bash
# Development Configuration
VITE_API_BASE_URL=http://localhost:3000
VITE_DASHBOARD_URL=http://localhost:5173/beta/login?extension=true
VITE_EXTENSION_DEBUG=true

# Production Configuration (example)
# VITE_API_BASE_URL=https://bzu99jbwnr.us-east-2.awsapprunner.com
# VITE_DASHBOARD_URL=https://d13kgequzx7lkd.cloudfront.net/beta/login?extension=true
# VITE_EXTENSION_DEBUG=false
```

### 2. API Configuration (src/config/api.ts)
```typescript
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 
    (import.meta.env.MODE === 'production' 
      ? 'https://bzu99jbwnr.us-east-2.awsapprunner.com' 
      : 'http://localhost:3000'),
  
  ENDPOINTS: {
    PRODUCTS: {
      TRACK: '/api/products',
      LIST: '/api/products',
      UPDATE: (id: string) => `/api/products/${id}`,
      DELETE: (id: string) => `/api/products/${id}`,
    }
  }
};
```

### 3. Extension Configuration (src/config/extension.ts)
```typescript
export const EXTENSION_CONFIG = {
  DASHBOARD_URL: import.meta.env.VITE_DASHBOARD_URL || 
    (import.meta.env.MODE === 'production' 
      ? 'https://d13kgequzx7lkd.cloudfront.net/beta/login?extension=true'
      : 'http://localhost:5173/beta/login?extension=true'),
  
  AUTH_TIMEOUT: 600000, // 10 minutes
  TOKEN_REFRESH_BUFFER: 300000, // 5 minutes
  DEBUG: import.meta.env.VITE_EXTENSION_DEBUG === 'true'
};
```

## Local Development Setup

### 1. Backend API Setup
```bash
# Clone and start backend API
cd ../backend-api
npm install
npm run dev
# Backend runs on http://localhost:3000
```

### 2. Frontend Dashboard Setup
```bash
# Clone and start frontend dashboard
cd ../dealpop-frontend
npm install
npm run dev
# Dashboard runs on http://localhost:5173
```

### 3. Extension Development
```bash
# In chrome-extension directory
npm run build:watch

# Load extension in Chrome
# Test integration with local services
```

## Testing

### 1. Unit Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### 2. Manual Testing
```bash
# Test extension functionality
npm run test:extraction

# Test on different sites
npm run test:sites
```

### 3. Integration Testing
1. **Start all services**: Backend, Dashboard, Extension
2. **Test authentication**: Sign in flow
3. **Test product tracking**: Track products on various sites
4. **Test API communication**: Verify data flow
5. **Test error handling**: Network failures, invalid data

## Debugging

### 1. Chrome DevTools
- **Popup Debugging**: Right-click extension icon → "Inspect popup"
- **Content Script**: Open DevTools on any webpage
- **Background Script**: Go to chrome://extensions/ → "Inspect views: service worker"

### 2. Console Logging
```typescript
// Debug logging (only in development)
if (EXTENSION_CONFIG.DEBUG) {
  console.log('🔍 Debug info:', data);
}

// Error logging
console.error('❌ Error:', error);

// Success logging
console.log('✅ Success:', result);
```

### 3. Network Debugging
- **API Calls**: Monitor in Network tab
- **CORS Issues**: Check console for CORS errors
- **Authentication**: Verify token in request headers

### 4. Storage Debugging
```typescript
// Check Chrome storage
chrome.storage.local.get(null, (items) => {
  console.log('Storage contents:', items);
});
```

## Common Development Issues

### 1. Build Issues
**Problem**: Extension doesn't build
```bash
# Check for TypeScript errors
npm run type-check

# Clean and rebuild
npm run clean
npm run build
```

**Problem**: Content script not loading
- Check `dist/content.js` exists
- Verify `manifest.json` has content_scripts entry
- Check for JavaScript errors in console

### 2. Authentication Issues
**Problem**: Can't sign in
- Verify dashboard is running on correct port
- Check `VITE_DASHBOARD_URL` in .env
- Ensure Firebase configuration is correct

**Problem**: API calls fail with 401
- Check if backend is running
- Verify `VITE_API_BASE_URL` in .env
- Check Firebase token in Chrome storage

### 3. Product Extraction Issues
**Problem**: Can't extract product data
- Check if content script is injecting
- Verify selectors in `src/content/content.ts`
- Test on different retailer sites

### 4. Hot Reload Issues
**Problem**: Changes not reflecting
- Use `npm run build:watch` for auto-rebuild
- Manually reload extension in Chrome Extensions page
- Check for build errors in terminal

## Development Best Practices

### 1. Code Organization
- **Separation of Concerns**: Keep UI, business logic, and API calls separate
- **Type Safety**: Use TypeScript interfaces for all data structures
- **Error Handling**: Always handle errors gracefully
- **Logging**: Use consistent logging format

### 2. Testing
- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test API communication
- **Manual Testing**: Test on real websites
- **Cross-browser**: Test on different Chrome versions

### 3. Performance
- **Bundle Size**: Monitor extension size
- **Memory Usage**: Avoid memory leaks
- **API Calls**: Minimize unnecessary requests
- **Content Script**: Optimize DOM queries

### 4. Security
- **No Remote Code**: All code must be bundled
- **Input Validation**: Validate all user inputs
- **Token Security**: Never log tokens
- **CSP Compliance**: Follow Content Security Policy

## Deployment Preparation

### 1. Production Build
```bash
# Create production build
npm run build:prod

# Verify build output
ls -la dist/
```

### 2. Chrome Web Store Preparation
```bash
# Create zip file for submission
cd dist
zip -r ../deal-pop-extension.zip .
cd ..

# Verify zip contents
unzip -l deal-pop-extension.zip
```

### 3. Pre-deployment Checklist
- [ ] All tests pass
- [ ] Production build successful
- [ ] No console errors
- [ ] Extension loads without issues
- [ ] Authentication flow works
- [ ] Product tracking works
- [ ] API communication works
- [ ] Error handling works

## Troubleshooting

### 1. Extension Won't Load
- Check `manifest.json` syntax
- Verify all required files exist in `dist/`
- Check Chrome Extensions page for errors
- Try loading in incognito mode

### 2. Content Script Issues
- Check if script is injecting on target sites
- Verify `matches` in manifest.json
- Check for JavaScript errors in page console
- Test on different websites

### 3. API Communication Issues
- Verify backend is running and accessible
- Check CORS configuration
- Verify API URLs in configuration
- Check network tab for failed requests

### 4. Authentication Issues
- Verify Firebase configuration
- Check dashboard URL configuration
- Ensure extension ID is whitelisted
- Check Chrome storage for tokens

## Resources

### Documentation
- [Chrome Extension Developer Guide](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration](https://developer.chrome.com/docs/extensions/migrating/)
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/)

### Tools
- [Chrome Extensions Developer Tools](https://chrome.google.com/webstore/detail/chrome-extensions-developer-tools/nbbfhkmklbajblajflfobfpmfafedhel)
- [Extension Reloader](https://chrome.google.com/webstore/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid)

### Community
- [Chrome Extensions Google Group](https://groups.google.com/a/chromium.org/forum/#!forum/chromium-extensions)
- [Stack Overflow - Chrome Extensions](https://stackoverflow.com/questions/tagged/google-chrome-extension)

---

*This setup guide focuses on Chrome Extension development. For information about other DealPop repositories, see their respective documentation.*
