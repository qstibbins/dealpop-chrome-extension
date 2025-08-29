import React, { useState, useEffect } from 'react'
import { ProductInfo, ProductExtractor, OpenAIProductData } from '../utils/productExtractor'
import { TEST_PRODUCTS, TEST_AI_PRODUCTS, TestUtils, TEST_CONFIG } from '../utils/testData'

const DEV_MODE = true;

interface AppProps {}

const App: React.FC<AppProps> = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [aiProductData, setAiProductData] = useState<OpenAIProductData | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [priceGoal, setPriceGoal] = useState('');
  const [trackingPeriod, setTrackingPeriod] = useState('30');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionMethod, setExtractionMethod] = useState<'dom' | 'ai'>('dom');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [showTestControls, setShowTestControls] = useState(false);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);

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

      // Check if API key is already saved
      const savedApiKey = await ProductExtractor.getApiKey();
      if (savedApiKey) {
        setApiKeySaved(true);
      } else {
        // Auto-set the hardcoded API key if none exists
        try {
          const hardcodedApiKey = "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";
          await ProductExtractor.setApiKey(hardcodedApiKey);
          setApiKeySaved(true);
          setApiKey(hardcodedApiKey);
          console.log('✅ API key automatically set');
        } catch (error) {
          console.error('❌ Failed to auto-set API key:', error);
        }
      }

      // Get the active tab and extract product info
      if (TEST_CONFIG.enabled) {
        loadRandomTestProduct();
      } else {
        await extractProductInfo();
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

  const handleScreenshotAndExtract = async () => {
    if (!apiKeySaved) {
      setShowApiKeyInput(true);
      return;
    }

    setIsExtracting(true);
    setExtractionMethod('ai');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send message to content script to take screenshot and extract with AI
      chrome.tabs.sendMessage(tab.id!, { 
        command: "screenshotAndExtract",
        apiKey: await ProductExtractor.getApiKey()
      }, (response) => {
        if (chrome.runtime.lastError) {
          alert('Failed to extract product info: ' + chrome.runtime.lastError.message);
          setIsExtracting(false);
          return;
        }

        if (response.error) {
          alert('Extraction failed: ' + response.error);
          setIsExtracting(false);
          return;
        }

        // Update product info with AI-extracted data
        if (response.aiData) {
          setAiProductData(response.aiData);
          setProductInfo({
            title: { selector: null, value: response.aiData.product_name },
            price: { selector: null, value: response.aiData.price },
            image: { selector: null, value: productInfo?.image?.value || "icon.png" },
            url: productInfo?.url || "",
            variants: {
              brand: response.aiData.brand,
              color: response.aiData.color,
              capacity: response.aiData.capacity,
              vendor: response.aiData.vendor
            }
          });
        }
        
        setIsExtracting(false);
      });
    } catch (error) {
      alert('Failed to extract product info: ' + error);
      setIsExtracting(false);
    }
  };

  const handleSaveApiKey = async () => {
    try {
      // Use the hardcoded API key directly
      const hardcodedApiKey = "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";
      await ProductExtractor.setApiKey(hardcodedApiKey);
      setApiKeySaved(true);
      setShowApiKeyInput(false);
      setApiKey(hardcodedApiKey);
      alert('API key saved successfully!');
    } catch (error) {
      alert('Failed to save API key: ' + error);
    }
  };

  const handleLogin = async () => {
    const res = await fetch('https://your-api.com/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (data.token) {
      chrome.storage.local.set({ token: data.token }, () => {
        setIsLoggedIn(true);
      });
    } else {
      alert("Login failed");
    }
  };

  const handleTrackProduct = async () => {
    if (!productInfo) return;

    chrome.storage.local.get("token", async ({ token }) => {
      const res = await fetch("https://your-api.com/api/tracked-products", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...productInfo,
          priceGoal: parseFloat(priceGoal),
          trackingPeriod: parseInt(trackingPeriod)
        })
      });

      const data = await res.json();
      if (data.id) {
        setShowConfirmation(true);
      } else {
        alert("Failed to start tracking.");
      }
    });
  };

  const handleOkay = () => {
    setShowConfirmation(false);
    setPriceGoal('');
    setTrackingPeriod('30');
    setAiProductData(null);
    setExtractionMethod('dom');
  };

  const handleSaveApiKeyFromSettings = async () => {
    try {
      await ProductExtractor.setApiKey(apiKey);
      setApiKeySaved(true);
      setShowSettings(false);
      alert('API key saved successfully!');
    } catch (error) {
      alert('Failed to save API key: ' + error);
    }
  };

  // Test functions
  const loadTestProduct = (index: number) => {
    const testProduct = TEST_PRODUCTS[index];
    setProductInfo(testProduct);
    setCurrentTestIndex(index);
    // Clear any previous AI data when loading a new product
    setAiProductData(null);
  };

  const loadRandomTestProduct = () => {
    const randomIndex = Math.floor(Math.random() * TEST_PRODUCTS.length);
    const randomProduct = TEST_PRODUCTS[randomIndex];
    setProductInfo(randomProduct);
    setCurrentTestIndex(randomIndex);
    // Clear any previous AI data when loading a new product
    setAiProductData(null);
  };

  const simulateAIExtraction = async () => {
    setIsExtracting(true);
    setExtractionMethod('ai');
    
    // Simulate delay
    await TestUtils.simulateExtractionDelay();
    
    // Simulate network error occasionally
    if (TestUtils.simulateNetworkError()) {
      alert('Simulated network error occurred');
      setIsExtracting(false);
      return;
    }
    
    // Find the matching AI product based on the current product title
    const currentProductTitle = productInfo?.title?.value || '';
    let matchingAIProduct = TEST_AI_PRODUCTS[currentTestIndex]; // fallback
    
    // Try to find a matching AI product by title
    for (const aiProduct of TEST_AI_PRODUCTS) {
      if (aiProduct.product_name.toLowerCase().includes(currentProductTitle.toLowerCase()) ||
          currentProductTitle.toLowerCase().includes(aiProduct.product_name.toLowerCase())) {
        matchingAIProduct = aiProduct;
        break;
      }
    }
    
    setAiProductData(matchingAIProduct);
    
    // Update product info with AI data
    setProductInfo({
      title: { selector: null, value: matchingAIProduct.product_name },
      price: { selector: null, value: matchingAIProduct.price.replace('$', '').replace(',', '') },
      image: { selector: null, value: productInfo?.image?.value || "icon.png" },
      url: productInfo?.url || "",
      variants: {
        brand: matchingAIProduct.brand,
        color: matchingAIProduct.color || '',
        capacity: matchingAIProduct.capacity || '',
        vendor: matchingAIProduct.vendor || ''
      }
    });
    
    setIsExtracting(false);
  };

  if (showConfirmation) {
    return (
      <div className="bg-primary-100 border-2 border-gray-200 rounded-[20px] p-5 shadow-sm mb-4 text-center">
        <p className="mb-2">This product has been added and it's now being tracked</p>
        <img 
          src={productInfo?.image?.value || "icon.png"} 
          alt="Product Image" 
          className="w-12 h-12 rounded-[10px] object-cover mb-2 border border-gray-200 bg-white mx-auto"
        />
        <div className="font-semibold">{productInfo?.title?.value || "Product Name"}</div>
        <div className="font-bold text-lg text-gray-800">
          {productInfo?.price?.value ? `$${productInfo.price.value}` : "$0.00"}
        </div>
        {aiProductData && (
          <div className="text-sm text-gray-600 mt-2">
            <div>Brand: {aiProductData.brand}</div>
            {aiProductData.color && <div>Color: {aiProductData.color}</div>}
            {aiProductData.capacity && <div>Capacity: {aiProductData.capacity}</div>}
          </div>
        )}
        <button 
          onClick={handleOkay}
          className="bg-primary-200 text-gray-800 border-none rounded-lg py-2 px-6 text-base font-semibold mt-3 cursor-pointer transition-colors hover:bg-primary-300"
        >
          Okay
        </button>
      </div>
    );
  }

  if (showApiKeyInput) {
    return (
      <div className="bg-primary-100 border-2 border-gray-200 rounded-[20px] p-5 shadow-sm mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Add OpenAI API Key</h2>
          <button 
            onClick={() => setShowApiKeyInput(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-3">
            To use AI-powered product extraction, you need an OpenAI API key.
          </p>
          <label className="block mb-2 text-sm">
            OpenAI API Key
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..." 
              className="border border-gray-200 rounded-md py-1.5 px-2.5 text-base mt-0.5 mb-2.5 w-full box-border"
            />
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-500 underline">OpenAI Platform</a>
          </p>
          <button 
            onClick={handleSaveApiKey}
            className="bg-primary-200 text-gray-800 border-none rounded-lg py-2 w-full cursor-pointer transition-colors hover:bg-primary-300 font-semibold"
          >
            Save API Key
          </button>
        </div>
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
        
        <div className="mb-4">
          <label className="block mb-2 text-sm">
            OpenAI API Key
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..." 
              className="border border-gray-200 rounded-md py-1.5 px-2.5 text-base mt-0.5 mb-2.5 w-full box-border"
            />
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Your API key is stored locally and never sent to our servers.
          </p>
          <button 
            onClick={handleSaveApiKeyFromSettings}
            className="bg-primary-200 text-gray-800 border-none rounded-lg py-2 w-full cursor-pointer transition-colors hover:bg-primary-300 font-semibold"
          >
            Save API Key
          </button>
        </div>
        
        {apiKeySaved && (
          <div className="text-green-600 text-sm">
            ✓ API key is saved
          </div>
        )}
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
            src={productInfo?.image?.value || "icon.png"} 
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
        className="bg-primary-200 text-gray-800 border-none rounded-lg py-2.5 w-full mt-2 cursor-pointer transition-colors hover:bg-primary-300 font-semibold text-lg"
      >
        + Track This Product
      </button>
    </div>
  );
};

export default App; 