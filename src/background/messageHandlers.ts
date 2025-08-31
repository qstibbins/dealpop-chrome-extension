/// <reference types="chrome"/>

import { State } from './state.js';
import { extractPrice } from './priceUtils.js';

export function registerMessageHandlers(state: State) {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.command === 'extractPrice') {
      extractPrice(msg.url, msg.selector)
        .then(price => sendResponse({ price }))
        .catch(err => sendResponse({ error: err.message }));
      return true;
    }

    if (msg.command === 'setToken') {
      state.token = msg.token;
      sendResponse({ status: 'ok' });
    }

    return false;
  });
} 