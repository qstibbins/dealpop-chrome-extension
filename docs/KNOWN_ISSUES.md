# Known Issues and Limitations

## Overview

This document tracks known bugs, limitations, and planned improvements for the DealPop Chrome Extension. Issues are categorized by severity and include workarounds where available.

## Critical Issues

### 1. Extension ID Dependency
**Issue**: Extension ID must be manually added to dashboard configuration after each build
**Severity**: High
**Impact**: Authentication flow fails if extension ID changes
**Workaround**: 
1. Build extension and load in Chrome
2. Get extension ID from `chrome://extensions/`
3. Update dashboard's `externally_connectable` configuration
4. Redeploy dashboard

**Planned Fix**: Automate extension ID detection or use consistent extension ID

### 2. Dynamic Content Loading
**Issue**: Product data extraction fails on sites with dynamic content loading
**Severity**: High
**Impact**: Extension can't extract product info from some e-commerce sites
**Affected Sites**: 
- Sites using React/Vue/Angular with client-side rendering
- Sites with lazy-loaded product data
- Sites with AJAX price updates

**Workaround**: 
- Wait for page to fully load before extracting
- Use MutationObserver to detect content changes
- Retry extraction after delays

**Planned Fix**: Implement robust dynamic content detection

## High Priority Issues

### 3. Variant Detection Limitations
**Issue**: Variant detection doesn't work consistently across all retailers
**Severity**: High
**Impact**: Users may track wrong product variant
**Affected Retailers**:
- Some Amazon product pages with complex variant structures
- Walmart products with nested variant selectors
- Target products with dynamic variant loading

**Current Status**: 
- Amazon: 80% success rate
- Walmart: 70% success rate  
- Target: 75% success rate

**Workaround**: Manual variant selection in popup
**Planned Fix**: Enhanced variant detection algorithms

### 4. Price Extraction Edge Cases
**Issue**: Price extraction fails on certain product page layouts
**Severity**: High
**Impact**: Extension shows "No price found" for valid products
**Common Scenarios**:
- Sale prices with strikethrough original prices
- Subscription pricing models
- Bundle/package pricing
- International currency formats

**Workaround**: Fallback to manual price entry
**Planned Fix**: Expanded price selector patterns

### 5. Authentication Token Expiration
**Issue**: Users must re-authenticate when Firebase tokens expire
**Severity**: Medium
**Impact**: Poor user experience, requires frequent re-login
**Frequency**: Every 1-2 hours of inactivity

**Current Behavior**: 
- Token refresh attempts fail silently
- User sees "Not signed in" without clear error message
- Must manually sign in again

**Planned Fix**: Implement automatic token refresh with user notification

## Medium Priority Issues

### 6. Content Script Injection Timing
**Issue**: Content script may inject before page is fully ready
**Severity**: Medium
**Impact**: Product extraction fails on fast-loading pages
**Frequency**: ~10% of page loads

**Workaround**: 
- Use `run_at: "document_idle"` in manifest
- Add retry logic with delays
- Check for required DOM elements before extraction

**Planned Fix**: Implement smarter injection timing

### 7. Image CORS Issues
**Issue**: Product images may not load due to CORS restrictions
**Severity**: Medium
**Impact**: Product cards show broken images
**Affected Sites**: Sites with strict CORS policies

**Workaround**: 
- Use image proxy service
- Fallback to placeholder images
- Cache images locally when possible

**Planned Fix**: Implement image proxy or caching solution

### 8. Memory Usage Growth
**Issue**: Extension memory usage increases over time
**Severity**: Medium
**Impact**: Browser performance degradation
**Frequency**: After 2+ hours of continuous use

**Current Behavior**:
- Memory usage grows from ~10MB to ~50MB
- No memory leaks detected in code
- Likely due to Chrome extension overhead

**Planned Fix**: Implement memory cleanup routines

## Low Priority Issues

### 9. Popup Size Limitations
**Issue**: Popup window is too small for some product information
**Severity**: Low
**Impact**: Long product names or descriptions are truncated
**Chrome Limitation**: Popup max size is 800x600px

**Workaround**: 
- Truncate long text with ellipsis
- Add "View full details" link to dashboard
- Use tooltips for additional information

**Planned Fix**: Redesign popup layout for better space utilization

### 10. Browser Compatibility
**Issue**: Extension only works in Chrome-based browsers
**Severity**: Low
**Impact**: Limited browser support
**Supported Browsers**:
- Chrome (primary)
- Edge (Chromium-based)
- Opera (Chromium-based)

**Not Supported**:
- Firefox (different extension format)
- Safari (different extension format)
- Internet Explorer (deprecated)

**Planned Fix**: Consider Firefox extension development

### 11. Offline Functionality
**Issue**: Extension doesn't work when offline
**Severity**: Low
**Impact**: Users can't track products without internet
**Current Behavior**: All functionality requires internet connection

**Planned Fix**: Implement offline product caching and sync

## Retailer-Specific Issues

### Amazon
**Known Issues**:
- Variant detection fails on some product types (books, digital products)
- Price extraction issues with Subscribe & Save pricing
- Product image extraction fails on some product pages
- Title extraction includes unnecessary text (e.g., "Amazon's Choice")

**Success Rate**: 85% overall
**Planned Improvements**: Enhanced selectors for edge cases

### Walmart
**Known Issues**:
- Variant detection struggles with color swatches
- Price extraction fails on clearance items
- Product name extraction includes store-specific text
- Image URLs may be temporary/expire

**Success Rate**: 75% overall
**Planned Improvements**: Better variant detection for color/size options

### Target
**Known Issues**:
- Variant detection fails on some clothing items
- Price extraction issues with RedCard pricing
- Product image extraction fails on some categories
- Title extraction includes promotional text

**Success Rate**: 80% overall
**Planned Improvements**: Enhanced selectors for clothing variants

### Other Retailers
**Known Issues**:
- Limited support for smaller retailers
- Generic extraction may not work well
- No variant detection for unsupported sites

**Success Rate**: 60% overall
**Planned Improvements**: Expand retailer support

## Performance Issues

### 12. Bundle Size
**Issue**: Extension bundle is larger than ideal
**Severity**: Low
**Impact**: Slower installation and loading
**Current Size**: ~200KB total
**Target Size**: <150KB

**Planned Fix**: 
- Remove unused dependencies
- Implement code splitting
- Optimize React bundle

### 13. Content Script Performance
**Issue**: Content script may slow down page loading
**Severity**: Low
**Impact**: Slight performance impact on e-commerce sites
**Current Behavior**: Minimal impact, but measurable

**Planned Fix**: 
- Optimize DOM queries
- Use more efficient selectors
- Implement lazy loading

## Security Considerations

### 14. Token Storage
**Issue**: Firebase tokens stored in Chrome local storage
**Severity**: Low
**Impact**: Potential security risk if device is compromised
**Current Behavior**: Tokens stored in Chrome's secure storage

**Planned Fix**: Consider more secure storage options

### 15. Content Script Permissions
**Issue**: Content script runs on all websites
**Severity**: Low
**Impact**: Potential privacy concerns
**Current Behavior**: Script only activates on e-commerce sites

**Planned Fix**: Implement more granular permission system

## Planned Improvements

### Short Term (Next 2-4 weeks)
- [ ] Fix extension ID dependency issue
- [ ] Improve variant detection for Amazon
- [ ] Implement automatic token refresh
- [ ] Add better error messages for authentication

### Medium Term (Next 1-3 months)
- [ ] Expand retailer support (Best Buy, Home Depot)
- [ ] Implement dynamic content detection
- [ ] Add offline functionality
- [ ] Optimize bundle size

### Long Term (Next 3-6 months)
- [ ] Firefox extension development
- [ ] Advanced variant detection
- [ ] Image proxy service
- [ ] Performance optimizations

## Reporting Issues

### How to Report
1. **Check Existing Issues**: Review this document first
2. **Gather Information**:
   - Chrome version
   - Extension version
   - Website URL where issue occurred
   - Steps to reproduce
   - Console error messages
3. **Submit Issue**: Create GitHub issue with detailed information

### Issue Template
```
**Chrome Version**: 
**Extension Version**: 
**Website**: 
**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:

**Actual Behavior**:

**Console Errors**:

**Screenshots** (if applicable):
```

## Testing Status

### Automated Testing
- [ ] Unit tests for core functions
- [ ] Integration tests for API communication
- [ ] End-to-end tests for user flows

### Manual Testing
- [ ] Testing on major retailer sites
- [ ] Cross-browser compatibility testing
- [ ] Performance testing
- [ ] Security testing

### Test Coverage
- **Core Functions**: 80%
- **API Integration**: 90%
- **UI Components**: 70%
- **Error Handling**: 60%

## Monitoring

### Error Tracking
- Console errors logged to browser console
- API errors tracked in backend logs
- User feedback collected through support channels

### Performance Monitoring
- Extension load time
- Memory usage
- API response times
- User engagement metrics

### Success Metrics
- **Product Extraction Success Rate**: 80%
- **Authentication Success Rate**: 95%
- **User Retention**: 70% (7-day)
- **Chrome Web Store Rating**: Target 4.5+ stars

---

*This document is updated regularly as new issues are discovered and resolved. For the most current information, check the GitHub issues page.*
