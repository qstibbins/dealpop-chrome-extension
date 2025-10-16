import React, { useState, useEffect } from 'react'
import { signInWithGoogle, signOutUser, initializeAuthState, onAuthStateChange, FirebaseUser } from '../services/firebaseAuth'
import { trackProduct, ProductData } from '../services/apiClient'
import { EXTENSION_CONFIG } from '../config/extension'

// Define ProductInfo type based on what the content script actually returns
interface ProductInfo {
  title: { selector: string | null; value: string };
  price: { selector: string | null; value: string };
  image: { selector: string | null; value: string };
  url: string;
  variants: Record<string, any>;
  variantInfo?: any;
  meta?: {
    canonical?: string;
    image?: string;
    images?: string[];
    sourceMap?: Record<string, string>;
  };
}

const DEV_MODE = false; // Disable dev mode to use Firebase auth

// Helper function to truncate long product names
const truncateProductName = (name: string, maxLength: number = 60) => {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength).trim() + '...';
};

interface AppProps {}

const App: React.FC<AppProps> = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('This product has been added and it\'s now being tracked');
  const [priceGoal, setPriceGoal] = useState('');
  const [trackingPeriod, setTrackingPeriod] = useState('30');
  const [isTracking, setIsTracking] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [extractionMethod, setExtractionMethod] = useState<'dom' | 'ai'>('dom');
  
  
  

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize auth state
        const authState = await initializeAuthState();
        setIsLoggedIn(authState.isAuthenticated);
        setUser(authState.user);

        // Set up auth state listener
        const unsubscribe = onAuthStateChange((authState) => {
          setIsLoggedIn(authState.isAuthenticated);
          setUser(authState.user);
          setAuthError(null);
        });

        // Extract product info
        await extractProductInfo();

        // Cleanup function
        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setAuthError('Failed to initialize authentication');
      }
    };

    initializeApp();
  }, []);

  const extractProductInfo = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id!, { command: "extractProductInfo" }, (productInfo) => {
      if (chrome.runtime.lastError || !productInfo) {
        console.log('❌ Extraction failed:', chrome.runtime.lastError);
        // Handle error or missing info
        setProductInfo({
          title: { selector: null, value: "Product" },
          price: { selector: null, value: "" },
          image: { selector: null, value: "icon.png" },
          url: "",
          variants: {}
        });
        return;
      }
      
      console.log('✅ Received product info:', productInfo);
      
      // Validate the data structure
      if (typeof productInfo === 'string' || productInfo.length > 1000) {
        console.error('❌ Invalid product info received - looks like raw page content');
        setProductInfo({
          title: { selector: null, value: "Invalid Data Received" },
          price: { selector: null, value: "" },
          image: { selector: null, value: "icon.png" },
          url: "",
          variants: {}
        });
        return;
      }
      
      setProductInfo(productInfo);
      
      // Auto-fill price goal if price was extracted
      if (productInfo.price?.value) {
        // Extract just the numeric price value
        const priceMatch = productInfo.price.value.match(/[\d,]+(\.\d{2})?/);
        if (priceMatch) {
          const numericPrice = priceMatch[0].replace(/,/g, '');
          setPriceGoal(numericPrice);
          console.log('💰 Auto-filled price goal:', numericPrice);
        }
      }
    });
  };

  const handleGoogleSignIn = async () => {
    try {
      setAuthError(null);
      const { user } = await signInWithGoogle();
      setUser(user);
      setIsLoggedIn(true);
    } catch (error: any) {
      console.error('❌ Google sign in failed:', error);
      
      // Provide user-friendly error messages based on error code
      let errorMessage = 'Sign in failed';
      
      if (error?.code === 'TAB_CREATION_FAILED') {
        errorMessage = 'Could not open authentication window. Please try again.';
      } else if (error?.code === 'TIMEOUT') {
        errorMessage = 'Authentication timed out. Please try again.';
      } else if (error?.code === 'USER_CANCELLED') {
        errorMessage = 'Sign in was cancelled.';
      } else if (error?.code === 'DASHBOARD_AUTH_ERROR') {
        errorMessage = `Authentication failed: ${error.message}`;
      } else if (error?.code === 'INVALID_AUTH_DATA') {
        errorMessage = 'Received invalid authentication data. Please contact support.';
      } else if (error?.code === 'STORAGE_ERROR') {
        errorMessage = 'Failed to save authentication data. Please try again.';
      } else {
        errorMessage = error?.message || 'Sign in failed. Please try again.';
      }
      
      setAuthError(errorMessage);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setUser(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      setAuthError(error instanceof Error ? error.message : 'Sign out failed');
    }
  };

  const handleTrackProduct = async () => {
    if (!productInfo) return;

    setIsTracking(true);
    try {
      // Transform product info to API format
      const currentPrice = productInfo.price?.value 
        ? parseFloat(productInfo.price.value.replace(/[^0-9.]/g, ''))
        : 0;

      const vendor = productInfo.url 
        ? new URL(productInfo.url).hostname.replace('www.', '').split('.')[0].charAt(0).toUpperCase() + 
          new URL(productInfo.url).hostname.replace('www.', '').split('.')[0].slice(1)
        : "Unknown";

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(trackingPeriod));

      const productData = {
        product_url: productInfo.url,
        product_name: productInfo.title?.value || "Unknown Product",
        product_image_url: productInfo.image?.value || productInfo.meta?.image || "",
        vendor: vendor,
        current_price: currentPrice,
        target_price: parseFloat(priceGoal),
        expires_at: expiresAt.toISOString()
      };

      const response = await trackProduct(productData as any);

      if (response.success) {
        // Show backend message if available, otherwise use default
        const message = response.message || 'This product has been added and it\'s now being tracked';
        setConfirmationMessage(message);
        setShowConfirmation(true);
      } else {
        throw new Error(response.error || "Failed to start tracking");
      }
      
    } catch (error) {
      console.error('❌ Failed to track product:', error);
      alert(`Failed to start tracking: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTracking(false);
    }
  };

  const handleOkay = () => {
    setShowConfirmation(false);
    setPriceGoal('');
    setTrackingPeriod('30');
    setExtractionMethod('dom');
    // Close the popup after tracking
    window.close();
  };

  if (showConfirmation) {
    return (
      <div className="bg-primary-100 border-2 border-gray-200 rounded-[20px] p-5 shadow-sm mb-4 text-center">
        <p className="mb-2">{confirmationMessage}</p>
        <img 
          src={productInfo?.meta?.image || productInfo?.image?.value || "icon.png"} 
          alt="Product Image" 
          className="w-12 h-12 rounded-[10px] object-cover mb-2 border border-gray-200 bg-white mx-auto"
        />
        <div 
          className="font-semibold" 
          title={productInfo?.title?.value || "Product Name"}
        >
          {truncateProductName(productInfo?.title?.value || "Product Name", 50)}
        </div>
        <div className="font-bold text-lg text-gray-800">
          ${priceGoal || "0.00"}
        </div>
    
        <button 
          onClick={handleOkay}
          className="bg-primary-200 text-gray-800 border-none rounded-lg py-2 px-6 text-base font-semibold mt-3 cursor-pointer transition-colors hover:bg-primary-300"
        >
          Okay
        </button>
      </div>
    );
  }

  if (showSettings) {
    return (
      <div className="bg-primary-100 border-2 border-gray-200 rounded-[20px] p-5 shadow-sm mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Settings</h2>
          <button 
            onClick={() => setShowSettings(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="bg-primary-100 border-2 border-gray-200 rounded-[20px] p-5 shadow-sm mb-4">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Welcome to DealPop</h2>
          <p className="text-gray-600 mb-4">Sign in to track deals and save money</p>
          
          {authError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {authError}
            </div>
          )}
          
          <button 
            onClick={handleGoogleSignIn}
            className="bg-white text-gray-800 border border-gray-300 rounded-lg py-2.5 w-full mt-2 cursor-pointer transition-colors hover:bg-gray-50 font-semibold text-lg"
          >
            Continue to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary-100 border-2 border-gray-200 rounded-[20px] p-5 shadow-sm mb-4">
      {/* User Info */}
      {user && (
        <div className="flex items-center justify-between mb-4 p-2 bg-white rounded-lg">
          <div className="flex items-center">
            {user.photoURL && (
              <img 
                src={user.photoURL} 
                alt="User Avatar" 
                className="w-8 h-8 rounded-full mr-2"
              />
            )}
            <div>
              <div className="text-sm font-medium text-gray-800">
                {user.displayName || 'User'}
              </div>
              <div className="text-xs text-gray-500">
                {user.email}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center">
          <img 
            src={productInfo?.meta?.image || productInfo?.image?.value || "icon.png"} 
            alt="Product Image" 
            className="w-16 h-16 rounded-xl object-cover mr-4 border border-gray-200 bg-white"
          />
          <div>
            <div 
              className="text-lg font-semibold mb-1" 
              title={productInfo?.title?.value || "Product Name"}
            >
              {truncateProductName(productInfo?.title?.value || "Product Name")}
            </div>
            <div className="text-xl font-bold text-gray-800 mb-0.5">
              {productInfo?.price?.value ? productInfo.price.value : ""}
            </div>
            <div className="text-sm text-gray-500 mb-2">
              {productInfo?.url ? new URL(productInfo.url).hostname : ""}
            </div>
            {productInfo?.meta?.image && (
              <div className="text-xs text-blue-600 mb-1">
                📷 Meta image found
              </div>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          {EXTENSION_CONFIG.FEATURES.SHOW_SETTINGS_BUTTON && (
            <button 
              onClick={() => setShowSettings(true)}
              className="text-gray-500 hover:text-gray-700 text-sm"
              title="Settings"
            >
              ⚙️
            </button>
          )}
          <button 
            onClick={handleSignOut}
            className="text-gray-500 hover:text-gray-700 text-sm"
            title="Sign Out"
          >
            🚪
          </button>
        </div>
      </div>

      {/* Product Extraction */}
      <div className="mb-4">
        <div className="flex space-x-2 mb-2">
                      <button
              onClick={extractProductInfo}
              className="px-3 py-1 rounded text-sm font-medium bg-blue-500 text-white"
            >
              Extract Product Info
            </button>
        </div>
      </div>


      
      <label className="block mb-2 text-sm">
        Price Goal 
        <input 
          type="number" 
          value={priceGoal}
          onChange={(e) => setPriceGoal(e.target.value)}
          placeholder="$300" 
          className="border border-gray-200 rounded-md py-1.5 px-2.5 text-base mt-0.5 mb-2.5 w-full box-border"
        />
      </label>
      
      <label className="block mb-2 text-sm">
        Tracking Period
        <select 
          value={trackingPeriod}
          onChange={(e) => setTrackingPeriod(e.target.value)}
          className="border border-gray-200 rounded-md py-1.5 px-2.5 text-base mt-0.5 mb-2.5 w-full box-border"
        >
          <option value="30">30 days</option>
          <option value="60">60 days</option>
        </select>
      </label>
      
      <button 
        onClick={handleTrackProduct}
        disabled={isTracking}
        className={`bg-primary-200 text-gray-800 border-none rounded-lg py-2.5 w-full mt-2 transition-colors font-semibold text-lg ${
          isTracking 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer hover:bg-primary-300'
        }`}
      >
        {isTracking ? '⏳ Tracking...' : '+ Track This Product'}
      </button>
    </div>
  );
};

export default App; 