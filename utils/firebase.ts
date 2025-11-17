import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validate Firebase configuration
const isFirebaseConfigured = Object.values(firebaseConfig).every(value =>
    value && typeof value === 'string' && !value.includes('YOUR_')
);

let app: any;
let db: any;

try {
    if (isFirebaseConfigured) {
        // Initialize Firebase
        app = initializeApp(firebaseConfig);

        // Initialize Firestore (only what we need)
        db = getFirestore(app);
        console.log('Firebase Firestore initialized successfully');
    } else {
        console.warn('Firebase is not configured. Please update .env.local with your Firebase credentials.');
    }
} catch (error) {
    console.error('Error initializing Firebase:', error);
    isFirebaseConfigured;
}

export { app, db };
export { isFirebaseConfigured };
