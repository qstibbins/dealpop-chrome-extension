# Chrome Extension Repository Analysis

## Overview
This document provides a comprehensive analysis of the DealPop Chrome extension repository, covering its architecture, functionality, and data flow patterns.

## Technical Specifications

### a) Manifest Version
**Manifest V3** - The extension uses `"manifest_version": 3` in the manifest.json file.

### b) Data Scraping vs API
**Scrapes product data directly from web pages** - The extension has sophisticated content script functionality that:
- Extracts product information (title, price, image, variants) directly from web page DOM
- Uses multiple extraction methods including structured data (JSON-LD), meta tags, and DOM selectors
- Has retailer-specific selectors for Amazon, Target, Walmart, and other e-commerce sites
- Includes advanced variant detection for product options (color, size, style, etc.)

### c) Backend Communication
**Communicates directly with the backend API** - The extension:
- Has its own API client (`src/services/apiClient.ts`) that makes direct HTTP requests to the backend
- Uses Bearer token authentication for API calls
- Sends scraped product data directly to the backend API endpoints
- Does NOT route through the frontend - it bypasses the dashboard entirely for data operations

### d) Authentication Flow
**Gets tokens from the frontend/dashboard** - The authentication flow works as follows:
1. Extension opens the dashboard website for authentication
2. User signs in via Google OAuth on the dashboard
3. Dashboard sends the authentication token back to the extension via `chrome.runtime.sendMessage`
4. Extension stores the token locally and uses it for direct API calls
5. The extension does NOT handle OAuth directly - it relies on the dashboard for authentication

### e) Core Functionality
The extension **tracks product prices and manages watchlists**:
- **Price Tracking**: Scrapes current prices from product pages
- **Product Monitoring**: Adds products to a watchlist with target prices
- **Price Alerts**: Monitors price changes and notifies users when prices drop
- **Product Management**: Allows users to update/delete tracked products
- **Variant Detection**: Handles product variants (color, size, etc.) for accurate tracking

## Data Flow Architecture

### Where does it send data?
- **Primary Backend API** (default): The extension sends all scraped product data directly to the main backend API at:
  - Production: `https://bzu99jbwnr.us-east-2.awsapprunner.com`
  - Development: `http://localhost:3000`
- **NOT to the scraper service**: There's no evidence of communication with a separate scraper service
- **NOT through the frontend**: The extension bypasses the dashboard for data operations

### Architecture Flow
```
1. Content Script → Scrapes product data from web pages
2. Background Script → Processes and transforms the data
3. API Client → Sends data directly to backend API
4. Dashboard → Only used for authentication, not data flow
```

## Key Components

### Content Script (`src/content/content.ts`)
- **Product Data Extraction**: Comprehensive scraping of product information
- **Variant Detection**: Advanced detection of product variants (color, size, style)
- **Multi-source Extraction**: Uses structured data, meta tags, and DOM selectors
- **Retailer-specific Logic**: Custom extraction for Amazon, Target, Walmart

### Background Script (`src/background/`)
- **Message Handling**: Processes communication between content script and popup
- **API Integration**: Handles product tracking requests to backend
- **Authentication Management**: Manages auth tokens and user state

### API Client (`src/services/apiClient.ts`)
- **Direct Backend Communication**: Makes HTTP requests to backend API
- **Authentication**: Handles Bearer token authentication
- **Product Management**: CRUD operations for tracked products

### Authentication Service (`src/services/auth.ts`)
- **Dashboard Integration**: Opens dashboard for OAuth authentication
- **Token Management**: Stores and retrieves authentication tokens
- **State Management**: Tracks authentication status

## Configuration

### API Endpoints
- **Base URL**: Configurable via environment variables
- **Product Tracking**: `POST /api/products`
- **Product Management**: `GET/PUT/DELETE /api/products/{id}`
- **Health Check**: `GET /health`

### Permissions
- `activeTab`: Access to current tab content
- `scripting`: Inject content scripts
- `storage`: Store authentication data
- `tabs`: Create authentication tabs

## Summary

This is a **direct scraping + API approach** where:
- The extension performs sophisticated product data extraction from web pages
- Scraped data is sent directly to the backend API
- Authentication is handled through the dashboard website
- The extension operates independently for data operations, bypassing the frontend

The architecture is designed for efficiency and reliability, with the extension handling the complex task of product data extraction while maintaining direct communication with the backend for data persistence and processing.
