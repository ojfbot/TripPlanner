import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import cssInjectedByJs from 'vite-plugin-css-injected-by-js';
import path from 'path';

// TripPlanner is a Module Federation REMOTE.
// The shell host at localhost:4000 loads this app's Dashboard via:
//   remotes: { tripplanner: 'http://localhost:3010/assets/remoteEntry.js' }
//
// Shell shared singletons (must match exactly — version mismatches silently break):
//   react, react-dom, @reduxjs/toolkit, react-redux

export default defineConfig({
  plugins: [
    react(),
    // cssInjectedByJs must come before federation — intercepts CSS extraction and
    // converts it to JS style-injection so the exposed Dashboard carries its own
    // styles. jsAssetsFilterFunction scopes injection to the Dashboard chunk only.
    cssInjectedByJs({
      jsAssetsFilterFunction: ({ fileName }) =>
        fileName.includes('__federation_expose_Dashboard'),
    }),
    federation({
      name: 'tripplanner',
      filename: 'remoteEntry.js',
      exposes: {
        './Dashboard': './src/components/Dashboard',
        './Settings': './src/components/settings/SettingsPanel',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.3.1' },
        'react-dom': { singleton: true, requiredVersion: '^18.3.1' },
        '@reduxjs/toolkit': { singleton: true, requiredVersion: '^2.5.0' },
        'react-redux': { singleton: true, requiredVersion: '^9.2.0' },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3010,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3011',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3010,
    cors: true,
  },
  css: {
    preprocessorOptions: {
      scss: {
        includePaths: ['node_modules'],
      },
    },
  },
  build: {
    target: 'esnext',
    minify: false, // Required for MF — minification mangles shared module exports
  },
});
