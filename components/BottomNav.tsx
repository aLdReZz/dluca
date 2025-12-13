import React from 'react';
import type { Page, Role } from '../types';
import {
    HomeIcon,
    ChartBarIcon,
    CubeIcon,
    BookOpenIcon,
    ClockIcon,
    CreditCardIcon,
    CalendarIcon,
    UserIcon,
} from './Icons';

interface BottomNavProps {
    role: Role;
    currentPage: Page;
    onNavigate: (page: Page) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ role, currentPage, onNavigate }) => {
    // Define navigation items based on role
    const getNavItems = () => {
        const items = [
            { id: 'dashboard', label: 'Home', icon: HomeIcon, roles: ['admin', 'staff'] },
            { id: 'sales', label: 'Sales', icon: ChartBarIcon, roles: ['admin', 'staff'] },
            { id: 'inventory-supplies', label: 'Inventory', icon: CubeIcon, roles: ['admin', 'staff'] },
        ];

        if (role === 'admin') {
            items.push(
                { id: 'accounting', label: 'Accounting', icon: BookOpenIcon, roles: ['admin'] },
                { id: 'attendance', label: 'More', icon: UserIcon, roles: ['admin'] }
            );
        } else {
            items.push(
                { id: 'attendance', label: 'Attendance', icon: ClockIcon, roles: ['admin', 'staff'] },
                { id: 'calendar', label: 'Calendar', icon: CalendarIcon, roles: ['admin', 'staff'] }
            );
        }

        return items.filter(item => item.roles.includes(role));
    };

    const navItems = getNavItems();

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-bg-secondary border-t border-border-color safe-area-bottom">
            <div className="flex justify-around items-center h-16 px-2">
                {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id as Page)}
                            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                                isActive ? 'text-accent-blue' : 'text-text-secondary'
                            }`}
                        >
                            <Icon className={`w-6 h-6 mb-1 ${isActive ? 'text-accent-blue' : 'text-text-secondary'}`} />
                            <span className={`text-[10px] font-medium ${isActive ? 'text-accent-blue' : 'text-text-secondary'}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
