function extractProductInfo() {
  const getPrice = () => {
    const semantic = document.querySelector('[itemprop*="price"], [class*="price"], [id*="price"]');
    if (semantic && containsPrice(semantic.innerText)) return getSelectorAndValue(semantic);

    const allElements = Array.from(document.querySelectorAll('body *')).filter(el =>
      el.innerText && containsPrice(el.innerText)
    );
    for (let el of allElements) {
      return getSelectorAndValue(el);
    }

    return null;
  };

  const getTitle = () => {
    const candidates = [
      document.querySelector('h1'),
      document.querySelector('meta[property="og:title"]'),
      document.querySelector('title')
    ];
    for (let el of candidates) {
      if (el?.innerText) return getSelectorAndValue(el);
      if (el?.content) return { selector: null, value: el.content };
    }
    return null;
  };

  const getImage = () => {
    const metaImg = document.querySelector('meta[property="og:image"]');
    if (metaImg?.content) return { selector: null, value: metaImg.content };

    const img = document.querySelector('img[src*="product"], img');
    if (img?.src) return getSelectorAndValue(img, 'src');

    return null;
  };

  const extractVariants = () => {
    const variants = {};

    document.querySelectorAll("label").forEach(label => {
      const htmlFor = label.getAttribute("for");
      if (htmlFor) {
        const select = document.getElementById(htmlFor);
        if (select && select.tagName === "SELECT") {
          const selectedOption = select.options[select.selectedIndex];
          if (selectedOption) {
            variants[label.innerText.trim()] = selectedOption.text.trim();
          }
        }
      }
    });

    document.querySelectorAll("select").forEach(select => {
      const label = select.closest("label") || select.previousElementSibling;
      const selectedOption = select.options[select.selectedIndex];
      if (label && selectedOption && label.innerText) {
        variants[label.innerText.trim()] = selectedOption.text.trim();
      }
    });

    const radios = document.querySelectorAll('input[type="radio"]:checked');
    radios.forEach(radio => {
      const name = radio.name || "Option";
      const label = document.querySelector(`label[for="${radio.id}"]`);
      if (label) {
        variants[name] = label.innerText.trim();
      }
    });

    document.querySelectorAll('[aria-pressed="true"], .selected, .active').forEach(el => {
      const label = el.closest('[data-variant-label]')?.getAttribute('data-variant-label') || el.closest('fieldset')?.getAttribute('aria-label') || "Option";
      const value = el.innerText.trim();
      if (value) {
        variants[label] = value;
      }
    });

    return variants;
  };

  const containsPrice = (text) => {
    return /\$\s?\d{1,3}(,\d{3})*(\.\d{2})?/.test(text);
  };

  const getSelectorAndValue = (el, attr = null) => {
    return {
      selector: getCssSelector(el),
      value: attr ? el.getAttribute(attr) : el.innerText.trim()
    };
  };

  const getCssSelector = (el) => {
    if (!(el instanceof Element)) return null;
    const path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      if (el.id) {
        selector += `#${el.id}`;
        path.unshift(selector);
        break;
      } else {
        let sibling = el, nth = 1;
        while (sibling = sibling.previousElementSibling) {
          if (sibling.nodeName.toLowerCase() === selector) nth++;
        }
        selector += `:nth-of-type(${nth})`;
      }
      path.unshift(selector);
      el = el.parentNode;
    }
    return path.join(" > ");
  };

  return {
    price: getPrice(),
    title: getTitle(),
    image: getImage(),
    url: window.location.href,
    variants: extractVariants()
  };
}

function injectDealPopButton() {
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
  btn.style.zIndex = 9999;
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
  btn.onclick = () => {
    alert('DealPop button clicked!');
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