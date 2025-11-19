
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

    const MenuItem: React.FC<{ id: Page; label: string; icon: React.FC<any> }> = ({ id, label, icon: Icon }) => {
        const isActive = currentPage === id;
        return (
            <button
                type="button"
                onClick={() => onNavigate(id as Page)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 ${
                    isActive
                        ? 'bg-bg-tertiary text-text-primary shadow-[0_4px_12px_rgba(0,0,0,0.35)]'
                        : 'text-text-secondary hover:text-text-primary hover:bg-hover-bg'
                }`}
            >
                <Icon className={`w-5 h-5 ${isActive ? 'text-text-primary' : 'text-text-secondary'}`} />
                <span>{label}</span>
            </button>
        );
    };

    const inventorySubItems = [
        { id: 'inventory-supplies', label: 'Inventory & Supplies', icon: InventoryBoxIcon },
        { id: 'pricelist', label: 'Pricelist', icon: TagIcon },
        { id: 'purchase-request', label: 'Purchase Request', icon: ShoppingCartIcon },
    ];

    return (
        <aside
            className={`fixed lg:relative lg:flex-shrink-0 w-72 bg-bg-secondary text-text-primary border-r border-border-color flex flex-col h-full transition-transform duration-300 ease-in-out z-30 ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:translate-x-0`}
        >
            <div className="p-5 pb-0">
                <div className="flex items-center gap-3 rounded-3xl border border-border-color/60 bg-gradient-to-r from-bg-secondary to-bg-tertiary/40 px-4 py-3 shadow-[0_10px_24px_rgba(0,0,0,0.45)]">
                    <img src="/dlc-sublogo.png" alt="D'Luca Icon" className="h-11 w-11 object-contain" />
                    <div className="leading-tight">
                        <p className="text-lg font-semibold text-text-primary tracking-[0.15em] uppercase">D'Luca</p>
                        <p className="text-[0.6rem] uppercase tracking-[0.24em] text-text-secondary">Bistro x Cafe</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-5 mt-7 space-y-7">
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.65em] text-text-primary mb-4">Main Menu</h3>
                    {navItems.filter(item => item.roles.includes(role)).map(item => {
                        if (item.isDropdown) {
                            const isInventoryActive = inventoryPages.includes(currentPage);
                            return (
                                <div key={item.id}>
                                    <button
                                        type="button"
                                        onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                                        className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 ${
                                            isInventoryActive
                                                ? 'bg-bg-tertiary text-text-primary shadow-[0_6px_18px_rgba(0,0,0,0.4)]'
                                                : 'text-text-secondary hover:text-text-primary hover:bg-hover-bg'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <item.icon className={`w-5 h-5 ${isInventoryActive ? 'text-text-primary' : 'text-text-secondary'}`} />
                                            <span>{item.label}</span>
                                        </div>
                                        <ChevronDownIcon
                                            className={`w-4 h-4 transition-transform ${isInventoryOpen ? 'rotate-180' : ''} ${
                                                isInventoryActive ? 'text-text-primary' : 'text-text-secondary'
                                            }`}
                                        />
                                    </button>
                                    <div
                                        className={`pl-4 pr-2 transition-all duration-300 ${
                                            isInventoryOpen ? 'max-h-96 opacity-100 pt-3' : 'max-h-0 opacity-0 pt-0'
                                        } overflow-hidden`}
                                    >
                                        <div className="relative ml-3 pl-5 pb-2 space-y-1">
                                            {isInventoryOpen && (
                                                <span className="pointer-events-none absolute left-1 top-2 bottom-2 w-px bg-border-color/40 rounded-full" aria-hidden="true" />
                                            )}
                                            {inventorySubItems.map(subItem => {
                                                const SubIcon = subItem.icon;
                                                const isActive = currentPage === subItem.id;
                                                return (
                                                    <button
                                                        type="button"
                                                        key={subItem.id}
                                                        onClick={() => onNavigate(subItem.id as Page)}
                                                        className={`group flex w-full items-center gap-3 rounded-2xl pl-4 pr-4 py-2 text-sm transition-all duration-200 ${
                                                            isActive
                                                                ? 'text-text-primary bg-hover-bg shadow-[0_3px_10px_rgba(0,0,0,0.25)]'
                                                                : 'text-text-secondary hover:text-text-primary hover:bg-hover-bg'
                                                        }`}
                                                    >
                                                        <SubIcon className={`relative z-10 w-4 h-4 ${isActive ? 'text-text-primary' : 'text-text-secondary'}`} />
                                                        <span className="whitespace-nowrap">{subItem.label}</span>
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
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.65em] text-text-primary mb-4">Staff</h3>
                    {staffManagementItems.filter(item => item.roles.includes(role)).map(item => (
                        <MenuItem key={item.id} id={item.id as Page} label={item.label} icon={item.icon} />
                    ))}
                </div>
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.65em] text-text-primary mb-4">Content</h3>
                    {contentItems.filter(item => item.roles.includes(role)).map(item => (
                        <MenuItem key={item.id} id={item.id as Page} label={item.label} icon={item.icon} />
                    ))}
                </div>
            </nav>

            <div className="mt-auto px-5 pb-6 pt-6">
                <div className="flex items-center justify-between text-xs text-text-secondary border border-border-color/50 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-text-primary/80 font-semibold">
                        {role === 'admin' ? (
                            <ShieldCheckIcon className="w-4 h-4 text-accent-blue/80" />
                        ) : (
                            <UserIcon className="w-4 h-4 text-accent-blue/80" />
                        )}
                        <span>{role === 'admin' ? 'Admin' : 'Staff'}</span>
                    </div>
                    <button
                        onClick={onLogout}
                        className="text-xs font-semibold text-text-primary/80 hover:text-white transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
