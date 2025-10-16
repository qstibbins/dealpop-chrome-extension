import { getStoredToken, getFreshToken } from './auth';
import { API_CONFIG } from '../config/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ProductData {
  productUrl: string;
  productName: string;
  productImageUrl: string;
  vendor: string;
  currentPrice: number;
  targetPrice: number;
  expiresAt: string;
}

export interface TrackedProduct {
  id: string;
  productUrl: string;
  productName: string;
  productImageUrl: string;
  vendor: string;
  currentPrice: number;
  targetPrice: number;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    let token = await getStoredToken();
    console.log('🔍 Stored token:', token ? 'Present' : 'Missing');
    
    // If no token or token might be expired, try to get a fresh one
    if (!token) {
      console.log('🔍 No stored token, trying to get fresh token...');
      token = await getFreshToken();
      console.log('🔍 Fresh token:', token ? 'Present' : 'Missing');
    }

    if (!token) {
      console.error('❌ No authentication token available');
      throw new Error('No authentication token available. Please sign in again.');
    }

    console.log('🔍 Using token for API request:', token.substring(0, 20) + '...');

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          ...options.headers
        }
      });

      const data = await response.json();

      if (!response.ok) {
        // If unauthorized, try to refresh token and retry once
        if (response.status === 401) {
          const freshToken = await getFreshToken();
          if (freshToken) {
            const newHeaders = await this.getAuthHeaders();
            const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
              ...options,
              headers: {
                ...newHeaders,
                ...options.headers
              }
            });

            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              return { success: true, data: retryData };
            }
          }
        }

        return {
          success: false,
          error: data.message || `HTTP error! status: ${response.status}`
        };
      }

      return { success: true, data };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Product tracking methods
  async trackProduct(productData: ProductData): Promise<ApiResponse<TrackedProduct>> {
    return this.makeRequest<TrackedProduct>(API_CONFIG.ENDPOINTS.PRODUCTS.TRACK, {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  }

  async getTrackedProducts(): Promise<ApiResponse<TrackedProduct[]>> {
    return this.makeRequest<TrackedProduct[]>(API_CONFIG.ENDPOINTS.PRODUCTS.LIST, {
      method: 'GET'
    });
  }

  async updateProduct(id: string, productData: Partial<ProductData>): Promise<ApiResponse<TrackedProduct>> {
    return this.makeRequest<TrackedProduct>(API_CONFIG.ENDPOINTS.PRODUCTS.UPDATE(id), {
      method: 'PUT',
      body: JSON.stringify(productData)
    });
  }

  async deleteProduct(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(API_CONFIG.ENDPOINTS.PRODUCTS.DELETE(id), {
      method: 'DELETE'
    });
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.makeRequest<{ status: string; timestamp: string }>('/health', {
      method: 'GET'
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export individual functions for convenience
export const trackProduct = (productData: ProductData) => apiClient.trackProduct(productData);
export const getTrackedProducts = () => apiClient.getTrackedProducts();
export const updateProduct = (id: string, productData: Partial<ProductData>) => 
  apiClient.updateProduct(id, productData);
export const deleteProduct = (id: string) => apiClient.deleteProduct(id);
export const healthCheck = () => apiClient.healthCheck();
