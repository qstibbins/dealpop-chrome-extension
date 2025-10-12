/**
 * Chrome Extension Configuration
 * 
 * Centralized configuration for extension settings
 */

export const EXTENSION_CONFIG = {
  /**
   * Dashboard URL for authentication
   * 
   * IMPORTANT: Update this to your deployed dashboard URL
   * 
   * Development: http://localhost:5173/#/login?extension=true
   * Production: https://your-domain.com/login?extension=true
   */
  // For now, always use localhost during development
  // Change this to production URL when ready to deploy
  DASHBOARD_URL: 'http://localhost:5173/#/login?extension=true',
  
  // Production URL (uncomment when deploying):
  // DASHBOARD_URL: 'https://your-dashboard-domain.com/#/login?extension=true',

  /**
   * Authentication timeout (in milliseconds)
   * Default: 10 minutes
   */
  AUTH_TIMEOUT: 600000, // 10 minutes

  /**
   * Token expiration buffer (in milliseconds)
   * Refresh token this much before it actually expires
   * Default: 5 minutes
   */
  TOKEN_REFRESH_BUFFER: 300000, // 5 minutes

  /**
   * Extension version
   */
  VERSION: '1.0.0',

  /**
   * Debug mode - set to true for verbose logging
   */
  DEBUG: import.meta.env.MODE !== 'production',
};

/**
 * Log helper that only logs in debug mode
 */
export function debugLog(message: string, ...args: any[]) {
  if (EXTENSION_CONFIG.DEBUG) {
    console.log(`[DealPop Debug] ${message}`, ...args);
  }
}

/**
 * Error log helper (always logs)
 */
export function errorLog(message: string, error?: any) {
  console.error(`[DealPop Error] ${message}`, error);
}

/**
 * Success log helper
 */
export function successLog(message: string, ...args: any[]) {
  console.log(`✅ [DealPop] ${message}`, ...args);
}

