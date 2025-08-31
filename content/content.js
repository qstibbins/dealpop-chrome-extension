"use strict";
/// <reference types="chrome"/>
// Content script for DealPop extension
console.log('🎯 DealPop content script loaded!');
// Inline the necessary functions to avoid module imports
function extractProductInfo() {
    const getPrice = () => {
        // First attempt: Try structured data extraction
        const structuredPrice = extractPriceFromStructuredData();
        if (structuredPrice !== null) {
            console.log('🎯 Found price from structured data:', structuredPrice);
            return {
                selector: 'structured-data',
                value: `$${structuredPrice}`
            };
        }
        console.log('🎯 No structured data found, falling back to DOM selectors');
        // Amazon-specific price selectors (higher priority)
        const amazonSelectors = [
            '.a-price-whole',
            '.a-price .a-offscreen',
            '[data-a-color="price"] .a-offscreen',
            '.a-price-range .a-offscreen',
            '.a-price-symbol + span',
            '.a-price .a-price-whole',
            '.a-price .a-price-fraction'
        ];
        // Target-specific price selectors
        const targetSelectors = [
            '[data-testid="product-price"]',
            '[data-testid="price-current"]',
            '.price-current',
            '.price',
            '[class*="price"]'
        ];
        // Walmart-specific price selectors
        const walmartSelectors = [
            '[data-price-type="finalPrice"]',
            '.price-characteristic',
            '.price-main',
            '[class*="price"]'
        ];
        // Try Amazon selectors first
        for (const selector of amazonSelectors) {
            const element = document.querySelector(selector);
            if (element && containsPrice(element.textContent || '')) {
                return getSelectorAndValue(element);
            }
        }
        // Try Target selectors
        for (const selector of targetSelectors) {
            const element = document.querySelector(selector);
            if (element && containsPrice(element.textContent || '')) {
                return getSelectorAndValue(element);
            }
        }
        // Try Walmart selectors
        for (const selector of walmartSelectors) {
            const element = document.querySelector(selector);
            if (element && containsPrice(element.textContent || '')) {
                return getSelectorAndValue(element);
            }
        }
        // Generic semantic selectors
        const semantic = document.querySelector('[itemprop*="price"], [class*="price"], [id*="price"]');
        if (semantic && containsPrice(semantic.textContent || ''))
            return getSelectorAndValue(semantic);
        // Fallback: search all elements for price patterns
        const allElements = Array.from(document.querySelectorAll('body *')).filter(el => el.textContent && containsPrice(el.textContent));
        for (let el of allElements) {
            return getSelectorAndValue(el);
        }
        return undefined;
    };
    // Helper function to extract price from structured data
    const extractPriceFromStructuredData = () => {
        console.log('🎯 Attempting structured data extraction...');
        // Look for JSON-LD structured data
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        console.log('🎯 Found', jsonLdScripts.length, 'JSON-LD scripts');
        for (const script of jsonLdScripts) {
            try {
                const data = JSON.parse(script.textContent || '');
                console.log('🎯 Parsed JSON-LD data:', data);
                // Handle both single object and array of objects
                const items = Array.isArray(data) ? data : [data];
                for (const item of items) {
                    console.log('🎯 Checking item:', item['@type']);
                    // Check if it's a Product schema
                    if (item['@type'] === 'Product' || item['@type'] === 'http://schema.org/Product') {
                        console.log('🎯 Found Product schema');
                        // Look for offers with price
                        if (item.offers) {
                            const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
                            console.log('🎯 Found offers:', offers);
                            for (const offer of offers) {
                                console.log('🎯 Checking offer:', offer);
                                if (offer.price) {
                                    const price = parseFloat(offer.price);
                                    console.log('🎯 Found price:', price);
                                    if (!isNaN(price) && price > 0) {
                                        return price;
                                    }
                                }
                            }
                        }
                        // Also check for direct price property
                        if (item.price) {
                            const price = parseFloat(item.price);
                            console.log('🎯 Found direct price:', price);
                            if (!isNaN(price) && price > 0) {
                                return price;
                            }
                        }
                    }
                }
            }
            catch (e) {
                console.error('🎯 Error parsing JSON-LD:', e);
                // Continue to next script if JSON parsing fails
                continue;
            }
        }
        console.log('🎯 No structured data found');
        return null; // No structured data found
    };
    const getTitle = () => {
        const candidates = [
            document.querySelector('h1'),
            document.querySelector('[itemprop="name"]'),
            document.querySelector('[class*="title"]'),
            document.querySelector('[id*="title"]'),
            document.querySelector('[class*="product"]'),
            document.querySelector('[id*="product"]')
        ];
        for (let el of candidates) {
            if (el && el.textContent && el.textContent.trim()) {
                return getSelectorAndValue(el);
            }
        }
        return undefined;
    };
    const getImage = () => {
        const img = document.querySelector('img[src*="product"], img[src*="item"], img');
        if (img) {
            return getSelectorAndValue(img, 'src');
        }
        return undefined;
    };
    const extractVariants = () => {
        const variants = {};
        // Look for common variant selectors
        const variantSelectors = [
            '[data-variant]',
            '[class*="variant"]',
            '[id*="variant"]',
            'select[data-option]',
            'input[name*="option"]'
        ];
        variantSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el instanceof HTMLSelectElement) {
                    const selectedOption = el.options[el.selectedIndex];
                    if (selectedOption) {
                        variants[el.name || 'option'] = selectedOption.text;
                    }
                }
                else if (el instanceof HTMLInputElement) {
                    if (el.type === 'radio' && el.checked) {
                        variants[el.name || 'input'] = el.value;
                    }
                    else if (el.type === 'checkbox' && el.checked) {
                        variants[el.name || 'checkbox'] = el.value;
                    }
                }
            });
        });
        return variants;
    };
    const containsPrice = (text) => {
        return /\$[\d,]+(\.\d{2})?/.test(text) || /\d+\.\d{2}/.test(text);
    };
    const getSelectorAndValue = (el, attr = null) => {
        const value = attr ? el[attr] : el.textContent?.trim();
        if (!value)
            return undefined;
        return {
            selector: getCssSelector(el),
            value: value
        };
    };
    const getCssSelector = (el) => {
        if (el.id)
            return `#${el.id}`;
        if (el.className) {
            const classes = Array.from(el.classList).join('.');
            return `${el.tagName.toLowerCase()}.${classes}`;
        }
        return el.tagName.toLowerCase();
    };
    // Only return clean, structured data
    const cleanData = {
        title: getTitle(),
        price: getPrice(),
        image: getImage(),
        url: window.location.href,
        variants: extractVariants()
    };
    // Validate the data before returning
    console.log('🎯 Raw extracted data:', cleanData);
    // Ensure we're not accidentally returning page content
    if (cleanData.title?.value && cleanData.title.value.length > 200) {
        console.error('❌ Title too long - might be page content');
        cleanData.title = { selector: '', value: 'Product Name' };
    }
    if (cleanData.price?.value && cleanData.price.value.length > 50) {
        console.error('❌ Price too long - might be page content');
        cleanData.price = { selector: '', value: '' };
    }
    console.log('🎯 Clean data being returned:', cleanData);
    return cleanData;
}
// ProductExtractor class for AI functionality
class ProductExtractor {
    constructor(apiKey) {
        if (apiKey && typeof window !== 'undefined') {
            // For now, we'll handle OpenAI initialization in the methods
            this.apiKey = apiKey;
        }
    }
    async captureScreenshot() {
        // Instead of screenshots, we'll use DOM extraction
        // This is more reliable and doesn't require external libraries
        console.log('🎯 Using DOM-based extraction instead of screenshots');
        // Return a placeholder since we're not using screenshots
        return 'data:image/png;base64,dom-extraction-placeholder';
    }
    async extractProductFromImage(imageDataUrl) {
        // Instead of AI extraction, we'll use enhanced DOM extraction
        // This is more reliable and doesn't require API calls
        console.log('🎯 Using enhanced DOM extraction instead of AI');
        try {
            // Use the existing extractProductInfo function for DOM extraction
            const domData = extractProductInfo();
            // Enhance the data with additional extraction
            const enhancedData = {
                product_name: domData.title?.value || this.extractProductName(),
                price: domData.price?.value || this.extractPrice(),
                color: this.extractColor(),
                brand: this.extractBrand(),
                capacity: this.extractCapacity(),
                vendor: new URL(window.location.href).hostname
            };
            console.log('🎯 Enhanced DOM extraction completed:', enhancedData);
            return enhancedData;
        }
        catch (error) {
            console.error('Enhanced DOM extraction failed:', error);
            throw error;
        }
    }
    extractProductName() {
        // Try multiple selectors for product name
        const selectors = [
            'h1',
            '[itemprop="name"]',
            '[class*="title"]',
            '[class*="product"]',
            'title'
        ];
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element?.textContent?.trim()) {
                return element.textContent.trim();
            }
        }
        return 'Product Name Not Found';
    }
    extractPrice() {
        // Try multiple selectors for price
        const selectors = [
            '[itemprop="price"]',
            '[class*="price"]',
            '[id*="price"]',
            'span:contains("$")',
            '.price',
            '#price'
        ];
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element?.textContent?.trim()) {
                const priceMatch = element.textContent.match(/\$[\d,]+(\.\d{2})?/);
                if (priceMatch) {
                    return priceMatch[0];
                }
            }
        }
        return 'Price Not Found';
    }
    extractColor() {
        // Look for color information
        const colorSelectors = [
            '[data-color]',
            '[class*="color"]',
            'span:contains("Color")',
            'label:contains("Color")'
        ];
        for (const selector of colorSelectors) {
            const element = document.querySelector(selector);
            if (element?.textContent?.trim()) {
                return element.textContent.trim();
            }
        }
        return 'Color Not Specified';
    }
    extractBrand() {
        // Look for brand information
        const brandSelectors = [
            '[itemprop="brand"]',
            '[class*="brand"]',
            '[id*="brand"]',
            'span:contains("Brand")',
            'label:contains("Brand")'
        ];
        for (const selector of brandSelectors) {
            const element = document.querySelector(selector);
            if (element?.textContent?.trim()) {
                return element.textContent.trim();
            }
        }
        return 'Brand Not Specified';
    }
    extractCapacity() {
        // Look for capacity/size information
        const capacitySelectors = [
            '[data-capacity]',
            '[class*="capacity"]',
            '[class*="size"]',
            'span:contains("GB")',
            'span:contains("TB")',
            'span:contains("inch")'
        ];
        for (const selector of capacitySelectors) {
            const element = document.querySelector(selector);
            if (element?.textContent?.trim()) {
                return element.textContent.trim();
            }
        }
        return 'Capacity Not Specified';
    }
}
// Make ProductExtractor globally available for debugging
window.ProductExtractor = ProductExtractor;
function injectDealPopButton() {
    console.log('🎯 Injecting DP button...');
    // Avoid injecting multiple times
    if (document.getElementById('dealpop-btn')) {
        console.log('🎯 DP button already exists, skipping injection');
        return;
    }
    // More flexible reference element detection
    const referenceSelectors = [
        'img[src*="product"]',
        'img[src*="item"]',
        'img',
        'h1',
        '[class*="product"]',
        '[class*="title"]',
        '.product-image',
        '.product-title'
    ];
    let refElement = null;
    for (const selector of referenceSelectors) {
        refElement = document.querySelector(selector);
        if (refElement) {
            console.log(`🎯 Found reference element: ${selector}`);
            break;
        }
    }
    if (!refElement) {
        console.log('❌ No reference element found, injecting button in top-right corner');
        // Inject in top-right corner if no reference element
        refElement = document.body;
    }
    // Create the button
    const btn = document.createElement('div');
    btn.id = 'dealpop-btn';
    btn.innerText = 'DP';
    btn.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 999999;
    background: linear-gradient(135deg, #007bff, #0056b3);
    color: white;
    border-radius: 50%;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-weight: bold;
    font-size: 18px;
    transition: all 0.2s ease;
    border: 2px solid white;
  `;
    // Add hover effects
    btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.1)';
        btn.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    });
    // Add click handler
    btn.addEventListener('click', () => {
        console.log('🎯 DP button clicked!');
        // You can add your popup logic here
        alert('DealPop button clicked! Product extraction ready.');
    });
    // Position the button
    if (refElement === document.body) {
        // Fixed position in top-right corner
        btn.style.position = 'fixed';
        btn.style.top = '20px';
        btn.style.right = '20px';
    }
    else if (refElement) {
        // Position relative to reference element
        const rect = refElement.getBoundingClientRect();
        btn.style.position = 'absolute';
        btn.style.top = `${window.scrollY + rect.top + 10}px`;
        btn.style.left = `${window.scrollX + rect.right + 10}px`;
    }
    document.body.appendChild(btn);
    console.log('✅ DP button injected successfully!');
    // Add a small delay and check if button is visible
    setTimeout(() => {
        const injectedBtn = document.getElementById('dealpop-btn');
        if (injectedBtn) {
            console.log('✅ DP button is visible and clickable');
            // Flash the button to make it more noticeable
            injectedBtn.style.animation = 'pulse 2s ease-in-out';
        }
        else {
            console.log('❌ DP button injection failed');
        }
    }, 100);
}
// Add CSS animation for button visibility
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
`;
document.head.appendChild(style);
// Run after DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectDealPopButton);
}
else {
    injectDealPopButton();
}
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('🎯 Content script received message:', msg);
    if (msg.command === "extractProductInfo") {
        console.log('🎯 Extracting product info...');
        const data = extractProductInfo();
        console.log('🎯 Product info extracted:', data);
        sendResponse(data);
    }
    if (msg.command === "screenshotAndExtract") {
        console.log('🎯 Starting screenshot and extract...');
        handleScreenshotAndExtract(msg.apiKey)
            .then(result => {
            console.log('🎯 Screenshot and extract result:', result);
            sendResponse(result);
        })
            .catch(error => {
            console.error('🎯 Screenshot and extract error:', error);
            sendResponse({ error: error.message });
        });
        return true; // Keep the message channel open for async response
    }
});
async function handleScreenshotAndExtract(apiKey) {
    try {
        // Initialize ProductExtractor with API key
        const extractor = new ProductExtractor(apiKey);
        // Take a screenshot of the current page
        console.log('🎯 Taking screenshot...');
        const screenshot = await extractor.captureScreenshot();
        console.log('🎯 Screenshot captured, size:', screenshot.length);
        // Extract product information from the screenshot using AI
        console.log('🎯 Extracting product info from screenshot...');
        const aiData = await extractor.extractProductFromImage(screenshot);
        console.log('🎯 AI extraction completed:', aiData);
        return { aiData };
    }
    catch (error) {
        console.error('🎯 Screenshot and extraction failed:', error);
        return { error: error instanceof Error ? error.message : String(error) };
    }
}
