// API Configuration
// Update these URLs to match your backend server

export const API_CONFIG = {
  // Base URL for your backend API
  BASE_URL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.MODE === 'production' ? 'https://bzu99jbwnr.us-east-2.awsapprunner.com' : 'http://localhost:3000'),
  
  // API Endpoints
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/v1/auth/login',
      REGISTER: '/v1/auth/register',
      REFRESH: '/v1/auth/refresh',
    },
    PRODUCTS: {
      TRACK: '/api/products',
      LIST: '/api/products',
      UPDATE: (id: string) => `/api/products/${id}`,
      DELETE: (id: string) => `/api/products/${id}`,
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
