import React, { useState, useEffect } from 'react'

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

const DEV_MODE = true;

// API configuration is now imported from config/api.ts

// Data extraction and API calls are now handled by the background script

interface AppProps {}

const App: React.FC<AppProps> = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [priceGoal, setPriceGoal] = useState('');
  const [trackingPeriod, setTrackingPeriod] = useState('30');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showSettings, setShowSettings] = useState(false);
  const [extractionMethod, setExtractionMethod] = useState<'dom' | 'ai'>('dom');
  const [isTracking, setIsTracking] = useState(false);
  
  
  

  useEffect(() => {
    const initializeApp = async () => {
      if (DEV_MODE) {
        chrome.storage.local.set({ token: 'dev-token' }, () => {
          setIsLoggedIn(true);
        });
      } else {
        chrome.storage.local.get('token', ({ token }) => {
          if (token) {
            setIsLoggedIn(true);
          }
        });
      }
        await extractProductInfo();
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

  const handleLogin = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        command: 'login',
        email,
        password
      });

      if (response.success) {
        setIsLoggedIn(true);
      } else {
        throw new Error(response.error || "Login failed");
      }
    } catch (error) {
      console.error('❌ Login failed:', error);
      alert(`Login failed: ${error.message}`);
    }
  };

  const handleTrackProduct = async () => {
    if (!productInfo) return;

    setIsTracking(true);
    try {
      const response = await chrome.runtime.sendMessage({
        command: 'trackProduct',
        productInfo,
        priceGoal: parseFloat(priceGoal),
        trackingPeriod: parseInt(trackingPeriod)
      });

      if (response.success) {
        setShowConfirmation(true);
      } else {
        throw new Error(response.error || "Failed to start tracking");
      }
      
    } catch (error) {
      console.error('❌ Failed to track product:', error);
      alert(`Failed to start tracking: ${error.message}`);
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
        <h2 className="text-xl font-bold mb-4">Login</h2>
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email" 
          className="border border-gray-200 rounded-md py-1.5 px-2.5 text-base mt-0.5 mb-2.5 w-full box-border"
        />
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password" 
          className="border border-gray-200 rounded-md py-1.5 px-2.5 text-base mt-0.5 mb-2.5 w-full box-border"
        />
        <button 
          onClick={handleLogin}
          className="bg-primary-200 text-gray-800 border-none rounded-lg py-2.5 w-full mt-2 cursor-pointer transition-colors hover:bg-primary-300 font-semibold text-lg"
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div className="bg-primary-100 border-2 border-gray-200 rounded-[20px] p-5 shadow-sm mb-4">
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