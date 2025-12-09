# Deployment Guide for D'Luca Restaurant Management System

## Netlify Deployment

### Prerequisites
- A Netlify account
- Your Firebase credentials from `.env.local`

### Step-by-Step Instructions

#### 1. Configure Environment Variables on Netlify

Your app requires Firebase environment variables to work properly. Follow these steps:

1. **Log in to Netlify**: https://app.netlify.com
2. **Select your site** (`dluca` or whatever you named it)
3. **Go to Site Settings** → **Environment variables**
4. **Click "Add a variable"** and add each of the following:

```env
VITE_FIREBASE_API_KEY=<your_api_key_from_.env.local>
VITE_FIREBASE_AUTH_DOMAIN=<your_auth_domain_from_.env.local>
VITE_FIREBASE_PROJECT_ID=<your_project_id_from_.env.local>
VITE_FIREBASE_STORAGE_BUCKET=<your_storage_bucket_from_.env.local>
VITE_FIREBASE_MESSAGING_SENDER_ID=<your_sender_id_from_.env.local>
VITE_FIREBASE_APP_ID=<your_app_id_from_.env.local>
VITE_FIREBASE_MEASUREMENT_ID=<your_measurement_id_from_.env.local>
```

**Note**: Copy these values from your `.env.local` file in the project root.

5. **Save all variables**

#### 2. Trigger a Redeploy

After adding the environment variables:

1. Go to **Deploys** tab in your Netlify dashboard
2. Click **"Trigger deploy"** → **"Clear cache and deploy site"**
3. Wait for the build to complete (usually 1-2 minutes)

#### 3. Verify the Deployment

1. Visit your site: https://dluca.netlify.app/
2. Open browser DevTools (F12)
3. Check the Console tab
4. You should see: `Firebase Firestore initialized successfully`
5. The app should load normally without any errors

---

## Build Configuration

The project is configured with:
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: 20

These settings are already configured in `netlify.toml`.

---

## Troubleshooting

### White Screen Issue
**Cause**: Missing environment variables or incorrect build configuration

**Solution**:
1. Verify all environment variables are set in Netlify
2. Check that `netlify.toml` exists in your repository
3. Redeploy the site with cache cleared

### Firebase Not Configured Warning
**Cause**: Environment variables not set in Netlify

**Solution**: Add all Firebase environment variables as shown above

### TypeScript/Build Errors
**Cause**: Dependencies not installed or build cache issues

**Solution**:
1. In Netlify, go to **Deploys** → **Deploy settings**
2. Click **"Clear cache and retry deploy"**

---

## Progressive Web App (PWA) Features

Your app is a PWA and will work offline after the first visit. To test:

1. Visit the site on your mobile device
2. Use your browser's "Add to Home Screen" option
3. The app will install and work like a native app

---

## Security Notes

- **Firebase credentials** are public-facing (they're in the browser)
- **Security is enforced** by Firebase Security Rules (set these in Firebase Console)
- **Never commit** sensitive API keys or secrets
- The Firebase credentials shown here are for **frontend use only**

---

## Support

If you encounter issues:
1. Check the Netlify deploy logs
2. Check browser console for errors
3. Verify all environment variables are set correctly
4. Try clearing cache and redeploying
