
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SalesData } from '../types';
import { Chart, registerables } from 'chart.js';
import StatCard from '../components/StatCard';
import { CurrencyPesoIcon, ArrowTrendingUpIcon, BanknotesIcon, CalendarDaysIcon, SparklesIcon } from '../components/Icons';
import CalendarPopup from '../components/CalendarPopup';
import {
    parseSalesDate,
    parseNumericValue,
    getSalesFieldValue,
    TOTAL_HEADERS,
    TOTAL_INCLUDE,
    TOTAL_EXCLUDE,
    SERVICE_HEADERS,
    SERVICE_INCLUDE,
    COGS_HEADERS,
    COGS_INCLUDE,
    COGS_EXCLUDE,
    DATE_HEADERS,
    DATE_INCLUDE
} from '../utils/salesData';

Chart.register(...registerables);

interface DashboardProps {
    salesData: SalesData[];
}

const formatPeso = (amount?: number) => {
    const safeAmount = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
    return '\u20B1' + safeAmount.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    const [filter, setFilter] = useState<'daily' | 'weekly' | 'monthly' | 'lastMonth' | 'custom'>('monthly');
    const [stats, setStats] = useState({ netSales: 0, grossSales: 0, totalProfit: 0, totalCOGS: 0, serviceCharge: 0 });
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
            setStats({ netSales: 0, grossSales: 0, totalProfit: 0, totalCOGS: 0, serviceCharge: 0 });
            return [];
        }

        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59');

        const filteredData = salesData.filter(row => {
            const dateValue = getSalesFieldValue(row, DATE_INCLUDE, [], DATE_HEADERS);
            const rowDate = parseSalesDate(dateValue ?? row.Date);
            return rowDate && rowDate >= start && rowDate <= end;
        });

        const totalGrossSales = filteredData.reduce((sum, row) => {
            const raw = getSalesFieldValue(row, TOTAL_INCLUDE, TOTAL_EXCLUDE, TOTAL_HEADERS);
            return sum + parseNumericValue(raw);
        }, 0);
        const totalProfit = filteredData.reduce((sum, row) => {
            const gross = parseNumericValue(getSalesFieldValue(row, TOTAL_INCLUDE, TOTAL_EXCLUDE, TOTAL_HEADERS));
            const cost = parseNumericValue(getSalesFieldValue(row, COGS_INCLUDE, COGS_EXCLUDE, COGS_HEADERS));
            const service = parseNumericValue(getSalesFieldValue(row, SERVICE_INCLUDE, [], SERVICE_HEADERS));
            return sum + (gross - service - cost);
        }, 0);
        const totalCOGS = filteredData.reduce((sum, row) => {
            const value = getSalesFieldValue(row, COGS_INCLUDE, COGS_EXCLUDE, COGS_HEADERS);
            return sum + parseNumericValue(value);
        }, 0);
        const totalServiceCharge = filteredData.reduce((sum, row) => {
            const value = getSalesFieldValue(row, SERVICE_INCLUDE, [], SERVICE_HEADERS);
            return sum + parseNumericValue(value);
        }, 0);
        const netSales = Math.max(totalGrossSales - totalServiceCharge, 0);

        setStats({ netSales, grossSales: totalGrossSales, totalProfit, totalCOGS, serviceCharge: totalServiceCharge });
        return filteredData;
    }, [salesData, startDate, endDate]);

    const updateChart = useCallback((data: SalesData[]) => {
        if (!chartRef.current) return;

        const chartCtx = chartRef.current.getContext('2d');
        if (!chartCtx) return;
        
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        chartCtx.clearRect(0, 0, chartCtx.canvas.width, chartCtx.canvas.height);

        const groupedData = data.reduce((acc, row) => {
            const dateValue = getSalesFieldValue(row, DATE_INCLUDE, [], DATE_HEADERS);
            const parsedDate = parseSalesDate(dateValue ?? row.Date);
            const date = parsedDate?.toLocaleDateString('en-CA') || 'Unknown'; // YYYY-MM-DD for sorting
            const totalValue = parseNumericValue(getSalesFieldValue(row, TOTAL_INCLUDE, TOTAL_EXCLUDE, TOTAL_HEADERS));
            const serviceChargeValue = parseNumericValue(getSalesFieldValue(row, SERVICE_INCLUDE, [], SERVICE_HEADERS));
            const netValue = Math.max(totalValue - serviceChargeValue, 0);
            acc[date] = (acc[date] || 0) + netValue;
            return acc;
        }, {} as { [key: string]: number });

        const sortedEntries = Object.entries(groupedData)
            .filter(([date]) => date !== 'Unknown')
            .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

        const labels = sortedEntries.map(([date]) =>
            new Date(date + 'T00:00:00').toLocaleDateString()
        );
        const chartData = sortedEntries.map(([, value]) => value);

        chartInstanceRef.current = new Chart(chartCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Sales',
                    data: chartData,
                    borderColor: '#2563eb',
                    borderWidth: 2.5,
                    backgroundColor: (ctx) => {
                        const { chart } = ctx;
                        const { ctx: canvasCtx, chartArea } = chart;
                        if (!chartArea) {
                            return 'rgba(37, 99, 235, 0.1)';
                        }
                        const gradient = canvasCtx.createLinearGradient(
                            chartArea.left,
                            chartArea.top,
                            chartArea.left,
                            chartArea.bottom
                        );
                        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.22)');
                        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.06)');
                        return gradient;
                    },
                    fill: 'origin',
                    tension: 0.45,
                    pointRadius: 4.5,
                    pointHoverRadius: 7,
                    pointBorderWidth: 2,
                    pointHoverBorderWidth: 2.5,
                    pointBackgroundColor: '#1f2937',
                    pointBorderColor: '#60a5fa',
                    pointHoverBackgroundColor: '#bfdbfe',
                    pointHoverBorderColor: '#1d4ed8',
                    pointHitRadius: 14,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(12, 15, 22, 0.94)',
                        borderColor: 'rgba(96, 165, 250, 0.35)',
                        borderWidth: 1.2,
                        padding: 12,
                        titleColor: '#f4f4f5',
                        titleFont: { weight: '600', size: 12, family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
                        titleSpacing: 6,
                        bodyColor: '#e2e8f0',
                        bodyFont: { weight: '500', size: 12, family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
                        bodySpacing: 8,
                        footerColor: 'rgba(148, 163, 184, 0.85)',
                        footerFont: { weight: '400', size: 10, family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
                        footerSpacing: 4,
                        displayColors: false,
                        cornerRadius: 10,
                        caretSize: 6,
                        boxPadding: 6,
                        callbacks: {
                            title: () => [],
                            label: (context) => {
                                const value = context.raw as number;
                                return formatPeso(value);
                            },
                            footer: (items) => {
                                const first = items[0];
                                if (!first?.label) return [];
                                const date = new Date(first.label);
                                if (Number.isNaN(date.getTime())) return [first.label];
                                return [
                                    date.toLocaleDateString('en-PH', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })
                                ];
                            }
                        }
                    }
                },
                interaction: { intersect: false, mode: 'index' },
                scales: {
                    y: { ticks: { color: '#a1a1a6' }, grid: { color: '#424245' } },
                    x: { ticks: { color: '#a1a1a6' }, grid: { color: 'transparent' } }
                }
            }
        });

        const srTooltip = chartInstanceRef.current.canvas.parentNode?.querySelector('.chartjs-tooltip');
        if (srTooltip) {
            srTooltip.remove();
        }

        const tooltip = (chartInstanceRef.current.tooltip ?? null) as unknown as {
            draw?: (ctx: CanvasRenderingContext2D) => void;
        };
        if (tooltip && typeof tooltip.draw === 'function') {
            const originalDraw = tooltip.draw.bind(tooltip);
            tooltip.draw = (ctx: CanvasRenderingContext2D) => {
                ctx.save();
                ctx.shadowColor = 'rgba(10, 14, 25, 0.45)';
                ctx.shadowBlur = 18;
                ctx.shadowOffsetY = 10;
                originalDraw(ctx);
                ctx.restore();
            };
        }
    }, []);

    useEffect(() => {
        const filteredData = calculateStats();
        updateChart(filteredData);
    }, [salesData, startDate, endDate, calculateStats, updateChart]);
    
    const handleFilterChange = (newFilter: 'daily' | 'weekly' | 'monthly' | 'lastMonth') => {
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
        } else if (newFilter === 'lastMonth') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
        } else { // monthly
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }
        setStartDate(formatDateForInput(start));
        setEndDate(formatDateForInput(end));
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
      period: 'daily' | 'weekly' | 'monthly' | 'lastMonth' | 'custom';
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
                        <FilterButton period="lastMonth" label="Last Month" activeFilter={filter} onClick={() => handleFilterChange('lastMonth')} />
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <StatCard title="Net Sales" value={formatPeso(stats.netSales)} icon={CurrencyPesoIcon} color="blue" />
                <StatCard title="Gross Sales" value={formatPeso(stats.grossSales)} icon={CurrencyPesoIcon} color="purple" />
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





