import React, { useState, useEffect, useMemo, useRef } from 'react';

const CategoryAutocomplete: React.FC<{
    value: string;
    onChange: (value: string) => void;
    options: { id: string; name: string; parentId?: string }[];
    placeholder?: string;
    className?: string;
    showClear?: boolean;
}> = ({ value, onChange, options, placeholder = 'Select or type category', className = '', showClear = true }) => {
    const pathMap = useMemo(() => {
        const idToName = new Map(options.map(o => [o.id, o.name]));
        const idToParent = new Map(options.map(o => [o.id, o.parentId]));
        const buildPath = (id: string): string => {
            const parentId = idToParent.get(id);
            if (!parentId || !idToName.has(parentId)) return '';
            const parentPath = buildPath(parentId);
            const parentName = idToName.get(parentId)!;
            return parentPath ? `${parentPath} > ${parentName}` : parentName;
        };
        const map = new Map<string, string>();
        options.forEach(o => map.set(o.id, buildPath(o.id)));
        return map;
    }, [options]);

    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, openUpward: false });
    const wrapperRef = useRef<HTMLDivElement>(null);
    const optionsRef = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => { setInputValue(value); }, [value]);

    useEffect(() => {
        const updatePosition = () => {
            if (wrapperRef.current && isOpen) {
                const rect = wrapperRef.current.getBoundingClientRect();
                const dropdownHeight = 256;
                const spaceBelow = window.innerHeight - rect.bottom;
                const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
                setDropdownPosition({
                    top: openUpward ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
                    left: rect.left,
                    width: rect.width,
                    openUpward,
                });
            }
        };
        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSelectedIndex(-1);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        if (!inputValue) return options;
        return options.filter(o => o.name.toLowerCase().includes(inputValue.toLowerCase()));
    }, [inputValue, options]);

    const handleSelectOption = (optionId: string, optionName: string) => {
        const parentPath = pathMap.get(optionId) || '';
        const fullPath = parentPath ? `${parentPath} > ${optionName}` : optionName;
        setInputValue(fullPath);
        onChange(fullPath);
        setIsOpen(false);
        setSelectedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setIsOpen(true); setSelectedIndex(0); e.preventDefault(); return;
        }
        if (!isOpen) return;
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => {
                    const n = prev < filteredOptions.length - 1 ? prev + 1 : prev;
                    setTimeout(() => optionsRef.current[n]?.scrollIntoView({ block: 'nearest' }), 0);
                    return n;
                }); break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => {
                    const n = prev > 0 ? prev - 1 : 0;
                    setTimeout(() => optionsRef.current[n]?.scrollIntoView({ block: 'nearest' }), 0);
                    return n;
                }); break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < filteredOptions.length)
                    handleSelectOption(filteredOptions[selectedIndex].id, filteredOptions[selectedIndex].name);
                break;
            case 'Tab':
                if (selectedIndex >= 0 && selectedIndex < filteredOptions.length)
                    handleSelectOption(filteredOptions[selectedIndex].id, filteredOptions[selectedIndex].name);
                break;
            case 'Escape':
                e.preventDefault(); setIsOpen(false); setSelectedIndex(-1); break;
        }
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div className="relative flex items-center">
                <input
                    type="text"
                    value={inputValue}
                    onChange={e => { setInputValue(e.target.value); onChange(e.target.value); setIsOpen(true); setSelectedIndex(-1); }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full bg-bg-primary border border-border-color rounded-lg pl-2.5 pr-14 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-accent-blue placeholder-text-secondary/50 truncate"
                    autoComplete="off"
                />
                <div className="absolute right-0 flex items-center pr-1 gap-0.5">
                    {showClear && inputValue && (
                        <button type="button"
                            onMouseDown={e => { e.preventDefault(); setInputValue(''); onChange(''); setIsOpen(false); }}
                            className="p-1 text-text-secondary hover:text-text-primary transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                    <button type="button"
                        onMouseDown={e => { e.preventDefault(); setIsOpen(o => !o); }}
                        className="p-1 text-text-secondary hover:text-text-primary transition-colors">
                        <svg className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            </div>
            {isOpen && filteredOptions.length > 0 && (
                <div className="fixed z-[9999] bg-bg-primary border border-border-color rounded-xl shadow-2xl max-h-64 overflow-y-auto"
                     data-autocomplete-dropdown="true"
                     style={{
                         top: `${dropdownPosition.top}px`,
                         left: `${dropdownPosition.left}px`,
                         width: `${Math.max(dropdownPosition.width, 280)}px`,
                     }}>
                    {filteredOptions.map((option, index) => {
                        const parentPath = pathMap.get(option.id) || '';
                        return (
                            <div key={option.id} ref={el => optionsRef.current[index] = el}
                                onClick={() => handleSelectOption(option.id, option.name)}
                                className={`px-3 py-2 cursor-pointer transition-colors ${index === selectedIndex ? 'bg-accent-blue' : 'hover:bg-hover-bg'}`}>
                                <div className={`text-sm font-medium ${index === selectedIndex ? 'text-white' : 'text-text-primary'}`}>
                                    {option.name}
                                </div>
                                {parentPath && (
                                    <div className={`text-xs mt-0.5 ${index === selectedIndex ? 'text-white/60' : 'text-text-secondary/70'}`}>
                                        {parentPath}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CategoryAutocomplete;
