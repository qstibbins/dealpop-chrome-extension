# API Integration Guide

This guide explains how to configure the Chrome extension to work with your backend API.

## Configuration

### 1. Update API URLs

Edit `src/config/api.ts` to point to your backend server:

```typescript
export const API_CONFIG = {
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://your-production-api.com'  // Your production API
    : 'http://localhost:3001',           // Your local development API
  // ... rest of config
};
```

### 2. Expected API Endpoints

Your backend should implement these endpoints:

**Note:** Authentication is handled by Firebase. The extension sends Firebase ID tokens in the Authorization header. Your backend should validate these tokens using Firebase Admin SDK.

#### Product Tracking
- `POST /v1/products` - Create new tracked product
  ```json
  // Request
  {
    "productUrl": "https://www.amazon.com/dp/B08N5WRWNW",
    "productName": "Echo Dot (4th Gen) Smart Speaker with Alexa",
    "productImageUrl": "https://m.media-amazon.com/images/I/714Rq4k05UL._AC_SL1000_.jpg",
    "brand": "Amazon",
    "color": "Charcoal",
    "capacity": "N/A",
    "vendor": "Amazon",
    "currentPrice": 49.99,
    "targetPrice": 39.99,
    "expiresAt": "2024-12-31T23:59:59.000Z"
  }
  
  // Response
  { "id": 123, "success": true, "message": "Product tracking started" }
  ```

## Data Flow

1. **User authenticates via dashboard** using Google OAuth (Firebase)
2. **Extension receives Firebase ID token** and stores it
3. **User clicks "Track This Product"** in the popup
4. **Extension extracts product data** using the content script
5. **Extension sends data to your API** via `POST /v1/products` with Firebase token
6. **Your backend validates the Firebase token** using Firebase Admin SDK
7. **Your backend stores the product** in the database
8. **Background jobs can now monitor** the product URL for price changes

## Testing

1. Update the API URLs in `src/config/api.ts`
2. Build the extension: `npm run build`
3. Load the extension in Chrome
4. Navigate to a product page
5. Click the extension icon and try tracking a product
6. Check your backend logs to see the incoming requests

## Error Handling

The extension includes comprehensive error handling:
- Network errors are caught and displayed to the user
- Invalid responses show helpful error messages
- Loading states prevent duplicate requests
- Console logging helps with debugging

## Backend Firebase Configuration

Your backend must validate Firebase ID tokens. Here's a basic example:

```javascript
// Node.js with Firebase Admin SDK
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Middleware to verify Firebase tokens
async function verifyFirebaseToken(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Use on protected routes
app.post('/v1/products', verifyFirebaseToken, async (req, res) => {
  // req.user contains verified Firebase user data
  // ... handle product tracking
});
```

## Next Steps

Once the API integration is working:
1. Implement background price monitoring jobs
2. Add email/notification systems for price alerts
3. Users can manage tracked products via your dashboard
4. Add price history tracking and charts
