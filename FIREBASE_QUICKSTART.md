# Firebase & Firestore Quick Start Guide

Get your Firebase integration up and running in 15 minutes!

## Step 1: Create Firebase Project (5 minutes)

1. Go to [firebase.google.com](https://firebase.google.com)
2. Click "Go to console"
3. Click "Add project"
4. Enter `dluca-restaurant` as project name
5. Click "Create project"
6. Wait for project creation to complete

## Step 2: Create Firestore Database (3 minutes)

1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click **Create Database**
3. Select a location near your users
4. Start in **Test mode** (for development)
5. Click **Create**

## Step 3: Get Your Credentials (3 minutes)

1. Go to **Project Settings** (gear icon)
2. Click **Developers** or **Service accounts** tab
3. Look for the Firebase config code snippet
4. You'll see something like:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "dluca-restaurant.firebaseapp.com",
  projectId: "dluca-restaurant",
  storageBucket: "dluca-restaurant.appspot.com",
  messagingSenderId: "123...",
  appId: "1:123:web:abc...",
  measurementId: "G-..."
};
```

## Step 4: Update .env.local (2 minutes)

Edit `c:\Users\Carl\Downloads\dluca\.env.local`:

```env
VITE_FIREBASE_API_KEY=AIzaSyD...
VITE_FIREBASE_AUTH_DOMAIN=dluca-restaurant.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dluca-restaurant
VITE_FIREBASE_STORAGE_BUCKET=dluca-restaurant.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123...
VITE_FIREBASE_APP_ID=1:123:web:abc...
VITE_FIREBASE_MEASUREMENT_ID=G-...
```

Replace the placeholder values with your Firebase credentials.

## Step 5: Restart Dev Server (2 minutes)

```bash
# Stop the dev server (Ctrl+C)
# Restart it
npm run dev
```

Check the browser console - you should NOT see Firebase configuration warnings.

## Step 6: Test Connection (optional)

Add this to any component to verify Firebase is working:

```typescript
import { isFirebaseConfigured } from '@/utils/firebase';

export function FirebaseStatus() {
    return (
        <div>
            Firebase Status: {isFirebaseConfigured ? '✅ Connected' : '❌ Not Configured'}
        </div>
    );
}
```

If you see ✅ Connected, you're all set!

## What's Ready to Use

### Files Created
- ✅ `utils/firebase.ts` - Firebase initialization
- ✅ `utils/firebaseService.ts` - All CRUD operations
- ✅ `hooks/useFirebase.ts` - React hooks for easy integration
- ✅ `.env.local` - Environment configuration

### Services Available

```typescript
// Employees
import { employeesService } from '@/utils/firebaseService';
employeesService.getAll()
employeesService.add(employee)
employeesService.update(id, data)
employeesService.delete(id)

// Attendance
import { attendanceService } from '@/utils/firebaseService';
attendanceService.getAll()
attendanceService.getByEmployee(name)
attendanceService.getByDateRange(start, end)
attendanceService.batch(records)

// Payroll
import { payrollService } from '@/utils/firebaseService';
payrollService.getAll()
payrollService.getByEmployee(name)
payrollService.batchUpdate(records)

// Sales
import { salesService } from '@/utils/firebaseService';
salesService.getAll()
salesService.batch(records)

// And more: inventory, products, purchase orders, recipes, calendar events
```

### React Hooks Available

```typescript
import { useFirebaseData, useFirebaseMutation } from '@/hooks/useFirebase';

// Fetch data
const { data, loading, error } = useFirebaseData(
    () => employeesService.getAll(),
    []
);

// Mutate data
const { mutate: deleteEmployee, loading } = useFirebaseMutation(
    (id: string) => employeesService.delete(id)
);
```

## Next: Migrate Your First Page

Choose a simple page like **Dashboard** to start:

1. Open `pages/Dashboard.tsx`
2. Find localStorage calls:
   ```typescript
   const data = JSON.parse(localStorage.getItem('employees') || '[]');
   ```

3. Replace with Firebase:
   ```typescript
   import { useFirebaseData } from '@/hooks/useFirebase';
   import { employeesService } from '@/utils/firebaseService';

   const { data: employees = [] } = useFirebaseData(
       () => employeesService.getAll(),
       []
   );
   ```

4. Test everything works
5. Move to next page

## Common Tasks

### Add a New Employee
```typescript
const { mutate: addEmployee } = useFirebaseMutation(
    (emp: Employee) => employeesService.add(emp)
);

const handleAdd = async () => {
    await addEmployee(newEmployee);
};
```

### Get Attendance Records
```typescript
const { data: records } = useFirebaseData(
    () => attendanceService.getByEmployee('John Doe'),
    []
);
```

### Update Payroll
```typescript
const { mutate: updatePayroll } = useFirebaseMutation(
    (data: { id: string; updates: Partial<PayrollRecord> }) =>
        payrollService.update(data.id, data.updates)
);

await updatePayroll({ id: payrollId, updates: { rate: 500 } });
```

### Batch Upload Attendance
```typescript
const { mutate: batchAdd } = useFirebaseMutation(
    (records: AttendanceRecord[]) => attendanceService.batch(records)
);

await batchAdd(csvData);
```

## Fallback Mode

If Firebase isn't configured:
- Services will use localStorage automatically
- No code changes needed
- Just update `.env.local` when ready to switch

Perfect for switching between development (localStorage) and production (Firestore).

## Troubleshooting

### Firebase not connecting?
1. Check `.env.local` has no `YOUR_` placeholders
2. Verify credentials are copied correctly
3. Restart dev server: `npm run dev`
4. Check browser console for errors

### Data not saving?
1. Check Firestore security rules (should be in Test mode initially)
2. Verify no errors in browser console
3. Check Firestore Dashboard in Firebase Console

### Slow performance?
1. Check read/write counts in Firebase Console
2. Consider adding indexes (Firestore suggests them automatically)
3. For large datasets, implement pagination

## Security Rules for Production

When ready to deploy, update Firestore rules:

1. Go to Firebase Console → **Firestore** → **Rules**
2. Replace with:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Need Help?

- 📖 Full setup: See `FIREBASE_SETUP.md`
- 💡 Code examples: See `FIREBASE_INTEGRATION_EXAMPLE.md`
- 🔥 Firebase docs: [firebase.google.com/docs](https://firebase.google.com/docs)

## What's Next?

1. ✅ Firebase configured
2. ⬜ Migrate Dashboard
3. ⬜ Migrate Attendance
4. ⬜ Migrate Payroll
5. ⬜ Migrate remaining pages
6. ⬜ Update security rules
7. ⬜ Deploy to production

You're ready to start integrating! 🚀
