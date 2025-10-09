import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Firebase configuration for the deal-pop project
// Using your actual Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyA83GztYPrTDd4iIsdtjXz8Ix-A9Rr3K18",
  authDomain: "deal-pop.firebaseapp.com",
  projectId: "deal-pop",
  storageBucket: "deal-pop.firebasestorage.app",
  messagingSenderId: "322820763406",
  appId: "1:322820763406:web:ddad1eb51d5920ebc5b15f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Set auth language (optional, but can help with initialization)
auth.languageCode = 'en';

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export default app;
