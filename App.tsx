import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import RoleSelection from './components/RoleSelection';
import PinModal from './components/PinModal';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Inventory from './pages/Inventory';
import Costing from './pages/Costing';
import Attendance from './pages/Attendance';
import Payroll from './pages/Payroll';
import Calendar from './pages/Calendar';
import PurchaseRequest from './pages/PurchaseRequest';
import type { Role, Page, SalesData, InventoryItem, PurchaseOrder, Employee, CalendarEvent, RecipeCosting, PayrollRecord, AttendanceRecord, ProductInventoryItem } from './types';
import { MenuIcon, ShieldCheckIcon, UserIcon } from './components/Icons';

const ADMIN_PIN = '1234';

const COMMON_UNITS = [
    'pcs', 'kg', 'g', 'mg', 'L', 'ml', 'oz', 'lb', 'servings', 'bottles', 'pack', 'box', 'case', 'bundle'
];

const initialProductInventory: ProductInventoryItem[] = [
    { "id": 1, "name": "Crushed Tomato", "brand": "Dona Elena", "category": "Canned Goods", "unit": "pcs", "price": 85.00, "supplier": "S&R Membership Shopping" },
    { "id": 2, "name": "Corned Beef", "brand": "Delimondo", "category": "Canned Goods", "unit": "pcs", "price": 155.00, "supplier": "Puregold" },
    { "id": 3, "name": "Cream of Mushroom", "brand": "Jolly", "category": "Canned Goods", "unit": "pcs", "price": 45.50, "supplier": "SM Supermarket" },
    { "id": 4, "name": "Button Mushroom - Pieces and Stem", "brand": "Jolly", "category": "Canned Goods", "unit": "pcs", "price": 52.00, "supplier": "SM Supermarket" },
    { "id": 5, "name": "Shitake Mushroom", "brand": "Jolly", "category": "Canned Goods", "unit": "pcs", "price": 95.00, "supplier": "Local Market" },
    { "id": 6, "name": "Spanish Sardines", "brand": "555", "category": "Canned Goods", "unit": "pcs", "price": 65.00, "supplier": "Robinson's Supermarket" },
    { "id": 7, "name": "Corn Kernel", "brand": "Jolly", "category": "Canned Goods", "unit": "pcs", "price": 48.00, "supplier": "SM Supermarket" },
    { "id": 8, "name": "Parmesan Cheese", "brand": "Chizboy", "category": "Dairy", "unit": "pack", "price": 120.00, "supplier": "S&R Membership Shopping" },
    { "id": 9, "name": "Slice Cheese", "brand": "Arla", "category": "Dairy", "unit": "pack", "price": 110.00, "supplier": "Puregold" },
    { "id": 10, "name": "Cooking Cream", "brand": "EverChef", "category": "Dairy", "unit": "pcs", "price": 130.00, "supplier": "S&R Membership Shopping" },
    { "id": 11, "name": "Butter Salted", "brand": "Magnolia", "category": "Dairy", "unit": "pcs", "price": 90.00, "supplier": "SM Supermarket" },
    { "id": 12, "name": "Egg", "brand": "", "category": "Dairy", "unit": "pcs", "price": 8.00, "supplier": "Local Market" },
    { "id": 13, "name": "Mozzarella Cheese", "brand": "Arla", "category": "Dairy", "unit": "pcs", "price": 350.00, "supplier": "S&R Membership Shopping" },
    { "id": 14, "name": "Mozzarella Cheese", "brand": "Jersey", "category": "Dairy", "unit": "pcs", "price": 280.00, "supplier": "Puregold" },
    { "id": 15, "name": "Yogurt", "brand": "Nestle", "category": "Dairy", "unit": "pcs", "price": 45.00, "supplier": "Robinson's Supermarket" },
    { "id": 16, "name": "Baguette", "brand": "", "category": "Dairy", "unit": "pcs", "price": 80.00, "supplier": "Local Bakery" },
    { "id": 17, "name": "Breadcrumbs", "brand": "Good Life", "category": "Dry Goods", "unit": "pack", "price": 60.00, "supplier": "SM Supermarket" },
    { "id": 18, "name": "Cornstarch", "brand": "", "category": "Dry Goods", "unit": "kg", "price": 35.00, "supplier": "Local Market" },
    { "id": 19, "name": "Flour", "brand": "", "category": "Dry Goods", "unit": "kg", "price": 70.00, "supplier": "Local Market" },
    { "id": 20, "name": "Rice", "brand": "", "category": "Dry Goods", "unit": "kg", "price": 55.00, "supplier": "Local Market" },
    { "id": 21, "name": "Linguine", "brand": "Ideal", "category": "Dry Goods", "unit": "pack", "price": 95.00, "supplier": "S&R Membership Shopping" },
    { "id": 22, "name": "Spaghetti", "brand": "Ideal", "category": "Dry Goods", "unit": "pack", "price": 90.00, "supplier": "Puregold" },
    { "id": 23, "name": "Kropek", "brand": "Fat and Thin", "category": "Dry Goods", "unit": "pack", "price": 25.00, "supplier": "Local Market" },
    { "id": 24, "name": "Nacho Chips", "brand": "", "category": "Dry Goods", "unit": "pack", "price": 150.00, "supplier": "S&R Membership Shopping" },
    { "id": 25, "name": "Lumpia Wrapper (Big)", "brand": "Bambi", "category": "Dry Goods", "unit": "pack", "price": 30.00, "supplier": "Local Market" },
    { "id": 26, "name": "Dried Basil", "brand": "Badia", "category": "Dry Goods", "unit": "bottles", "price": 80.00, "supplier": "SM Supermarket" },
    { "id": 27, "name": "Bay Leaves", "brand": "", "category": "Dry Goods", "unit": "pack", "price": 20.00, "supplier": "Local Market" },
    { "id": 28, "name": "Parsley (Dried)", "brand": "Badia", "category": "Dry Goods", "unit": "bottles", "price": 75.00, "supplier": "SM Supermarket" },
    { "id": 29, "name": "Garlic Powder", "brand": "Badia", "category": "Dry Goods", "unit": "bottles", "price": 70.00, "supplier": "Puregold" },
    { "id": 30, "name": "Crinkle Fries", "brand": "HyFun", "category": "Frozen", "unit": "pack", "price": 250.00, "supplier": "S&R Membership Shopping" },
    { "id": 31, "name": "Cling Wrap", "brand": "", "category": "Kitchen Supplies", "unit": "pcs", "price": 120.00, "supplier": "Robinson's Supermarket" },
    { "id": 32, "name": "Tocino", "brand": "Young Pork CDO", "category": "Meat", "unit": "pack", "price": 200.00, "supplier": "SM Supermarket" },
    { "id": 33, "name": "Lechon Kawali Slab", "brand": "", "category": "Meat", "unit": "kg", "price": 450.00, "supplier": "Local Market" },
    { "id": 34, "name": "Pork Kasim", "brand": "", "category": "Meat", "unit": "kg", "price": 380.00, "supplier": "Local Market" },
    { "id": 35, "name": "Pork Ground", "brand": "", "category": "Meat", "unit": "kg", "price": 360.00, "supplier": "Local Market" },
    { "id": 36, "name": "Beef Sukiyaki", "brand": "", "category": "Meat", "unit": "kg", "price": 550.00, "supplier": "S&R Membership Shopping" },
    { "id": 37, "name": "Beef Ground (Fatty)", "brand": "", "category": "Meat", "unit": "kg", "price": 420.00, "supplier": "Local Market" },
    { "id": 38, "name": "Chicken Breast Fillet", "brand": "", "category": "Meat", "unit": "kg", "price": 280.00, "supplier": "SM Supermarket" },
    { "id": 39, "name": "Chicken Skin", "brand": "", "category": "Meat", "unit": "kg", "price": 100.00, "supplier": "Local Market" },
    { "id": 40, "name": "Chicken Quarter", "brand": "", "category": "Meat", "unit": "kg", "price": 240.00, "supplier": "Puregold" },
    { "id": 41, "name": "Banugs Boneless (Small - Medium)", "brand": "", "category": "Meat", "unit": "kg", "price": 180.00, "supplier": "Local Market" },
    { "id": 42, "name": "Ham Slice", "brand": "", "category": "Meat", "unit": "pack", "price": 220.00, "supplier": "Robinson's Supermarket" },
    { "id": 43, "name": "Hungarian Sausage", "brand": "", "category": "Meat", "unit": "pack", "price": 300.00, "supplier": "S&R Membership Shopping" },
    { "id": 44, "name": "Calumpit Longganisa", "brand": "", "category": "Meat", "unit": "pack", "price": 250.00, "supplier": "Local Market" },
    { "id": 45, "name": "Calamansi", "brand": "", "category": "Produce", "unit": "kg", "price": 80.00, "supplier": "Local Market" },
    { "id": 46, "name": "Carrots", "brand": "", "category": "Produce", "unit": "kg", "price": 120.00, "supplier": "Local Market" },
    { "id": 47, "name": "Celery", "brand": "", "category": "Produce", "unit": "kg", "price": 150.00, "supplier": "Local Market" },
    { "id": 48, "name": "Cucumber", "brand": "", "category": "Produce", "unit": "kg", "price": 90.00, "supplier": "Local Market" },
    { "id": 49, "name": "Garlic", "brand": "", "category": "Produce", "unit": "kg", "price": 150.00, "supplier": "Local Market" },
    { "id": 50, "name": "Lettuce", "brand": "", "category": "Produce", "unit": "kg", "price": 200.00, "supplier": "Local Market" },
    { "id": 51, "name": "Onion Red", "brand": "", "category": "Produce", "unit": "kg", "price": 140.00, "supplier": "Local Market" },
    { "id": 52, "name": "Onion White", "brand": "", "category": "Produce", "unit": "kg", "price": 160.00, "supplier": "Local Market" },
    { "id": 53, "name": "Parsley (Fresh)", "brand": "", "category": "Produce", "unit": "bundle", "price": 50.00, "supplier": "Local Market" },
    { "id": 54, "name": "Potato", "brand": "", "category": "Produce", "unit": "kg", "price": 110.00, "supplier": "Local Market" },
    { "id": 55, "name": "Squash", "brand": "", "category": "Produce", "unit": "kg", "price": 60.00, "supplier": "Local Market" },
    { "id": 56, "name": "Beef Cubes", "brand": "Knorr", "category": "Spices, Seasonings, Condiments", "unit": "pcs", "price": 12.00, "supplier": "Puregold" },
    { "id": 57, "name": "Ketchup", "brand": "UFC", "category": "Spices, Seasonings, Condiments", "unit": "bottles", "price": 80.00, "supplier": "SM Supermarket" },
    { "id": 58, "name": "Chicken Powder", "brand": "Knorr", "category": "Spices, Seasonings, Condiments", "unit": "pack", "price": 150.00, "supplier": "S&R Membership Shopping" },
    { "id": 59, "name": "Aligue Paste", "brand": "", "category": "Spices, Seasonings, Condiments", "unit": "pcs", "price": 180.00, "supplier": "Local Market" },
    { "id": 60, "name": "Smoke Paprika", "brand": "McCormick", "category": "Spices, Seasonings, Condiments", "unit": "bottles", "price": 110.00, "supplier": "S&R Membership Shopping" },
    { "id": 61, "name": "Chili Flakes", "brand": "", "category": "Spices, Seasonings, Condiments", "unit": "pack", "price": 60.00, "supplier": "Local Market" },
    { "id": 62, "name": "Hot Sauce", "brand": "Jufran", "category": "Spices, Seasonings, Condiments", "unit": "bottles", "price": 55.00, "supplier": "Robinson's Supermarket" },
    { "id": 63, "name": "Iodized Salt", "brand": "", "category": "Spices, Seasonings, Condiments", "unit": "kg", "price": 20.00, "supplier": "Local Market" },
    { "id": 64, "name": "Rock Salt", "brand": "", "category": "Spices, Seasonings, Condiments", "unit": "kg", "price": 18.00, "supplier": "Local Market" },
    { "id": 65, "name": "Liquid Seasoning", "brand": "Knorr", "category": "Spices, Seasonings, Condiments", "unit": "bottles", "price": 70.00, "supplier": "Puregold" },
    { "id": 66, "name": "Oyster Sauce", "brand": "Mama Sita", "category": "Spices, Seasonings, Condiments", "unit": "bottles", "price": 65.00, "supplier": "SM Supermarket" },
    { "id": 67, "name": "Patis", "brand": "Lorins Patis", "category": "Spices, Seasonings, Condiments", "unit": "bottles", "price": 35.00, "supplier": "Local Market" },
    { "id": 68, "name": "Black Pepper Whole", "brand": "Member's Value", "category": "Spices, Seasonings, Condiments", "unit": "pack", "price": 180.00, "supplier": "S&R Membership Shopping" },
    { "id": 69, "name": "Black Pepper Ground", "brand": "Member's Value", "category": "Spices, Seasonings, Condiments", "unit": "pack", "price": 160.00, "supplier": "S&R Membership Shopping" },
    { "id": 70, "name": "White Pepper Ground", "brand": "Member's Value", "category": "Spices, Seasonings, Condiments", "unit": "pack", "price": 170.00, "supplier": "S&R Membership Shopping" },
    { "id": 71, "name": "Soy Sauce", "brand": "Datu Puti", "category": "Spices, Seasonings, Condiments", "unit": "bottles", "price": 40.00, "supplier": "Puregold" },
    { "id": 72, "name": "Sugar Brown", "brand": "", "category": "Spices, Seasonings, Condiments", "unit": "kg", "price": 65.00, "supplier": "Local Market" },
    { "id": 73, "name": "Sugar White", "brand": "", "category": "Spices, Seasonings, Condiments", "unit": "kg", "price": 80.00, "supplier": "Local Market" },
    { "id": 74, "name": "Sweet Chili Sauce", "brand": "Suree", "category": "Spices, Seasonings, Condiments", "unit": "bottles", "price": 90.00, "supplier": "Robinson's Supermarket" },
    { "id": 75, "name": "Vinegar", "brand": "Datu Puti", "category": "Spices, Seasonings, Condiments", "unit": "bottles", "price": 30.00, "supplier": "Local Market" },
    { "id": 76, "name": "Mixed Vegetable", "brand": "Southern Valley", "category": "Frozen", "unit": "pack", "price": 120.00, "supplier": "S&R Membership Shopping" },
    { "id": 77, "name": "Pickled Relish", "brand": "RAM", "category": "Spices, Seasonings, Condiments", "unit": "pcs", "price": 85.00, "supplier": "SM Supermarket" },
    { "id": 78, "name": "Yellow Mustard", "brand": "", "category": "Spices, Seasonings, Condiments", "unit": "bottles", "price": 110.00, "supplier": "S&R Membership Shopping" },
    { "id": 79, "name": "Maple", "brand": "Cem's", "category": "Spices, Seasonings, Condiments", "unit": "bottles", "price": 250.00, "supplier": "S&R Membership Shopping" },
    { "id": 80, "name": "Honey", "brand": "Prime", "category": "Spices, Seasonings, Condiments", "unit": "bottles", "price": 300.00, "supplier": "Local Market" },
    { "id": 81, "name": "Vegetable Oil", "brand": "Jolly", "category": "Spices, Seasonings, Condiments", "unit": "L", "price": 120.00, "supplier": "Puregold" },
    { "id": 82, "name": "Liquid Smoke", "brand": "Wright's", "category": "Spices, Seasonings, Condiments", "unit": "bottles", "price": 280.00, "supplier": "S&R Membership Shopping" }
];

const initialRecipeCostings: RecipeCosting[] = [
    {
        id: 1,
        name: "Hearty Tomato Soup",
        ingredients: [
            { itemId: 1, name: "Crushed Tomato", quantity: 1, unit: "pcs", cost: 85.00 },
            { itemId: 49, name: "Garlic", quantity: 0.05, unit: "kg", cost: 7.50 },
            { itemId: 51, name: "Onion Red", quantity: 0.1, unit: "kg", cost: 14.00 },
            { itemId: 10, name: "Cooking Cream", quantity: 0.2, unit: "pcs", cost: 26.00 }
        ],
        totalCost: 132.50,
        totalCostWithAllocation: 267.65,
        sellingPrice: 280.00,
        foodCostPercentage: 47.32,
        finalCostPercentage: 95.59
    },
    {
        id: 2,
        name: "Cheesy Beef Tapa",
        ingredients: [
            { itemId: 36, name: "Beef Sukiyaki", quantity: 0.25, unit: "kg", cost: 137.5 },
            { itemId: 9, name: "Slice Cheese", quantity: 0.2, unit: "pack", cost: 22 },
            { itemId: 20, name: "Rice", quantity: 0.15, unit: "kg", cost: 8.25 },
            { itemId: 12, name: "Egg", quantity: 1, unit: "pcs", cost: 8.00 }
        ],
        totalCost: 175.75,
        totalCostWithAllocation: 355.02,
        sellingPrice: 350.00,
        foodCostPercentage: 50.21,
        finalCostPercentage: 101.43
    }
];


const App: React.FC = () => {
    const [role, setRole] = useState<Role | null>('admin');
    const [isPinModalOpen, setPinModalOpen] = useState<boolean>(false);
    const [page, setPage] = useState<Page>('costing');
    const [isSidebarOpen, setSidebarOpen] = useState<boolean>(false);
    const [dashboardIntro, setDashboardIntro] = useState(false);
    const dashboardIntroTimeout = useRef<number | null>(null);

    // App Data State
    const [salesData, setSalesData] = useState<SalesData[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([
        { id: 1, name: 'Tomatoes', category: 'Vegetable', department: 'Kitchen', stock: 120, unit: 'kg', minStock: 20, lastUpdated: '2024-08-15T14:30:00Z', storageLocation: 'Freezer', expirationDate: '2024-09-15T00:00:00Z', image: 'https://img.icons8.com/plasticine/100/tomato.png' },
        { id: 2, name: 'Chicken Breast', category: 'Meat', department: 'Kitchen', stock: 40, unit: 'kg', minStock: 50, lastUpdated: '2024-08-15T14:30:00Z', storageLocation: 'Freezer', expirationDate: '2024-08-25T00:00:00Z', image: 'https://img.icons8.com/plasticine/100/chicken.png' },
        { id: 3, name: 'Eggs', category: 'Dairy', department: 'Bakery', stock: 0, unit: 'pcs', minStock: 100, lastUpdated: '2024-08-15T14:30:00Z', storageLocation: 'Freezer 2', expirationDate: '2024-09-01T00:00:00Z', image: 'https://img.icons8.com/plasticine/100/boiled-egg.png' },
        { id: 4, name: 'Pasta', category: 'Dry Goods', department: 'Kitchen', stock: 40, unit: 'kg', minStock: 10, lastUpdated: '2024-08-15T14:30:00Z', storageLocation: 'Pantry', expirationDate: '2024-07-15T00:00:00Z', image: 'https://img.icons8.com/plasticine/100/spaghetti.png' },
        { id: 5, name: 'Olive Oil', category: 'Dry Goods', department: 'Kitchen', stock: 120, unit: 'L', minStock: 20, lastUpdated: '2024-08-14T10:00:00Z', storageLocation: 'Pantry', expirationDate: '2025-01-01T00:00:00Z', image: null },
        { id: 6, name: 'Flour', category: 'Dry Goods', department: 'Bakery', stock: 80, unit: 'kg', minStock: 25, lastUpdated: '2024-08-15T11:00:00Z', storageLocation: 'Pantry', expirationDate: '2025-02-01T00:00:00Z', image: 'https://img.icons8.com/plasticine/100/flour.png' },
        { id: 7, name: 'Coffee Beans', category: 'Beverage', department: 'Bar', stock: 30, unit: 'kg', minStock: 15, lastUpdated: '2024-08-15T09:30:00Z', storageLocation: 'Bar Stock', expirationDate: '2024-11-01T00:00:00Z', image: 'https://img.icons8.com/plasticine/100/coffee-beans-.png' },
        { id: 8, name: 'Napkins', category: 'Supplies', department: 'Dining', stock: 500, unit: 'pcs', minStock: 200, lastUpdated: '2024-08-12T16:00:00Z', storageLocation: 'Supply Closet', expirationDate: '2026-01-01T00:00:00Z', image: 'https://img.icons8.com/plasticine/100/paper-napkin.png' },
        { id: 9, name: 'Red Wine', category: 'Beverage', department: 'Bar', stock: 15, unit: 'bottles', minStock: 10, lastUpdated: '2024-08-10T18:00:00Z', storageLocation: 'Wine Cellar', expirationDate: '2028-01-01T00:00:00Z', image: 'https://img.icons8.com/plasticine/100/wine-bottle.png' },
        { id: 10, name: 'Table Cloths', category: 'Supplies', department: 'Dining', stock: 25, unit: 'pcs', minStock: 30, lastUpdated: '2024-08-13T13:00:00Z', storageLocation: 'Linen Closet', expirationDate: '2030-01-01T00:00:00Z', image: 'https://img.icons8.com/plasticine/100/tablecloth.png' }
    ]);
    const [productInventoryItems, setProductInventoryItems] = useState<ProductInventoryItem[]>(initialProductInventory);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([
        {
            id: 2024001,
            date: '2024-08-10T00:00:00Z',
            department: 'Kitchen',
            items: [
                { itemId: 1, quantity: 50, cost: 5000 },
                { itemId: 2, quantity: 20, cost: 8000 },
            ],
            totalCost: 13000,
            status: 'Completed',
        },
        {
            id: 2024002,
            date: '2024-08-12T00:00:00Z',
            department: 'Bakery',
            items: [
                { itemId: 6, quantity: 100, cost: 7500 },
            ],
            totalCost: 7500,
            status: 'Pending',
        },
        {
            id: 2024003,
            date: '2024-08-13T00:00:00Z',
            department: 'Kitchen',
            items: [
                { itemId: 1, quantity: 20, cost: 2000 },
            ],
            totalCost: 2000,
            status: 'Cancelled',
        },
    ]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
    const [recipeCostings, setRecipeCostings] = useState<RecipeCosting[]>(initialRecipeCostings);
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

    const productCategories = useMemo(() => {
        const categories = new Set(productInventoryItems.map(item => item.category));
        return Array.from(categories).sort();
    }, [productInventoryItems]);

    const productBrands = useMemo(() => {
        const brands = new Set(productInventoryItems.map(item => item.brand).filter(Boolean));
        return Array.from(brands).sort();
    }, [productInventoryItems]);

    const productUnits = useMemo(() => {
        const dynamicUnits = productInventoryItems.map(item => item.unit).filter(Boolean);
        const combinedUnits = new Set([...COMMON_UNITS, ...dynamicUnits]);
        return Array.from(combinedUnits).sort();
    }, [productInventoryItems]);

    const productSuppliers = useMemo(() => {
        const suppliers = new Set(productInventoryItems.map(item => item.supplier).filter(Boolean));
        return Array.from(suppliers).sort();
    }, [productInventoryItems]);

    const departments = useMemo(() => {
        const depts = new Set(inventoryItems.map(item => item.department));
        return Array.from(depts).sort();
    }, [inventoryItems]);

    const loadData = useCallback(() => {
        const savedData = localStorage.getItem('cafeManagementData');
        if (savedData) {
            const data = JSON.parse(savedData);
            setSalesData(data.salesData || []);
            // setInventoryItems(data.inventoryItems || []); // Use hardcoded data for demo
            setProductInventoryItems(data.productInventoryItems || initialProductInventory);
            // setPurchaseOrders(data.purchaseOrders || []); // Use hardcoded data for demo
            setEmployees(data.employees || []);
            setAttendanceRecords(data.attendanceRecords || []);
            setPayrollRecords(data.payrollRecords || []);
            setRecipeCostings(data.recipeCostings || initialRecipeCostings);
            setCalendarEvents(data.calendarEvents || []);
        }
    }, []);

    const saveData = useCallback(() => {
        const dataToSave = {
            salesData,
            inventoryItems,
            productInventoryItems,
            purchaseOrders,
            employees,
            attendanceRecords,
            payrollRecords,
            recipeCostings,
            calendarEvents
        };
        localStorage.setItem('cafeManagementData', JSON.stringify(dataToSave));
    }, [salesData, inventoryItems, productInventoryItems, purchaseOrders, employees, attendanceRecords, payrollRecords, recipeCostings, calendarEvents]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (employees.length > 0) {
            const needsUpdate = employees.some(emp => 
                (emp.name.toLowerCase() === 'paul' && emp.rate !== 50) ||
                (emp.name.toLowerCase() !== 'paul' && emp.rate !== 53)
            );
    
            if (needsUpdate) {
                const updatedEmployees = employees.map(emp => {
                    if (emp.name.toLowerCase() === 'paul') {
                        return { ...emp, rate: 50 };
                    }
                    return { ...emp, rate: 53 };
                });
                setEmployees(updatedEmployees);
            }
        }
    }, [employees]);

    useEffect(() => {
        saveData();
    }, [saveData]);
    
    // Check screen size on mount to set initial sidebar state for mobile
    useEffect(() => {
        if (window.innerWidth < 1024) {
            setSidebarOpen(false);
        }
    }, []);

    const handleRoleSelect = (selectedRole: Role) => {
        if (selectedRole === 'admin') {
            setPinModalOpen(true);
        } else {
            setRole('staff');
        }
    };

    const handlePinVerify = (pin: string) => {
        return pin === ADMIN_PIN;
    };

    const handlePinSuccess = () => {
        setRole('admin');
        setPinModalOpen(false);
    };

    useEffect(() => {
        if (role) {
            setDashboardIntro(true);
            if (dashboardIntroTimeout.current) {
                window.clearTimeout(dashboardIntroTimeout.current);
            }
            dashboardIntroTimeout.current = window.setTimeout(() => {
                setDashboardIntro(false);
                dashboardIntroTimeout.current = null;
            }, 650);
        } else {
            if (dashboardIntroTimeout.current) {
                window.clearTimeout(dashboardIntroTimeout.current);
                dashboardIntroTimeout.current = null;
            }
            setDashboardIntro(false);
        }
    }, [role]);

    useEffect(() => {
        return () => {
            if (dashboardIntroTimeout.current) {
                window.clearTimeout(dashboardIntroTimeout.current);
            }
        };
    }, []);

    const handleLogout = () => {
        setRole(null);
        setPage('dashboard');
    };

    const handleNavigate = (newPage: Page) => {
        setPage(newPage);
        // Only close sidebar on mobile after navigation
        if (window.innerWidth < 1024) { 
            setSidebarOpen(false);
        }
    };

    const handleAddProduct = (newProductData: Omit<ProductInventoryItem, 'id'>) => {
        const newProduct: ProductInventoryItem = {
            id: Date.now(),
            ...newProductData,
        };
        setProductInventoryItems(prev => [...prev, newProduct]);
    };
    
    const handleAddPurchaseOrder = (orderData: Omit<PurchaseOrder, 'id' | 'date' | 'status'>) => {
        setPurchaseOrders(prev => {
            const maxId = prev.length > 0 ? Math.max(...prev.map(o => o.id)) : 2024000;
            const newOrder: PurchaseOrder = {
                id: maxId + 1,
                date: new Date().toISOString(),
                status: 'Pending',
                ...orderData,
            };
            return [newOrder, ...prev];
        });
    };

    const renderPage = () => {
        switch (page) {
            case 'dashboard':
                return <Dashboard salesData={salesData} />;
            case 'sales':
                return <Sales salesData={salesData} setSalesData={setSalesData} />;
            case 'inventory-supplies':
            case 'pricelist':
                return <Inventory 
                    inventoryItems={inventoryItems} 
                    setInventoryItems={setInventoryItems} 
                    purchaseOrders={purchaseOrders} 
                    setPurchaseOrders={setPurchaseOrders}
                    productInventoryItems={productInventoryItems}
                    setProductInventoryItems={setProductInventoryItems}
                    activeView={page === 'inventory-supplies' ? 'supplies' : 'product'}
                    productCategories={productCategories}
                    productBrands={productBrands}
                    productUnits={productUnits}
                    productSuppliers={productSuppliers}
                    onAddProduct={handleAddProduct}
                />;
            case 'purchase-request':
                return <PurchaseRequest 
                    purchaseOrders={purchaseOrders} 
                    setPurchaseOrders={setPurchaseOrders} 
                    productInventoryItems={productInventoryItems}
                    onAddPurchaseOrder={handleAddPurchaseOrder}
                    departments={departments}
                />;
            case 'costing':
                return <Costing recipeCostings={recipeCostings} setRecipeCostings={setRecipeCostings} productInventoryItems={productInventoryItems} />;
            case 'attendance':
                return <Attendance employees={employees} setEmployees={setEmployees} attendanceRecords={attendanceRecords} setAttendanceRecords={setAttendanceRecords} setPayrollRecords={setPayrollRecords} salesData={salesData} />;
            case 'payroll':
                return <Payroll 
                            employees={employees}
                            attendanceRecords={attendanceRecords}
                            payrollRecords={payrollRecords} 
                            setPayrollRecords={setPayrollRecords} 
                            salesData={salesData}
                        />;
            case 'calendar':
                return <Calendar events={calendarEvents} setEvents={setCalendarEvents} />;
            default:
                return <Dashboard salesData={salesData} />;
        }
    };

    if (!role) {
        return (
            <>
                <RoleSelection onSelectRole={handleRoleSelect} />
                {isPinModalOpen && (
                    <PinModal
                        onClose={() => setPinModalOpen(false)}
                        onVerify={handlePinVerify}
                        onSuccess={handlePinSuccess}
                    />
                )}
            </>
        );
    }
    
    const RoleBadge = ({ role }: { role: Role | null }) => {
        if (!role) return null;
        
        const isAdmin = role === 'admin';
        const Icon = isAdmin ? ShieldCheckIcon : UserIcon;
        const text = isAdmin ? 'Admin Role' : 'Staff Role';
        const colors = isAdmin ? 'text-accent-purple' : 'text-text-secondary';

        return (
            <div className="p-2 bg-bg-tertiary rounded-full group cursor-pointer" title={text}>
                <Icon className={`w-5 h-5 ${colors}`} />
            </div>
        );
    };
    
    return (
        <div className="flex h-screen overflow-hidden font-sans">
            <Sidebar
                role={role}
                currentPage={page}
                onNavigate={handleNavigate}
                isOpen={isSidebarOpen}
                setIsOpen={setSidebarOpen}
            />
            {/* Mobile Overlay */}
            <div className={`fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity lg:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)}></div>
            
            <div className={`relative flex-1 flex flex-col min-w-0 ${dashboardIntro ? 'dashboard-container-intro' : ''}`}>
                <div className="fixed top-0 left-0 right-0 z-10 lg:absolute lg:right-auto lg:w-full p-4 lg:p-8 flex justify-between items-center bg-bg-primary border-b border-border-color lg:bg-transparent lg:border-none lg:backdrop-blur-none lg:pointer-events-none">
                    <button 
                        onClick={() => setSidebarOpen(!isSidebarOpen)} 
                        className="p-2 rounded-md hover:bg-hover-bg lg:hidden pointer-events-auto"
                    >
                        <MenuIcon className="w-6 h-6" />
                    </button>
                    <div className="hidden lg:block flex-grow" />
                    <div className="flex items-center gap-3 pointer-events-auto">
                        <RoleBadge role={role} />
                        <button
                            onClick={handleLogout}
                            className="bg-bg-tertiary text-text-primary px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-hover-bg"
                        >
                            Logout
                        </button>
                    </div>
                </div>
                <main className={`flex-1 overflow-y-auto bg-bg-primary pt-20 lg:pt-28 ${dashboardIntro ? 'dashboard-content-intro' : ''}`}>
                    {renderPage()}
                </main>
            </div>
        </div>
    );
};

export default App;
