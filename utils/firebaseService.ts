import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    where,
    orderBy,
    QueryConstraint,
    writeBatch,
    setDoc,
    getDoc,
    QueryDocumentSnapshot,
    DocumentData,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import type { Employee, AttendanceRecord, PayrollRecord, SalesData, InventoryItem, ProductInventoryItem, PurchaseOrder, RecipeCosting, CalendarEvent, AccountingTransaction, AccountBalance } from '../types';

const FIRESTORE_BATCH_LIMIT = 450;

const deleteCollectionDocuments = async (collectionName: string) => {
    if (!db) return;

    const snapshot = await getDocs(collection(db, collectionName));
    if (snapshot.empty) return;

    let batch = writeBatch(db);
    let operationCount = 0;

    for (const docSnap of snapshot.docs) {
        batch.delete(docSnap.ref);
        operationCount++;

        if (operationCount >= FIRESTORE_BATCH_LIMIT) {
            await batch.commit();
            batch = writeBatch(db);
            operationCount = 0;
        }
    }

    if (operationCount > 0) {
        await batch.commit();
    }
};

// Type definitions for Firestore operations
type FirestoreData = Employee | AttendanceRecord | PayrollRecord | SalesData | InventoryItem | ProductInventoryItem | PurchaseOrder | RecipeCosting | CalendarEvent;

// Helper function to handle Firebase operations with fallback to localStorage
const withFirebaseCheck = async <T,>(
    operation: () => Promise<T>,
    fallbackOperation?: () => T
): Promise<T> => {
    if (!isFirebaseConfigured) {
        console.warn('Firebase is not configured. Using fallback operation.');
        return fallbackOperation ? fallbackOperation() : {} as T;
    }
    return operation();
};

// ==================== EMPLOYEES ====================

export const employeesService = {
    // Add a new employee
    async add(employee: Employee): Promise<string> {
        return withFirebaseCheck(
            async () => {
                const docRef = await addDoc(collection(db, 'employees'), {
                    ...employee,
                    createdAt: new Date(),
                });
                return docRef.id;
            }
        );
    },

    // Get all employees
    async getAll(): Promise<(Employee & { id: string })[]> {
        return withFirebaseCheck(
            async () => {
                const snapshot = await getDocs(collection(db, 'employees'));
                const employees = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                })) as (Employee & { id: string })[];
                // Sort by order field to preserve employee sequence
                return employees.sort((a: any, b: any) => {
                    const orderA = a.order ?? Number.MAX_VALUE;
                    const orderB = b.order ?? Number.MAX_VALUE;
                    return orderA - orderB;
                });
            },
            () => [] // Fallback to empty array
        );
    },

    // Get employee by ID
    async getById(id: string): Promise<(Employee & { id: string }) | null> {
        return withFirebaseCheck(
            async () => {
                const docSnap = await getDoc(doc(db, 'employees', id));
                return docSnap.exists()
                    ? { ...docSnap.data(), id: docSnap.id } as Employee & { id: string }
                    : null;
            }
        );
    },

    // Update employee
    async update(id: string, data: Partial<Employee>): Promise<void> {
        return withFirebaseCheck(
            async () => {
                await updateDoc(doc(db, 'employees', id), {
                    ...data,
                    updatedAt: new Date(),
                });
            }
        );
    },

    // Delete employee
    async delete(id: string): Promise<void> {
        return withFirebaseCheck(
            async () => {
                await deleteDoc(doc(db, 'employees', id));
            }
        );
    },

    // Batch upsert employees (for syncing local state to Firebase)
    async batchUpsert(employees: Employee[]): Promise<void> {
        return withFirebaseCheck(
            async () => {
                const batch = writeBatch(db);
                employees.forEach((employee, index) => {
                    // Use the employee's local ID as the document ID
                    const docRef = doc(db, 'employees', String(employee.id));
                    // Store the order index to preserve employee sequence
                    batch.set(docRef, { ...employee, order: index, updatedAt: new Date() }, { merge: true });
                });
                await batch.commit();
                console.log(`✅ Successfully saved ${employees.length} employees with schedules to Firebase`);
            }
        );
    },

    // Delete every employee document
    async clearAll(): Promise<void> {
        return withFirebaseCheck(
            async () => {
                await deleteCollectionDocuments('employees');
            },
            () => undefined
        );
    },
};

// ==================== ATTENDANCE RECORDS ====================

export const attendanceService = {
    // Add attendance record
    async add(record: AttendanceRecord): Promise<string> {
        return withFirebaseCheck(
            async () => {
                const docRef = await addDoc(collection(db, 'attendanceRecords'), {
                    ...record,
                    createdAt: new Date(),
                });
                return docRef.id;
            }
        );
    },

    // Get all attendance records
    async getAll(): Promise<(AttendanceRecord & { id: string })[]> {
        return withFirebaseCheck(
            async () => {
                const snapshot = await getDocs(collection(db, 'attendanceRecords'));
                return snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                })) as (AttendanceRecord & { id: string })[];
            },
            () => []
        );
    },

    // Get attendance records for employee
    async getByEmployee(employeeName: string): Promise<(AttendanceRecord & { id: string })[]> {
        return withFirebaseCheck(
            async () => {
                const q = query(
                    collection(db, 'attendanceRecords'),
                    where('employee', '==', employeeName)
                );
                const snapshot = await getDocs(q);
                return snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                })) as (AttendanceRecord & { id: string })[];
            },
            () => []
        );
    },

    // Get attendance records by date range
    async getByDateRange(startDate: string, endDate: string): Promise<(AttendanceRecord & { id: string })[]> {
        return withFirebaseCheck(
            async () => {
                const q = query(
                    collection(db, 'attendanceRecords'),
                    where('date', '>=', startDate),
                    where('date', '<=', endDate)
                );
                const snapshot = await getDocs(q);
                return snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                })) as (AttendanceRecord & { id: string })[];
            },
            () => []
        );
    },

    // Update attendance record
    async update(id: string, data: Partial<AttendanceRecord>): Promise<void> {
        return withFirebaseCheck(
            async () => {
                await updateDoc(doc(db, 'attendanceRecords', id), {
                    ...data,
                    updatedAt: new Date(),
                });
            }
        );
    },

    // Delete attendance record
    async delete(id: string): Promise<void> {
        return withFirebaseCheck(
            async () => {
                await deleteDoc(doc(db, 'attendanceRecords', id));
            }
        );
    },

    // Batch add/update attendance records
    async batch(records: AttendanceRecord[]): Promise<void> {
        return withFirebaseCheck(
            async () => {
                const batch = writeBatch(db);
                records.forEach((record, index) => {
                    const docId = `${record.employee}-${record.date}`;
                    const docRef = doc(db, 'attendanceRecords', docId);
                    batch.set(docRef, { ...record, updatedAt: new Date() }, { merge: true });
                });
                await batch.commit();
                console.log(`✅ Successfully saved ${records.length} attendance records to Firebase`);
            }
        );
    },

    // Delete every attendance record
    async clearAll(): Promise<void> {
        return withFirebaseCheck(
            async () => {
                await deleteCollectionDocuments('attendanceRecords');
            },
            () => undefined
        );
    },
};

// ==================== PAYROLL RECORDS ====================

export const payrollService = {
    // Add payroll record
    async add(record: PayrollRecord): Promise<string> {
        return withFirebaseCheck(
            async () => {
                const docRef = await addDoc(collection(db, 'payrollRecords'), {
                    ...record,
                    createdAt: new Date(),
                });
                return docRef.id;
            }
        );
    },

    // Get all payroll records
    async getAll(): Promise<(PayrollRecord & { id: string })[]> {
        return withFirebaseCheck(
            async () => {
                const snapshot = await getDocs(collection(db, 'payrollRecords'));
                return snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                })) as (PayrollRecord & { id: string })[];
            },
            () => []
        );
    },

    // Get payroll records for employee
    async getByEmployee(employeeName: string): Promise<(PayrollRecord & { id: string })[]> {
        return withFirebaseCheck(
            async () => {
                const q = query(
                    collection(db, 'payrollRecords'),
                    where('employee', '==', employeeName)
                );
                const snapshot = await getDocs(q);
                return snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                })) as (PayrollRecord & { id: string })[];
            },
            () => []
        );
    },

    // Update payroll record
    async update(id: string, data: Partial<PayrollRecord>): Promise<void> {
        return withFirebaseCheck(
            async () => {
                await updateDoc(doc(db, 'payrollRecords', id), {
                    ...data,
                    updatedAt: new Date(),
                });
            }
        );
    },

    // Delete payroll record
    async delete(id: string): Promise<void> {
        return withFirebaseCheck(
            async () => {
                await deleteDoc(doc(db, 'payrollRecords', id));
            }
        );
    },

    // Batch update payroll records
    async batchUpdate(records: (PayrollRecord & { id: string })[]): Promise<void> {
        return withFirebaseCheck(
            async () => {
                const batch = writeBatch(db);
                records.forEach(record => {
                    const { id, ...data } = record;
                    batch.update(doc(db, 'payrollRecords', id), {
                        ...data,
                        updatedAt: new Date(),
                    });
                });
                await batch.commit();
            }
        );
    },
};

// ==================== SALES DATA ====================

export const salesService = {
    // Add sales record
    async add(record: SalesData): Promise<string> {
        return withFirebaseCheck(
            async () => {
                const docRef = await addDoc(collection(db, 'salesData'), {
                    ...record,
                    createdAt: new Date(),
                });
                return docRef.id;
            }
        );
    },

    // Get all sales records
    async getAll(): Promise<(SalesData & { id: string })[]> {
        return withFirebaseCheck(
            async () => {
                const snapshot = await getDocs(collection(db, 'salesData'));
                return snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                })) as (SalesData & { id: string })[];
            },
            () => []
        );
    },

    // Batch add sales records (prevents duplicates using Transaction ID)
    async batch(records: SalesData[]): Promise<void> {
        return withFirebaseCheck(
            async () => {
                const batch = writeBatch(db);
                records.forEach(record => {
                    // Use Transaction ID as the document ID to prevent duplicates
                    const transactionId = record['Transaction ID'] || `transaction-${Date.now()}-${Math.random()}`;
                    const docRef = doc(db, 'salesData', transactionId);
                    // Use set with merge to avoid overwriting if it already exists
                    batch.set(docRef, { ...record, createdAt: new Date() }, { merge: true });
                });
                await batch.commit();
            }
        );
    },

    // Delete all sales records
    async deleteAll(): Promise<void> {
        return withFirebaseCheck(
            async () => {
                await deleteCollectionDocuments('salesData');
            }
        );
    },
};

// ==================== INVENTORY ITEMS ====================

export const inventoryService = {
    // Add inventory item
    async add(item: InventoryItem): Promise<string> {
        return withFirebaseCheck(
            async () => {
                const docRef = await addDoc(collection(db, 'inventoryItems'), {
                    ...item,
                    createdAt: new Date(),
                });
                return docRef.id;
            }
        );
    },

    // Get all inventory items
    async getAll(): Promise<(InventoryItem & { id: string })[]> {
        return withFirebaseCheck(
            async () => {
                const snapshot = await getDocs(collection(db, 'inventoryItems'));
                return snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                })) as (InventoryItem & { id: string })[];
            },
            () => []
        );
    },

    // Update inventory item
    async update(id: string, data: Partial<InventoryItem>): Promise<void> {
        return withFirebaseCheck(
            async () => {
                await updateDoc(doc(db, 'inventoryItems', id), {
                    ...data,
                    updatedAt: new Date(),
                });
            }
        );
    },

    // Delete inventory item
    async delete(id: string): Promise<void> {
        return withFirebaseCheck(
            async () => {
                await deleteDoc(doc(db, 'inventoryItems', id));
            }
        );
    },
};

// ==================== PRODUCT INVENTORY ====================

export const productInventoryService = {
    // Add product
    async add(item: Omit<ProductInventoryItem, 'id'>): Promise<string> {
        return withFirebaseCheck(
            async () => {
                const docRef = await addDoc(collection(db, 'productInventory'), {
                    ...item,
                    createdAt: new Date(),
                });
                return docRef.id;
            }
        );
    },

    // Get all products
    async getAll(): Promise<(ProductInventoryItem & { id: string })[]> {
        return withFirebaseCheck(
            async () => {
                const snapshot = await getDocs(collection(db, 'productInventory'));
                return snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                })) as (ProductInventoryItem & { id: string })[];
            },
            () => []
        );
    },

    // Update product
    async update(id: string, data: Partial<ProductInventoryItem>): Promise<void> {
        return withFirebaseCheck(
            async () => {
                await updateDoc(doc(db, 'productInventory', id), {
                    ...data,
                    updatedAt: new Date(),
                });
            }
        );
    },

    // Delete product
    async delete(id: string): Promise<void> {
        return withFirebaseCheck(
            async () => {
                await deleteDoc(doc(db, 'productInventory', id));
            }
        );
    },
};

// ==================== PURCHASE ORDERS ====================

export const purchaseOrderService = {
    // Add purchase order
    async add(order: Omit<PurchaseOrder, 'id' | 'date' | 'status'>): Promise<string> {
        return withFirebaseCheck(
            async () => {
                const docRef = await addDoc(collection(db, 'purchaseOrders'), {
                    ...order,
                    date: new Date().toISOString(),
                    status: 'Pending' as const,
                    createdAt: new Date(),
                });
                return docRef.id;
            }
        );
    },

    // Get all purchase orders
    async getAll(): Promise<(PurchaseOrder & { id: string })[]> {
        return withFirebaseCheck(
            async () => {
                const snapshot = await getDocs(collection(db, 'purchaseOrders'));
                return snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                })) as (PurchaseOrder & { id: string })[];
            },
            () => []
        );
    },

    // Update purchase order
    async update(id: string, data: Partial<PurchaseOrder>): Promise<void> {
        return withFirebaseCheck(
            async () => {
                await updateDoc(doc(db, 'purchaseOrders', id), {
                    ...data,
                    updatedAt: new Date(),
                });
            }
        );
    },

    // Delete purchase order
    async delete(id: string): Promise<void> {
        return withFirebaseCheck(
            async () => {
                await deleteDoc(doc(db, 'purchaseOrders', id));
            }
        );
    },
};

// ==================== RECIPES ====================

export const recipesService = {
    // Add recipe
    async add(recipe: Omit<RecipeCosting, 'id'>): Promise<string> {
        return withFirebaseCheck(
            async () => {
                const docRef = await addDoc(collection(db, 'recipes'), {
                    ...recipe,
                    createdAt: new Date(),
                });
                return docRef.id;
            }
        );
    },

    // Get all recipes
    async getAll(): Promise<(RecipeCosting & { id: string })[]> {
        return withFirebaseCheck(
            async () => {
                const snapshot = await getDocs(collection(db, 'recipes'));
                return snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                })) as (RecipeCosting & { id: string })[];
            },
            () => []
        );
    },

    // Update recipe
    async update(id: string, data: Partial<RecipeCosting>): Promise<void> {
        return withFirebaseCheck(
            async () => {
                await updateDoc(doc(db, 'recipes', id), {
                    ...data,
                    updatedAt: new Date(),
                });
            }
        );
    },

    // Delete recipe
    async delete(id: string): Promise<void> {
        return withFirebaseCheck(
            async () => {
                await deleteDoc(doc(db, 'recipes', id));
            }
        );
    },
};

// ==================== CALENDAR EVENTS ====================

export const calendarService = {
    // Add event
    async add(event: Omit<CalendarEvent, 'id' | 'created'>): Promise<string> {
        return withFirebaseCheck(
            async () => {
                const docRef = await addDoc(collection(db, 'calendarEvents'), {
                    ...event,
                    created: new Date().toISOString(),
                    createdAt: new Date(),
                });
                return docRef.id;
            }
        );
    },

    // Get all events
    async getAll(): Promise<(CalendarEvent & { id: string })[]> {
        return withFirebaseCheck(
            async () => {
                const snapshot = await getDocs(collection(db, 'calendarEvents'));
                return snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                })) as (CalendarEvent & { id: string })[];
            },
            () => []
        );
    },

    // Update event
    async update(id: string, data: Partial<CalendarEvent>): Promise<void> {
        return withFirebaseCheck(
            async () => {
                await updateDoc(doc(db, 'calendarEvents', id), {
                    ...data,
                    updatedAt: new Date(),
                });
            }
        );
    },

    // Delete event
    async delete(id: string): Promise<void> {
        return withFirebaseCheck(
            async () => {
                await deleteDoc(doc(db, 'calendarEvents', id));
            }
        );
    },
};

// ==================== CLEAR UTILITIES ====================

/**
 * Clear all employee schedules and attendance records
 * This removes all weekly schedule and attendance data from Firebase
 */
export async function clearAttendanceData(): Promise<void> {
    if (!isFirebaseConfigured) {
        console.warn('Firebase is not configured. Cannot clear data.');
        return;
    }

    try {
        // Clear all attendance records
        await attendanceService.clearAll();
        console.log('✅ All attendance records cleared from Firebase');

        // Clear all schedules from employees
        const employees = await employeesService.getAll();
        if (employees.length > 0) {
            const batch = writeBatch(db);
            employees.forEach(emp => {
                batch.update(doc(db, 'employees', emp.id), {
                    schedule: {},
                    updatedAt: new Date(),
                });
            });
            await batch.commit();
            console.log('✅ All employee schedules cleared from Firebase');
        }
    } catch (error) {
        console.error('Error clearing attendance data:', error);
        throw error;
    }
}

// ==================== SYNC UTILITIES ====================

/**
 * Sync all data from localStorage to Firestore
 * This is useful for one-time migration of existing data
 */
export async function syncDataToFirestore(appData: {
    employees: Employee[];
    attendanceRecords: AttendanceRecord[];
    payrollRecords: PayrollRecord[];
    salesData: SalesData[];
    inventoryItems: InventoryItem[];
    productInventory: ProductInventoryItem[];
    purchaseOrders: PurchaseOrder[];
    recipes: RecipeCosting[];
    calendarEvents: CalendarEvent[];
}): Promise<void> {
    if (!isFirebaseConfigured) {
        throw new Error('Firebase is not configured');
    }

    try {
        // Use batch writes for better performance
        const batch = writeBatch(db);

        // Sync employees
        appData.employees.forEach((emp) => {
            const docRef = doc(collection(db, 'employees'), `emp-${emp.id}`);
            batch.set(docRef, { ...emp, syncedAt: new Date() });
        });

        // Sync attendance records
        await attendanceService.batch(appData.attendanceRecords);

        // Sync payroll records
        appData.payrollRecords.forEach((record) => {
            const docRef = doc(collection(db, 'payrollRecords'), `payroll-${record.id}`);
            batch.set(docRef, { ...record, syncedAt: new Date() });
        });

        // Sync sales data
        await salesService.batch(appData.salesData);

        // Sync inventory
        appData.inventoryItems.forEach((item) => {
            const docRef = doc(collection(db, 'inventoryItems'), `inv-${item.id}`);
            batch.set(docRef, { ...item, syncedAt: new Date() });
        });

        // Sync product inventory
        appData.productInventory.forEach((product) => {
            const docRef = doc(collection(db, 'productInventory'), `prod-${product.id}`);
            batch.set(docRef, { ...product, syncedAt: new Date() });
        });

        // Sync purchase orders
        appData.purchaseOrders.forEach((order) => {
            const docRef = doc(collection(db, 'purchaseOrders'), `po-${order.id}`);
            batch.set(docRef, { ...order, syncedAt: new Date() });
        });

        // Sync recipes
        appData.recipes.forEach((recipe) => {
            const docRef = doc(collection(db, 'recipes'), `recipe-${recipe.id}`);
            batch.set(docRef, { ...recipe, syncedAt: new Date() });
        });

        // Sync calendar events
        appData.calendarEvents.forEach((event) => {
            const docRef = doc(collection(db, 'calendarEvents'), `event-${event.id}`);
            batch.set(docRef, { ...event, syncedAt: new Date() });
        });

        await batch.commit();
        console.log('All data synced to Firestore successfully');
    } catch (error) {
        console.error('Error syncing data to Firestore:', error);
        throw error;
    }
}

// ==================== DASHBOARD PREFERENCES ====================

export interface DashboardPreference {
    filter: 'daily' | 'weekly' | 'monthly' | 'lastMonth' | 'custom';
    startDate: string;
    endDate: string;
    updatedAt?: Date;
}

export const dashboardPreferencesService = {
    // Save dashboard preferences
    async save(preferences: DashboardPreference): Promise<void> {
        return withFirebaseCheck(
            async () => {
                const docRef = doc(db, 'userPreferences', 'dashboardFilter');
                await setDoc(docRef, {
                    ...preferences,
                    updatedAt: new Date()
                }, { merge: true });
                console.log('✅ Dashboard preferences saved to Firebase');
            }
        );
    },

    // Load dashboard preferences
    async load(): Promise<DashboardPreference | null> {
        return withFirebaseCheck(
            async () => {
                const docRef = doc(db, 'userPreferences', 'dashboardFilter');
                const snapshot = await getDoc(docRef);
                if (snapshot.exists()) {
                    return snapshot.data() as DashboardPreference;
                }
                return null;
            },
            () => null // Fallback to null if Firebase not available
        );
    }
};

export const accountingService = {
    // Account balances management
    async getAccountBalance(account: string): Promise<AccountBalance | null> {
        return withFirebaseCheck(
            async () => {
                const docRef = doc(db, 'accountBalances', account);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    return { ...docSnap.data(), account } as AccountBalance;
                }
                return null;
            },
            () => null
        );
    },

    async setAccountBalance(account: string, openingBalance: number): Promise<void> {
        return withFirebaseCheck(
            async () => {
                const docRef = doc(db, 'accountBalances', account);
                await setDoc(docRef, {
                    account,
                    openingBalance,
                    currentBalance: openingBalance,
                    updatedAt: new Date().toISOString(),
                });
            }
        );
    },

    // Get all transactions
    async getAll(): Promise<(AccountingTransaction & { id: string })[]> {
        return withFirebaseCheck(
            async () => {
                const snapshot = await getDocs(
                    query(collection(db, 'accountingTransactions'), orderBy('date', 'desc'))
                );
                return snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                })) as (AccountingTransaction & { id: string })[];
            },
            () => []
        );
    },

    // Get transactions by date range
    async getByDateRange(startDate: string, endDate: string): Promise<(AccountingTransaction & { id: string })[]> {
        return withFirebaseCheck(
            async () => {
                const q = query(
                    collection(db, 'accountingTransactions'),
                    where('date', '>=', startDate),
                    where('date', '<=', endDate),
                    orderBy('date', 'desc')
                );
                const snapshot = await getDocs(q);
                return snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                })) as (AccountingTransaction & { id: string })[];
            },
            () => []
        );
    },

    // Add transaction
    async add(transaction: Omit<AccountingTransaction, 'id'>): Promise<string> {
        return withFirebaseCheck(
            async () => {
                const docRef = await addDoc(collection(db, 'accountingTransactions'), {
                    ...transaction,
                    createdAt: new Date().toISOString(),
                });
                return docRef.id;
            }
        );
    },

    // Update transaction
    async update(id: string, data: Partial<AccountingTransaction>): Promise<void> {
        return withFirebaseCheck(
            async () => {
                await updateDoc(doc(db, 'accountingTransactions', id), {
                    ...data,
                    updatedAt: new Date().toISOString(),
                });
            }
        );
    },

    // Delete transaction
    async delete(id: string): Promise<void> {
        return withFirebaseCheck(
            async () => {
                await deleteDoc(doc(db, 'accountingTransactions', id));
            }
        );
    },
};
