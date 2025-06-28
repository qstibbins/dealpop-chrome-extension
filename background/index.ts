/// <reference types="chrome"/>

import { registerMessageHandlers } from './messageHandlers.js';
import { State } from './state.js';

console.log('DealPop background script loaded successfully');

try {
  const state = new State();
  registerMessageHandlers(state);
  console.log('DealPop background script initialized successfully');
} catch (error) {
  console.error('Error initializing DealPop background script:', error);
}