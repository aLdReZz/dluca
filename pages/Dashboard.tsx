
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SalesData } from '../types';
import { Chart, registerables } from 'chart.js';
import StatCard from '../components/StatCard';
import { CurrencyPesoIcon, ArrowTrendingUpIcon, ChartPieIcon, BanknotesIcon, CalendarDaysIcon } from '../components/Icons';
import CalendarPopup from '../components/CalendarPopup';

Chart.register(...registerables);

interface DashboardProps {
    salesData: SalesData[];
}

// Helper to parse date strings from CSV
const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const date = new Date(dateStr.trim());
    return isNaN(date.getTime()) ? null : date;
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
    const [stats, setStats] = useState({ totalSales: 0, totalProfit: 0, totalCOGS: 0, profitMargin: 0 });
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
            setStats({ totalSales: 0, totalProfit: 0, totalCOGS: 0, profitMargin: 0 });
            return [];
        }

        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59');

        const filteredData = salesData.filter(row => {
            const rowDate = parseDate(row.Date);
            return rowDate && rowDate >= start && rowDate <= end;
        });

        const totalSales = filteredData.reduce((sum, row) => sum + parseNumericValue(row.Total), 0);
        const totalProfit = filteredData.reduce((sum, row) => sum + parseNumericValue(row.Profit), 0);
        const totalCOGS = filteredData.reduce((sum, row) => sum + parseNumericValue(row.Cost), 0);
        const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

        setStats({ totalSales, totalProfit, totalCOGS, profitMargin });
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
            const date = parseDate(row.Date)?.toLocaleDateString('en-CA') || 'Unknown'; // YYYY-MM-DD for sorting
            acc[date] = (acc[date] || 0) + parseNumericValue(row.Total);
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
                <StatCard title="Profit Margin" value={`${stats.profitMargin.toFixed(1)}%`} icon={ChartPieIcon} color="purple" />
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





