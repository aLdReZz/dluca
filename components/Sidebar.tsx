import React, { useState, useEffect } from 'react';
import type { Page, Role } from '../types';
import {
    ChartBarIcon,
    CubeIcon,
    CalculatorIcon,
    ClockIcon,
    CreditCardIcon,
    CalendarIcon,
    HomeIcon,
    ChevronDownIcon,
    TagIcon,
    ShoppingCartIcon,
    ShieldCheckIcon,
    UserIcon,
    BookOpenIcon,
    ClipboardDocumentListIcon,
} from './Icons';

const InventoryBoxIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
    <span className={`relative inline-flex h-4 w-4 flex-shrink-0 items-center justify-center ${className}`}>
        <span className="absolute inset-0 rounded-sm border border-current opacity-80" />
        <span className="absolute top-1 left-1 right-1 border-t border-current opacity-80" />
    </span>
);

interface SidebarProps {
    role: Role;
    currentPage: Page;
    onNavigate: (page: Page) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ role, currentPage, onNavigate, isOpen, onLogout }) => {
    const inventoryPages: Page[] = ['inventory-supplies', 'pricelist', 'purchase-request'];
    const accountingPages: Page[] = ['accounting-transactions', 'accounting-profitloss', 'accounting-chartofaccounts'];
    const [isInventoryOpen, setIsInventoryOpen] = useState(inventoryPages.includes(currentPage));
    const [isAccountingOpen, setIsAccountingOpen] = useState(accountingPages.includes(currentPage));

    useEffect(() => {
        if (inventoryPages.includes(currentPage)) {
            setIsInventoryOpen(true);
        }
        if (accountingPages.includes(currentPage)) {
            setIsAccountingOpen(true);
        }
    }, [currentPage]);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: HomeIcon, roles: ['admin', 'staff'] },
        { id: 'sales', label: 'Sales Tracking', icon: ChartBarIcon, roles: ['admin', 'staff'] },
        { id: 'inventory-dropdown', label: 'Inventory', icon: CubeIcon, roles: ['admin', 'staff'], isDropdown: true },
        { id: 'costing', label: 'Costing Analysis', icon: CalculatorIcon, roles: ['admin'] },
        { id: 'accounting-dropdown', label: 'Accounting', icon: BookOpenIcon, roles: ['admin'], isDropdown: true },
    ];
    const staffManagementItems = [
        { id: 'attendance', label: 'Attendance', icon: ClockIcon, roles: ['admin', 'staff'] },
        { id: 'payroll', label: 'Payroll', icon: CreditCardIcon, roles: ['admin'] },
    ];
    const contentItems = [
        { id: 'calendar', label: 'Content Calendar', icon: CalendarIcon, roles: ['admin', 'staff'] },
    ];

    const MenuItem: React.FC<{ id: Page; label: string; icon: React.FC<any> }> = ({ id, label, icon: Icon }) => {
        const isActive = currentPage === id;
        return (
            <button
                type="button"
                onClick={() => onNavigate(id as Page)}
                className={`group flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                    isActive
                        ? 'bg-bg-tertiary text-text-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-hover-bg'
                }`}
            >
                {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent-blue rounded-r-full" />
                )}
                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-accent-blue' : 'text-text-secondary group-hover:text-text-primary'}`} />
                <span className="transition-colors">{label}</span>
            </button>
        );
    };

    const inventorySubItems = [
        { id: 'inventory-supplies', label: 'Inventory & Supplies', icon: InventoryBoxIcon },
        { id: 'pricelist', label: 'Pricelist', icon: TagIcon },
        { id: 'purchase-request', label: 'Purchase Request', icon: ShoppingCartIcon },
    ];

    const accountingSubItems = [
        { id: 'accounting-transactions', label: 'Transactions', icon: CreditCardIcon },
        { id: 'accounting-profitloss', label: 'Profit and Loss', icon: ChartBarIcon },
        { id: 'accounting-chartofaccounts', label: 'Chart of Accounts', icon: ClipboardDocumentListIcon },
    ];

    return (
        <aside
            className={`fixed lg:relative lg:flex-shrink-0 w-72 bg-bg-secondary text-text-primary border-r border-border-color/50 flex flex-col h-full transition-transform duration-300 ease-in-out z-30 ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:translate-x-0`}
        >
            {/* Logo Header */}
            <div className="p-6 border-b border-border-color/30">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-bg-tertiary rounded-xl flex items-center justify-center border border-border-color/30">
                        <img src="/dlc-sublogo.png" alt="D'Luca" className="w-8 h-8 object-contain" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-text-primary">D'LUCA</h1>
                        <p className="text-xs text-text-secondary">Bistro & Cafe</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
                {/* Main Menu */}
                <div className="space-y-1">
                    <h3 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary/60 mb-3">Main Menu</h3>
                    {navItems.filter(item => item.roles.includes(role)).map(item => {
                        if (item.isDropdown) {
                            const isInventoryDropdown = item.id === 'inventory-dropdown';
                            const isAccountingDropdown = item.id === 'accounting-dropdown';
                            const isActive = isInventoryDropdown
                                ? inventoryPages.includes(currentPage)
                                : accountingPages.includes(currentPage);
                            const isOpen = isInventoryDropdown ? isInventoryOpen : isAccountingOpen;
                            const subItems = isInventoryDropdown ? inventorySubItems : accountingSubItems;
                            const toggleOpen = isInventoryDropdown
                                ? () => setIsInventoryOpen(!isInventoryOpen)
                                : () => setIsAccountingOpen(!isAccountingOpen);

                            return (
                                <div key={item.id} className="space-y-1">
                                    <button
                                        type="button"
                                        onClick={toggleOpen}
                                        className={`group flex w-full items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                                            isActive
                                                ? 'bg-bg-tertiary text-text-primary'
                                                : 'text-text-secondary hover:text-text-primary hover:bg-hover-bg'
                                        }`}
                                    >
                                        {isActive && (
                                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent-blue rounded-r-full" />
                                        )}
                                        <div className="flex items-center gap-3">
                                            <item.icon className={`w-5 h-5 ${isActive ? 'text-accent-blue' : 'text-text-secondary group-hover:text-text-primary'}`} />
                                            <span>{item.label}</span>
                                        </div>
                                        <ChevronDownIcon
                                            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${
                                                isActive ? 'text-accent-blue' : 'text-text-secondary group-hover:text-text-primary'
                                            }`}
                                        />
                                    </button>
                                    <div
                                        className={`transition-all duration-300 ${
                                            isOpen ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'
                                        } overflow-hidden`}
                                    >
                                        <div className="ml-7 space-y-1 py-1">
                                            {subItems.map(subItem => {
                                                const SubIcon = subItem.icon;
                                                const isActive = currentPage === subItem.id;
                                                return (
                                                    <button
                                                        type="button"
                                                        key={subItem.id}
                                                        onClick={() => onNavigate(subItem.id as Page)}
                                                        className={`group flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                                                            isActive
                                                                ? 'text-accent-blue bg-accent-blue/10 font-medium'
                                                                : 'text-text-secondary hover:text-text-primary hover:bg-hover-bg'
                                                        }`}
                                                    >
                                                        <SubIcon className={`w-4 h-4 ${isActive ? 'text-accent-blue' : 'text-text-secondary group-hover:text-text-primary'}`} />
                                                        <span className="text-xs">{subItem.label}</span>
                                                    </button>
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

                {/* Staff Section */}
                {staffManagementItems.filter(item => item.roles.includes(role)).length > 0 && (
                    <div className="space-y-1">
                        <h3 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary/60 mb-3">Staff</h3>
                        {staffManagementItems.filter(item => item.roles.includes(role)).map(item => (
                            <MenuItem key={item.id} id={item.id as Page} label={item.label} icon={item.icon} />
                        ))}
                    </div>
                )}

                {/* Content Section */}
                {contentItems.filter(item => item.roles.includes(role)).length > 0 && (
                    <div className="space-y-1">
                        <h3 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary/60 mb-3">Content</h3>
                        {contentItems.filter(item => item.roles.includes(role)).map(item => (
                            <MenuItem key={item.id} id={item.id as Page} label={item.label} icon={item.icon} />
                        ))}
                    </div>
                )}
            </nav>

            {/* User Footer */}
            <div className="mt-auto p-4 border-t border-border-color/30">
                <div className="flex items-center justify-between p-3 bg-bg-tertiary/50 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            role === 'admin' ? 'bg-accent-blue/20' : 'bg-accent-purple/20'
                        }`}>
                            {role === 'admin' ? (
                                <ShieldCheckIcon className="w-4 h-4 text-accent-blue" />
                            ) : (
                                <UserIcon className="w-4 h-4 text-accent-purple" />
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-text-primary">{role === 'admin' ? 'Admin' : 'Staff'}</p>
                            <p className="text-[10px] text-text-secondary">Logged in</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-hover-bg rounded-lg transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
