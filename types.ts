import React from 'react';

export type Role = 'admin' | 'staff';

export type Page = 'dashboard' | 'sales' | 'pricelist' | 'inventory-supplies' | 'purchase-request' | 'costing' | 'attendance' | 'payroll' | 'calendar';

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
    price: number;
    supplier: string;
}

export interface PurchaseOrder {
    id: number;
    date: string;
    department: string;
    items: {
        itemId: number;
        quantity: number;
        cost: number;
    }[];
    totalCost: number;
    status: 'Pending' | 'Completed' | 'Cancelled';
}

export interface Schedule {
    timeIn: string;
    timeOut: string;
    off: boolean;
}

export interface Employee {
    id: number;
    name: string;
    position: string;
    rate: number;
    schedule: { [dateKey: string]: Schedule };
    phone?: string;
    email?: string;
    approvedOvertime?: { [dateKey: string]: number }; // in minutes
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
