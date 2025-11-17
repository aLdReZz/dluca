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

const requiredFirebaseKeys: (keyof typeof firebaseConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
];

const missingFirebaseKeys = requiredFirebaseKeys.filter((key) => {
    const value = firebaseConfig[key];
    return !(value && typeof value === 'string' && !value.includes('YOUR_'));
});

const isFirebaseConfigured = missingFirebaseKeys.length === 0;

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
        console.warn(
            `Firebase is not configured. Missing or placeholder values for: ${
                missingFirebaseKeys.length > 0 ? missingFirebaseKeys.join(', ') : 'unknown keys'
            }. Please update .env.local with your Firebase credentials.`
        );
    }
} catch (error) {
    console.error('Error initializing Firebase:', error);
    isFirebaseConfigured;
}

export { app, db };
export { isFirebaseConfigured };
