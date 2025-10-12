import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, existsSync, mkdirSync } from 'fs'

export default defineConfig({
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
  base: './'
}) 