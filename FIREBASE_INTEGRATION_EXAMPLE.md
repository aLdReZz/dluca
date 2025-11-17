# Firebase Integration Example

This document shows how to integrate Firebase/Firestore into your React components.

## Example 1: Simple Data Fetching with Hook

### Before (localStorage)
```typescript
const [employees, setEmployees] = useState<Employee[]>([]);

useEffect(() => {
    const stored = localStorage.getItem('employees');
    if (stored) {
        setEmployees(JSON.parse(stored));
    }
}, []);
```

### After (Firebase)
```typescript
import { useFirebaseData } from '../hooks/useFirebase';
import { employeesService } from '../utils/firebaseService';

const { data: employees = [], loading, error } = useFirebaseData(
    () => employeesService.getAll(),
    [] // dependencies
);

if (loading) return <div>Loading employees...</div>;
if (error) return <div>Error: {error}</div>;
```

## Example 2: Adding Data

### Before (localStorage)
```typescript
const handleAddEmployee = (employee: Employee) => {
    const existing = JSON.parse(localStorage.getItem('employees') || '[]');
    const updated = [...existing, { ...employee, id: Date.now() }];
    localStorage.setItem('employees', JSON.stringify(updated));
    setEmployees(updated);
};
```

### After (Firebase)
```typescript
import { useFirebaseMutation } from '../hooks/useFirebase';
import { employeesService } from '../utils/firebaseService';

const { mutate: addEmployee, loading } = useFirebaseMutation(
    (employee: Employee) => employeesService.add(employee)
);

const handleAddEmployee = async (employee: Employee) => {
    try {
        const docId = await addEmployee(employee);
        // Optionally refetch or update local state
        console.log('Employee added with ID:', docId);
    } catch (error) {
        console.error('Failed to add employee:', error);
    }
};
```

## Example 3: Updating Data

### Before (localStorage)
```typescript
const handleUpdateEmployee = (id: number, updates: Partial<Employee>) => {
    const existing = JSON.parse(localStorage.getItem('employees') || '[]');
    const updated = existing.map((emp: Employee) =>
        emp.id === id ? { ...emp, ...updates } : emp
    );
    localStorage.setItem('employees', JSON.stringify(updated));
    setEmployees(updated);
};
```

### After (Firebase)
```typescript
const { mutate: updateEmployee, loading } = useFirebaseMutation(
    (data: { id: string; updates: Partial<Employee> }) =>
        employeesService.update(data.id, data.updates)
);

const handleUpdateEmployee = async (id: string, updates: Partial<Employee>) => {
    try {
        await updateEmployee({ id, updates });
        // Optionally refetch or show success message
    } catch (error) {
        console.error('Failed to update employee:', error);
    }
};
```

## Example 4: Batch Operations

### Batch Add Attendance Records
```typescript
const { mutate: batchAddAttendance, loading } = useFirebaseMutation(
    (records: AttendanceRecord[]) => attendanceService.batch(records)
);

const handleUploadAttendance = async (csvData: AttendanceRecord[]) => {
    try {
        await batchAddAttendance(csvData);
        console.log('Attendance records uploaded successfully');
    } catch (error) {
        console.error('Failed to upload attendance:', error);
    }
};
```

## Example 5: Conditional Queries

### Get Attendance by Date Range
```typescript
const [startDate, setStartDate] = useState('2024-01-01');
const [endDate, setEndDate] = useState('2024-01-31');

const { data: records = [], loading } = useFirebaseData(
    () => attendanceService.getByDateRange(startDate, endDate),
    [startDate, endDate] // Refetch when dates change
);
```

### Get Records by Employee
```typescript
const [selectedEmployee, setSelectedEmployee] = useState('John Doe');

const { data: employeeRecords = [], loading } = useFirebaseData(
    () => employeesService.getByEmployee(selectedEmployee),
    [selectedEmployee]
);
```

## Example 6: Multiple Data Fetches

```typescript
const { data: employees = [], loading: employeesLoading } = useFirebaseData(
    () => employeesService.getAll(),
    []
);

const { data: payroll = [], loading: payrollLoading } = useFirebaseData(
    () => payrollService.getAll(),
    []
);

const isLoading = employeesLoading || payrollLoading;

return (
    <div>
        {isLoading ? (
            <p>Loading...</p>
        ) : (
            // Render employees and payroll data
        )}
    </div>
);
```

## Example 7: Complete Component Migration

### Original Component (localStorage)
```typescript
import React, { useState, useEffect } from 'react';
import type { Employee } from '../types';

const EmployeeList: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem('employees');
        if (stored) setEmployees(JSON.parse(stored));
    }, []);

    const handleAdd = (employee: Employee) => {
        const updated = [...employees, { ...employee, id: Date.now() }];
        setEmployees(updated);
        localStorage.setItem('employees', JSON.stringify(updated));
    };

    const handleDelete = (id: number) => {
        const updated = employees.filter(e => e.id !== id);
        setEmployees(updated);
        localStorage.setItem('employees', JSON.stringify(updated));
    };

    return (
        <div>
            <h1>Employees</h1>
            {employees.map(emp => (
                <div key={emp.id}>
                    <span>{emp.name}</span>
                    <button onClick={() => handleDelete(emp.id)}>Delete</button>
                </div>
            ))}
        </div>
    );
};
```

### Updated Component (Firebase)
```typescript
import React from 'react';
import type { Employee } from '../types';
import { useFirebaseData, useFirebaseMutation } from '../hooks/useFirebase';
import { employeesService } from '../utils/firebaseService';

const EmployeeList: React.FC = () => {
    const { data: employees = [], loading, error } = useFirebaseData(
        () => employeesService.getAll(),
        []
    );

    const { mutate: deleteEmployee } = useFirebaseMutation(
        (id: string) => employeesService.delete(id)
    );

    const handleDelete = async (id: string) => {
        try {
            await deleteEmployee(id);
        } catch (error) {
            console.error('Failed to delete employee:', error);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            <h1>Employees</h1>
            {employees.map((emp: Employee & { id: string }) => (
                <div key={emp.id}>
                    <span>{emp.name}</span>
                    <button onClick={() => handleDelete(emp.id)}>Delete</button>
                </div>
            ))}
        </div>
    );
};

export default EmployeeList;
```

## Best Practices

### 1. Error Handling
```typescript
const { data, error } = useFirebaseData(fetchFn, deps);

if (error) {
    return <div className="text-red-600">Error: {error}</div>;
}
```

### 2. Loading States
```typescript
const { data, loading } = useFirebaseData(fetchFn, deps);

return (
    <>
        {loading && <Spinner />}
        {data && <DataDisplay data={data} />}
    </>
);
```

### 3. Optimistic Updates
```typescript
// Update UI immediately, sync with Firebase in background
const handleUpdate = async (id: string, updates: any) => {
    // Optimistic update
    setItems(items.map(item =>
        item.id === id ? { ...item, ...updates } : item
    ));

    try {
        // Sync with Firebase
        await updateItem(id, updates);
    } catch (error) {
        // Revert on error
        refetch();
    }
};
```

### 4. Avoid Unnecessary Refetches
```typescript
// Good: Depend only on what matters
const { data } = useFirebaseData(
    () => employeesService.getAll(),
    [] // Only fetch once on mount
);

// Bad: Refetches on every render
const { data } = useFirebaseData(
    () => employeesService.getAll()
    // Missing dependency array!
);
```

### 5. Combine Local State with Firebase
```typescript
const [formData, setFormData] = useState<Employee>(initialData);
const { mutate: save, loading } = useFirebaseMutation(
    (data: Employee) => employeesService.update(id, data)
);

const handleSave = async () => {
    await save(formData);
};
```

## Migration Checklist for Each Page

- [ ] Import `useFirebaseData` and `useFirebaseMutation` hooks
- [ ] Import relevant service (e.g., `employeesService`)
- [ ] Replace `localStorage.getItem()` with `useFirebaseData()`
- [ ] Replace `localStorage.setItem()` with `useFirebaseMutation()`
- [ ] Update error handling to show Firebase errors
- [ ] Test all CRUD operations
- [ ] Verify loading states work correctly
- [ ] Test with Firebase configured
- [ ] Test with Firebase not configured (fallback)

## Common Patterns

### Pattern 1: Fetch and Display
```typescript
const { data, loading, error } = useFirebaseData(fetchFn, deps);
```

### Pattern 2: Add New Item
```typescript
const { mutate: add, loading } = useFirebaseMutation(addFn);
await add(newItem);
```

### Pattern 3: Update Existing Item
```typescript
const { mutate: update, loading } = useFirebaseMutation(updateFn);
await update({ id, ...updates });
```

### Pattern 4: Delete Item
```typescript
const { mutate: remove } = useFirebaseMutation(deleteFn);
await remove(itemId);
```

### Pattern 5: Batch Operations
```typescript
const { mutate: batch } = useFirebaseMutation(batchFn);
await batch(itemsArray);
```

## Troubleshooting

### Issue: Data not appearing
**Solution**: Check Firestore rules allow reads, verify data is actually in Firebase

### Issue: Slow loading
**Solution**: Add indexes in Firestore, optimize queries, consider pagination

### Issue: Stale data
**Solution**: Add dependencies to refetch when needed, or use real-time listeners

### Issue: Firebase fallback not working
**Solution**: Ensure `.env.local` is set correctly, restart dev server

## Next Steps

1. Choose one page to migrate first (e.g., Dashboard or Attendance)
2. Follow the patterns above
3. Test thoroughly with Firebase
4. Migrate remaining pages
5. Update security rules for production
6. Deploy to production with Firestore

For more details, see `FIREBASE_SETUP.md`.
