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
3. Build (if using TypeScript or a bundler):
   ```sh
   npm run build
   ```
4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable **Developer mode**
   - Click **Load unpacked** and select the `chrome-extension` directory

## Development
- Main extension logic is in the `chrome-extension/` folder
- `content.js` extracts product info from web pages
- `popup.html` and `popup.js` handle the popup UI
- Background scripts are in `background/`
- Use `npm run build` to compile TypeScript (if applicable)

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