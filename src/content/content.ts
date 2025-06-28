import { extractProductInfo } from '../utils/productExtractor';

function injectDealPopButton() {
  console.log('Injecting DP button...');
  // Avoid injecting multiple times
  if (document.getElementById('dealpop-btn')) return;

  // Find a reference element (e.g., product image or title)
  const productImage = document.querySelector('img[src*="product"], img');
  const refElement = productImage || document.querySelector('h1');

  if (!refElement) return;

  // Create the button
  const btn = document.createElement('div');
  btn.id = 'dealpop-btn';
  btn.innerText = 'DP'; // Or use an <img> for your logo
  btn.style.position = 'absolute';
  btn.style.zIndex = '9999';
  btn.style.background = '#fff';
  btn.style.borderRadius = '50%';
  btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  btn.style.width = '40px';
  btn.style.height = '40px';
  btn.style.display = 'flex';
  btn.style.alignItems = 'center';
  btn.style.justifyContent = 'center';
  btn.style.cursor = 'pointer';

  // Position it near the reference element
  const rect = refElement.getBoundingClientRect();
  btn.style.top = `${window.scrollY + rect.top + 10}px`;
  btn.style.left = `${window.scrollX + rect.right + 10}px`;

  // Optional: Add click handler
  btn.onclick = async () => {
    console.log('DP button clicked!');
    if (document.getElementById('dealpop-overlay')) return;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'dealpop-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.3)';
    overlay.style.zIndex = '10000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    // Popup container
    const popup = document.createElement('div');
    popup.style.background = '#f7fafd';
    popup.style.borderRadius = '20px';
    popup.style.boxShadow = '0 4px 32px rgba(0,0,0,0.18)';
    popup.style.padding = '0';
    popup.style.minWidth = '350px';
    popup.style.maxWidth = '90vw';
    popup.style.position = 'relative';

    // Inject popup.html CSS
    const style = document.createElement('style');
    style.textContent = `body { font-family: 'Inter', Arial, sans-serif; background: #f7fafd; margin: 0; padding: 16px; min-width: 350px; min-height: 300px; } .popup-card { background: #e8fafe; border-radius: 20px; border: 2px solid #e9e9e9; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); margin-bottom: 16px; } #product-info { display: flex; align-items: center; margin-bottom: 16px; } #product-image { width: 64px; height: 64px; border-radius: 12px; object-fit: cover; margin-right: 16px; border: 1px solid #e9e9e9; background: #fff; } #product-title { font-size: 1.1em; font-weight: 600; margin-bottom: 4px; } #product-price { font-size: 1.2em; font-weight: 700; color: #333; margin-bottom: 2px; } #product-source { font-size: 0.95em; color: #888; margin-bottom: 8px; } label { display: block; margin-bottom: 8px; font-size: 0.98em; } input, select { border: 1px solid #e9e9e9; border-radius: 6px; padding: 6px 10px; font-size: 1em; margin-top: 2px; margin-bottom: 10px; width: 100%; box-sizing: border-box; } #track-btn, #login-btn { background: #ffd6ef; color: #333; border: none; border-radius: 8px; padding: 10px 0; font-size: 1.1em; font-weight: 600; width: 100%; margin-top: 8px; cursor: pointer; transition: background 0.2s; } #track-btn:hover, #login-btn:hover { background: #ffb6e6; } #confirmation { background: #e8fafe; border-radius: 20px; border: 2px solid #e9e9e9; padding: 20px; display: none; text-align: center; } #confirm-image { width: 48px; height: 48px; border-radius: 10px; object-fit: cover; margin-bottom: 8px; border: 1px solid #e9e9e9; background: #fff; } #okay-btn { background: #ffd6ef; color: #333; border: none; border-radius: 8px; padding: 8px 24px; font-size: 1em; font-weight: 600; margin-top: 12px; cursor: pointer; transition: background 0.2s; } #okay-btn:hover { background: #ffb6e6; }`;
    popup.appendChild(style);

    // Inject popup.html body (with unique IDs for overlay)
    popup.innerHTML += `
      <div id="login-view" class="popup-card" style="display:none;">
        <h2>Login</h2>
        <input type="email" id="email" placeholder="Email" /><br />
        <input type="password" id="password" placeholder="Password" /><br />
        <button id="login-btn">Login</button>
      </div>
      <div id="track-view" class="popup-card" style="display:none;">
        <div id="product-info">
          <img id="product-image" src="icon.png" alt="Product Image" />
          <div>
            <div id="product-title">Product Name</div>
            <div id="product-price">$0.00</div>
            <div id="product-source">Amazon</div>
          </div>
        </div>
        <label>Price Goal <input id="price-goal" type="number" placeholder="$300" /></label>
        <label>Tracking Period
          <select id="tracking-period">
            <option value="30">30 days</option>
            <option value="60">60 days</option>
          </select>
        </label>
        <button id="track-btn">+ Track This Product</button>
      </div>
      <div id="confirmation" class="popup-card" style="display:none;">
        <p>This product has been added and it's now being tracked</p>
        <img id="confirm-image" src="" alt="Product Image" />
        <div id="confirm-title">Product Name</div>
        <div id="confirm-price">$0.00</div>
        <button id="okay-btn">Okay</button>
      </div>
    `;

    // Close button for overlay
    const closeBtn = document.createElement('button');
    closeBtn.innerText = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '12px';
    closeBtn.style.right = '16px';
    closeBtn.style.background = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '1.5rem';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => overlay.remove();
    popup.appendChild(closeBtn);

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // --- Begin popup.js logic, scoped to popup ---
    // Safely get all elements
    const loginView = popup.querySelector('#login-view');
    const trackView = popup.querySelector('#track-view');
    const confirmation = popup.querySelector('#confirmation');
    const productImage = popup.querySelector('#product-image') as HTMLImageElement;
    const productTitle = popup.querySelector('#product-title');
    const productPrice = popup.querySelector('#product-price');
    const productSource = popup.querySelector('#product-source');
    const loginBtn = popup.querySelector('#login-btn');
    const trackBtn = popup.querySelector('#track-btn');
    const okayBtn = popup.querySelector('#okay-btn');
    const emailInput = popup.querySelector('#email') as HTMLInputElement;
    const passwordInput = popup.querySelector('#password') as HTMLInputElement;
    const priceGoalInput = popup.querySelector('#price-goal') as HTMLInputElement;
    const trackingPeriodSelect = popup.querySelector('#tracking-period') as HTMLSelectElement;
    const confirmTitle = popup.querySelector('#confirm-title');
    const confirmPrice = popup.querySelector('#confirm-price');
    const confirmImage = popup.querySelector('#confirm-image') as HTMLImageElement;

    // Show login or track view
    if (loginView && trackView) {
      chrome.storage.local.get('token', ({ token }) => {
        if (token) {
          trackView.style.display = 'block';
        } else {
          loginView.style.display = 'block';
        }
      });
    }

    // Set icon as default image
    if (productImage) productImage.src = 'icon.png';

    // Extract product info from the current page
    const productInfo = extractProductInfo();
    if (productInfo && productTitle && productPrice && productImage && productSource) {
      productTitle.textContent = productInfo.title?.value || 'Product';
      productPrice.textContent = productInfo.price?.value ? `$${productInfo.price.value}` : '';
      productImage.src = productInfo.image?.value || 'icon.png';
      if (productInfo.url) {
        productSource.textContent = (new URL(productInfo.url)).hostname;
      } else {
        productSource.textContent = '';
      }
    }

    // Login handler
    if (loginBtn && emailInput && passwordInput && loginView && trackView) {
      loginBtn.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        const res = await fetch('https://your-api.com/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.token) {
          chrome.storage.local.set({ token: data.token }, () => {
            loginView.style.display = 'none';
            trackView.style.display = 'block';
          });
        } else {
          alert('Login failed');
        }
      });
    }

    // Track product handler
    if (trackBtn && confirmation && confirmTitle && confirmPrice && confirmImage && trackView) {
      trackBtn.addEventListener('click', async () => {
        chrome.storage.local.get('token', async ({ token }) => {
          const res = await fetch('https://your-api.com/api/tracked-products', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(productInfo)
          });
          const data = await res.json();
          if (data.id) {
            trackView.style.display = 'none';
            confirmation.style.display = 'block';
            confirmTitle.textContent = productInfo.title?.value || 'Product';
            confirmPrice.textContent = productInfo.price?.value ? `$${productInfo.price.value}` : '';
            confirmImage.src = productInfo.image?.value || 'icon.png';
          } else {
            alert('Failed to start tracking.');
          }
        });
      });
    }

    // Okay button handler
    if (okayBtn) {
      okayBtn.addEventListener('click', () => {
        overlay.remove();
      });
    }
  };

  document.body.appendChild(btn);
}

// Run after DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectDealPopButton);
} else {
  injectDealPopButton();
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.command === "extractProductInfo") {
    const data = extractProductInfo();
    sendResponse(data);
  }
}); 