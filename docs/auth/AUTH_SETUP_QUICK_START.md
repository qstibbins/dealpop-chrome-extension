# 🚀 Auth Setup Quick Start

## TL;DR - 3 Steps to Get Auth Working

### 1. Update Extension Config (2 minutes)

**File:** `src/config/extension.ts`

```typescript
DASHBOARD_URL: process.env.NODE_ENV === 'production'
  ? 'https://YOUR_DOMAIN.com/login?extension=true'  // ← Change this
  : 'http://localhost:5173/login?extension=true',   // ← Update port if needed
```

---

### 2. Get Extension ID & Add to Dashboard (3 minutes)

**A) Build & Load Extension:**
```bash
npm run build
# Then load unpacked extension from dist/ folder
```

**B) Copy Extension ID:**
- Go to `chrome://extensions/`
- Copy the long ID under your extension name

**C) Add to Dashboard:**

In your dashboard repo, add to `.env.local`:
```bash
VITE_EXTENSION_ID=paste-your-extension-id-here
```

Then restart your dashboard dev server.

---

### 3. Test It (1 minute)

1. Click extension icon
2. Click "Sign in with Google"  
3. Dashboard opens → Sign in
4. Extension popup shows you're logged in ✅

---

## That's It!

Your dashboard already has the `handleExtensionAuth()` function implemented, so it automatically:
- Detects `?extension=true` parameter
- Sends auth data back to extension
- Closes the tab after success

---

## Troubleshooting

**Dashboard doesn't send message?**
→ Wrong extension ID. Re-copy from `chrome://extensions/`

**Extension timeout?**
→ Dashboard URL wrong. Check `src/config/extension.ts`

**Can't find message?**
→ Check dashboard console: Should log "Auth sent to extension successfully"

---

## Your Dashboard Integration

Your dashboard's `AuthContext.tsx` already handles this with:

```typescript
const handleExtensionAuth = async (user: User) => {
  // Detects ?extension=true
  // Sends message to extension
  // All done! ✅
}
```

Just needs the correct EXTENSION_ID configured.

---

## For Production (After Publishing)

1. Publish extension to Chrome Web Store → Get permanent ID
2. Update dashboard production env: `VITE_EXTENSION_ID=permanent-id`
3. Update extension config with production dashboard URL
4. Done!

