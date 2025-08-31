export async function extractPriceFromStructuredData(url) {
    const tab = await chrome.tabs.create({ url, active: false });
    return new Promise((resolve, reject) => {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                // Wait for page to be ready
                if (document.readyState !== 'complete') {
                    return new Promise((resolve) => {
                        window.addEventListener('load', () => {
                            // Add a small delay to ensure all scripts are loaded
                            setTimeout(() => {
                                resolve(extractPriceFromStructuredDataInner());
                            }, 1000);
                        });
                    });
                }
                // Add a small delay even if page is complete
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(extractPriceFromStructuredDataInner());
                    }, 1000);
                });
                function extractPriceFromStructuredDataInner() {
                    // Look for JSON-LD structured data
                    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
                    console.log('Found', jsonLdScripts.length, 'JSON-LD scripts');
                    for (const script of jsonLdScripts) {
                        try {
                            const data = JSON.parse(script.textContent || '');
                            console.log('Parsed JSON-LD data:', data);
                            // Handle both single object and array of objects
                            const items = Array.isArray(data) ? data : [data];
                            for (const item of items) {
                                console.log('Checking item:', item['@type']);
                                // Check if it's a Product schema
                                if (item['@type'] === 'Product' || item['@type'] === 'http://schema.org/Product') {
                                    console.log('Found Product schema');
                                    // Look for offers with price
                                    if (item.offers) {
                                        const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
                                        console.log('Found offers:', offers);
                                        for (const offer of offers) {
                                            console.log('Checking offer:', offer);
                                            if (offer.price) {
                                                const price = parseFloat(offer.price);
                                                console.log('Found price:', price);
                                                if (!isNaN(price) && price > 0) {
                                                    return price;
                                                }
                                            }
                                        }
                                    }
                                    // Also check for direct price property
                                    if (item.price) {
                                        const price = parseFloat(item.price);
                                        console.log('Found direct price:', price);
                                        if (!isNaN(price) && price > 0) {
                                            return price;
                                        }
                                    }
                                }
                            }
                        }
                        catch (e) {
                            console.error('Error parsing JSON-LD:', e);
                            // Continue to next script if JSON parsing fails
                            continue;
                        }
                    }
                    console.log('No structured data found');
                    return null; // No structured data found
                }
            }
        }, (results) => {
            chrome.tabs.remove(tab.id);
            if (chrome.runtime.lastError)
                return reject(chrome.runtime.lastError);
            resolve(results?.[0]?.result);
        });
    });
}
export async function extractPriceFromDOM(url, selector) {
    const tab = await chrome.tabs.create({ url, active: false });
    return new Promise((resolve, reject) => {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (sel) => {
                const el = document.querySelector(sel);
                if (!el)
                    throw new Error("Selector not found");
                const priceText = el.textContent || '';
                return parseFloat(priceText.replace(/[^\d.]/g, ''));
            },
            args: [selector]
        }, (results) => {
            chrome.tabs.remove(tab.id);
            if (chrome.runtime.lastError)
                return reject(chrome.runtime.lastError);
            resolve(results?.[0]?.result);
        });
    });
}
export async function extractPrice(url, selector) {
    console.log('Starting price extraction for URL:', url);
    // First attempt: Try structured data
    try {
        console.log('Attempting structured data extraction...');
        const structuredPrice = await extractPriceFromStructuredData(url);
        console.log('Structured data result:', structuredPrice);
        if (structuredPrice !== null) {
            console.log('Successfully extracted price from structured data:', structuredPrice);
            return structuredPrice;
        }
    }
    catch (error) {
        console.warn('Failed to extract price from structured data:', error);
    }
    // Fallback: Use DOM selector if provided
    if (selector) {
        console.log('Falling back to DOM selector:', selector);
        return extractPriceFromDOM(url, selector);
    }
    throw new Error('No price found in structured data and no selector provided for DOM fallback');
}
