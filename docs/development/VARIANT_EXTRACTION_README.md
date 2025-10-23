# Variant Extraction for DealPop Chrome Extension

This document describes the advanced variant extraction functionality that has been integrated into the DealPop Chrome extension.

## Overview

The variant extractor provides robust extraction of product variant information from e-commerce product pages using a multi-layered approach with trust ordering:

1. **Embedded JSON** (highest priority) - App state, React props, etc.
2. **JSON-LD** - Structured data markup
3. **OG/Meta tags** - Open Graph and meta tag hints
4. **DOM heuristics** (lowest priority) - ARIA attributes, form elements

## Features

- **Normalized attribute keys** - All variant attributes are normalized to lowercase (color, size, style, etc.)
- **Fallback mechanisms** - When reselection fails due to DOM changes, falls back to text matching
- **Caching** - Variant data is cached per URL to avoid re-work during navigation
- **Reselection hints** - Provides robust selectors and indices for later variant selection

## Usage

### Basic Extraction

```typescript
import { extractVariantInfo } from './src/utils/variant-extractor';

// Extract variant info from current document
const variantInfo = extractVariantInfo(document);

if (variantInfo) {
  console.log('Selected variant:', variantInfo.selectedVariant);
  console.log('Variant key:', variantInfo.variantKey);
  console.log('Available options:', variantInfo.options);
  console.log('Data sources:', variantInfo.source);
}
```

### Caching

```typescript
import { cacheVariantInfo, getCachedVariantInfo, clearVariantCache } from './src/utils/variant-extractor';

// Cache variant info for a URL
cacheVariantInfo('https://example.com/product', variantInfo);

// Retrieve cached info
const cached = getCachedVariantInfo('https://example.com/product');

// Clear all cached data
clearVariantCache();
```

## Data Structure

### VariantInfo

```typescript
type VariantInfo = {
  selectedVariant: Record<string, string>; // {color: "Blue", size: "L"}
  variantKey?: string;                      // ASIN / itemId / SKU / selectedSkuId
  options?: Record<string, string[]>;       // available values, by attribute
  source: Array<"ld+json"|"og/meta"|"embedded"|"dom">;
  variantSelectorData?: {
    urlParams?: Record<string,string>;
    attrs: Array<{
      name: string;                // "Color"
      value: string;               // "Blue"
      groupSelector: string;       // e.g., [role="radiogroup"][aria-label*="Color" i]
      optionIndex: number;         // index within clickable options at visit time
      optionSelector: string;      // selector used to click (radio/option/button)
    }>;
    variantKeyParam?: string;      // e.g., "skuId", "ASIN", "tcin"
  };
};
```

## Supported Retailers

The extractor includes specialized support for major retailers:

- **Amazon** - ASIN extraction from URLs (e.g., `/dp/B08N5WRWNW`)
- **Walmart** - TCIN extraction from URLs (e.g., `/ip/product-name/123456`)
- **Target** - DPCI extraction from URLs (e.g., `/A-12345678`)

## Integration with Content Script

The variant extractor is automatically integrated into the DealPop content script:

1. **Automatic extraction** - Runs when `extractProductInfo()` is called
2. **Enhanced data** - Adds `variantInfo` field to product data
3. **Fallback support** - Falls back to basic extraction if advanced methods fail
4. **Logging** - Provides detailed console logging for debugging

## Testing

### Test HTML Page

A test page is available at `test-extension/variant-test.html` that demonstrates:

- JSON-LD structured data
- Embedded app state JSON
- DOM variant selectors
- Interactive testing interface

### Unit Tests

Run the test suite with:

```bash
npm test
```

Tests cover:
- JSON-LD extraction
- Meta tag parsing
- DOM element detection
- URL-based extraction
- Caching functionality

## Debugging

The extractor provides extensive console logging:

```typescript
// Enable debug logging
console.log('🎯 Advanced variant extraction found:', variantInfo);
console.log('🎯 Full variant info extracted:', variantInfo);
console.log('🎯 Falling back to basic variant extraction');
```

## Performance Considerations

- **Caching** - Variant data is cached per URL to avoid re-extraction
- **Lazy evaluation** - DOM queries are only performed when needed
- **Error handling** - Graceful fallbacks prevent crashes
- **Memory management** - Cache can be cleared when needed

## Future Enhancements

Potential improvements include:

- **Machine learning** - Pattern recognition for new variant formats
- **Retailer plugins** - Extensible retailer-specific extraction logic
- **Real-time updates** - Mutation observers for dynamic content
- **Performance metrics** - Extraction timing and success rate tracking

## Troubleshooting

### Common Issues

1. **No variants found** - Check if page has structured data or clear variant selectors
2. **Incorrect variants** - Verify JSON-LD schema compliance
3. **Performance issues** - Clear cache or check for excessive DOM queries

### Debug Steps

1. Check browser console for extraction logs
2. Verify page has proper structured data
3. Test with the provided test HTML page
4. Check if variants are in expected DOM locations

## Contributing

When adding new extraction methods:

1. Follow the trust order (embedded → JSON-LD → OG/meta → DOM)
2. Add comprehensive error handling
3. Include unit tests for new functionality
4. Update this documentation
5. Consider performance impact of new selectors
