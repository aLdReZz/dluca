import React, { useEffect, useRef, useState, useMemo } from 'react';
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
import { triggerHaptic, HapticPattern } from '../utils/haptics';

interface BottomNavProps {
    role: Role;
    currentPage: Page;
    onNavigate: (page: Page) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ role, currentPage, onNavigate }) => {
    const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
    const navItemsRef = useRef<(HTMLButtonElement | null)[]>([]);

    // Define navigation items based on role - memoized to prevent infinite loops
    const navItems = useMemo(() => {
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
    }, [role]);

    // Update indicator position when page changes
    useEffect(() => {
        const activeIndex = navItems.findIndex(item => item.id === currentPage);
        if (activeIndex !== -1 && navItemsRef.current[activeIndex]) {
            const element = navItemsRef.current[activeIndex];
            if (element) {
                const { offsetLeft, offsetWidth } = element;
                setIndicatorStyle({ left: offsetLeft, width: offsetWidth });
            }
        }
    }, [currentPage, navItems]);

    const handleNavigate = (page: Page) => {
        triggerHaptic(HapticPattern.Light);
        onNavigate(page);
    };

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-bg-secondary/95 backdrop-blur-[40px] border-t border-border-color safe-area-bottom">
            <div className="relative flex justify-around items-center h-16 px-2">
                {/* Active indicator */}
                <div
                    className="absolute top-0 h-0.5 bg-accent-blue transition-all duration-300 ease-out"
                    style={{
                        left: `${indicatorStyle.left}px`,
                        width: `${indicatorStyle.width}px`,
                    }}
                />

                {navItems.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;

                    return (
                        <button
                            key={item.id}
                            ref={(el) => (navItemsRef.current[index] = el)}
                            onClick={() => handleNavigate(item.id as Page)}
                            className={`
                                flex flex-col items-center justify-center flex-1 h-full
                                transition-all duration-200
                                ${isActive ? 'text-accent-blue scale-105' : 'text-text-secondary scale-100'}
                                hover:text-accent-blue/80 active:scale-95
                            `}
                        >
                            <Icon className={`w-6 h-6 mb-1 transition-transform duration-200 ${
                                isActive ? 'text-accent-blue' : 'text-text-secondary'
                            }`} />
                            <span className={`text-[10px] font-medium transition-colors duration-200 ${
                                isActive ? 'text-accent-blue' : 'text-text-secondary'
                            }`}>
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
