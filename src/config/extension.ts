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
  // Dashboard URL - switches based on environment
  DASHBOARD_URL: import.meta.env.VITE_DASHBOARD_URL || (import.meta.env.MODE === 'production' 
    ? 'https://www.dealpop.co/?extension=true#/login'
    : 'http://localhost:5173/?extension=true#/login'),

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
  DEBUG: import.meta.env.VITE_EXTENSION_DEBUG === 'true' || import.meta.env.MODE !== 'production',

  /**
   * Feature Flags
   */
  FEATURES: {
    /**
     * Enable/disable the floating DealPop button
     * Set to false to hide the button
     */
    SHOW_FLOATING_BUTTON: false,

    /**
     * Enable/disable the settings button in popup
     * Set to false to hide the settings button
     */
    SHOW_SETTINGS_BUTTON: false,
  },
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

