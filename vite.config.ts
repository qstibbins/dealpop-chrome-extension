import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { config } from 'dotenv'

export default defineConfig(({ mode }) => {
  // Explicitly load the correct .env file
  if (mode === 'production') {
    config({ path: '.env.prod' });
  } else {
    config({ path: '.env.development' });
  }
  
  // Load environment variables based on mode
  const env = loadEnv(mode, process.cwd(), '')
  
  console.log('🔍 Build mode:', mode);
  console.log('🔍 Environment variables loaded:', Object.keys(env).filter(key => key.startsWith('VITE_')));
  console.log('🔍 Firebase Project ID from env:', env.VITE_FIREBASE_PROJECT_ID);
  
  return {
  plugins: [
    react(),
    {
      name: 'copy-extension-assets',
      writeBundle() {
        // Ensure dist directory exists
        if (!existsSync('dist')) {
          mkdirSync('dist', { recursive: true });
        }

        // Copy manifest
        copyFileSync('manifest.json', 'dist/manifest.json');
        console.log('✓ Copied manifest.json');

        // Copy icon
        if (existsSync('icon.png')) {
          copyFileSync('icon.png', 'dist/icon.png');
          console.log('✓ Copied icon.png');
        }

        // Copy additional icon sizes if they exist
        if (existsSync('icons')) {
          const iconSizes = ['16', '48', '128'];
          const iconsDir = 'dist/icons';
          if (!existsSync(iconsDir)) {
            mkdirSync(iconsDir, { recursive: true });
          }
          
          iconSizes.forEach(size => {
            const iconFile = `icons/icon-${size}.png`;
            if (existsSync(iconFile)) {
              copyFileSync(iconFile, `${iconsDir}/icon-${size}.png`);
              console.log(`✓ Copied ${iconFile}`);
            }
          });
        }

        console.log('✓ Build complete! Extension ready in dist/ folder');
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/content.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        // Keep content script as a single file (don't code split)
        manualChunks: undefined,
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    // Ensure source maps are generated for debugging
    sourcemap: process.env.NODE_ENV !== 'production',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  base: './',
  define: {
    'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY),
    'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
    'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
    'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
    'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
    'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID),
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL),
    'import.meta.env.VITE_DASHBOARD_URL': JSON.stringify(env.VITE_DASHBOARD_URL),
    'import.meta.env.VITE_EXTENSION_DEBUG': JSON.stringify(env.VITE_EXTENSION_DEBUG),
    'import.meta.env.VITE_EXTENSION_VERSION': JSON.stringify(env.VITE_EXTENSION_VERSION),
    'import.meta.env.VITE_EXTENSION_ID': JSON.stringify(env.VITE_EXTENSION_ID),
    __APP_ENV__: JSON.stringify(mode),
  }
  }
}) 