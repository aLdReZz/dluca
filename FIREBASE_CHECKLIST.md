# Firebase Integration Checklist

Use this checklist to track your Firebase integration progress.

## Phase 1: Initial Setup ✅ (Already Complete)

- [x] Firebase SDK installed (`npm install firebase`)
- [x] `utils/firebase.ts` created and configured
- [x] `utils/firebaseService.ts` with all CRUD operations created
- [x] `hooks/useFirebase.ts` with React hooks created
- [x] `.env.local` updated with Firebase placeholders
- [x] Documentation created (4 guides + API reference)

## Phase 2: Firebase Project Setup ⬜ (Do This Next)

### Create Firebase Project
- [ ] Go to [firebase.google.com](https://firebase.google.com)
- [ ] Sign in with Google account
- [ ] Click "Go to console"
- [ ] Click "Add project"
- [ ] Enter project name: `dluca-restaurant`
- [ ] Enable Google Analytics (optional)
- [ ] Select region/location
- [ ] Click "Create project"
- [ ] Wait for project creation (may take 1-2 minutes)

### Create Firestore Database
- [ ] In Firebase Console, go to **Build** → **Firestore Database**
- [ ] Click **Create Database**
- [ ] Select database location (region closest to you)
- [ ] Start in **Test mode** (for development)
- [ ] Click **Create**
- [ ] Wait for database initialization

### Get Firebase Credentials
- [ ] In Firebase Console, click gear icon (Settings)
- [ ] Click **Project settings**
- [ ] Scroll down to "Your apps" section
- [ ] Click **Web** (or "Add app" if not visible)
- [ ] Copy the Firebase config object
- [ ] Keep this tab open for next step

## Phase 3: Configure Environment ⬜ (Do This Next)

### Update .env.local
- [ ] Open `.env.local` in your project root
- [ ] Copy each value from Firebase config to corresponding env variable:
  - [ ] `VITE_FIREBASE_API_KEY` ← `apiKey`
  - [ ] `VITE_FIREBASE_AUTH_DOMAIN` ← `authDomain`
  - [ ] `VITE_FIREBASE_PROJECT_ID` ← `projectId`
  - [ ] `VITE_FIREBASE_STORAGE_BUCKET` ← `storageBucket`
  - [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID` ← `messagingSenderId`
  - [ ] `VITE_FIREBASE_APP_ID` ← `appId`
  - [ ] `VITE_FIREBASE_MEASUREMENT_ID` ← `measurementId`
- [ ] Verify no values contain `YOUR_` placeholder text
- [ ] Save `.env.local`

### Restart Dev Server
- [ ] Stop dev server (Ctrl+C in terminal)
- [ ] Run `npm run dev`
- [ ] Wait for dev server to start
- [ ] Open browser to `http://localhost:5173` (or configured port)

## Phase 4: Verify Connection ⬜ (Do This Next)

### Check Browser Console
- [ ] Open browser DevTools (F12)
- [ ] Go to Console tab
- [ ] Look for Firebase initialization messages
- [ ] You should NOT see errors about Firebase configuration
- [ ] You should NOT see warnings about `YOUR_` placeholders

### Optional: Add Status Component
- [ ] Add temporary component to verify connection:
  ```typescript
  import { isFirebaseConfigured } from '@/utils/firebase';

  export function FirebaseStatus() {
      return (
          <div>
              Firebase: {isFirebaseConfigured ? '✅ Connected' : '❌ Not Configured'}
          </div>
      );
  }
  ```
- [ ] Check if it shows "Connected" ✅
- [ ] Remove component when verified

## Phase 5: Test Basic Operations ⬜

### Create a Simple Test Page
- [ ] Create `pages/FirebaseTest.tsx`
- [ ] Import `employeesService` from firebaseService
- [ ] Test adding an employee:
  ```typescript
  const testData: Employee = {
      id: 999,
      name: 'Test Employee',
      position: 'Test',
      rate: 100,
      schedule: {},
  };

  const docId = await employeesService.add(testData);
  console.log('Added with ID:', docId);
  ```
- [ ] Check Firebase Console to see if data appears
- [ ] Verify in `Firestore` → `employees` collection
- [ ] Delete test data

## Phase 6: Migrate Pages (Recommended Order) ⬜

### Dashboard Page
- [ ] Replace localStorage with `useFirebaseData()`
- [ ] Test: Can view employees
- [ ] Test: Can view sales totals
- [ ] Test: Can view inventory summary
- [ ] Test: Data refreshes on changes
- [ ] ✅ Dashboard migrated

### Calendar Page
- [ ] Replace localStorage with Firestore
- [ ] Test: Can add events
- [ ] Test: Can update events
- [ ] Test: Can delete events
- [ ] ✅ Calendar migrated

### Inventory Page
- [ ] Migrate inventory items to Firestore
- [ ] Test: Can add items
- [ ] Test: Can update stock
- [ ] Test: Can delete items
- [ ] Test: CSV upload works
- [ ] ✅ Inventory migrated

### Sales Page
- [ ] Migrate sales data to Firestore
- [ ] Test: Can add sales records
- [ ] Test: Batch upload from CSV
- [ ] Test: Can view sales reports
- [ ] ✅ Sales migrated

### Attendance Page
- [ ] Migrate attendance records
- [ ] Test: Can record attendance
- [ ] Test: Can edit attendance
- [ ] Test: CSV upload works
- [ ] Test: Schedule management works
- [ ] ✅ Attendance migrated

### Payroll Page
- [ ] Migrate payroll records
- [ ] Test: Payroll calculations work
- [ ] Test: Can update payroll
- [ ] Test: Export to PDF works
- [ ] Test: Service charge calculations work
- [ ] ✅ Payroll migrated

### Remaining Pages
- [ ] Costing page
- [ ] Purchase Request page
- [ ] Employee Profile
- [ ] Any other custom pages

## Phase 7: Data Migration ⬜

### Backup Existing Data
- [ ] Export all localStorage data (optional)
- [ ] Document what data needs to migrate

### Sync Data to Firestore
- [ ] Use `syncDataToFirestore()` function to migrate existing data
- [ ] Run in console or temporary migration script:
  ```typescript
  import { syncDataToFirestore } from '@/utils/firebaseService';

  await syncDataToFirestore({
      employees: appData.employees,
      attendanceRecords: appData.attendanceRecords,
      payrollRecords: appData.payrollRecords,
      salesData: appData.salesData,
      inventoryItems: appData.inventoryItems,
      productInventory: appData.productInventory,
      purchaseOrders: appData.purchaseOrders,
      recipes: appData.recipes,
      calendarEvents: appData.calendarEvents,
  });
  ```
- [ ] Verify data appears in Firestore Console
- [ ] Cross-check counts (Firestore vs localStorage)

## Phase 8: Testing & Validation ⬜

### CRUD Operations
- [ ] ✅ Create: Can add new records
- [ ] ✅ Read: Can fetch and display data
- [ ] ✅ Update: Can edit existing records
- [ ] ✅ Delete: Can remove records

### Data Persistence
- [ ] ✅ Data persists after page refresh
- [ ] ✅ Data persists after browser close/reopen
- [ ] ✅ Multiple users see same data

### Error Handling
- [ ] ✅ Errors display user-friendly messages
- [ ] ✅ Loading states show correctly
- [ ] ✅ Network errors are handled gracefully

### Performance
- [ ] ✅ Page load time is acceptable
- [ ] ✅ No unnecessary Firestore reads
- [ ] ✅ Batch operations complete efficiently

### Edge Cases
- [ ] ✅ Handles empty collections
- [ ] ✅ Handles large datasets
- [ ] ✅ Works with special characters in data
- [ ] ✅ Handles concurrent updates

## Phase 9: Production Preparation ⬜

### Security Rules
- [ ] Review current test mode rules
- [ ] Create proper production rules
- [ ] Test rules with real user data
- [ ] Document rule changes

### Firestore Indexes
- [ ] Check Firebase Console for recommended indexes
- [ ] Create composite indexes if needed:
  - [ ] `attendanceRecords`: employee + date
  - [ ] `payrollRecords`: employee + date
  - [ ] `salesData`: date (if added)

### Authentication (Optional)
- [ ] Decide if adding Firebase Auth
- [ ] Set up Firebase Authentication if needed
- [ ] Test login/logout flow
- [ ] Update security rules for auth

### Backups
- [ ] Enable Firestore automatic backups
- [ ] Document backup location
- [ ] Test restore process

### Monitoring
- [ ] Set up Firebase Performance Monitoring
- [ ] Monitor read/write counts
- [ ] Check for quota usage
- [ ] Set up alerts for anomalies

## Phase 10: Deployment ⬜

### Pre-deployment Checks
- [ ] All tests pass ✅
- [ ] Security rules updated ✅
- [ ] No console errors ✅
- [ ] Performance acceptable ✅
- [ ] Backup verified ✅

### Update Security Rules
- [ ] Replace test mode rules with production rules
- [ ] Test rules thoroughly
- [ ] Document rule changes

### Deploy Application
- [ ] Update build configuration
- [ ] Run production build: `npm run build`
- [ ] Test production build locally: `npm run preview`
- [ ] Deploy to hosting

### Post-deployment
- [ ] Verify all features work in production
- [ ] Monitor Firestore metrics
- [ ] Watch for errors in console
- [ ] Test user workflows

## Phase 11: Optimization ⬜ (Optional)

### Performance Optimization
- [ ] Implement pagination for large lists
- [ ] Add caching with React Query or SWR
- [ ] Optimize queries (add filters, limits)
- [ ] Implement lazy loading

### Features
- [ ] Add real-time listeners (optional)
- [ ] Implement offline capability
- [ ] Add data synchronization across devices
- [ ] Add conflict resolution

### Monitoring
- [ ] Set up detailed analytics
- [ ] Monitor user behavior
- [ ] Track performance metrics
- [ ] Analyze costs

## Quick Reference

### Files Created
| File | Purpose |
|------|---------|
| `utils/firebase.ts` | Firebase initialization |
| `utils/firebaseService.ts` | CRUD operations |
| `hooks/useFirebase.ts` | React hooks |
| `.env.local` | Configuration |

### Documentation Files
| File | Purpose |
|------|---------|
| `FIREBASE_QUICKSTART.md` | 15-minute setup (START HERE) |
| `FIREBASE_SETUP.md` | Comprehensive guide |
| `FIREBASE_INTEGRATION_EXAMPLE.md` | Code examples |
| `FIREBASE_API_REFERENCE.md` | API documentation |
| `FIREBASE_CHECKLIST.md` | This file |
| `FIREBASE_SUMMARY.md` | Overview |

### Services Available
- `employeesService`
- `attendanceService`
- `payrollService`
- `salesService`
- `inventoryService`
- `productInventoryService`
- `purchaseOrderService`
- `recipesService`
- `calendarService`

### React Hooks
- `useFirebaseData()`
- `useFirebaseMutation()`
- `useFirebaseStatus()`
- `useFirebasePagination()` (optional)

## Estimated Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Setup (Phase 1) | 0 min | ✅ Done |
| Firebase Project (Phase 2) | 10-15 min | ⬜ Next |
| Configuration (Phase 3) | 5 min | ⬜ |
| Verification (Phase 4) | 5 min | ⬜ |
| Basic Tests (Phase 5) | 15 min | ⬜ |
| Migrate Pages (Phase 6) | 3-4 hours | ⬜ |
| Data Migration (Phase 7) | 30 min | ⬜ |
| Testing (Phase 8) | 1-2 hours | ⬜ |
| Production Prep (Phase 9) | 1 hour | ⬜ |
| Deployment (Phase 10) | 30 min | ⬜ |
| Optimization (Phase 11) | Variable | ⬜ |

**Total Estimated Time: 8-10 hours** (spread over 2-3 days)

## Support

- 📖 See `FIREBASE_QUICKSTART.md` for fast setup
- 💡 See `FIREBASE_INTEGRATION_EXAMPLE.md` for code patterns
- 📚 See `FIREBASE_API_REFERENCE.md` for API docs
- 🔗 Visit [Firebase Console](https://console.firebase.google.com)
- 📘 Visit [Firebase Docs](https://firebase.google.com/docs)

---

**Status**: Ready to begin! Start with Phase 2 (Firebase Project Setup) 🚀
