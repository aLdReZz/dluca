
import React, { useState, useEffect } from 'react';
import type { Page, Role } from '../types';
import { ChartBarIcon, CubeIcon, CalculatorIcon, ClockIcon, CreditCardIcon, CalendarIcon, HomeIcon, ChevronDownIcon, ArchiveBoxIcon, TagIcon, ShoppingCartIcon } from './Icons';

interface SidebarProps {
    role: Role;
    currentPage: Page;
    onNavigate: (page: Page) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ role, currentPage, onNavigate, isOpen }) => {
    const inventoryPages: Page[] = ['inventory-supplies', 'pricelist', 'purchase-request'];
    const [isInventoryOpen, setIsInventoryOpen] = useState(inventoryPages.includes(currentPage));
    
    useEffect(() => {
        if (inventoryPages.includes(currentPage)) {
            setIsInventoryOpen(true);
        }
    }, [currentPage]);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: HomeIcon, roles: ['admin', 'staff'] },
        { id: 'sales', label: 'Sales Tracking', icon: ChartBarIcon, roles: ['admin', 'staff'] },
        { id: 'inventory-dropdown', label: 'Inventory', icon: CubeIcon, roles: ['admin', 'staff'], isDropdown: true },
        { id: 'costing', label: 'Costing Analysis', icon: CalculatorIcon, roles: ['admin'] },
    ];
    const staffManagementItems = [
        { id: 'attendance', label: 'Attendance', icon: ClockIcon, roles: ['admin', 'staff'] },
        { id: 'payroll', label: 'Payroll', icon: CreditCardIcon, roles: ['admin'] },
    ];
    const contentItems = [
        { id: 'calendar', label: 'Content Calendar', icon: CalendarIcon, roles: ['admin', 'staff'] },
    ];

    const MenuItem: React.FC<{ id: Page, label: string, icon: React.FC<any> }> = ({ id, label, icon: Icon }) => (
        <div
            className={`flex items-center gap-4 px-3 py-2.5 rounded-lg cursor-pointer transition-colors duration-200 ease-in-out mb-1 ${
                currentPage === id
                    ? 'bg-bg-tertiary text-text-primary'
                    : 'text-text-secondary hover:bg-hover-bg hover:text-text-primary'
            }`}
            onClick={() => onNavigate(id as Page)}
        >
            <Icon className={`w-5 h-5 ${currentPage === id ? 'text-text-primary' : 'text-text-secondary'}`} />
            <span className="font-medium text-sm">{label}</span>
        </div>
    );

    const inventorySubItems = [
        { id: 'inventory-supplies', label: 'Inventory & Supplies', icon: ArchiveBoxIcon },
        { id: 'pricelist', label: 'Pricelist', icon: TagIcon },
        { id: 'purchase-request', label: 'Purchase Request', icon: ShoppingCartIcon },
    ];

    return (
        <aside className={`fixed lg:relative lg:flex-shrink-0 w-64 bg-bg-secondary p-4 border-r border-border-color flex flex-col h-full transition-transform duration-300 ease-in-out z-30 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-color px-2">
                <img src="/dlc-sublogo.png" alt="D'Luca Logo" className="w-12 h-12 object-contain" />
                <div className="text-xl font-semibold text-text-primary">D'Luca</div>
            </div>

            <nav className="flex-1 overflow-y-auto">
                <div className="mb-6">
                    <h3 className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2 px-3">Main Menu</h3>
                    {navItems.filter(item => item.roles.includes(role)).map(item => {
                        if (item.isDropdown) {
                            const isInventoryActive = inventoryPages.includes(currentPage);
                            return (
                                <div key={item.id}>
                                    <div
                                        className={`flex items-center justify-between gap-4 px-3 py-2.5 rounded-lg cursor-pointer transition-colors duration-200 ease-in-out mb-1 ${
                                            isInventoryActive
                                                ? 'bg-bg-tertiary text-text-primary'
                                                : 'text-text-secondary hover:bg-hover-bg hover:text-text-primary'
                                        }`}
                                        onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <item.icon className={`w-5 h-5 ${isInventoryActive ? 'text-text-primary' : 'text-text-secondary'}`} />
                                            <span className="font-medium text-sm">{item.label}</span>
                                        </div>
                                        <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${isInventoryOpen ? 'rotate-180' : ''}`} />
                                    </div>
                                    <div className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${isInventoryOpen ? 'max-h-40' : 'max-h-0'}`}>
                                        <div className="pl-6 pt-2 pb-2 space-y-1">
                                            {inventorySubItems.map(subItem => {
                                                const SubIcon = subItem.icon;
                                                const isActive = currentPage === subItem.id;
                                                return (
                                                <div
                                                    key={subItem.id}
                                                    onClick={() => onNavigate(subItem.id as Page)}
                                                    className={`flex items-center gap-3 text-sm font-medium cursor-pointer py-1.5 px-3 rounded-md transition-colors ${
                                                        isActive ? 'text-text-primary bg-hover-bg' : 'text-text-secondary hover:text-text-primary hover:bg-hover-bg'
                                                    }`}
                                                >
                                                    <SubIcon className={`w-4 h-4 ${isActive ? 'text-text-primary' : 'text-text-secondary'}`} />
                                                    <span>{subItem.label}</span>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        return <MenuItem key={item.id} id={item.id as Page} label={item.label} icon={item.icon} />
                    })}
                </div>
                <div className="mb-6">
                    <h3 className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2 px-3">Staff Management</h3>
                    {staffManagementItems.filter(item => item.roles.includes(role)).map(item => (
                        <MenuItem key={item.id} id={item.id as Page} label={item.label} icon={item.icon} />
                    ))}
                </div>
                <div>
                    <h3 className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2 px-3">Content</h3>
                     {contentItems.filter(item => item.roles.includes(role)).map(item => (
                        <MenuItem key={item.id} id={item.id as Page} label={item.label} icon={item.icon} />
                    ))}
                </div>
            </nav>
        </aside>
    );
};

export default Sidebar;
