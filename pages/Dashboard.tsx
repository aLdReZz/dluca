
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SalesData } from '../types';
import { Chart, registerables } from 'chart.js';
import StatCard from '../components/StatCard';
import { CurrencyPesoIcon, ArrowTrendingUpIcon, BanknotesIcon, CalendarDaysIcon, SparklesIcon } from '../components/Icons';
import CalendarPopup from '../components/CalendarPopup';

Chart.register(...registerables);

interface DashboardProps {
    salesData: SalesData[];
}

// Helper to parse date strings from CSV
const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const trimmed = dateStr.trim();
    if (!trimmed) return null;

    const nativeParsed = new Date(trimmed);
    if (!Number.isNaN(nativeParsed.getTime())) {
        return nativeParsed;
    }

    const normalizeYear = (rawYear: number) => {
        if (rawYear < 100) {
            return rawYear + (rawYear >= 70 ? 1900 : 2000);
        }
        return rawYear;
    };

    const monthMap: Record<string, number> = {
        jan: 0, january: 0,
        feb: 1, february: 1,
        mar: 2, march: 2,
        apr: 3, april: 3,
        may: 4,
        jun: 5, june: 5,
        jul: 6, july: 6,
        aug: 7, august: 7,
        sep: 8, sept: 8, september: 8,
        oct: 9, october: 9,
        nov: 10, november: 10,
        dec: 11, december: 11
    };

    const cleaned = trimmed
        .replace(/,/g, ' ')
        .replace(/\./g, '/')
        .replace(/-/g, '/')
        .replace(/\s+/g, ' ')
        .trim();

    const numericParts = cleaned.match(/^(\d{1,4})\/(\d{1,2})\/(\d{1,4})$/);
    if (numericParts) {
        let part1 = parseInt(numericParts[1], 10);
        let part2 = parseInt(numericParts[2], 10);
        let part3 = parseInt(numericParts[3], 10);

        if (numericParts[1].length === 4) {
            // yyyy/mm/dd
            const year = normalizeYear(part1);
            const month = part2 - 1;
            const day = part3;
            if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
                return new Date(year, month, day);
            }
        } else {
            // assume mm/dd/yyyy or dd/mm/yyyy
            let month = part1;
            let day = part2;
            const year = normalizeYear(part3);

            if (month > 12 && day <= 12) {
                [month, day] = [day, month];
            } else if (day > 12 && month <= 12) {
                // already month/day
            }

            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                return new Date(year, month - 1, day);
            }
        }
    }

    const tokens = cleaned.split(' ');
    if (tokens.length >= 3) {
        const first = tokens[0].toLowerCase();
        const second = tokens[1].toLowerCase();
        const third = tokens[2];

        // Format: 07 Oct 2025 or Oct 07 2025
        const tryParse = (dayToken: string, monthToken: string, yearToken: string) => {
            const monthIndex = monthMap[monthToken.toLowerCase()];
            const day = parseInt(dayToken, 10);
            const year = normalizeYear(parseInt(yearToken, 10));
            if (Number.isInteger(day) && !Number.isNaN(monthIndex) && !Number.isNaN(year)) {
                return new Date(year, monthIndex, day);
            }
            return null;
        };

        if (!Number.isNaN(parseInt(first, 10)) && monthMap[second] !== undefined) {
            const parsed = tryParse(first, second, third);
            if (parsed) return parsed;
        }

        if (monthMap[first] !== undefined && !Number.isNaN(parseInt(second, 10))) {
            const parsed = tryParse(second, first, third);
            if (parsed) return parsed;
        }
    }

    return null;
};

const formatPeso = (amount: number) => {
    return '\u20B1' + amount.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const parseNumericValue = (value?: string): number => {
    if (!value) return 0;
    const cleaned = value.replace(/[^0-9.-]+/g, '');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
};

const getFieldValue = (
    row: SalesData,
    include: string[],
    exclude: string[] = [],
    exact: string[] = []
): string | undefined => {
    if (!row) return undefined;

    const entries = Object.entries(row).map(([key, value]) => ({
        keyOriginal: key,
        key: key.trim().toLowerCase(),
        value
    }));

    if (exact.length > 0) {
        for (const candidate of exact) {
            const normalizedCandidate = candidate.trim().toLowerCase();
            const match = entries.find(entry => entry.key === normalizedCandidate);
            if (match) return match.value;
        }
    }

    const includeNorm = include.map(item => item.trim().toLowerCase());
    const excludeNorm = exclude.map(item => item.trim().toLowerCase());

    for (const entry of entries) {
        if (includeNorm.some(fragment => entry.key.includes(fragment))) {
            if (excludeNorm.some(fragment => entry.key.includes(fragment))) {
                continue;
            }
            return entry.value;
        }
    }

    return undefined;
};

const TOTAL_HEADERS = ['total'];
const TOTAL_INCLUDE = ['total'];
const TOTAL_EXCLUDE = ['service', 'profit', 'tax', 'vat', 'charge', 'discount', 'fee', 'cost'];

const SERVICE_HEADERS = ['service amount'];
const SERVICE_INCLUDE = ['service'];

const COGS_HEADERS = ['cogs', 'cost of goods', 'cost'];
const COGS_INCLUDE = ['cogs', 'cost'];
const COGS_EXCLUDE = ['service', 'discount', 'charge'];

const DATE_HEADERS = ['date', 'transaction date', 'sales date', 'order date'];
const DATE_INCLUDE = ['date'];

const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
};

const Dashboard: React.FC<DashboardProps> = ({ salesData }) => {
    const [filter, setFilter] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('monthly');
    const [stats, setStats] = useState({ totalSales: 0, totalProfit: 0, totalCOGS: 0, serviceCharge: 0 });
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart | null>(null);
    const calendarRef = useRef<HTMLDivElement>(null);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    
    useEffect(() => {
        // Set initial date range to "This Month" on component mount
        handleFilterChange('monthly');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const calculateStats = useCallback(() => {
        if (!startDate || !endDate) {
            setStats({ totalSales: 0, totalProfit: 0, totalCOGS: 0, serviceCharge: 0 });
            return [];
        }

        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59');

        const filteredData = salesData.filter(row => {
            const dateValue = getFieldValue(row, DATE_INCLUDE, [], DATE_HEADERS);
            const rowDate = parseDate(dateValue ?? row.Date);
            return rowDate && rowDate >= start && rowDate <= end;
        });

        const totalGrossSales = filteredData.reduce((sum, row) => {
            const raw = getFieldValue(row, TOTAL_INCLUDE, TOTAL_EXCLUDE, TOTAL_HEADERS);
            return sum + parseNumericValue(raw);
        }, 0);
        const totalProfit = filteredData.reduce((sum, row) => {
            const gross = parseNumericValue(getFieldValue(row, TOTAL_INCLUDE, TOTAL_EXCLUDE, TOTAL_HEADERS));
            const cost = parseNumericValue(getFieldValue(row, COGS_INCLUDE, COGS_EXCLUDE, COGS_HEADERS));
            const service = parseNumericValue(getFieldValue(row, SERVICE_INCLUDE, [], SERVICE_HEADERS));
            return sum + (gross - service - cost);
        }, 0);
        const totalCOGS = filteredData.reduce((sum, row) => {
            const value = getFieldValue(row, COGS_INCLUDE, COGS_EXCLUDE, COGS_HEADERS);
            return sum + parseNumericValue(value);
        }, 0);
        const totalServiceCharge = filteredData.reduce((sum, row) => {
            const value = getFieldValue(row, SERVICE_INCLUDE, [], SERVICE_HEADERS);
            return sum + parseNumericValue(value);
        }, 0);
        const netSales = Math.max(totalGrossSales - totalServiceCharge, 0);

        setStats({ totalSales: netSales, totalProfit, totalCOGS, serviceCharge: totalServiceCharge });
        return filteredData;
    }, [salesData, startDate, endDate]);

    const updateChart = useCallback((data: SalesData[]) => {
        if (!chartRef.current) return;

        const chartCtx = chartRef.current.getContext('2d');
        if (!chartCtx) return;
        
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        const groupedData = data.reduce((acc, row) => {
            const dateValue = getFieldValue(row, DATE_INCLUDE, [], DATE_HEADERS);
            const parsedDate = parseDate(dateValue ?? row.Date);
            const date = parsedDate?.toLocaleDateString('en-CA') || 'Unknown'; // YYYY-MM-DD for sorting
            const totalValue = parseNumericValue(getFieldValue(row, TOTAL_INCLUDE, TOTAL_EXCLUDE, TOTAL_HEADERS));
            const serviceChargeValue = parseNumericValue(getFieldValue(row, SERVICE_INCLUDE, [], SERVICE_HEADERS));
            const netValue = Math.max(totalValue - serviceChargeValue, 0);
            acc[date] = (acc[date] || 0) + netValue;
            return acc;
        }, {} as { [key: string]: number });

        const labels = Object.keys(groupedData).sort((a,b) => new Date(a).getTime() - new Date(b).getTime()).map(d => new Date(d+'T00:00:00').toLocaleDateString());
        const chartData = labels.map(label => groupedData[Object.keys(groupedData).find(d => new Date(d+'T00:00:00').toLocaleDateString() === label) || '']);

        chartInstanceRef.current = new Chart(chartCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Sales',
                    data: chartData,
                    borderColor: '#007aff',
                    backgroundColor: 'rgba(0, 122, 255, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#007aff',
                    pointBorderColor: '#fff',
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#007aff',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { ticks: { color: '#a1a1a6' }, grid: { color: '#424245' } },
                    x: { ticks: { color: '#a1a1a6' }, grid: { color: 'transparent' } }
                }
            }
        });
    }, []);

    useEffect(() => {
        const filteredData = calculateStats();
        updateChart(filteredData);
    }, [salesData, startDate, endDate, calculateStats, updateChart]);
    
    const handleFilterChange = (newFilter: 'daily' | 'weekly' | 'monthly') => {
        setFilter(newFilter);
        const now = new Date();
        let start: Date, end: Date;

        if (newFilter === 'daily') {
            start = end = now;
        } else if (newFilter === 'weekly') {
            const dayOfWeek = now.getDay();
            const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
            start = new Date(now.setDate(diff));
            end = new Date(start);
            end.setDate(start.getDate() + 6);
        } else { // monthly
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };
    
    const handleRangeComplete = (range: { start: string; end: string }) => {
        setStartDate(range.start);
        setEndDate(range.end);
        setFilter('custom');
        setIsCalendarOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setIsCalendarOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const FilterButton: React.FC<{
      period: 'daily' | 'weekly' | 'monthly' | 'custom';
      label: string;
      activeFilter: string;
      onClick: () => void;
    }> = ({ period, label, activeFilter, onClick }) => (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 ${
                activeFilter === period
                    ? 'bg-accent-blue text-white'
                    : 'bg-bg-tertiary text-text-secondary hover:bg-hover-bg'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
             <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-semibold">Overview</h2>
                    <p className="text-text-secondary mt-1">A snapshot of your cafe's performance.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2 p-1 bg-bg-tertiary rounded-lg">
                        <FilterButton period="daily" label="Today" activeFilter={filter} onClick={() => handleFilterChange('daily')} />
                        <FilterButton period="weekly" label="This Week" activeFilter={filter} onClick={() => handleFilterChange('weekly')} />
                        <FilterButton period="monthly" label="This Month" activeFilter={filter} onClick={() => handleFilterChange('monthly')} />
                    </div>
                    <div className="relative w-full sm:w-auto" ref={calendarRef}>
                        <button
                            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                            className="w-full sm:w-auto bg-bg-tertiary border border-border-color rounded-lg px-3 py-2 text-sm font-medium flex items-center justify-between sm:justify-start gap-2 hover:bg-hover-bg transition"
                            aria-label="Select date range"
                        >
                            <CalendarDaysIcon className="w-5 h-5 text-text-secondary" />
                            <span className="text-text-primary">
                                {startDate && endDate
                                    ? `${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}`
                                    : 'Select range'}
                            </span>
                        </button>
                        {isCalendarOpen && (
                            <CalendarPopup
                                initialRange={{ start: startDate || endDate, end: endDate || startDate }}
                                onRangeComplete={handleRangeComplete}
                                onClose={() => setIsCalendarOpen(false)}
                            />
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Sales" value={formatPeso(stats.totalSales)} icon={CurrencyPesoIcon} color="blue" />
                <StatCard title="Total Profit" value={formatPeso(stats.totalProfit)} icon={ArrowTrendingUpIcon} color="green" />
                <StatCard title="COGS" value={formatPeso(stats.totalCOGS)} icon={BanknotesIcon} color="orange" />
                <StatCard title="Service Charge" value={formatPeso(stats.serviceCharge)} icon={SparklesIcon} color="yellow" />
            </div>

            <div className="bg-bg-secondary p-6 rounded-xl border border-border-color">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Sales Overview</h3>
                </div>
                <div className="h-80">
                    <canvas ref={chartRef}></canvas>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;





