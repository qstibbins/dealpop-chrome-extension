// API Configuration
// Update these URLs to match your backend server

export const API_CONFIG = {
  // Base URL for your backend API
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://your-api.com'  // Replace with your production API URL when ready
    : 'http://localhost:3000', // Your local development API URL
  
  // API Endpoints
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/v1/auth/login',
      REGISTER: '/v1/auth/register',
      REFRESH: '/v1/auth/refresh',
    },
    PRODUCTS: {
      TRACK: '/tracked-products',
      LIST: '/tracked-products',
      UPDATE: (id: string) => `/tracked-products/${id}`,
      DELETE: (id: string) => `/tracked-products/${id}`,
    }
  }
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to get auth headers
export const getAuthHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
});
