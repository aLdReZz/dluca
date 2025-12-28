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
    ChevronLeftIcon,
    ChevronRightIcon,
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
    const [hoveredDropdown, setHoveredDropdown] = useState<string | null>(null);

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
                className={`group flex w-full items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                        ? 'bg-bg-tertiary text-text-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-hover-bg'
                }`}
            >
                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`} />
                {!isCollapsed && <span className="transition-colors">{label}</span>}
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
            className={`fixed lg:relative lg:flex-shrink-0 ${isCollapsed ? 'w-20' : 'w-72'} bg-bg-secondary text-text-primary border-r border-border-color/50 flex flex-col h-full transition-all duration-300 ease-in-out ${
                isOpen ? 'translate-x-0 z-30' : '-translate-x-full z-30'
            } lg:translate-x-0 lg:z-10`}
        >
            {/* Logo Header */}
            <div className="p-6 border-b border-border-color/30">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-bg-tertiary rounded-xl flex items-center justify-center border border-border-color/30">
                        <img src="/dlc-sublogo.png" alt="D'Luca" className="w-8 h-8 object-contain" />
                    </div>
                    {!isCollapsed && (
                        <div>
                            <h1 className="text-lg font-bold text-text-primary">D'LUCA</h1>
                            <p className="text-xs text-text-secondary">Bistro & Cafe</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-hide">
                {/* Main Menu */}
                <div className="space-y-1">
                    {!isCollapsed && <h3 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary/60 mb-3">Main Menu</h3>}
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

                            const handleDropdownClick = () => {
                                if (!isCollapsed) {
                                    // When expanded, toggle dropdown
                                    toggleOpen();
                                }
                                // When collapsed, do nothing - submenu will show on hover
                            };

                            return (
                                <div key={item.id} className="space-y-1 relative">
                                    <button
                                        type="button"
                                        onClick={handleDropdownClick}
                                        className={`group flex w-full items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                                            isActive
                                                ? 'bg-bg-tertiary text-text-primary'
                                                : 'text-text-secondary hover:text-text-primary hover:bg-hover-bg'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <item.icon className={`w-5 h-5 ${isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`} />
                                            {!isCollapsed && <span>{item.label}</span>}
                                        </div>
                                        {!isCollapsed && (
                                            <ChevronDownIcon
                                                className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${
                                                    isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'
                                                }`}
                                            />
                                        )}
                                    </button>
                                    {/* Collapsed submenu popover */}
                                    {isCollapsed && (
                                        <div className="absolute left-full top-0 ml-2 hidden group-hover:block z-50">
                                            <div className="bg-bg-secondary border border-border-color rounded-xl shadow-xl py-2 min-w-[200px]">
                                                <div className="px-3 py-2 border-b border-border-color">
                                                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{item.label}</span>
                                                </div>
                                                {subItems.map(subItem => {
                                                    const SubIcon = subItem.icon;
                                                    const isActive = currentPage === subItem.id;
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={subItem.id}
                                                            onClick={() => onNavigate(subItem.id as Page)}
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
                                        </div>
                                    )}
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
                        {!isCollapsed && <h3 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary/60 mb-3">Staff</h3>}
                        {staffManagementItems.filter(item => item.roles.includes(role)).map(item => (
                            <MenuItem key={item.id} id={item.id as Page} label={item.label} icon={item.icon} />
                        ))}
                    </div>
                )}

                {/* Content Section */}
                {contentItems.filter(item => item.roles.includes(role)).length > 0 && (
                    <div className="space-y-1">
                        {!isCollapsed && <h3 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary/60 mb-3">Content</h3>}
                        {contentItems.filter(item => item.roles.includes(role)).map(item => (
                            <MenuItem key={item.id} id={item.id as Page} label={item.label} icon={item.icon} />
                        ))}
                    </div>
                )}
            </nav>

            {/* User Footer */}
            <div className="mt-auto p-4 border-t border-border-color/30 relative overflow-visible">
                {/* Collapse button for expanded state */}
                {!isCollapsed && (
                    <button
                        onClick={() => setIsCollapsed(true)}
                        className="absolute -right-4 bottom-6 w-8 h-8 bg-bg-tertiary hover:bg-hover-bg rounded-full flex items-center justify-center border border-border-color/50 shadow-lg transition-all duration-200 hover:shadow-xl z-50 hidden lg:flex"
                        aria-label="Collapse sidebar"
                    >
                        <ChevronLeftIcon className="w-4 h-4 text-text-secondary" />
                    </button>
                )}
                {/* Collapse button for collapsed state */}
                {isCollapsed && (
                    <button
                        onClick={() => setIsCollapsed(false)}
                        className="absolute -right-3.5 bottom-6 w-8 h-8 bg-bg-tertiary hover:bg-hover-bg rounded-full flex items-center justify-center border border-border-color/50 shadow-lg transition-all duration-200 hover:shadow-xl z-50 hidden lg:flex"
                        aria-label="Expand sidebar"
                    >
                        <ChevronRightIcon className="w-4 h-4 text-text-secondary" />
                    </button>
                )}
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
                        {!isCollapsed && (
                            <div>
                                <p className="text-sm font-medium text-text-primary">{role === 'admin' ? 'Admin' : 'Staff'}</p>
                                <p className="text-[10px] text-text-secondary">Logged in</p>
                            </div>
                        )}
                    </div>
                    {!isCollapsed && (
                        <button
                            onClick={onLogout}
                            className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-hover-bg rounded-lg transition-colors"
                        >
                            Logout
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
