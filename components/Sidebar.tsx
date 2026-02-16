import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    ChevronLeftIcon,
    ChevronRightIcon,
    CalendarDaysIcon,
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
    isCollapsed: boolean;
    setIsCollapsed: (isCollapsed: boolean) => void;
    onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ role, currentPage, onNavigate, isOpen, isCollapsed, setIsCollapsed, onLogout }) => {
    const inventoryPages: Page[] = ['inventory-supplies', 'pricelist', 'purchase-request'];
    const accountingPages: Page[] = ['accounting-transactions', 'accounting-profitloss', 'accounting-chartofaccounts'];
    const [isInventoryOpen, setIsInventoryOpen] = useState(inventoryPages.includes(currentPage));
    const [isAccountingOpen, setIsAccountingOpen] = useState(accountingPages.includes(currentPage));
    const [clickedDropdown, setClickedDropdown] = useState<string | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
    const dropdownButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (inventoryPages.includes(currentPage)) {
            setIsInventoryOpen(true);
        }
        if (accountingPages.includes(currentPage)) {
            setIsAccountingOpen(true);
        }
    }, [currentPage]);

    // Close clicked dropdown when clicking outside
    useEffect(() => {
        if (!clickedDropdown) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-dropdown-menu]')) {
                setClickedDropdown(null);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [clickedDropdown]);

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
        { id: 'schedule-simulator', label: 'Schedule Simulator', icon: CalendarDaysIcon, roles: ['admin'] },
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
                className={`group flex w-full items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                        ? 'bg-bg-tertiary text-text-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-hover-bg'
                }`}
            >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`} />
                <span className={`overflow-hidden transition-all duration-300 ease-in-out inline-block ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100'}`}>
                    <span className="whitespace-nowrap">{label}</span>
                </span>
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
            className={`fixed lg:relative lg:flex-shrink-0 ${isCollapsed ? 'w-20' : 'w-72'} bg-bg-secondary text-text-primary border-r border-border-color/50 flex flex-col h-full transition-all duration-300 ease-in-out overflow-visible ${
                isOpen ? 'translate-x-0 z-30' : '-translate-x-full z-30'
            } lg:translate-x-0 lg:z-10`}
        >
            {/* Collapse/Expand button */}
            {isCollapsed ? (
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-bg-tertiary hover:bg-hover-bg rounded-full flex items-center justify-center border border-border-color/50 shadow-lg transition-all duration-200 hover:shadow-xl z-50"
                    aria-label="Expand sidebar"
                >
                    <ChevronRightIcon className="w-4 h-4 text-text-secondary" />
                </button>
            ) : (
                <button
                    onClick={() => setIsCollapsed(true)}
                    className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-bg-tertiary hover:bg-hover-bg rounded-full flex items-center justify-center border border-border-color/50 shadow-lg transition-all duration-200 hover:shadow-xl z-50"
                    aria-label="Collapse sidebar"
                >
                    <ChevronLeftIcon className="w-4 h-4 text-text-secondary" />
                </button>
            )}
            {/* Logo Header */}
            <div className="p-6 border-b border-border-color/30 relative">
                <div className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? '-ml-1' : ''}`}>
                    <div className="flex-shrink-0 flex items-center justify-center">
                        <img src="/dlc-sublogo.png" alt="D'Luca" className={`object-contain transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'w-12 h-12'}`} />
                    </div>
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100'}`}>
                        <div className="whitespace-nowrap">
                            <h1 className="text-lg font-bold text-text-primary">D'LUCA</h1>
                            <p className="text-xs text-text-secondary">Bistro & Cafe</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className={`flex-1 overflow-y-auto overflow-x-visible ${isCollapsed ? 'px-0' : 'px-4'} py-6 space-y-6 scrollbar-hide transition-all duration-300`}>
                {/* Main Menu */}
                <div className={`space-y-1 ${isCollapsed ? '' : 'px-0'}`}>
                    <h3 className={`px-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary/60 mb-3 overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-10 opacity-100'}`}>
                        <span className="whitespace-nowrap">Main Menu</span>
                    </h3>
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

                            const handleDropdownClick = (e: React.MouseEvent<HTMLButtonElement>) => {
                                if (!isCollapsed) {
                                    // When expanded, toggle dropdown
                                    toggleOpen();
                                } else {
                                    // When collapsed, calculate position and toggle the clicked dropdown state
                                    const button = e.currentTarget;
                                    const rect = button.getBoundingClientRect();
                                    setDropdownPosition({
                                        top: rect.top,
                                        left: rect.right + 8
                                    });
                                    setClickedDropdown(clickedDropdown === item.id ? null : item.id);
                                }
                            };

                            return (
                                <div key={item.id} className="space-y-1 relative" data-dropdown-menu>
                                    <button
                                        type="button"
                                        onClick={handleDropdownClick}
                                        className={`group flex w-full items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-3'} py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                                            isActive
                                                ? 'bg-bg-tertiary text-text-primary'
                                                : 'text-text-secondary hover:text-text-primary hover:bg-hover-bg'
                                        }`}
                                    >
                                        {isCollapsed ? (
                                            <item.icon className={`w-5 h-5 ${isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`} />
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-3">
                                                    <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`} />
                                                    <span className="whitespace-nowrap">{item.label}</span>
                                                </div>
                                                <ChevronDownIcon
                                                    className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${
                                                        isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'
                                                    }`}
                                                />
                                            </>
                                        )}
                                    </button>
                                    {!isCollapsed && (
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
                                                                    ? 'text-text-primary bg-bg-tertiary font-medium'
                                                                    : 'text-text-secondary hover:text-text-primary hover:bg-hover-bg'
                                                            }`}
                                                        >
                                                            <SubIcon className={`w-4 h-4 ${isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`} />
                                                            <span className="text-xs">{subItem.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        return <MenuItem key={item.id} id={item.id as Page} label={item.label} icon={item.icon} />
                    })}
                </div>

                {/* Staff Section */}
                {staffManagementItems.filter(item => item.roles.includes(role)).length > 0 && (
                    <div className="space-y-1">
                        <h3 className={`px-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary/60 mb-3 overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-10 opacity-100'}`}>
                            <span className="whitespace-nowrap">Staff</span>
                        </h3>
                        {staffManagementItems.filter(item => item.roles.includes(role)).map(item => (
                            <MenuItem key={item.id} id={item.id as Page} label={item.label} icon={item.icon} />
                        ))}
                    </div>
                )}

                {/* Content Section */}
                {contentItems.filter(item => item.roles.includes(role)).length > 0 && (
                    <div className="space-y-1">
                        <h3 className={`px-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary/60 mb-3 overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-10 opacity-100'}`}>
                            <span className="whitespace-nowrap">Content</span>
                        </h3>
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
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100'}`}>
                            <div className="whitespace-nowrap">
                                <p className="text-sm font-medium text-text-primary">{role === 'admin' ? 'Admin' : 'Staff'}</p>
                                <p className="text-[10px] text-text-secondary">Logged in</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className={`px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-hover-bg rounded-lg transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-xs opacity-100'}`}
                    >
                        <span className="whitespace-nowrap">Logout</span>
                    </button>
                </div>
            </div>
            {/* Portal for collapsed dropdown menu */}
            {isCollapsed && clickedDropdown && dropdownPosition && createPortal(
                <div
                    className="fixed z-[9999]"
                    style={{
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`
                    }}
                    data-dropdown-menu
                >
                    <div className="bg-bg-secondary border border-accent-blue/30 rounded-xl shadow-2xl py-2 min-w-[220px]">
                        <div className="px-3 py-2 border-b border-border-color/50">
                            <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                                {clickedDropdown === 'inventory-dropdown' ? 'Inventory' : 'Accounting'}
                            </span>
                        </div>
                        {(clickedDropdown === 'inventory-dropdown' ? inventorySubItems : accountingSubItems).map(subItem => {
                            const SubIcon = subItem.icon;
                            const isActive = currentPage === subItem.id;
                            return (
                                <button
                                    type="button"
                                    key={subItem.id}
                                    onClick={() => {
                                        onNavigate(subItem.id as Page);
                                        setClickedDropdown(null);
                                    }}
                                    className={`group/sub flex w-full items-center gap-3 px-3 py-2 text-sm transition-all duration-200 ${
                                        isActive
                                            ? 'text-text-primary bg-bg-tertiary font-medium'
                                            : 'text-text-secondary hover:text-text-primary hover:bg-hover-bg'
                                    }`}
                                >
                                    <SubIcon className={`w-4 h-4 ${isActive ? 'text-text-primary' : 'text-text-secondary group-hover/sub:text-text-primary'}`} />
                                    <span className="text-xs">{subItem.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>,
                document.body
            )}
        </aside>
    );
};

export default Sidebar;
