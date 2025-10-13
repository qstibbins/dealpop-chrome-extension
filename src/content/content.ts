/// <reference types="chrome"/>
// Content script for DealPop extension
console.log('🎯 DealPop content script loaded!');

// Inline variant extraction functions to avoid module imports
// These functions are copied from src/utils/variant-extractor.ts

// Variant extraction types and functions
type VariantInfo = {
  selectedVariant: Record<string, string>;
  variantKey?: string;
  options?: Record<string, string[]>;
  source: Array<"ld+json"|"og/meta"|"embedded"|"dom">;
  variantSelectorData?: {
    urlParams?: Record<string,string>;
    attrs: Array<{
      name: string;
      value: string;
      groupSelector: string;
      optionIndex: number;
      optionSelector: string;
    }>;
    variantKeyParam?: string;
  };
};

// Cache for variant data per URL
const variantCache = new Map<string, VariantInfo>();

function getCachedVariantInfo(url: string): VariantInfo | undefined {
  return variantCache.get(url);
}

function cacheVariantInfo(url: string, info: VariantInfo): void {
  variantCache.set(url, info);
}

function clearVariantCache(): void {
  variantCache.clear();
  console.log('🧹 Variant cache cleared');
}

function extractVariantInfo(doc: Document = document): VariantInfo | null {
  const sources: VariantInfo["source"] = [];
  const out: VariantInfo = { selectedVariant: {}, source: sources };

  // 1) Schema.org (ld+json)
  const fromLd = parseLdVariants(doc);
  if (fromLd) mergeVariant(out, fromLd, "ld+json");

  // 2) Head / OG product extensions
  const fromHead = parseHeadVariantHints(doc);
  if (fromHead) mergeVariant(out, fromHead, "og/meta");

  // 3) Embedded app state JSON blobs
  const fromEmbedded = parseEmbeddedStateVariants(doc);
  if (fromEmbedded) mergeVariant(out, fromEmbedded, "embedded");

  // 4) DOM / ARIA: currently selected swatches/buttons
  const fromDom = parseDomSelectedVariant(doc);
  if (fromDom) mergeVariant(out, fromDom, "dom");

  // 5) Fallback: derive variantKey from URL/canonical
  if (!out.variantKey) {
    out.variantKey = deriveRetailerKeyFromUrl(doc);
    if (out.variantKey) sources.push("og/meta");
  }

  // Add reselection hints
  out.variantSelectorData = buildReselectionHints(doc, out);

  if (Object.keys(out.selectedVariant).length || out.variantKey) return out;
  return null;
}

// Helper functions for variant extraction
function mergeVariant(target: VariantInfo, src: Partial<VariantInfo>, tag: VariantInfo["source"][number]) {
  target.source.push(tag);
  if (src.variantKey && !target.variantKey) target.variantKey = src.variantKey;
  if (src.options) {
    target.options = target.options || {};
    for (const [k, vals] of Object.entries(src.options)) {
      const lk = k.toLowerCase();
      target.options[lk] = Array.from(new Set([...(target.options[lk]||[]), ...vals]));
    }
  }
  if (src.selectedVariant) {
    for (const [k, v] of Object.entries(src.selectedVariant)) {
      const lk = k.toLowerCase();
      
      // DOM extraction ALWAYS takes priority - it reflects the user's actual selection
      if (tag === 'dom') {
        // For colors, validate the value to avoid product titles
        if (lk === 'color' && !isValidColorValue(v)) {
          console.log(`⚠️ Skipping invalid color value from DOM: "${v}"`);
          continue;
        }
        
        const oldValue = target.selectedVariant[lk];
        target.selectedVariant[lk] = v;
        
        if (oldValue && oldValue !== v) {
          console.log(`🔄 DOM override: ${lk} changed from "${oldValue}" to "${v}"`);
        } else {
          console.log(`✅ DOM detected ${lk}: "${v}"`);
        }
        continue; // Skip the rest of the logic for DOM values
      }
      
      // For non-DOM sources, only add if we don't already have a value
      if (!target.selectedVariant[lk]) {
        // For colors, validate the value to avoid product titles
        if (lk === 'color' && !isValidColorValue(v)) {
          console.log(`⚠️ Skipping invalid color value: "${v}"`);
          continue;
        }
        target.selectedVariant[lk] = v;
        console.log(`📝 Added ${lk} from ${tag}: "${v}"`);
      } else {
        console.log(`⏭️ Skipping ${lk} from ${tag}: "${v}" (already have "${target.selectedVariant[lk]}")`);
      }
    }
  }
}

function parseLdVariants(doc: Document): Partial<VariantInfo> | null {
  const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  let best: Partial<VariantInfo> | null = null;
  
  for (const s of scripts) {
    let data: any; 
    try { 
      data = JSON.parse(s.textContent || "null"); 
    } catch { 
      continue; 
    }
    
    const nodes = collectJsonLdNodes(data);
    for (const node of nodes) {
      if (!isType(node, "Product") && !isType(node, "ProductModel")) continue;

      const attrs: Record<string,string> = {};
      if (node.color) attrs.color = String(node.color);
      if (node.size) attrs.size = String(node.size);

      // additionalProperty as PropertyValue list
      const props = Array.isArray(node.additionalProperty) ? node.additionalProperty : [];
      for (const pv of props) {
        if (pv && pv.name && pv.value) {
          const name = String(pv.name).toLowerCase();
          const value = String(pv.value);
          if (["color","size","style","finish","capacity","material"].includes(name) && !attrs[name]) {
            attrs[name] = value;
          }
        }
      }

      // sku often equals retailer variant id
      const offers = pickFirst(node.offers);
      const variantKey = (offers?.sku || node.sku) ? String(offers?.sku || node.sku) : undefined;

      const candidate: Partial<VariantInfo> = {
        selectedVariant: Object.keys(attrs).length ? attrs : undefined,
        variantKey
      };
      
      if (!best || (candidate.selectedVariant && !best.selectedVariant) || (candidate.variantKey && !best.variantKey)) {
        best = candidate;
      }
    }
  }
  return best;
}

function collectJsonLdNodes(root: any): any[] {
  const arr = Array.isArray(root) ? root : [root];
  const out: any[] = [];
  for (const item of arr) {
    if (!item) continue;
    if (item["@graph"]) out.push(...collectJsonLdNodes(item["@graph"]));
    else out.push(item);
  }
  return out;
}

function isType(node: any, t: string): boolean {
  const typ = node?.["@type"];
  return typ === t || (Array.isArray(typ) && typ.includes(t));
}

function pickFirst<T>(x: T|T[]|undefined|null): T|undefined {
  if (!x) return undefined;
  return Array.isArray(x) ? x[0] : x;
}

function parseHeadVariantHints(doc: Document): Partial<VariantInfo> | null {
  const m = (sel: string) => (doc.querySelector(sel) as HTMLMetaElement | null)?.content?.trim();
  const ogTitle = m('meta[property="og:title"]') || doc.title || "";
  const ogDesc = m('meta[property="og:description"]') || m('meta[name="description"]') || "";
  const prodId = m('meta[property="product:retailer_item_id"]') || "";

  const attrs = extractAttrsFromText(`${ogTitle} ${ogDesc}`);
  const selectedVariant = Object.keys(attrs).length ? attrs : undefined;
  const variantKey = prodId || deriveRetailerKeyFromUrl(doc) || undefined;
  
  return (selectedVariant || variantKey) ? { selectedVariant, variantKey } : null;
}

function extractAttrsFromText(text: string): Record<string,string> {
  const t = text.toLowerCase();
  const out: Record<string,string> = {};
  
  // Enhanced color detection - more flexible and comprehensive
  // Look for color patterns in various formats
  const colorPatterns = [
    // Basic colors with word boundaries
    /\b(black|white|silver|grey|gray|blue|sky blue|navy|green|red|pink|purple|gold|rose gold|starlight|midnight|graphite|natural|beige|brown|orange|yellow|teal|indigo|violet|maroon|olive|lime|aqua|fuchsia|coral|tan|cream|ivory|navy blue|forest green|olive green|sage green|burgundy|plum|lavender|mint|peach|salmon|turquoise|cyan|magenta)\b/,
    // Descriptive colors (e.g., "Metallic Purple", "Multi-Colored", "Gamer")
    /\b(metallic|matte|glossy|shimmer|sparkle|iridescent|holographic|neon|pastel|dark|light|bright|muted|vibrant|earthy|neutral|warm|cool|bold|subtle|classic|modern|vintage|retro|trendy|sporty|casual|formal|elegant|playful|sophisticated|minimalist|maximalist|gamer|gaming|multi|multi-colored|multi-color|two-tone|tri-tone|ombre|gradient|tie-dye|camouflage|animal print|floral|geometric|abstract|artistic|creative|unique|exclusive|limited edition|seasonal|holiday|themed|custom|personalized)\s+([a-z]+(?:\s+[a-z]+)*)/,
    // Color + descriptor combinations
    /\b([a-z]+(?:\s+[a-z]+)*)\s+(purple|blue|green|red|pink|yellow|orange|brown|black|white|gray|grey|gold|silver|bronze|copper|platinum|rose|navy|teal|indigo|violet|maroon|olive|lime|aqua|fuchsia|coral|tan|cream|ivory)\b/,
    // Size + color combinations
    /\b(size\s*[=:]?\s*([a-z]+(?:\s+[a-z]+)*))\b/i
  ];
  
  let colorFound = false;
  for (const pattern of colorPatterns) {
    const match = t.match(pattern);
    if (match && !colorFound) {
      if (match[2]) {
        // For descriptive patterns, use the full matched text
        out.color = titleCase(match[0].replace(/^size\s*[=:]?\s*/i, ''));
      } else {
        out.color = titleCase(match[1]);
      }
      colorFound = true;
      break;
    }
  }

  // Enhanced size detection
  const sizeMatch = t.match(/\b(size\s*[=:]?\s*(xs|s|m|l|xl|xxl|xxxl|\d+[t]?|\d+(?:\.\d+)?("|-| - )?(?:in|inch|cm)))\b/i);
  if (sizeMatch) out.size = sizeMatch[2].toUpperCase();

  return out;
}

// Enhanced validation to avoid extracting product titles as colors
function isValidColorValue(value: string): boolean {
  const t = value.toLowerCase();
  
  // Reject common product title words that aren't colors
  const invalidWords = [
    'backpack', 'bag', 'purse', 'wallet', 'laptop', 'computer', 'phone', 'tablet',
    'shirt', 'pants', 'dress', 'shoes', 'boots', 'sneakers', 'jacket', 'coat',
    'hat', 'cap', 'scarf', 'gloves', 'socks', 'underwear', 'bra', 'panties',
    'toy', 'game', 'book', 'cd', 'dvd', 'blu-ray', 'vinyl', 'cassette',
    'furniture', 'chair', 'table', 'bed', 'sofa', 'couch', 'desk', 'lamp',
    'appliance', 'refrigerator', 'dishwasher', 'washer', 'dryer', 'oven', 'stove',
    'electronics', 'camera', 'tv', 'speaker', 'headphone', 'earbud', 'watch',
    'jewelry', 'ring', 'necklace', 'bracelet', 'earring', 'pendant', 'chain',
    'classic', 'premium', 'deluxe', 'standard', 'basic', 'essential', 'professional'
  ];
  
  // Check if the value contains any invalid words
  for (const word of invalidWords) {
    if (t.includes(word)) {
      return false;
    }
  }
  
  // Must be reasonably short for a color name
  if (value.length > 30) {
    return false;
  }
  
  return true;
}

function titleCase(s: string) { 
  return s.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()); 
}

function parseEmbeddedStateVariants(doc: Document): Partial<VariantInfo> | null {
  // Look for more script types that commonly contain variant data
  const jsonScripts = Array.from(doc.querySelectorAll(`
    script[type="application/json"], 
    script[id^="__"], 
    script[id*="STATE"], 
    script[id*="state"], 
    script[id*="data"], 
    script[id*="props"], 
    script[id*="config"], 
    script[id*="initial"], 
    script[id*="product"], 
    script[id*="variant"]
  `));
  
  const blobs: any[] = [];
  
  for (const s of jsonScripts) {
    try {
      const txt = s.textContent || "";
      // More comprehensive pattern matching for variant-related content
      if (!/variant|variants|variation|swatch|sku|selected|color|size|style|finish|material|capacity|dimension|attribute|option|choice|selection/i.test(txt)) continue;
      blobs.push(JSON.parse(txt));
    } catch { /* ignore */ }
  }

  let selected: Record<string,string> = {};
  let variantKey: string | undefined;

  for (const b of blobs) {
    walk(b, (k, v) => {
      // Look for selected variant data in various formats
      if (k === "selected" && v && typeof v === "object") {
        for (const [name, val] of Object.entries(v as any)) {
          if (typeof val === "string" && likelyAttrName(name)) selected[name.toLowerCase()] = String(val);
        }
      }
      if (k === "selectedVariant" && v && typeof v === "object") {
        for (const [name, val] of Object.entries(v as any)) {
          if (typeof val === "string" && likelyAttrName(name)) selected[name.toLowerCase()] = String(val);
        }
      }
      if (k === "currentVariant" && v && typeof v === "object") {
        for (const [name, val] of Object.entries(v as any)) {
          if (typeof val === "string" && likelyAttrName(name)) selected[name.toLowerCase()] = String(val);
        }
      }
      if (k === "activeVariant" && v && typeof v === "object") {
        for (const [name, val] of Object.entries(v as any)) {
          if (typeof val === "string" && likelyAttrName(name)) selected[name.toLowerCase()] = String(val);
        }
      }
      if (k === "chosenVariant" && v && typeof v === "object") {
        for (const [name, val] of Object.entries(v as any)) {
          if (typeof val === "string" && likelyAttrName(name)) selected[name.toLowerCase()] = String(val);
        }
      }
      
      // Look for variant keys in various formats
      if (/^(asin|itemId|sku|skuId|currentSku|selectedSku|selectedSkuId|variantId|productId|itemNumber|tcin|dpci|upc|ean|gtin)$/i.test(k) && typeof v === "string") {
        variantKey = variantKey || v;
      }
    });
  }

  if (!Object.keys(selected).length && !variantKey) return null;
  return { selectedVariant: selected, variantKey };
}

function likelyAttrName(n: string) { 
  return /^(color|size|style|finish|material|capacity|width|length|height)$/i.test(n); 
}

function walk(obj: any, fn: (k:string, v:any) => void) {
  if (!obj || typeof obj !== "object") return;
  for (const [k, v] of Object.entries(obj)) {
    fn(k, v);
    if (v && typeof v === "object") walk(v, fn);
  }
}

function parseDomSelectedVariant(doc: Document): Partial<VariantInfo> | null {
  console.log('🔍 Starting DOM variant extraction...');
  
  // More comprehensive selector patterns for variant groups
  const groups = Array.from(doc.querySelectorAll<HTMLElement>(`
    [role="radiogroup"], 
    [role="listbox"], 
    [data-attribute-name], 
    [class*="variant"], 
    [class*="swatch"], 
    [class*="option"], 
    [class*="choice"], 
    [class*="selector"], 
    [class*="picker"], 
    [class*="attribute"], 
    [class*="dimension"], 
    [data-testid*="variant"], 
    [data-testid*="option"], 
    [data-testid*="color"], 
    [data-testid*="size"], 
    [data-testid*="style"], 
    [aria-label*="color"], 
    [aria-label*="size"], 
    [aria-label*="style"], 
    [aria-label*="variant"], 
    [aria-label*="option"],
    [class*="color-swatch"],
    [class*="color-option"],
    [class*="color-picker"],
    [class*="color-selector"],
    [class*="swatch-option"],
    [class*="swatch-selector"]
  `));
  
  console.log(`🔍 Found ${groups.length} potential variant groups`);
  
  const selected: Record<string,string> = {};

  for (const g of groups) {
    const groupName = inferGroupName(g) || "";
    console.log(`🔍 Checking group with inferred name: "${groupName}"`);
    
    const { value, all, index } = readSelectedFromGroup(g);
    console.log(`  - Found ${all.length} options:`, all);
    console.log(`  - Selected index: ${index}, value: "${value}"`);
    
    if (groupName && value) {
      // Validate color values before adding them
      if (groupName.toLowerCase() === 'color' && !isValidColorValue(value)) {
        console.log(`⚠️ Skipping invalid color from DOM: "${value}"`);
        continue;
      }
      selected[groupName.toLowerCase()] = value;
      console.log(`✅ DOM extracted ${groupName}: "${value}"`);
    } else if (!groupName) {
      console.log(`⚠️ No group name inferred for this group`);
    } else if (!value) {
      console.log(`⚠️ No selected value found in group "${groupName}"`);
    }
  }
  
  if (!Object.keys(selected).length) return null;
  return { selectedVariant: selected };
}

function inferGroupName(g: HTMLElement): string | undefined {
  const label = g.getAttribute("aria-label") || g.getAttribute("data-attribute-name");
  if (label) return label;
  
  const prev = g.previousElementSibling as HTMLElement | null;
  const t = prev?.textContent?.trim();
  if (t && t.length <= 24 && /color|size|style|finish|material/i.test(t)) return t;
  return undefined;
}

function readSelectedFromGroup(g: HTMLElement): { value?: string; all: string[]; index: number; optionSelector: string } {
  const clickable = Array.from(g.querySelectorAll<HTMLElement>('input[type="radio"], [role="radio"], [role="option"], button, [data-value], [data-color], [data-size]'))
    .filter(el => !el.closest('[aria-hidden="true"], [hidden]'));
  
  const labels = clickable.map(el => {
    // First try direct attributes on the clickable element
    let label = el.getAttribute("aria-label") || el.getAttribute("data-value") || el.getAttribute("data-color") || el.getAttribute("data-size");
    
    // If no direct label, check child elements for aria-label (common for color swatches)
    if (!label) {
      const childWithLabel = el.querySelector('[aria-label]');
      if (childWithLabel) {
        label = childWithLabel.getAttribute("aria-label");
      }
    }
    
    // Fallback to text content
    if (!label) {
      label = (el.textContent || "").trim();
    }
    
    return label;
  }).map(s => s?.replace(/\s+/g, " ").trim()).filter(Boolean) as string[];
  
  let index = -1;
  for (let i=0;i<clickable.length;i++) {
    const el = clickable[i];
    
    // Comprehensive "selected" detection function
    const isSelected = (() => {
      // 1. Standard form element checked state
      if ((el as HTMLInputElement).checked) return true;
      
      // 2. ARIA attributes (standard accessibility)
      if (el.getAttribute("aria-checked") === "true") return true;
      if (el.getAttribute("aria-selected") === "true") return true;
      if (el.getAttribute("aria-current") === "page" || el.getAttribute("aria-current") === "true") return true;
      
      // 3. Data attributes with "selected"
      if (el.getAttribute("data-selected") === "true" || el.getAttribute("data-selected") === "1") return true;
      
      // 4. Check element's class for "selected" keyword
      if (/\bselected\b/i.test(el.className)) return true;
      
      // 5. Check element's ID for "selected" keyword
      if (el.id && /selected/i.test(el.id)) return true;
      
      // 6. Check ALL attributes for "selected" keyword (data-*, aria-*, etc.)
      const allAttributes = Array.from(el.attributes);
      for (const attr of allAttributes) {
        // Check attribute name contains "selected"
        if (/selected/i.test(attr.name)) {
          // If the attribute name contains "selected", check if value is truthy
          if (attr.value === 'true' || attr.value === '1' || attr.value === 'selected') {
            return true;
          }
        }
        // Check attribute value contains "selected" (for class-like patterns)
        if (/\bselected\b/i.test(attr.value)) {
          return true;
        }
      }
      
      // 7. Check parent element for "selected" in class/id
      const parent = el.parentElement;
      if (parent) {
        if (/\bselected\b/i.test(parent.className)) return true;
        if (parent.id && /selected/i.test(parent.id)) return true;
      }
      
      // 8. Check nested children for "selected" class, id, or attributes
      const childrenWithSelected = el.querySelectorAll('[class*="selected" i], [id*="selected" i], [data-selected], [aria-selected]');
      if (childrenWithSelected.length > 0) {
        for (const child of Array.from(childrenWithSelected)) {
          if (/\bselected\b/i.test(child.className)) return true;
          if ((child as HTMLElement).getAttribute('data-selected') === 'true') return true;
          if ((child as HTMLElement).getAttribute('aria-selected') === 'true') return true;
        }
      }
      
      // 9. Check for "selected" in visible text content (Target pattern)
      const visibleChildren = Array.from(el.querySelectorAll('*')).filter(child => {
        const computedStyle = window.getComputedStyle(child as HTMLElement);
        return computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden';
      });
      
      for (const child of visibleChildren) {
        const text = child.textContent?.trim().toLowerCase() || '';
        // Look for "selected" at the start of text (e.g., "selected, M" or "selected M")
        if (/^selected[,\s]/i.test(text)) return true;
      }
      
      // 10. Check visual indicators in inline styles (Walmart color swatches)
      const style = el.getAttribute('style') || '';
      const childStyles = Array.from(el.querySelectorAll('[style]')).map(child => 
        (child as HTMLElement).getAttribute('style') || ''
      ).join(' ');
      
      // Look for thick borders/outlines (common for selected swatches)
      if (/(?:outline-width|border-width)\s*:\s*[0-9.]+(?:rem|px|em)/i.test(style + ' ' + childStyles)) {
        // Make sure it's not a negligible border (0px, etc.)
        const borderMatch = (style + ' ' + childStyles).match(/(?:outline-width|border-width)\s*:\s*([0-9.]+)(?:rem|px|em)/i);
        if (borderMatch && parseFloat(borderMatch[1]) > 0.05) return true;
      }
      
      return false;
    })();
    
    if (isSelected) {
      index = i; 
      break;
    }
  }
  
  const value = index >= 0 ? labels[index] : undefined;
  const optionSelector = 'input[type="radio"], [role="radio"], [role="option"], button, [data-value], [data-color], [data-size]';
  return { value, all: Array.from(new Set(labels)), index, optionSelector };
}

function deriveRetailerKeyFromUrl(doc: Document): string | undefined {
  const canon = (doc.querySelector('link[rel="canonical"]') as HTMLLinkElement | null)?.href || location.href;
  try {
    const u = new URL(canon);
    const h = u.hostname;
    if (/amazon\./i.test(h)) {
      const m = u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
      if (m) return m[1].toUpperCase();
    }
    if (/walmart\.com$/i.test(h)) {
      const m = u.pathname.match(/\/ip\/[^/]+\/(\d+)/i);
      if (m) return m[1];
    }
    if (/target\.com$/i.test(h)) {
      const m = u.pathname.match(/\/-\/A-(\d+)/i);
      if (m) return m[1];
    }
  } catch {}
  return undefined;
}

function buildReselectionHints(doc: Document, info: VariantInfo): VariantInfo["variantSelectorData"] {
  const urlParams: Record<string,string> = {};
  try {
    const u = new URL((doc.querySelector('link[rel="canonical"]') as HTMLLinkElement | null)?.href || location.href);
    for (const [k,v] of u.searchParams) if (v) urlParams[k] = v;
  } catch {}

  const attrs: NonNullable<VariantInfo["variantSelectorData"]>["attrs"] = [];
  for (const [name, value] of Object.entries(info.selectedVariant || {})) {
    const groupSelector = `[role="radiogroup"][aria-label*="${cssq(name)}" i], [role="listbox"][aria-label*="${cssq(name)}" i], [data-attribute-name*="${cssq(name)}" i]`;
    const group = document.querySelector<HTMLElement>(groupSelector);
    if (!group) continue;
    const { index, optionSelector } = readSelectedFromGroup(group);
    if (index >= 0) attrs.push({ name, value, groupSelector, optionIndex: index, optionSelector });
  }

  let variantKeyParam: string | undefined;
  if (info.variantKey) {
    for (const key of ["sku","skuId","asin","tcin","itemId","variantId"]) {
      if (urlParams[key]) { variantKeyParam = key; break; }
    }
  }

  return { urlParams, attrs, variantKeyParam };
}

function cssq(s: string) { 
  return s.replace(/["\\]/g, "\\$&"); 
}

// Inline the necessary functions to avoid module imports
function extractMetaSignals(doc: Document = document) {
  const get = (sel: string) => (doc.querySelector(sel) as HTMLMetaElement | HTMLLinkElement | null);

  // Helper functions to extract content from different meta tag types
  const og = (p: string) => (get(`meta[property="og:${p}"]`) as HTMLMetaElement | null)?.content?.trim() || "";
  const tw = (p: string) => (get(`meta[property="twitter:${p}"]`) as HTMLMetaElement | null)?.content?.trim() || "";
  const mt = (n: string) => (get(`meta[name="${n}"]`) as HTMLMetaElement | null)?.content?.trim() || "";
  const linkCanon = (get('link[rel="canonical"]') as HTMLLinkElement | null)?.href?.trim() || "";

  const signals: any = { sourceMap: {} };

  // Title - prefer OG → Twitter → standard meta → document title
  signals.title = og("title") || tw("title") || doc.title?.trim() || mt("title") || undefined;
  if (signals.title) {
    if (og("title")) signals.sourceMap.title = "og";
    else if (tw("title")) signals.sourceMap.title = "twitter";
    else if (mt("title")) signals.sourceMap.title = "meta";
    else signals.sourceMap.title = "document";
  }

  // Description - prefer OG → Twitter → standard meta
  signals.description = og("description") || tw("description") || mt("description") || undefined;
  if (signals.description) {
    if (og("description")) signals.sourceMap.description = "og";
    else if (tw("description")) signals.sourceMap.description = "twitter";
    else signals.sourceMap.description = "meta";
  }

  // Keywords (sometimes the product name repeats here—useful as a hint)
  signals.keywords = mt("keywords") || undefined;
  if (signals.keywords) signals.sourceMap.keywords = "meta";

  // URL + canonical - prefer canonical link → og:url → current location
  const ogUrl = og("url");
  signals.canonical = linkCanon || (ogUrl ? absolutize(ogUrl) : undefined);
  if (signals.canonical) {
    signals.sourceMap.canonical = linkCanon ? "link" : "og";
  }

  // Image candidates - collect all available images and dedupe
  const candidates = [
    og("image"),
    // Some sites add secure_url or multiple indexed tags
    (get('meta[property="og:image:secure_url"]') as HTMLMetaElement | null)?.content,
    tw("image"),
    // Fallback to any meta image tags
    (get('meta[name="image"]') as HTMLMetaElement | null)?.content,
  ].filter(Boolean) as string[];

  const deduped = dedupeUrls(candidates.map(url => absolutizeSafe(url)));
  signals.images = deduped.length ? deduped : undefined;
  signals.image = deduped[0];

  if (signals.image) {
    if (og("image")) signals.sourceMap.image = "og";
    else if (tw("image")) signals.sourceMap.image = "twitter";
    else signals.sourceMap.image = "meta";
  }

  // Also expose URL (prefer canonical, then og:url, then location)
  signals.url = signals.canonical || (ogUrl ? absolutize(ogUrl) : location.href);

  return signals;
}

function absolutize(url: string, base: string = location.href): string {
  try { 
    return new URL(url, base).toString(); 
  } catch { 
    return url; 
  }
}

function absolutizeSafe(url?: string | null): string {
  if (!url) return "";
  return absolutize(url);
}

function dedupeUrls(urls: string[]): string[] {
  const set = new Set<string>();
  for (const url of urls) {
    const key = url.replace(/(\?|#).*$/, ""); // ignore query/hash variants
    if (!set.has(key)) set.add(key);
  }
  return Array.from(set.values());
}

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
        console.log('🎯 Found price using Amazon selector:', selector);
        return getPriceSelectorAndValue(element);
      }
    }
    
    // Try Target selectors
    for (const selector of targetSelectors) {
      const element = document.querySelector(selector);
      if (element && containsPrice(element.textContent || '')) {
        console.log('🎯 Found price using Target selector:', selector);
        return getPriceSelectorAndValue(element);
      }
    }
    
    // Try Walmart selectors
    for (const selector of walmartSelectors) {
      const element = document.querySelector(selector);
      if (element && containsPrice(element.textContent || '')) {
        console.log('🎯 Found price using Walmart selector:', selector);
        return getPriceSelectorAndValue(element);
      }
    }
    
    // Generic semantic selectors
    const semantic = document.querySelector('[itemprop*="price"], [class*="price"], [id*="price"]');
    if (semantic && containsPrice(semantic.textContent || '')) {
      console.log('🎯 Found price using generic semantic selector');
      return getSelectorAndValue(semantic);
    }

    // NEW: Universal fallback (only runs if specific selectors fail)
    console.log('🎯 Retailer-specific selectors failed, trying universal fallback...');
    const universalResult = extractPriceUniversalFallback();
    if (universalResult) {
      return universalResult;
    }

    // Final fallback: search all elements for price patterns
    const allElements = Array.from(document.querySelectorAll('body *')).filter(el =>
      el.textContent && containsPrice(el.textContent)
    );
    for (let el of allElements) {
      console.log('🎯 Found price using final text scanning fallback');
      return getSelectorAndValue(el);
    }

    console.log('🎯 No price found with any extraction method');
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
              
              // Smart price selection logic
              const validPrices = [];
              for (const offer of offers) {
                console.log('🎯 Checking offer:', offer);
                if (offer.price) {
                  const price = parseFloat(offer.price);
                  console.log('🎯 Found price:', price);
                  if (!isNaN(price) && price > 0) {
                    validPrices.push(price);
                  }
                }
              }
              
              if (validPrices.length > 0) {
                // For Walmart specifically: prefer the higher price (main product price)
                // over lower prices (shipping, add-ons, etc.)
                const sortedPrices = validPrices.sort((a, b) => b - a);
                const selectedPrice = sortedPrices[0];
                
                console.log('🎯 All valid prices found:', validPrices);
                console.log('🎯 Selected highest price:', selectedPrice);
                return selectedPrice;
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
      } catch (e) {
        console.error('🎯 Error parsing JSON-LD:', e);
        // Continue to next script if JSON parsing fails
        continue;
      }
    }
    
    console.log('🎯 No structured data found');
    return null; // No structured data found
  };

  const getTitle = () => {
    // Check if we're on Walmart - use <title> tag first
    const isWalmart = /walmart\.com/i.test(window.location.hostname);
    
    if (isWalmart) {
      const titleTag = document.querySelector('title');
      if (titleTag && titleTag.textContent) {
        const titleText = titleTag.textContent.trim();
        // Clean up Walmart title (remove " - Walmart.com" suffix if present)
        const cleanTitle = titleText.replace(/\s*[-–—]\s*Walmart\.com.*$/i, '').trim();
        if (cleanTitle.length > 3 && cleanTitle.length < 300) {
          console.log('🎯 Found Walmart title from <title> tag:', cleanTitle);
          return { selector: 'title', value: cleanTitle };
        }
      }
    }
    
    // Amazon-specific title selectors (try these first)
    const amazonSelectors = [
      '#productTitle',
      '[data-automation-id="product-title"]',
      '.product-title',
      '#dp-container h1',
      '#centerCol h1',
      '#titleSection h1'
    ];
    
    // Try Amazon selectors first
    for (const selector of amazonSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent && element.textContent.trim()) {
        const title = element.textContent.trim();
        if (title.length > 3 && title.length < 200) { // Reasonable title length
          console.log('🎯 Found Amazon title using selector:', selector, title);
          return getSelectorAndValue(element);
        }
      }
    }
    
    // Generic selectors as fallback
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
        const title = el.textContent.trim();
        if (title.length > 3 && title.length < 200) { // Reasonable title length
          return getSelectorAndValue(el);
        }
      }
    }

    return undefined;
  };

  const getImage = (metaSignals: any) => {
    console.log('🎯 Starting vendor-agnostic image extraction...');
    
    // PHASE 1: Meta tags (most reliable for social/preview)
    if (metaSignals.image) {
      console.log('✅ Phase 1: Found image from meta tags:', metaSignals.image, 'Source:', metaSignals.sourceMap?.image);
      return { selector: null, value: metaSignals.image };
    }

    // PHASE 1.5: JSON-LD structured data (backup/additional images)
    console.log('🎯 Phase 1.5: Trying JSON-LD structured data...');
    const jsonLdImage = extractImageFromStructuredData();
    if (jsonLdImage) {
      console.log('✅ Phase 1.5: Found image from JSON-LD:', jsonLdImage);
      return { selector: 'json-ld', value: jsonLdImage };
    }

    // PHASE 2: Semantic HTML (vendor-agnostic standards)
    console.log('🎯 Phase 2: Trying semantic image selectors...');
    const semanticSelectors = [
      '[itemprop="image"]',
      '[property="og:image"]',
      'link[rel="image_src"]',
      '[data-main-image]',
      '[data-product-image]'
    ];
    
    for (const selector of semanticSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const src = (element as HTMLImageElement).src || 
                    element.getAttribute('content') || 
                    element.getAttribute('href');
        if (src && src.startsWith('http')) {
          console.log('✅ Phase 2: Found image using semantic selector:', selector);
          return { selector, value: src };
        }
      }
    }

    // PHASE 3: Generic patterns (vendor-agnostic)
    console.log('🎯 Phase 3: Trying generic image patterns...');
    const genericSelectors = [
      'img[class*="product"][class*="main"]',
      'img[class*="product"][class*="primary"]',
      'img[src*="product"]',
      'img[src*="item"]',
      'img[alt*="product"]'
    ];
    
    for (const selector of genericSelectors) {
      const img = document.querySelector(selector);
      if (img && (img as HTMLImageElement).src) {
        console.log('✅ Phase 3: Found image using generic pattern:', selector);
        return getSelectorAndValue(img, 'src');
      }
    }

    // PHASE 4: Vendor-specific selectors (Amazon with data-a-dynamic-image)
    console.log('🎯 Phase 4: Trying vendor-specific image selectors...');
    const vendorImage = tryVendorSpecificImageSelectors();
    if (vendorImage) {
      console.log('✅ Phase 4: Found image using vendor-specific selector');
      return vendorImage;
    }

    // PHASE 5: Final fallback - first large image
    console.log('🎯 Phase 5: Final fallback - scanning for large images...');
    const allImages = Array.from(document.querySelectorAll('img'))
      .filter(img => {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        return width > 200 && height > 200; // Reasonable product image size
      });
    
    if (allImages.length > 0) {
      console.log('✅ Phase 5: Found image using size heuristic');
      return getSelectorAndValue(allImages[0], 'src');
    }

    return undefined;
  };

  // Helper: Extract image from JSON-LD structured data
  const extractImageFromStructuredData = (): string | null => {
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        const items = Array.isArray(data) ? data : [data];
        
        for (const item of items) {
          if (item['@type'] === 'Product' || item['@type'] === 'http://schema.org/Product') {
            // Check for image property
            if (item.image) {
              const imageUrl = Array.isArray(item.image) ? item.image[0] : item.image;
              if (typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
                return imageUrl;
              }
              // Handle ImageObject format
              if (typeof imageUrl === 'object' && imageUrl.url) {
                return imageUrl.url;
              }
            }
          }
        }
      } catch (e) {
        // Continue to next script
        continue;
      }
    }
    
    return null;
  };

  // Helper: Vendor-specific image extraction
  const tryVendorSpecificImageSelectors = () => {
    const hostname = window.location.hostname;
    
    // Amazon-specific extraction
    if (hostname.includes('amazon.')) {
      return tryAmazonImageSelectors();
    } else if (hostname.includes('target.')) {
      return tryTargetImageSelectors();
    } else if (hostname.includes('walmart.')) {
      return tryWalmartImageSelectors();
    }
    
    return undefined;
  };

  const tryAmazonImageSelectors = () => {
    console.log('🏪 Trying Amazon-specific image selectors...');
    const amazonImageSelectors = [
      '#landingImage',
      '#imgTagWrapperId img',
      '#imageBlock img',
      '.a-dynamic-image'
    ];
    
    for (const selector of amazonImageSelectors) {
      const img = document.querySelector(selector);
      if (img && (img as HTMLImageElement).src) {
        // Priority 1: data-old-hires (high resolution SL1500)
        const hiRes = img.getAttribute('data-old-hires') || img.getAttribute('data-a-hires');
        if (hiRes) {
          console.log('✅ Found Amazon high-res image from data-old-hires:', hiRes);
          return { selector, value: hiRes };
        }
        
        // Priority 2: Parse data-a-dynamic-image JSON for highest resolution
        const dynamicImages = img.getAttribute('data-a-dynamic-image');
        if (dynamicImages) {
          try {
            const imageMap = JSON.parse(dynamicImages);
            // Sort by width (first dimension) descending to get highest resolution
            const sorted = Object.entries(imageMap).sort((a: any, b: any) => {
              const widthA = Array.isArray(a[1]) ? a[1][0] : 0;
              const widthB = Array.isArray(b[1]) ? b[1][0] : 0;
              return widthB - widthA;
            });
            
            if (sorted.length > 0) {
              const highestResUrl = sorted[0][0];
              const dimensions = sorted[0][1];
              console.log(`✅ Found Amazon image from data-a-dynamic-image: ${highestResUrl} (${dimensions})`);
              return { selector, value: highestResUrl };
            }
          } catch (e) {
            console.log('⚠️ Failed to parse data-a-dynamic-image JSON:', e);
          }
        }
        
        // Priority 3: Fallback to src attribute
        console.log('✅ Found Amazon image from src attribute');
        return getSelectorAndValue(img, 'src');
      }
    }
    return undefined;
  };

  const tryTargetImageSelectors = () => {
    console.log('🏪 Trying Target-specific image selectors...');
    // Add Target-specific selectors if needed
    return undefined;
  };

  const tryWalmartImageSelectors = () => {
    console.log('🏪 Trying Walmart-specific image selectors...');
    // Add Walmart-specific selectors if needed
    return undefined;
  };

  const extractVariants = () => {
    // Use the new advanced variant extractor
    try {
      const variantInfo = extractVariantInfo(document);
      if (variantInfo && Object.keys(variantInfo.selectedVariant).length > 0) {
        console.log('🎯 Advanced variant extraction found:', variantInfo);
        
        // Cache the variant info for this URL
        cacheVariantInfo(window.location.href, variantInfo);
        
        return variantInfo.selectedVariant;
      }
    } catch (error) {
      console.error('🎯 Error in advanced variant extraction:', error);
    }
    
    // Fallback to basic variant extraction if advanced method fails
    console.log('🎯 Falling back to basic variant extraction');
    const variants: Record<string, string> = {};
    
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
        } else if (el instanceof HTMLInputElement) {
          if (el.type === 'radio' && el.checked) {
            variants[el.name || 'input'] = el.value;
          } else if (el.type === 'checkbox' && el.checked) {
            variants[el.name || 'checkbox'] = el.value;
          }
        }
      });
    });

    return variants;
  };

  const containsPrice = (text: string) => {
    return /\$[\d,]+(\.\d{2})?/.test(text) || /\d+\.\d{2}/.test(text);
  };

  // Universal fallback function for retailer-agnostic price extraction
  const extractPriceUniversalFallback = () => {
    console.log('🎯 Running universal fallback price extraction...');
    
    // Universal semantic selectors (works on most e-commerce sites)
    const universalSelectors = [
      '[itemprop*="price"]',
      '[class*="price"]',
      '[id*="price"]',
      '[data-price]',
      '[data-amount]',
      '[class*="amount"]',
      '[class*="cost"]',
      '[class*="value"]',
      '[class*="retail"]',
      '[class*="sale"]',
      '[class*="current"]',
      '[class*="now"]',
      '[class*="final"]',
      '[data-testid*="price"]',
      '[data-testid*="amount"]',
      '[aria-label*="price"]',
      '[title*="price"]'
    ];
    
    for (const selector of universalSelectors) {
      const element = document.querySelector(selector);
      if (element && containsPrice(element.textContent || '')) {
        console.log('🎯 Universal selector found price:', selector, element.textContent?.trim());
        return getPriceSelectorAndValue(element);
      }
    }
    
    // Enhanced debugging: log all elements with price-like text
    console.log('🎯 Debugging: Searching for price elements...');
    const allPriceElements = Array.from(document.querySelectorAll('body *'))
      .filter(el => el.textContent && containsPrice(el.textContent));
    
    console.log('🎯 Found', allPriceElements.length, 'elements with price patterns:');
    allPriceElements.slice(0, 10).forEach((el, i) => {
      console.log(`  ${i + 1}. "${el.textContent?.trim()}" (class: "${el.className}", id: "${el.id}")`);
    });
    
    // Last resort: scan all text with scoring
    const allElements = Array.from(document.querySelectorAll('body *'))
      .filter(el => el.textContent && containsPrice(el.textContent))
      .sort((a, b) => getPriceLikelihoodScore(b) - getPriceLikelihoodScore(a));
      
    if (allElements.length > 0) {
      console.log('🎯 Text scanning found price with scoring');
      return getSelectorAndValue(allElements[0]);
    }
    
    return undefined;
  };

  // Enhanced price likelihood scoring for universal fallback
  const getPriceLikelihoodScore = (element: Element): number => {
    let score = 0;
    const text = element.textContent || '';
    const className = element.className || '';
    const id = element.id || '';
    const tagName = element.tagName.toLowerCase();
    
    // Positive signals
    if (/\bprice\b/i.test(className)) score += 5;
    if (/\bprice\b/i.test(id)) score += 5;
    if (/\bcurrent\b/i.test(className)) score += 4;
    if (/\bnow\b/i.test(className)) score += 4;
    if (/\bsale\b/i.test(className)) score += 3;
    if (/\bfinal\b/i.test(className)) score += 3;
    if (/\bretail\b/i.test(className)) score += 2;
    if (/\bamount\b/i.test(className)) score += 2;
    if (/\bcost\b/i.test(className)) score += 2;
    if (/\bvalue\b/i.test(className)) score += 2;
    
    // Negative signals
    if (/\bstrike\b/i.test(className)) score -= 5;
    if (/\bwas\b/i.test(className)) score -= 5;
    if (/\blist\b/i.test(className)) score -= 5;
    if (/\boriginal\b/i.test(className)) score -= 5;
    if (/\bmsrp\b/i.test(className)) score -= 5;
    if (/\bcompare\b/i.test(className)) score -= 3;
    if (/\bshipping\b/i.test(className)) score -= 3;
    if (/\btax\b/i.test(className)) score -= 3;
    
    // Tag-based scoring
    if (tagName === 'span' && /\$[\d,]+(\.\d{2})?/.test(text)) score += 2;
    if (tagName === 'div' && /\$[\d,]+(\.\d{2})?/.test(text)) score += 1;
    
    // Text content scoring
    if (text.match(/^\$[\d,]+(\.\d{2})?$/)) score += 3; // Exact price format
    if (text.match(/^[\d,]+(\.\d{2})?\s*USD$/)) score += 2; // Price with currency
    
    // Proximity to buy buttons (improved heuristic)
    const buyButton = element.closest('body')?.querySelector('button:not([disabled]), input[type="submit"], a[href*="cart"], a[href*="checkout"]');
    if (buyButton && buyButton.textContent?.match(/buy|add to cart|checkout|purchase/i)) {
      score += 2;
    }
    
    // Proximity to product title
    const productTitle = element.closest('body')?.querySelector('h1, [class*="title"], [class*="product"]');
    if (productTitle && element.closest('body')?.contains(productTitle)) {
      score += 1;
    }
    
    return score;
  };

  const getSelectorAndValue = (el: Element, attr: string | null = null) => {
    let value = attr ? (el as any)[attr] : el.textContent?.trim();
    if (!value) return undefined;
    
    return {
      selector: getCssSelector(el),
      value: value
    };
  };
  
  const getPriceSelectorAndValue = (el: Element, attr: string | null = null) => {
    let value = attr ? (el as any)[attr] : el.textContent?.trim();
    if (!value) return undefined;
    
    // Clean and extract the actual price value (only for prices)
    if (!attr) {
      const originalValue = value;
      value = extractCleanPriceValue(value);
      // If the original text already had a $, don't add another one
      if (originalValue.includes('$') && value.startsWith('$$')) {
        value = value.substring(1); // Remove the extra $
      }
    }
    
    return {
      selector: getCssSelector(el),
      value: value
    };
  };

  // Extract clean price value from text
  const extractCleanPriceValue = (text: string): string => {
    // Remove extra whitespace
    text = text.trim();
    
    // Try to extract just the price part
    const priceMatch = text.match(/\$?([\d,]+(?:\.\d{2})?)/);
    if (priceMatch) {
      const numericPrice = priceMatch[1].replace(/,/g, '');
      // Always return with $ prefix since we're extracting the numeric part
      return `$${numericPrice}`;
    }
    
    // Fallback: return original text
    return text;
  };

  const getCssSelector = (el: Element) => {
    if (el.id) return `#${el.id}`;
    if (el.className) {
      const classes = Array.from(el.classList).join('.');
      return `${el.tagName.toLowerCase()}.${classes}`;
    }
    return el.tagName.toLowerCase();
  };

  // Only return clean, structured data
  const metaSignals = extractMetaSignals();
  
  // Get advanced variant information
  let variantInfo = null;
  try {
    variantInfo = extractVariantInfo(document);
    if (variantInfo) {
      console.log('🎯 Full variant info extracted:', variantInfo);
      // Cache the variant info for this URL
      cacheVariantInfo(window.location.href, variantInfo);
    }
  } catch (error) {
    console.error('🎯 Error extracting full variant info:', error);
  }
  
  
  const cleanData = {
    title: getTitle(),
    price: getPrice(),
    image: getImage(metaSignals),
    url: window.location.href,
    variants: extractVariants(),
    variantInfo: variantInfo, // Include full variant information
    meta: {
      canonical: metaSignals.canonical,
      image: metaSignals.image,
      images: metaSignals.images,
      sourceMap: metaSignals.sourceMap
    }
  };
  
  // Validate the data before returning
  console.log('🎯 Raw extracted data:', cleanData);
  if (metaSignals.canonical) {
    console.log('🎯 Found canonical URL from meta tags:', metaSignals.canonical, 'Source:', metaSignals.sourceMap?.canonical);
  }
  if (metaSignals.image) {
    console.log('🎯 Found image from meta tags:', metaSignals.image, 'Source:', metaSignals.sourceMap?.image);
  }
  
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

  let refElement: Element | null = null;
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
    
    // Clear cache and re-extract variants
    clearVariantCache();
    
    // Re-extract variant info
    const variantInfo = extractVariantInfo(document);
    if (variantInfo) {
      console.log('🔄 Fresh variant extraction:', variantInfo);
      // Cache the new data
      cacheVariantInfo(window.location.href, variantInfo);
    }
    
    // You can add your popup logic here
    alert('DealPop button clicked! Cache cleared and variants re-extracted.');
  });

  // Position the button
  if (refElement === document.body) {
    // Fixed position in top-right corner
    btn.style.position = 'fixed';
    btn.style.top = '20px';
    btn.style.right = '20px';
  } else if (refElement) {
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
    } else {
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

// Expose cache functions globally for debugging
(window as any).dealPopCache = {
  clear: clearVariantCache,
  get: getCachedVariantInfo,
  set: cacheVariantInfo,
  info: () => {
    console.log('📊 Current cache contents:');
    console.log('Cache size:', variantCache.size);
    console.log('Cached URLs:', Array.from(variantCache.keys()));
    console.log('Current URL:', window.location.href);
    console.log('Current cache entry:', variantCache.get(window.location.href));
  }
};

console.log('🔧 DealPop cache functions exposed globally:');
console.log('  - dealPopCache.clear() - Clear all cached variants');
console.log('  - dealPopCache.info() - Show cache status');
console.log('  - dealPopCache.get(url) - Get cached data for URL');

// Test variant extraction on page load
function testVariantExtraction() {
  console.log('🧪 Testing variant extraction...');
  
  try {
    const variantInfo = extractVariantInfo(document);
    if (variantInfo) {
      console.log('✅ Variant extraction successful:', variantInfo);
      
      // Test caching
      cacheVariantInfo(window.location.href, variantInfo);
      console.log('✅ Variant info cached for URL:', window.location.href);
      
      // Test cache retrieval
      const cached = getCachedVariantInfo(window.location.href);
      console.log('✅ Cache retrieval successful:', cached);
    } else {
      console.log('ℹ️ No variant info found on this page');
    }
  } catch (error) {
    console.error('❌ Variant extraction error:', error);
  }
}

// Run after DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectDealPopButton();
    testVariantExtraction();
  });
} else {
  injectDealPopButton();
  testVariantExtraction();
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('🎯 Content script received message:', msg);
  
  if (msg.command === "extractProductInfo") {
    console.log('🎯 Extracting product info...');
    const data = extractProductInfo();
    console.log('🎯 Product info extracted:', data);
    sendResponse(data);
  }


});

 