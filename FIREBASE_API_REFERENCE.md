# Firebase Service API Reference

Complete API documentation for all Firebase services available in your project.

## Table of Contents
1. [Employees Service](#employees-service)
2. [Attendance Service](#attendance-service)
3. [Payroll Service](#payroll-service)
4. [Sales Service](#sales-service)
5. [Inventory Service](#inventory-service)
6. [Product Inventory Service](#product-inventory-service)
7. [Purchase Order Service](#purchase-order-service)
8. [Recipes Service](#recipes-service)
9. [Calendar Service](#calendar-service)
10. [React Hooks](#react-hooks)
11. [Utility Functions](#utility-functions)

---

## Employees Service

Import: `import { employeesService } from '@/utils/firebaseService';`

### `add(employee: Employee): Promise<string>`
Adds a new employee to Firestore.
```typescript
const docId = await employeesService.add({
    id: 1,
    name: 'John Doe',
    position: 'Manager',
    rate: 500,
    schedule: {},
    phone: '555-1234',
    email: 'john@example.com',
});
```

### `getAll(): Promise<(Employee & { id: string })[]>`
Retrieves all employees.
```typescript
const employees = await employeesService.getAll();
```

### `getById(id: string): Promise<(Employee & { id: string }) | null>`
Retrieves a specific employee by ID.
```typescript
const employee = await employeesService.getById('emp-123');
```

### `update(id: string, data: Partial<Employee>): Promise<void>`
Updates an existing employee.
```typescript
await employeesService.update('emp-123', {
    name: 'Jane Doe',
    rate: 550,
});
```

### `delete(id: string): Promise<void>`
Deletes an employee.
```typescript
await employeesService.delete('emp-123');
```

---

## Attendance Service

Import: `import { attendanceService } from '@/utils/firebaseService';`

### `add(record: AttendanceRecord): Promise<string>`
Adds a single attendance record.
```typescript
const docId = await attendanceService.add({
    employee: 'John Doe',
    date: '2024-11-17',
    timeIn: '09:00 AM',
    timeOut: '05:00 PM',
});
```

### `getAll(): Promise<(AttendanceRecord & { id: string })[]>`
Retrieves all attendance records.
```typescript
const records = await attendanceService.getAll();
```

### `getByEmployee(employeeName: string): Promise<(AttendanceRecord & { id: string })[]>`
Gets all records for a specific employee.
```typescript
const records = await attendanceService.getByEmployee('John Doe');
```

### `getByDateRange(startDate: string, endDate: string): Promise<(AttendanceRecord & { id: string })[]>`
Gets records within a date range.
```typescript
const records = await attendanceService.getByDateRange('2024-11-01', '2024-11-30');
```

### `update(id: string, data: Partial<AttendanceRecord>): Promise<void>`
Updates an attendance record.
```typescript
await attendanceService.update('att-123', {
    timeIn: '09:15 AM',
});
```

### `delete(id: string): Promise<void>`
Deletes an attendance record.
```typescript
await attendanceService.delete('att-123');
```

### `batch(records: AttendanceRecord[]): Promise<void>`
Batch uploads multiple attendance records (for CSV imports).
```typescript
await attendanceService.batch(parsedCsvData);
```

---

## Payroll Service

Import: `import { payrollService } from '@/utils/firebaseService';`

### `add(record: PayrollRecord): Promise<string>`
Adds a payroll record.
```typescript
const docId = await payrollService.add({
    id: 1,
    employee: 'John Doe',
    position: 'Manager',
    rate: 500,
    regularHours: 160,
    overtimeHours: 10,
    totalHours: 170,
    regularPay: 80000,
    overtimePay: 6250,
    serviceCharge: 5000,
    grossPay: 91250,
    deductions: { sss: 0, philhealth: 0, pagibig: 0, total: 0 },
    netPay: 91250,
    daysPresent: 20,
    daysAbsent: 2,
    daysLate: 1,
});
```

### `getAll(): Promise<(PayrollRecord & { id: string })[]>`
Retrieves all payroll records.
```typescript
const records = await payrollService.getAll();
```

### `getByEmployee(employeeName: string): Promise<(PayrollRecord & { id: string })[]>`
Gets payroll records for a specific employee.
```typescript
const records = await payrollService.getByEmployee('John Doe');
```

### `update(id: string, data: Partial<PayrollRecord>): Promise<void>`
Updates a payroll record.
```typescript
await payrollService.update('payroll-123', {
    regularPay: 85000,
    netPay: 96250,
});
```

### `delete(id: string): Promise<void>`
Deletes a payroll record.
```typescript
await payrollService.delete('payroll-123');
```

### `batchUpdate(records: (PayrollRecord & { id: string })[]): Promise<void>`
Batch updates multiple payroll records.
```typescript
await payrollService.batchUpdate(updatedRecords);
```

---

## Sales Service

Import: `import { salesService } from '@/utils/firebaseService';`

### `add(record: SalesData): Promise<string>`
Adds a sales record.
```typescript
const docId = await salesService.add({
    date: '2024-11-17',
    transactionId: 'TXN-001',
    amount: 5000,
    itemsSold: 'Burger, Fries, Drinks',
    // ... other flexible fields from CSV
});
```

### `getAll(): Promise<(SalesData & { id: string })[]>`
Retrieves all sales records.
```typescript
const records = await salesService.getAll();
```

### `batch(records: SalesData[]): Promise<void>`
Batch uploads sales records.
```typescript
await salesService.batch(parsedSalesData);
```

---

## Inventory Service

Import: `import { inventoryService } from '@/utils/firebaseService';`

### `add(item: InventoryItem): Promise<string>`
Adds an inventory item.
```typescript
const docId = await inventoryService.add({
    id: 1,
    name: 'Tomatoes',
    category: 'Produce',
    department: 'Kitchen',
    stock: 100,
    unit: 'kg',
    minStock: 10,
    lastUpdated: '2024-11-17',
    storageLocation: 'Cooler A',
});
```

### `getAll(): Promise<(InventoryItem & { id: string })[]>`
Retrieves all inventory items.
```typescript
const items = await inventoryService.getAll();
```

### `update(id: string, data: Partial<InventoryItem>): Promise<void>`
Updates an inventory item.
```typescript
await inventoryService.update('inv-123', {
    stock: 95,
    lastUpdated: '2024-11-17',
});
```

### `delete(id: string): Promise<void>`
Deletes an inventory item.
```typescript
await inventoryService.delete('inv-123');
```

---

## Product Inventory Service

Import: `import { productInventoryService } from '@/utils/firebaseService';`

### `add(item: ProductInventoryItem): Promise<string>`
Adds a product.
```typescript
const docId = await productInventoryService.add({
    id: 1,
    category: 'Main Courses',
    name: 'Grilled Chicken',
    brand: 'House Special',
    unit: 'plate',
    quantity: 50,
    price: 250,
    supplier: 'Local Farm',
});
```

### `getAll(): Promise<(ProductInventoryItem & { id: string })[]>`
Retrieves all products.
```typescript
const products = await productInventoryService.getAll();
```

### `update(id: string, data: Partial<ProductInventoryItem>): Promise<void>`
Updates a product.
```typescript
await productInventoryService.update('prod-123', {
    quantity: 45,
    price: 260,
});
```

### `delete(id: string): Promise<void>`
Deletes a product.
```typescript
await productInventoryService.delete('prod-123');
```

---

## Purchase Order Service

Import: `import { purchaseOrderService } from '@/utils/firebaseService';`

### `add(order: PurchaseOrder): Promise<string>`
Adds a purchase order.
```typescript
const docId = await purchaseOrderService.add({
    id: 1,
    date: '2024-11-17',
    department: 'Kitchen',
    items: [
        { itemId: 1, quantity: 10, cost: 500 },
        { itemId: 2, quantity: 5, cost: 250 },
    ],
    totalCost: 750,
    status: 'Pending',
});
```

### `getAll(): Promise<(PurchaseOrder & { id: string })[]>`
Retrieves all purchase orders.
```typescript
const orders = await purchaseOrderService.getAll();
```

### `update(id: string, data: Partial<PurchaseOrder>): Promise<void>`
Updates a purchase order.
```typescript
await purchaseOrderService.update('po-123', {
    status: 'Completed',
});
```

### `delete(id: string): Promise<void>`
Deletes a purchase order.
```typescript
await purchaseOrderService.delete('po-123');
```

---

## Recipes Service

Import: `import { recipesService } from '@/utils/firebaseService';`

### `add(recipe: RecipeCosting): Promise<string>`
Adds a recipe.
```typescript
const docId = await recipesService.add({
    id: 1,
    name: 'Grilled Chicken Plate',
    ingredients: [
        { itemId: 1, name: 'Chicken Breast', quantity: 200, unit: 'g', cost: 150 },
    ],
    totalCost: 150,
    totalCostWithAllocation: 200,
    sellingPrice: 250,
    foodCostPercentage: 60,
    finalCostPercentage: 80,
});
```

### `getAll(): Promise<(RecipeCosting & { id: string })[]>`
Retrieves all recipes.
```typescript
const recipes = await recipesService.getAll();
```

### `update(id: string, data: Partial<RecipeCosting>): Promise<void>`
Updates a recipe.
```typescript
await recipesService.update('recipe-123', {
    sellingPrice: 260,
});
```

### `delete(id: string): Promise<void>`
Deletes a recipe.
```typescript
await recipesService.delete('recipe-123');
```

---

## Calendar Service

Import: `import { calendarService } from '@/utils/firebaseService';`

### `add(event: CalendarEvent): Promise<string>`
Adds a calendar event.
```typescript
const docId = await calendarService.add({
    id: 1,
    title: 'Product Launch',
    description: 'New burger menu launch',
    date: '2024-12-01',
    type: 'Post',
    status: 'Planned',
    created: '2024-11-17',
});
```

### `getAll(): Promise<(CalendarEvent & { id: string })[]>`
Retrieves all events.
```typescript
const events = await calendarService.getAll();
```

### `update(id: string, data: Partial<CalendarEvent>): Promise<void>`
Updates an event.
```typescript
await calendarService.update('event-123', {
    status: 'Published',
});
```

### `delete(id: string): Promise<void>`
Deletes an event.
```typescript
await calendarService.delete('event-123');
```

---

## React Hooks

Import: `import { useFirebaseData, useFirebaseMutation, useFirebaseStatus } from '@/hooks/useFirebase';`

### `useFirebaseData<T>(fetchFn, dependencies): { data, loading, error }`
Hook for fetching data.

**Parameters:**
- `fetchFn`: Async function that returns the data
- `dependencies`: React dependency array

**Returns:**
- `data`: The fetched data (null if loading or error)
- `loading`: Boolean indicating loading state
- `error`: Error message string or null

**Example:**
```typescript
const { data: employees, loading, error } = useFirebaseData(
    () => employeesService.getAll(),
    []
);

if (loading) return <div>Loading...</div>;
if (error) return <div>Error: {error}</div>;
return <div>{employees.map(e => e.name).join(', ')}</div>;
```

### `useFirebaseMutation<T>(mutateFn): { mutate, loading, error }`
Hook for mutations (add, update, delete).

**Parameters:**
- `mutateFn`: Function that performs the mutation

**Returns:**
- `mutate`: Function to call to perform the mutation
- `loading`: Boolean indicating operation status
- `error`: Error message string or null

**Example:**
```typescript
const { mutate: addEmployee, loading } = useFirebaseMutation(
    (emp: Employee) => employeesService.add(emp)
);

const handleAdd = async () => {
    try {
        await addEmployee(newEmployee);
    } catch (error) {
        console.error('Failed:', error);
    }
};
```

### `useFirebaseStatus(): { isConfigured, mode }`
Hook to check Firebase configuration.

**Returns:**
- `isConfigured`: Boolean (true if Firebase is configured)
- `mode`: String ('firestore' or 'localStorage')

**Example:**
```typescript
const { isConfigured, mode } = useFirebaseStatus();

return <div>Storage: {mode}</div>;
```

---

## Utility Functions

Import: `import { syncDataToFirestore } from '@/utils/firebaseService';`

### `syncDataToFirestore(appData): Promise<void>`
One-time sync of all data from localStorage to Firestore.

**Parameters:**
```typescript
{
    employees: Employee[];
    attendanceRecords: AttendanceRecord[];
    payrollRecords: PayrollRecord[];
    salesData: SalesData[];
    inventoryItems: InventoryItem[];
    productInventory: ProductInventoryItem[];
    purchaseOrders: PurchaseOrder[];
    recipes: RecipeCosting[];
    calendarEvents: CalendarEvent[];
}
```

**Example:**
```typescript
try {
    await syncDataToFirestore({
        employees: appData.employees,
        attendanceRecords: appData.attendanceRecords,
        payrollRecords: appData.payrollRecords,
        // ... other data
    });
    console.log('Data synced successfully!');
} catch (error) {
    console.error('Sync failed:', error);
}
```

---

## Common Patterns

### Pattern: Fetch and Display List
```typescript
const { data: items = [], loading, error } = useFirebaseData(
    () => employeesService.getAll(),
    []
);

return (
    <>
        {loading && <Spinner />}
        {error && <Error msg={error} />}
        {items.map(item => <ItemCard key={item.id} item={item} />)}
    </>
);
```

### Pattern: Add Item
```typescript
const { mutate: add, loading } = useFirebaseMutation(
    (item: Employee) => employeesService.add(item)
);

const handleAdd = async (formData: Employee) => {
    await add(formData);
    // Refresh list or show success
};
```

### Pattern: Update Item
```typescript
const { mutate: update } = useFirebaseMutation(
    (data: { id: string; updates: any }) =>
        employeesService.update(data.id, data.updates)
);

const handleUpdate = async (id: string, updates: any) => {
    await update({ id, updates });
};
```

### Pattern: Delete Item
```typescript
const { mutate: remove } = useFirebaseMutation(
    (id: string) => employeesService.delete(id)
);

const handleDelete = async (id: string) => {
    await remove(id);
};
```

### Pattern: Batch Operation
```typescript
const { mutate: batchAdd } = useFirebaseMutation(
    (records: AttendanceRecord[]) => attendanceService.batch(records)
);

const handleUploadCSV = async (csvData: AttendanceRecord[]) => {
    await batchAdd(csvData);
};
```

---

## Error Handling

All services handle errors gracefully:

```typescript
try {
    const result = await employeesService.add(newEmployee);
} catch (error) {
    console.error('Failed to add employee:', error);
    // Show error to user
}
```

The `useFirebaseMutation` hook also provides error state:

```typescript
const { mutate, error } = useFirebaseMutation(...);

if (error) {
    return <div className="text-red-600">Error: {error}</div>;
}
```

---

## Type Safety

All services are fully typed with TypeScript:

```typescript
// Autocomplete and type checking
const employees: (Employee & { id: string })[] =
    await employeesService.getAll();

// Update provides type hints
await employeesService.update(id, {
    name: 'New Name', // ✅ Valid
    // invalidField: 123, // ❌ Type error
});
```

---

## Best Practices

1. **Always use dependencies array with useFirebaseData**
   ```typescript
   useFirebaseData(fetchFn, []) // Fetch once
   useFirebaseData(fetchFn, [dateRange]) // Refetch on date change
   ```

2. **Handle loading and error states**
   ```typescript
   if (loading) return <Spinner />;
   if (error) return <Error msg={error} />;
   ```

3. **Use batch operations for large imports**
   ```typescript
   await attendanceService.batch(csvData); // Efficient
   ```

4. **Batch updates for multiple changes**
   ```typescript
   await payrollService.batchUpdate(records);
   ```

5. **Test with Firebase configured and unconfigured**
   - Services fallback gracefully to localStorage

---

## Reference Quick Links

| What | File |
|------|------|
| All CRUD operations | `utils/firebaseService.ts` |
| React hooks | `hooks/useFirebase.ts` |
| Firebase init | `utils/firebase.ts` |
| Setup instructions | `FIREBASE_QUICKSTART.md` |
| Integration examples | `FIREBASE_INTEGRATION_EXAMPLE.md` |
| Full documentation | `FIREBASE_SETUP.md` |

---

**Version**: 1.0
**Last Updated**: 2024-11-17
**Status**: Production Ready ✅
