const DEV_MODE = true;

document.addEventListener("DOMContentLoaded", async () => {
  if (DEV_MODE) {
    chrome.storage.local.set({ token: 'dev-token' }, () => {
      document.getElementById("track-view").style.display = "block";
    });
  } else {
    chrome.storage.local.get('token', ({ token }) => {
      if (token) {
        document.getElementById("track-view").style.display = "block";
      } else {
        document.getElementById("login-view").style.display = "block";
      }
    });
  }

  // Set icon as default image
  document.getElementById('product-image').src = 'icon.png';

  // Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { command: "extractProductInfo" }, (productInfo) => {
    if (chrome.runtime.lastError || !productInfo) {
      // Handle error or missing info
      document.getElementById('product-title').textContent = "Product";
      document.getElementById('product-price').textContent = "";
      document.getElementById('product-image').src = "icon.png";
      document.getElementById('product-source').textContent = "";
      return;
    }
    // Update popup UI with product info
    document.getElementById('product-title').textContent = productInfo.title?.value || "Product";
    document.getElementById('product-price').textContent = productInfo.price?.value ? `$${productInfo.price.value}` : "";
    document.getElementById('product-image').src = productInfo.image?.value || "icon.png";
    document.getElementById('product-source').textContent = (new URL(productInfo.url)).hostname;
  });
});