# DealPop Chrome Extension

DealPop is a Chrome extension that helps you track product prices on e-commerce websites like Amazon. It allows you to extract product information and start tracking price changes with a single click.

## Features
- Extracts product title, price, image, and variants from product pages
- Tracks price changes for products
- Simple login and authentication
- Easy-to-use popup interface

## Installation
1. Clone this repository:
   ```sh
   git clone <your-repo-url>
   cd chrome-extension
   ```
2. Install dependencies:
   ```sh
   npm install
   ```

## Testing in Chrome

### Testing the **Old (Vanilla)** Version

1. **Build (if needed):**
   ```sh
   npm run build
   ```
   (Or skip if using plain JS files)

2. **Load the extension:**
   - Go to `chrome://extensions/`
   - Enable **Developer mode**
   - Click **Load unpacked** and select the `chrome-extension` directory (not `dist/`)
   - This will use the original `popup.html`, `content.js`, and background scripts

---

### Testing the **New (Vite + React + Tailwind)** Version

1. **Build the extension:**
   ```sh
   npm run build
   ```
   This will output the production-ready extension to the `dist/` folder.

2. **Load the extension:**
   - Go to `chrome://extensions/`
   - Enable **Developer mode**
   - Click **Load unpacked** and select the `dist/` directory
   - This will use the new React popup, Vite-bundled scripts, and Tailwind styling

3. **Reload after changes:**
   - After making code changes, run `npm run build` again and click **Reload** in the Chrome Extensions page.

---

## Development
- Main extension logic is in the `src/` folder (for Vite version)
- Legacy files are in the root (`popup.html`, `popup.js`, `content.js`, etc.)
- Use `npm run build` to compile the Vite/React version

## Testing
- Tests are located in `chrome-extension/__tests__/`
- Run tests with:
  ```sh
  npm test
  ```
- Make sure to install Jest and its types:
  ```sh
  npm install --save-dev jest @types/jest ts-jest
  ```

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
MIT 