# Firebase & Firestore Integration Guide

This guide helps you set up Firebase and Firestore for the d'luca restaurant management system.

## 1. Prerequisites

- A Google Account
- Node.js installed (already have it)
- Your project dependencies updated (already done)

## 2. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `dluca-restaurant` (or your preferred name)
4. Continue through the setup:
   - Google Analytics: Enable it (optional but recommended)
   - Location: Select your region
   - Create project

## 3. Set Up Firestore Database

1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click **Create Database**
3. Choose your preferred settings:
   - **Location**: Select closest to your users
   - **Security rules**: Start in **test mode** (for development)
4. Click **Create**

### Security Rules (Test Mode)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all reads and writes for now (development only!)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**⚠️ Important**: Update these rules for production!

## 4. Get Firebase Credentials

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Click **Service accounts** tab
3. Under **Web SDK**, you'll see a code snippet
4. Click "Copy" next to the `firebaseConfig` object
5. The config looks like:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "dluca-restaurant.firebaseapp.com",
  projectId: "dluca-restaurant",
  storageBucket: "dluca-restaurant.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456",
  measurementId: "G-XXXXXXXXXX"
};
```

## 5. Update Environment Variables

1. Open `.env.local` in your project root
2. Replace the Firebase config placeholders with your actual values:

```env
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
VITE_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID
```

3. Save the file

## 6. Firestore Collections Structure

The application uses the following Firestore collections:

### Collections Overview

| Collection | Purpose | Fields |
|-----------|---------|--------|
| `employees` | Employee records | `id`, `name`, `position`, `rate`, `schedule`, `approvedOvertime`, `salaryDeductions`, etc. |
| `attendanceRecords` | Clock in/out logs | `employee`, `date`, `timeIn`, `timeOut` |
| `payrollRecords` | Payroll calculations | `employee`, `regularHours`, `overtimeHours`, `regularPay`, `overtimePay`, `serviceCharge`, etc. |
| `salesData` | Sales transactions | All columns from CSV uploads |
| `inventoryItems` | Supply inventory | `id`, `name`, `category`, `stock`, `unit`, `minStock`, etc. |
| `productInventory` | Finished goods | `id`, `name`, `quantity`, `price`, `supplier`, etc. |
| `purchaseOrders` | Purchase requests | `id`, `date`, `department`, `items`, `totalCost`, `status` |
| `recipes` | Recipe costing | `id`, `name`, `ingredients`, `totalCost`, `sellingPrice`, etc. |
| `calendarEvents` | Content calendar | `id`, `title`, `date`, `type`, `status`, etc. |

### Recommended Indexes

Firestore will automatically suggest indexes for common queries. You'll see prompts in the console when needed.

For optimal performance, create these composite indexes:

1. **attendanceRecords**: `employee` + `date`
2. **payrollRecords**: `employee` + `date`
3. **salesData**: `date` (if added to schema)

## 7. Using the Firebase Service Layer

All Firestore operations are abstracted in `utils/firebaseService.ts`.

### Basic Usage Examples

```typescript
import { employeesService, attendanceService, payrollService } from '@/utils/firebaseService';

// Add employee
const employeeId = await employeesService.add(newEmployee);

// Get all employees
const employees = await employeesService.getAll();

// Update employee
await employeesService.update(employeeId, { name: 'New Name' });

// Get attendance records by employee
const records = await attendanceService.getByEmployee('John Doe');

// Batch add attendance records
await attendanceService.batch(attendanceRecordsArray);

// Get payroll records for employee
const payroll = await payrollService.getByEmployee('John Doe');
```

### Available Services

- `employeesService` - Manage employees
- `attendanceService` - Manage attendance records
- `payrollService` - Manage payroll
- `salesService` - Manage sales data
- `inventoryService` - Manage supply inventory
- `productInventoryService` - Manage product inventory
- `purchaseOrderService` - Manage purchase orders
- `recipesService` - Manage recipes
- `calendarService` - Manage calendar events

## 8. Migration: Sync Existing Data to Firestore

To move your existing localStorage data to Firestore:

```typescript
import { syncDataToFirestore } from '@/utils/firebaseService';

// Call this function with your existing app data
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

## 9. Hybrid Mode: Using Both localStorage and Firestore

The Firebase service layer automatically falls back to localStorage if Firebase is not configured. This allows you to:

1. **Development**: Use localStorage for quick testing
2. **Production**: Switch to Firestore by updating `.env.local`

The services will use Firestore when configured, and localStorage otherwise.

## 10. Authentication (Optional)

To add user authentication via Firebase:

1. Go to **Build** → **Authentication** in Firebase Console
2. Click **Get Started**
3. Enable sign-in methods:
   - Email/Password
   - Google Sign-in
   - Phone authentication
4. Update your `.env.local` with auth settings if needed

## 11. Security Rules for Production

Replace test mode rules with proper security:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /employees/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /attendanceRecords/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /payrollRecords/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
    // ... similar rules for other collections
  }
}
```

## 12. Monitoring & Analytics

1. **Firestore Metrics**: Monitor in Firebase Console
2. **Read/Write Counts**: Check Firestore Dashboard
3. **Storage**: See data usage statistics
4. **Performance**: Use Performance Monitoring (optional)

## 13. Troubleshooting

### Firebase Not Configured
If you see warnings about Firebase not being configured:
- Check `.env.local` has correct values
- Ensure no placeholders like `YOUR_PROJECT` remain
- Restart the dev server

### Firestore Connection Issues
- Verify network connectivity
- Check Firebase Console for errors
- Review Firestore rules in Console
- Check browser console for error messages

### Data Not Syncing
- Verify collection names match Firestore
- Check Firebase read/write rules
- Review browser console errors
- Try refreshing the page

## 14. Development Checklist

- [ ] Create Firebase project
- [ ] Set up Firestore database
- [ ] Get Firebase credentials
- [ ] Update `.env.local` with credentials
- [ ] Verify Firebase connection (check browser console)
- [ ] Test basic operations (create, read, update, delete)
- [ ] Migrate existing data to Firestore
- [ ] Update app components to use Firebase service
- [ ] Test all features
- [ ] Update security rules for production

## 15. Next Steps

1. **Integrate with React Components**: Update pages to use `firebaseService` instead of localStorage
2. **Add Real-time Listeners**: Listen for real-time data changes (optional)
3. **Implement Offline Support**: Use Firestore offline persistence
4. **Add Cloud Functions**: Create backend logic if needed
5. **Set up Backups**: Configure database backups

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/start)
- [Firebase CLI](https://firebase.google.com/docs/cli)

## Support

For issues or questions:
1. Check the Firebase Console for errors
2. Review Firestore documentation
3. Check browser console for specific error messages
4. Verify `.env.local` configuration
