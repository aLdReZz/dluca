import React from 'react';

export type Role = 'admin' | 'staff';

export type Page = 'dashboard' | 'sales' | 'pricelist' | 'inventory-supplies' | 'purchase-request' | 'costing' | 'accounting' | 'accounting-transactions' | 'accounting-profitloss' | 'accounting-chartofaccounts' | 'attendance' | 'payroll' | 'calendar';

export interface SalesData {
    [key: string]: string;
}

export interface InventoryItem {
    id: number;
    name: string;
    category: string;
    department: string;
    stock: number;
    unit: string;
    minStock: number;
    lastUpdated: string;
    image?: string | null;
    storageLocation?: string;
    expirationDate?: string;
}

export interface ProductInventoryItem {
    id: number;
    category: string;
    name: string;
    brand: string;
    unit: string;
    quantity?: number;
    price: number;
    supplier: string;
}

export interface PurchaseOrder {
    id: number;
    date: string;
    department: string;
    items: {
        itemId?: number;
        itemName: string;
        unit?: string;
        quantity: number;
        cost: number;
    }[];
    totalCost: number;
    status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
    delivered?: Record<number, boolean>;
}

export interface Schedule {
    timeIn: string;
    timeOut: string;
    off: boolean;
}

export interface SalaryDeduction {
    id: string;
    description: string;
    amount: number;
    date: string;
}

export interface AdditionalIncome {
    id: string;
    description: string;
    amount: number;
    date: string;
}

export interface RateHistoryEntry {
    id: string;
    rate: number;
    effectiveDate: string;
    notes?: string;
}

export interface Employee {
    id: number;
    name: string;
    position: string;
    rate: number;
    rateHistory?: RateHistoryEntry[];
    schedule: { [dateKey: string]: Schedule };
    phone?: string;
    email?: string;
    department?: string;
    bankAccount?: string;
    paymentMode?: string;
    approvedOvertime?: { [dateKey: string]: number }; // in minutes
    paidHoursOverride?: { [dateKey: string]: number };
    order?: number; // Position in the employee list
    salaryDeductions?: SalaryDeduction[];
    additionalIncome?: AdditionalIncome[];
    serviceChargeEnabled?: boolean; // Whether employee receives service charge distribution
}

export interface AttendanceRecord {
    employee: string;
    date: string;
    timeIn: string;
    timeOut: string;
}

export interface Deductions {
    sss: number;
    philhealth: number;
    pagibig: number;
    total: number;
}

export interface ServiceChargeDayDetail {
    dateKey: string;
    pool: number;
    totalMinutes: number;
    teamMinutes: number;
    attendanceMinutes: number;
    employeeMinutes: number;
    share: number;
    ghostMinutes: number;
    grossShare?: number;
    deductionAmount?: number;
    deductionRate?: number;
    ghostShareTotal?: number;
    ghostSharePerGhost?: number;
    ghostCount?: number;
}

export interface ServiceChargeBreakdown {
    totalShare: number;
    totalPool: number;
    coveredDays: number;
    details: ServiceChargeDayDetail[];
}

export interface PayrollRecord {
    id: number;
    employee: string;
    position: string;
    department?: string;
    bankAccount?: string;
    paymentMode?: string;
    rate: number;
    regularHours: number;
    overtimeHours: number;
    totalHours: number;
    regularPay: number;
    overtimePay: number;
    serviceCharge: number;
    grossPay: number;
    deductions: Deductions;
    netPay: number;
    daysPresent: number;
    daysAbsent: number;
    daysLate: number;
    deductionNotes?: string;
    customDeduction?: number;
    serviceChargeBreakdown?: ServiceChargeBreakdown;
    additionalIncome?: number;
    lateMinutes?: number;
    lateDeduction?: number;
}

export interface RecipeIngredient {
    itemId: number;
    name: string;
    quantity: number;
    unit: string;
    cost: number;
}

export interface RecipeCosting {
    id: number;
    name: string;
    ingredients: RecipeIngredient[];
    totalCost: number;
    totalCostWithAllocation: number;
    sellingPrice: number;
    foodCostPercentage: number;
    finalCostPercentage: number;
    isTemplate?: boolean; // True if this is a template recipe (not sold individually)
    yieldAmount?: number; // Total grams/units this recipe produces
    yieldUnit?: string; // Unit of yield (g, kg, pcs, etc.)
    costPerUnit?: number; // Cost per unit (calculated based on yieldUnit)
}

export type ContentType = 'Post' | 'Story' | 'Reel' | 'Ad';
export type ContentStatus = 'Planned' | 'In Progress' | 'Needs Review' | 'Published';

export interface CalendarEvent {
    id: number;
    title: string;
    description?: string;
    date: string;
    type: ContentType;
    status: ContentStatus;
    created: string;
    updated?: string;
}

export interface AccountingTransaction {
    id: string;
    date: string;
    type: 'debit' | 'credit' | 'transfer';
    account: 'cash' | 'gcash' | 'grab' | 'card';
    description: string;
    amount: number;
    reference?: string;
    notes?: string;
    transferTo?: string;
    runningBalance: number;
    accountId?: string; // Link to Chart of Accounts
    createdAt?: string;
    updatedAt?: string;
}

export interface AccountBalance {
    account: 'cash' | 'gcash' | 'grab' | 'card';
    openingBalance: number;
    currentBalance: number;
}

export interface Account {
    id: string;
    code: string;
    name: string;
    type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'bank';
    description?: string;
    parentId?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}
