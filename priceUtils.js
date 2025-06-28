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
