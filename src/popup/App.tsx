import React, { useState, useEffect } from 'react'
import { signInWithGoogle, signOutUser, initializeAuthState, onAuthStateChange, FirebaseUser } from '../services/firebaseAuth'
import { trackProduct, ProductData } from '../services/apiClient'

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

interface AppProps {}

const App: React.FC<AppProps> = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);

  const [showConfirmation, setShowConfirmation] = useState(false);
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
        ? new URL(productInfo.url).hostname.split('.')[0].charAt(0).toUpperCase() + 
          new URL(productInfo.url).hostname.split('.')[0].slice(1)
        : "Unknown";

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(trackingPeriod));

      const productData: ProductData = {
        productUrl: productInfo.url,
        productName: productInfo.title?.value || "Unknown Product",
        productImageUrl: productInfo.image?.value || productInfo.meta?.image || "",
        vendor: vendor,
        currentPrice: currentPrice,
        targetPrice: parseFloat(priceGoal),
        expiresAt: expiresAt.toISOString()
      };

      const response = await trackProduct(productData);

      if (response.success) {
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
  };

  if (showConfirmation) {
    return (
      <div className="bg-primary-100 border-2 border-gray-200 rounded-[20px] p-5 shadow-sm mb-4 text-center">
        <p className="mb-2">This product has been added and it's now being tracked</p>
        <img 
          src={productInfo?.meta?.image || productInfo?.image?.value || "icon.png"} 
          alt="Product Image" 
          className="w-12 h-12 rounded-[10px] object-cover mb-2 border border-gray-200 bg-white mx-auto"
        />
        <div className="font-semibold">{productInfo?.title?.value || "Product Name"}</div>
        <div className="font-bold text-lg text-gray-800">
          {productInfo?.price?.value ? `$${productInfo.price.value}` : "$0.00"}
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
            className="bg-white text-gray-800 border border-gray-300 rounded-lg py-2.5 w-full mt-2 cursor-pointer transition-colors hover:bg-gray-50 font-semibold text-lg flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
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
            <div className="text-lg font-semibold mb-1">
              {productInfo?.title?.value || "Product Name"}
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
          <button 
            onClick={() => setShowSettings(true)}
            className="text-gray-500 hover:text-gray-700 text-sm"
            title="Settings"
          >
            ⚙️
          </button>
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