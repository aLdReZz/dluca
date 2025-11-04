
import React from 'react';
import type { Page, Role } from '../types';

interface HeaderProps {
    currentPage: Page;
    role: Role;
    onLogout: () => void;
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = () => {
    // The visual header bar has been removed for a floating controls design.
    // This component is no longer rendered in App.tsx.
    return null;
};

export default Header;
