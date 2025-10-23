# Chrome Extension MVP - Outstanding Tasks Tracker

**Target Dates:**
- Testing Ready: October 17, 2025
- Go Live: October 21, 2025

**Last Updated:** October 9, 2025

---

## Status Legend
- ❌ Not Started
- 🔄 In Progress
- ✅ Completed
- ⚠️ Blocked

---

## P0 - CRITICAL (Must Have for MVP)

### 1. Icon & Visual Presence
**MVP Requirement:** Extension icon appears on retail commerce sites (Row #2, #3)  
**Status:** ❌ Not Started  
**Estimated Effort:** 2-3 hours  
**Assignee:** _________

**Tasks:**
- [ ] Add `default_icon` property to manifest.json (currently missing)
- [ ] Create icon asset files:
  - [ ] 16x16px icon
  - [ ] 48x48px icon  
  - [ ] 128x128px icon
- [ ] Test icon visibility in Chrome toolbar on retail sites
- [ ] Decision: Keep or remove on-page "DP" button injection (lines 1042-1161 in `src/content/content.ts`)
  - [ ] If keep: Fix positioning and styling
  - [ ] If remove: Delete injection code
- [ ] Verify icon appears correctly after build

**Files to Modify:**
- `manifest.json`
- `src/content/content.ts` (if removing button)
- Create: `icons/icon-16.png`, `icons/icon-48.png`, `icons/icon-128.png`

**Dependencies:** None

---

### 2. Authentication Flow - Dashboard Integration
**MVP Requirement:** User authentication via Auth0/Google (Row #29)  
**Status:** ✅ Completed  
**Estimated Effort:** 4-6 hours  
**Assignee:** Completed 10/9/25

**Tasks:**
- [x] Replace placeholder dashboard URL in `src/services/firebaseAuth.ts:31`
  - Created centralized config in `src/config/extension.ts`
  - Dashboard URL configurable for dev and production
- [x] Dashboard-side extension communication:
  - Dashboard already has `handleExtensionAuth()` implemented
  - Message format verified and documented
- [x] Improved auth flow implementation:
  - Added proper error handling with specific error codes
  - Added user cancellation handling
  - Added timeout handling with configurable duration
  - Added token timestamp tracking
  - Added validation for auth data
- [x] Error handling for auth failures:
  - User-friendly error messages in popup
  - Specific error codes for different scenarios
  - Proper cleanup on errors
- [x] Documentation created:
  - `DASHBOARD_INTEGRATION_SETUP.md` - Complete setup guide
  - `AUTH_SETUP_QUICK_START.md` - Quick reference
  - Configuration instructions for dashboard team

**Files Modified:**
- ✅ `src/config/extension.ts` (created)
- ✅ `src/services/firebaseAuth.ts` (enhanced)
- ✅ `src/popup/App.tsx` (improved error handling)
- ✅ `DASHBOARD_INTEGRATION_SETUP.md` (created)
- ✅ `AUTH_SETUP_QUICK_START.md` (created)

**Remaining:**
- [ ] Configure actual dashboard URL (user must provide)
- [ ] Add extension ID to dashboard (after first build)
- [ ] Test end-to-end flow (ready for testing)

**Dependencies:** 
- ⚠️ User needs to provide production dashboard URL
- ⚠️ Extension ID needed after first build/publish

---

### 3. Build & Deployment Pipeline
**MVP Requirement:** Extension must build and install correctly  
**Status:** ✅ Completed  
**Estimated Effort:** 3-4 hours  
**Assignee:** Completed 10/11/25

**Tasks:**
- [x] Fix content script compilation issue:
  - Content script now properly compiled from `src/content/content.ts`
  - Added to Vite rollup inputs
  - TypeScript compilation working correctly
- [x] Update `vite.config.ts`:
  - Added content script to rollup inputs
  - Created custom plugin for asset copying
  - Configured source maps for development
  - Added icon copying with size support
- [x] Update `tsconfig.json`:
  - Include all source files (src/**/*.ts, src/**/*.tsx)
  - Added proper types (chrome, vite/client)
  - Configured JSX for React
  - Added path aliases (@/*)
- [x] Create build scripts:
  - `npm run build` - Development build with source maps
  - `npm run build:prod` - Production build (minified, no source maps)
  - `npm run build:watch` - Watch mode for development
  - `npm run clean` - Clean dist folder
  - `npm run type-check` - TypeScript checking
- [x] Test full build pipeline:
  - ✅ Build completes successfully
  - ✅ All files in dist/ folder:
    - background.js (4.7 KB)
    - content.js (23.7 KB)
    - popup.js (153 KB)
    - firebaseAuth.js (161 KB)
    - manifest.json
    - icon.png
    - popup.css
    - src/popup/index.html
- [x] Document build process:
  - Created comprehensive `BUILD_GUIDE.md`
  - Includes troubleshooting
  - Icon creation instructions
  - CI/CD examples
  - Development workflow

**Files Modified:**
- ✅ `vite.config.ts` - Enhanced with content script compilation
- ✅ `package.json` - Updated build scripts
- ✅ `tsconfig.json` - Proper TypeScript configuration
- ✅ `manifest.json` - Added icon references and description
- ✅ `BUILD_GUIDE.md` - Created comprehensive guide

**Build Output:**
```
dist/background.js       4.73 KB
dist/content.js         23.56 KB  
dist/popup.js          152.97 KB
dist/firebaseAuth.js   161.48 KB
dist/manifest.json       0.99 KB
dist/icon.png            1.21 KB
```

**Remaining:**
- [ ] Create proper icon files (16x16, 48x48, 128x128) - documented in BUILD_GUIDE.md

**Dependencies:** None - Build system fully operational

---

### 4. Backend API Configuration
**MVP Requirement:** Extension must communicate with backend (Row #12-16)  
**Status:** ❌ Not Started  
**Estimated Effort:** 2-3 hours  
**Assignee:** _________

**Tasks:**
- [ ] Get production backend API URL from backend team
- [ ] Update `src/config/api.ts:7`:
  - Current: `https://your-api.com`
  - Required: Actual production URL
- [ ] Update `manifest.json` host_permissions to include backend domain
- [ ] Test API connectivity:
  - [ ] Health check endpoint
  - [ ] Product tracking endpoint
  - [ ] Error responses
- [ ] Verify CORS configuration on backend
- [ ] Test with authentication headers
- [ ] Document expected API responses
- [ ] Add API error codes documentation

**Files to Modify:**
- `src/config/api.ts`
- `manifest.json` (host_permissions)
- `API_INTEGRATION_README.md` (update)

**Dependencies:** Backend must be deployed with correct CORS settings

---

### 5. Core Testing Suite
**MVP Requirement:** Unit tests for utilities and key flows (Row #37)  
**Status:** ❌ Not Started  
**Estimated Effort:** 8-10 hours  
**Assignee:** _________

**Tasks:**
- [ ] Create unit tests for product extraction:
  - [ ] `tests/__tests__/extraction.test.ts`
  - [ ] Test title extraction
  - [ ] Test price extraction
  - [ ] Test image extraction
  - [ ] Test variant extraction
- [ ] Create unit tests for API client:
  - [ ] `tests/__tests__/apiClient.test.ts`
  - [ ] Test request formatting
  - [ ] Test auth headers
  - [ ] Test error handling
  - [ ] Test token refresh
- [ ] Create unit tests for auth flow:
  - [ ] `tests/__tests__/firebaseAuth.test.ts`
  - [ ] Test sign in flow
  - [ ] Test sign out
  - [ ] Test token storage
  - [ ] Test auth state changes
- [ ] Create manual test checklist:
  - [ ] `tests/MANUAL_TEST_CHECKLIST.md`
- [ ] Run all tests and fix failures
- [ ] Set up CI/CD test running (if applicable)

**Files to Create:**
- `tests/__tests__/extraction.test.ts`
- `tests/__tests__/apiClient.test.ts`
- `tests/__tests__/firebaseAuth.test.ts`
- `tests/MANUAL_TEST_CHECKLIST.md`

**Dependencies:** Core functionality must be working

---

### 6. Chrome Web Store Submission
**MVP Requirement:** Must be published to go live  
**Status:** ❌ Not Started  
**Estimated Effort:** 4-6 hours (+ 1-3 days review time)  
**Assignee:** _________

**Tasks:**
- [ ] Create Chrome Web Store developer account ($5 fee)
- [ ] Prepare promotional images:
  - [ ] Small tile: 440x280px
  - [ ] Large promo tile: 1400x560px
  - [ ] Marquee promo tile: 920x680px (optional)
- [ ] Prepare screenshots:
  - [ ] 1280x800px or 640x400px
  - [ ] Minimum 1 screenshot, recommended 3-5
  - [ ] Show key features: login, product tracking, confirmation
- [ ] Write store description:
  - [ ] Short description (132 chars max)
  - [ ] Detailed description
  - [ ] Feature highlights
- [ ] Create privacy policy:
  - [ ] Document data collection
  - [ ] Firebase usage
  - [ ] Product tracking data
  - [ ] Publish to accessible URL
- [ ] Create support documentation:
  - [ ] User guide
  - [ ] FAQ
  - [ ] Contact information
- [ ] Fill out store listing form:
  - [ ] Category: Shopping
  - [ ] Language: English
  - [ ] Privacy policy URL
  - [ ] Support URL/email
- [ ] Submit for review (aim for October 18)
- [ ] Monitor review status
- [ ] Address any review feedback

**Files to Create:**
- `PRIVACY_POLICY.md`
- `store-assets/` directory with images
- `docs/USER_GUIDE.md`
- `docs/FAQ.md`

**Dependencies:** All other P0 items must be complete

---

## P1 - IMPORTANT (Should Have for MVP)

### 7. Multi-Retailer Support Validation
**MVP Requirement:** Support for multiple retail domains (Row #4 in Features)  
**Status:** ❌ Not Started  
**Estimated Effort:** 6-8 hours  
**Assignee:** _________

**Tasks:**
- [ ] Test extraction on Amazon:
  - [ ] Product title
  - [ ] Price (including sale prices)
  - [ ] Product image
  - [ ] Variants (color, size, etc.)
  - [ ] Multiple product types
- [ ] Test extraction on Walmart:
  - [ ] Product title
  - [ ] Price
  - [ ] Product image
  - [ ] Variants
- [ ] Test extraction on Target:
  - [ ] Product title
  - [ ] Price
  - [ ] Product image
  - [ ] Variants
- [ ] Test extraction on eBay:
  - [ ] Product title
  - [ ] Price
  - [ ] Product image
  - [ ] Variants
- [ ] Test extraction on 2-3 other major retailers
- [ ] Document officially supported retailers
- [ ] Add user-facing error messages for unsupported sites
- [ ] Create fallback extraction for unrecognized retailers
- [ ] Update README with supported retailers list

**Files to Modify:**
- `src/content/content.ts` (if extraction needs fixes)
- `README.md` (add supported retailers)
- `tests/RETAILER_SUPPORT.md` (create)

**Dependencies:** Build pipeline must be working

---

### 8. Error Handling & User Feedback
**MVP Requirement:** Good UX for error scenarios  
**Status:** ❌ Not Started  
**Estimated Effort:** 4-5 hours  
**Assignee:** _________

**Tasks:**
- [ ] Add loading states for all async operations:
  - [ ] Auth sign in
  - [ ] Product extraction
  - [ ] API calls
- [ ] Improve error messages (currently generic):
  - [ ] Network errors
  - [ ] Extraction failures
  - [ ] API errors
  - [ ] Auth errors
- [ ] Handle network failures gracefully:
  - [ ] Offline detection
  - [ ] Timeout handling
  - [ ] Retry logic
- [ ] Handle extraction failures:
  - [ ] No price found
  - [ ] No title found
  - [ ] No image found
  - [ ] Show helpful messages
- [ ] Add retry logic for failed API calls:
  - [ ] Exponential backoff
  - [ ] Max retries
- [ ] Show user-friendly messages for common errors
- [ ] Add "Report Issue" functionality:
  - [ ] Button in popup
  - [ ] Collect error details
  - [ ] Send to support email or form

**Files to Modify:**
- `src/popup/App.tsx`
- `src/services/apiClient.ts`
- `src/content/content.ts`

**Dependencies:** None

---

### 9. User Documentation
**MVP Requirement:** Users need to know how to use the extension  
**Status:** ❌ Not Started  
**Estimated Effort:** 3-4 hours  
**Assignee:** _________

**Tasks:**
- [ ] Create installation guide:
  - [ ] `docs/INSTALLATION.md`
  - [ ] How to install from Chrome Web Store
  - [ ] How to grant permissions
  - [ ] First-time setup
- [ ] Create user guide:
  - [ ] `docs/USER_GUIDE.md`
  - [ ] How to sign in
  - [ ] How to track first product
  - [ ] How to set price goals
  - [ ] How to view tracked products
- [ ] Create troubleshooting guide:
  - [ ] `docs/TROUBLESHOOTING.md`
  - [ ] Common issues
  - [ ] How to check console logs
  - [ ] How to report bugs
- [ ] Create FAQ:
  - [ ] `docs/FAQ.md`
  - [ ] Which sites are supported?
  - [ ] How often are prices checked?
  - [ ] How do I get notifications?
  - [ ] Privacy and data questions
- [ ] Update main README:
  - [ ] Clear description
  - [ ] Quick start guide
  - [ ] Link to detailed docs
- [ ] Create developer documentation:
  - [ ] `docs/DEVELOPER_GUIDE.md`
  - [ ] Local setup
  - [ ] Build process
  - [ ] Architecture overview

**Files to Create:**
- `docs/INSTALLATION.md`
- `docs/USER_GUIDE.md`
- `docs/TROUBLESHOOTING.md`
- `docs/FAQ.md`
- `docs/DEVELOPER_GUIDE.md`

**Files to Modify:**
- `README.md`

**Dependencies:** Extension must be feature complete

---

## P2 - NICE TO HAVE (Polish for MVP)

### 10. User Experience Enhancements
**MVP Requirement:** Polish for better UX  
**Status:** ❌ Not Started  
**Estimated Effort:** 3-4 hours  
**Assignee:** _________

**Tasks:**
- [ ] Add "View Dashboard" button in popup
- [ ] Add "View Tracked Products" link to dashboard
- [ ] Improve tracking confirmation screen:
  - [ ] Show product thumbnail
  - [ ] Show price goal
  - [ ] Add link to dashboard
- [ ] Add tooltips for unclear UI elements
- [ ] Implement settings panel (currently empty stub):
  - [ ] Extraction method preference
  - [ ] Notification preferences
  - [ ] Default tracking period
- [ ] Add keyboard shortcuts (optional)
- [ ] Improve accessibility:
  - [ ] ARIA labels
  - [ ] Keyboard navigation
  - [ ] Screen reader support
- [ ] Polish visual design:
  - [ ] Consistent spacing
  - [ ] Better button styles
  - [ ] Improved color scheme

**Files to Modify:**
- `src/popup/App.tsx`
- `src/popup/index.css`

**Dependencies:** None

---

### 11. Advanced Variant Handling
**MVP Requirement:** Handle variant-based product pages (Row #4 in Features)  
**Status:** 🔄 Partially Done  
**Estimated Effort:** 2-3 hours testing/fixes  
**Assignee:** _________

**Tasks:**
- [ ] Test variant extraction thoroughly:
  - [ ] Amazon product with colors
  - [ ] Amazon product with sizes
  - [ ] Target product with variants
  - [ ] Walmart product with variants
- [ ] Verify variant caching works correctly
- [ ] Test variant re-selection on revisit
- [ ] Add UI to show detected variants in popup
- [ ] Document variant extraction capabilities
- [ ] Add fallback for variant extraction failures

**Files to Modify:**
- `src/content/content.ts` (if fixes needed)
- `src/popup/App.tsx` (to display variants)
- `VARIANT_EXTRACTION_README.md` (update)

**Dependencies:** Multi-retailer testing

---

## Timeline & Milestones

### Week 1: October 9-11 (Core Functionality)
**Goal:** Get extension fully functional end-to-end

- [ ] Day 1 (Oct 9): Build pipeline + Icon configuration
  - Complete: #3 Build & Deployment Pipeline
  - Complete: #1 Icon & Visual Presence
- [ ] Day 2 (Oct 10): Authentication + API
  - Complete: #2 Authentication Flow
  - Complete: #4 Backend API Configuration
  - Test: Full flow (install → auth → track)
- [ ] Day 3 (Oct 11): Testing infrastructure
  - Complete: #5 Core Testing Suite
  - Run all tests

### Week 2: October 14-16 (Testing & Polish)
**Goal:** Validate all functionality, improve UX, create documentation

- [ ] Day 4 (Oct 14): Retailer testing
  - Complete: #7 Multi-Retailer Support Validation
  - Fix any extraction issues
- [ ] Day 5 (Oct 15): Error handling + UX
  - Complete: #8 Error Handling & User Feedback
  - Complete: #10 User Experience Enhancements (if time)
- [ ] Day 6 (Oct 16): Documentation
  - Complete: #9 User Documentation
  - Prepare store assets for #6

### Week 3: October 17-21 (Launch)
**Goal:** Submit to store, final testing, go live

- [ ] Oct 17: Final testing & validation
  - Run complete manual test checklist
  - Fix any critical bugs
  - **TESTING READY CHECKPOINT**
- [ ] Oct 18: Chrome Web Store submission
  - Complete: #6 Chrome Web Store Submission
  - Submit for review
- [ ] Oct 19-20: Review & contingency
  - Monitor review status
  - Address any feedback
  - Final polish
- [ ] Oct 21: Go Live
  - Publish approved extension
  - **LAUNCH! 🚀**

---

## Risk Factors & Mitigation

### Risk 1: Chrome Web Store Review Delay
**Likelihood:** Medium  
**Impact:** High  
**Mitigation:**
- Submit by Oct 18 (3 days before launch)
- Have contingency plan to distribute via .crx file if needed
- Prepare detailed privacy policy and documentation to avoid rejection

### Risk 2: Backend API Not Ready
**Likelihood:** Medium  
**Impact:** High  
**Mitigation:**
- Coordinate with backend team early
- Get API deployed to production by Oct 10
- Test integration continuously, not just at end

### Risk 3: Dashboard Authentication Issues
**Likelihood:** Medium  
**Impact:** High  
**Mitigation:**
- Prioritize this in Week 1
- Test thoroughly on Oct 10
- Have fallback auth method if needed

### Risk 4: Extraction Failures on Major Retailers
**Likelihood:** Low-Medium  
**Impact:** High  
**Mitigation:**
- Test all major retailers by Oct 14
- Implement robust fallback extraction
- Document limitations clearly

---

## Success Criteria

- [ ] Extension installs without errors from Chrome Web Store
- [ ] User can sign in with Google successfully
- [ ] Extension extracts product info from Amazon, Walmart, Target
- [ ] User can track a product successfully
- [ ] Product appears in dashboard
- [ ] No critical errors in console
- [ ] All P0 tasks completed
- [ ] At least 80% of P1 tasks completed
- [ ] Extension passes Chrome Web Store review

---

## Notes & Decisions

### Decisions Made:
- _[Record major decisions here as they're made]_

### Open Questions:
- _[Record questions that need answers]_

### Blockers:
- _[Record any blockers and their status]_

---

## Resource Links

- MVP Timeline: `MVP Timeline(Features).csv`
- Firebase Setup: `FIREBASE_SETUP_GUIDE.md`
- API Integration: `API_INTEGRATION_README.md`
- Quick Start: `QUICK_START_CHECKLIST.md`
- Variant Extraction: `VARIANT_EXTRACTION_README.md`

