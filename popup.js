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

// Login handler
document.getElementById('login-btn')?.addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const res = await fetch('https://your-api.com/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (data.token) {
    chrome.storage.local.set({ token: data.token }, () => location.reload());
  } else {
    alert("Login failed");
  }
});

// Track product
document.getElementById('track-btn')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { command: "extractProductInfo" }, async (productInfo) => {
    chrome.storage.local.get("token", async ({ token }) => {
      const res = await fetch("https://your-api.com/api/tracked-products", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(productInfo)
      });

      const data = await res.json();
      if (data.id) {
        alert("Tracking started: " + data.id);
      } else {
        alert("Failed to start tracking.");
      }
    });
  });
});