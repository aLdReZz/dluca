
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SalesData } from '../types';
import { Chart, registerables } from 'chart.js';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { CurrencyPesoIcon, ArrowTrendingUpIcon, BanknotesIcon, CalendarDaysIcon, SparklesIcon, ChevronDownIcon } from '../components/Icons';
import CalendarPopup from '../components/CalendarPopup';
import { useFirebaseData } from '../hooks/useFirebase';
import { salesService, dashboardPreferencesService } from '../utils/firebaseService';
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
    DATE_INCLUDE,
    TIME_HEADERS,
    TIME_INCLUDE,
    extractHourKey
} from '../utils/salesData';

Chart.register(...registerables);

interface DashboardProps {
    salesData?: SalesData[];
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

const Dashboard: React.FC<DashboardProps> = ({ salesData: propSalesData }) => {
    // Fetch sales data from Firebase
    const { data: firebaseSalesData = [], loading: salesLoading, error: salesError } = useFirebaseData(
        () => salesService.getAll(),
        []
    );

    // Use Firebase data if available, otherwise use prop data (for backward compatibility)
    const salesData = (Array.isArray(firebaseSalesData) && firebaseSalesData.length > 0) ? firebaseSalesData : (propSalesData || []);

    const [filter, setFilter] = useState<'daily' | 'weekly' | 'monthly' | 'lastMonth' | 'allDates' | 'custom'>('monthly');
    const [stats, setStats] = useState({
        netSales: 0,
        grossSales: 0,
        totalProfit: 0,
        totalCOGS: 0,
        creditCardFees: 0,
        serviceCharge: 0,
        serviceChargeEmployee: 0,
        serviceChargeGhost: 0,
    });
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart | null>(null);
    const hourlyChartRef = useRef<HTMLCanvasElement>(null);
    const hourlyChartInstanceRef = useRef<Chart | null>(null);
    const calendarRef = useRef<HTMLDivElement>(null);
    const filterDropdownRef = useRef<HTMLDivElement>(null);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const [isSalesContainerVisible, setIsSalesContainerVisible] = useState(false);
    const [isSalesChartVisible, setIsSalesChartVisible] = useState(false);
    const [isHourlyChartVisible, setIsHourlyChartVisible] = useState(false);
    const [salesViewFilter, setSalesViewFilter] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

    useEffect(() => {
        // Load filter state from Firebase or default to monthly
        const loadPreferences = async () => {
            try {
                const preferences = await dashboardPreferencesService.load();
                if (preferences) {
                    setFilter(preferences.filter);
                    setStartDate(preferences.startDate);
                    setEndDate(preferences.endDate);
                } else {
                    // Default to "This Month" if no saved state
                    handleFilterChange('monthly');
                }
            } catch (error) {
                // If Firebase fails, default to monthly
                console.error('Error loading dashboard preferences from Firebase:', error);
                handleFilterChange('monthly');
            }
        };
        loadPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const containerTimer = window.setTimeout(() => setIsSalesContainerVisible(true), 80);
        const chartTimer = window.setTimeout(() => setIsSalesChartVisible(true), 260);
        const hourlyChartTimer = window.setTimeout(() => setIsHourlyChartVisible(true), 420);

        return () => {
            window.clearTimeout(containerTimer);
            window.clearTimeout(chartTimer);
            window.clearTimeout(hourlyChartTimer);
        };
    }, []);

    const calculateStats = useCallback(() => {
        if (!startDate || !endDate) {
            setStats({
                netSales: 0,
                grossSales: 0,
                totalProfit: 0,
                totalCOGS: 0,
                creditCardFees: 0,
                serviceCharge: 0,
                serviceChargeEmployee: 0,
                serviceChargeGhost: 0,
            });
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

        // Calculate credit card fees (already embedded in the data)
        // For card payments, 4% is deducted from both Total and Service Amount
        const creditCardFees = filteredData.reduce((sum, row) => {
            const paymentType = (row['Payment Type'] || '').toLowerCase().trim();
            if (paymentType.includes('card') || paymentType.includes('credit') || paymentType.includes('qr ph') || paymentType.includes('qrph')) {
                // Total fee = 4% of original total + 4% of original service amount
                // adjustedTotal = originalTotal * 0.96, so originalTotal = adjustedTotal / 0.96
                // adjustedService = originalService * 0.96, so originalService = adjustedService / 0.96
                const adjustedTotal = parseNumericValue(getSalesFieldValue(row, TOTAL_INCLUDE, TOTAL_EXCLUDE, TOTAL_HEADERS));
                const adjustedService = parseNumericValue(getSalesFieldValue(row, SERVICE_INCLUDE, [], SERVICE_HEADERS));

                const totalFee = adjustedTotal * 0.04 / 0.96;
                const serviceFee = adjustedService * 0.04 / 0.96;

                return sum + totalFee + serviceFee;
            }
            return sum;
        }, 0);

        const employeeShare = totalServiceCharge * 0.4;
        const ghostShare = totalServiceCharge * 0.6;
        const netSales = Math.max(totalGrossSales - totalServiceCharge, 0);

        setStats({
            netSales,
            grossSales: totalGrossSales,
            totalProfit,
            totalCOGS,
            creditCardFees,
            serviceCharge: totalServiceCharge,
            serviceChargeEmployee: employeeShare,
            serviceChargeGhost: ghostShare,
        });
        return filteredData;
    }, [salesData, startDate, endDate]);

    // Helper function to check if date range is a single day
    const isSingleDayRange = (start: string, end: string): boolean => {
        if (!start || !end) return false;
        const startDate = new Date(start + 'T00:00:00');
        const endDate = new Date(end + 'T00:00:00');
        return startDate.getTime() === endDate.getTime();
    };

    const updateChart = useCallback((data: SalesData[]) => {
        if (!chartRef.current) return;

        const chartCtx = chartRef.current.getContext('2d');
        if (!chartCtx) return;

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        chartCtx.clearRect(0, 0, chartCtx.canvas.width, chartCtx.canvas.height);

        let labels: string[] = [];
        let chartData: number[] = [];
        let chartTitle = 'Sales';
        let dateMapping: string[] = []; // Store actual dates for tooltip
        let weekEndMapping: string[] = []; // Store week end dates for weekly view

        // Check if this is a single-day range (for any filter, including custom date ranges)
        const isSingleDay = isSingleDayRange(startDate, endDate);

        // Use salesViewFilter for the Sales Overview chart grouping
        // Only show hourly view when the date range is a single day
        if (isSingleDay) {
            // Group data by hour and only show hours with sales
            const hourlyMap = new Map<number, number>();
            const START_HOUR = 9;
            const END_HOUR = 23;

            data.forEach(row => {
                const hourKey = extractHourKey(row);
                if (hourKey !== null && hourKey >= START_HOUR && hourKey <= END_HOUR) {
                    const totalValue = parseNumericValue(getSalesFieldValue(row, TOTAL_INCLUDE, TOTAL_EXCLUDE, TOTAL_HEADERS));
                    const serviceChargeValue = parseNumericValue(getSalesFieldValue(row, SERVICE_INCLUDE, [], SERVICE_HEADERS));
                    const netValue = Math.max(totalValue - serviceChargeValue, 0);
                    hourlyMap.set(hourKey, (hourlyMap.get(hourKey) || 0) + netValue);
                }
            });

            // Only show hours that have sales, sorted by hour
            const sortedHours = Array.from(hourlyMap.entries())
                .sort((a, b) => a[0] - b[0]);

            if (sortedHours.length > 0) {
                // Show only hours with sales
                labels = sortedHours.map(([hour]) => hour.toString().padStart(2, '0') + ':00');
                chartData = sortedHours.map(([, value]) => value);
            } else {
                // No sales data - show empty state
                labels = ['No Sales Data'];
                chartData = [0];
            }

            chartTitle = 'Hourly Sales';
        } else if (salesViewFilter === 'monthly') {
            // Group by month for monthly view
            const monthlyData = data.reduce((acc, row) => {
                const dateValue = getSalesFieldValue(row, DATE_INCLUDE, [], DATE_HEADERS);
                const parsedDate = parseSalesDate(dateValue ?? row.Date);
                if (parsedDate) {
                    const monthKey = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}`;
                    const totalValue = parseNumericValue(getSalesFieldValue(row, TOTAL_INCLUDE, TOTAL_EXCLUDE, TOTAL_HEADERS));
                    const serviceChargeValue = parseNumericValue(getSalesFieldValue(row, SERVICE_INCLUDE, [], SERVICE_HEADERS));
                    const netValue = Math.max(totalValue - serviceChargeValue, 0);
                    acc[monthKey] = (acc[monthKey] || 0) + netValue;
                }
                return acc;
            }, {} as { [key: string]: number });

            const sortedMonths = Object.entries(monthlyData)
                .sort((a, b) => a[0].localeCompare(b[0]));

            labels = sortedMonths.map(([monthKey]) => {
                const [year, month] = monthKey.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            });
            chartData = sortedMonths.map(([, value]) => value);
            chartTitle = 'Monthly Sales';
        } else if (salesViewFilter === 'weekly') {
            // Group by week for weekly view
            const getWeekStartDate = (date: Date): Date => {
                const dayOfWeek = date.getDay();
                const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
                return new Date(date.getFullYear(), date.getMonth(), diff);
            };

            const weeklyData = data.reduce((acc, row) => {
                const dateValue = getSalesFieldValue(row, DATE_INCLUDE, [], DATE_HEADERS);
                const parsedDate = parseSalesDate(dateValue ?? row.Date);
                if (parsedDate) {
                    const weekStart = getWeekStartDate(parsedDate);
                    const weekKey = weekStart.toISOString().split('T')[0]; // YYYY-MM-DD format
                    const totalValue = parseNumericValue(getSalesFieldValue(row, TOTAL_INCLUDE, TOTAL_EXCLUDE, TOTAL_HEADERS));
                    const serviceChargeValue = parseNumericValue(getSalesFieldValue(row, SERVICE_INCLUDE, [], SERVICE_HEADERS));
                    const netValue = Math.max(totalValue - serviceChargeValue, 0);
                    acc[weekKey] = (acc[weekKey] || 0) + netValue;
                }
                return acc;
            }, {} as { [key: string]: number });

            const sortedWeeks = Object.entries(weeklyData)
                .sort((a, b) => a[0].localeCompare(b[0]));

            // Calculate week numbers for labels and store dates
            labels = sortedWeeks.map(([weekKey]) => {
                const weekStart = new Date(weekKey + 'T00:00:00');
                const firstDayOfYear = new Date(weekStart.getFullYear(), 0, 1);
                const pastDaysOfYear = (weekStart.getTime() - firstDayOfYear.getTime()) / 86400000;
                const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
                return `Week ${weekNumber}`;
            });
            dateMapping = sortedWeeks.map(([weekKey]) => weekKey); // Store week start dates
            weekEndMapping = sortedWeeks.map(([weekKey]) => {
                const weekStart = new Date(weekKey + 'T00:00:00');
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6); // Add 6 days to get Sunday
                return weekEnd.toISOString().split('T')[0];
            }); // Store week end dates
            chartData = sortedWeeks.map(([, value]) => value);
            chartTitle = 'Weekly Sales';
        } else {
            // Group by date (existing logic)
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

            labels = sortedEntries.map(([date]) =>
                new Date(date + 'T00:00:00').toLocaleDateString()
            );
            chartData = sortedEntries.map(([, value]) => value);
            chartTitle = 'Sales';
        }

        // Calculate average for the average line
        const averageValue = chartData.length > 0
            ? chartData.reduce((sum, val) => sum + val, 0) / chartData.length
            : 0;
        const averageLineData = chartData.map(() => averageValue);

        chartInstanceRef.current = new Chart(chartCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: chartTitle,
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
                },
                {
                    label: `Average: ${formatPeso(averageValue)}`,
                    data: averageLineData,
                    borderColor: '#f59e0b',
                    borderWidth: 2,
                    borderDash: [8, 4],
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    pointHitRadius: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top' as const,
                        align: 'end' as const,
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'line',
                            boxWidth: 30,
                            boxHeight: 2,
                            padding: 15,
                            font: {
                                size: 11,
                                family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            },
                            color: '#94a3b8',
                            filter: (item) => item.text.startsWith('Average'),
                        },
                    },
                    tooltip: {
                        backgroundColor: 'rgba(12, 15, 22, 0.94)',
                        borderColor: 'rgba(96, 165, 250, 0.35)',
                        borderWidth: 1.2,
                        padding: 12,
                        titleColor: '#f4f4f5',
                        titleFont: { weight: 600, size: 12, family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
                        titleSpacing: 6,
                        bodyColor: '#e2e8f0',
                        bodyFont: { weight: 500, size: 12, family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
                        bodySpacing: 8,
                        footerColor: 'rgba(148, 163, 184, 0.85)',
                        footerFont: { weight: 400, size: 10, family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
                        footerSpacing: 4,
                        displayColors: false,
                        cornerRadius: 10,
                        caretSize: 6,
                        boxPadding: 6,
                        filter: (tooltipItem) => {
                            // Don't show tooltip for the average line
                            return !tooltipItem.dataset.label?.startsWith('Average');
                        },
                        callbacks: {
                            title: () => [],
                            label: (context) => {
                                const value = context.raw as number;
                                return formatPeso(value);
                            },
                            footer: (items) => {
                                const first = items[0];
                                if (!first?.label) return [];

                                // For weekly view, show week start and end dates
                                if (weekEndMapping.length > 0 && first.dataIndex !== undefined) {
                                    const weekStartStr = dateMapping[first.dataIndex];
                                    const weekEndStr = weekEndMapping[first.dataIndex];

                                    const weekStart = new Date(weekStartStr + 'T00:00:00');
                                    const weekEnd = new Date(weekEndStr + 'T00:00:00');

                                    const startFormatted = weekStart.toLocaleDateString('en-PH', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    });
                                    const endFormatted = weekEnd.toLocaleDateString('en-PH', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    });

                                    return [`${startFormatted} - ${endFormatted}`];
                                }

                                // For other views, use dateMapping to get the actual date
                                let dateStr = first.label;
                                if (dateMapping.length > 0 && first.dataIndex !== undefined) {
                                    dateStr = dateMapping[first.dataIndex];
                                }

                                const date = new Date(dateStr);
                                if (Number.isNaN(date.getTime())) return [first.label];
                                const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                                const formattedDate = date.toLocaleDateString('en-PH', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                });
                                return [dayName, formattedDate];
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
    }, [filter, startDate, endDate, salesViewFilter]);

    const updateHourlyChart = useCallback((data: SalesData[]) => {
        if (!hourlyChartRef.current) return;

        const chartCtx = hourlyChartRef.current.getContext('2d');
        if (!chartCtx) return;

        if (hourlyChartInstanceRef.current) {
            hourlyChartInstanceRef.current.destroy();
        }

        // Group data by hour
        const hourlyMap = new Map<number, { count: number; sales: number }>();
        const START_HOUR = 9;
        const END_HOUR = 23;

        // Initialize all hours with 0
        for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
            hourlyMap.set(hour, { count: 0, sales: 0 });
        }

        data.forEach((row) => {
            const hourKey = extractHourKey(row);
            if (hourKey !== null && hourKey >= START_HOUR && hourKey <= END_HOUR) {
                const current = hourlyMap.get(hourKey) || { count: 0, sales: 0 };
                const totalValue = parseNumericValue(getSalesFieldValue(row, TOTAL_INCLUDE, TOTAL_EXCLUDE, TOTAL_HEADERS));
                const serviceChargeValue = parseNumericValue(getSalesFieldValue(row, SERVICE_INCLUDE, [], SERVICE_HEADERS));
                const netValue = Math.max(totalValue - serviceChargeValue, 0);
                hourlyMap.set(hourKey, {
                    count: current.count + 1,
                    sales: current.sales + netValue
                });
            }
        });

        const sortedHours = Array.from(hourlyMap.entries()).sort((a, b) => a[0] - b[0]);
        const labels = sortedHours.map(([hour]) => {
            const period = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
            return `${displayHour.toString().padStart(2, '0')}:00 ${period}`;
        });
        const transactionCounts = sortedHours.map(([, data]) => data.count);

        hourlyChartInstanceRef.current = new Chart(chartCtx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Number of Transactions',
                    data: transactionCounts,
                    backgroundColor: 'rgba(34, 197, 94, 0.6)',
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 1,
                    borderRadius: 6,
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
                        titleFont: { weight: 600, size: 12, family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
                        bodyColor: '#e2e8f0',
                        bodyFont: { weight: 500, size: 12, family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
                        displayColors: false,
                        cornerRadius: 10,
                        callbacks: {
                            title: (items) => {
                                const hour = items[0].label;
                                return [`${hour}`];
                            },
                            label: (context) => {
                                const count = context.raw as number;
                                return `${count} transaction${count !== 1 ? 's' : ''}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#a1a1a6',
                            stepSize: 1,
                            precision: 0
                        },
                        grid: { color: '#424245' },
                        title: {
                            display: true,
                            text: 'Number of Transactions',
                            color: '#a1a1a6',
                            font: { size: 11, weight: 500 }
                        }
                    },
                    x: {
                        ticks: { color: '#a1a1a6' },
                        grid: { color: 'transparent' },
                        title: {
                            display: true,
                            text: 'Hour of Day',
                            color: '#a1a1a6',
                            font: { size: 11, weight: 500 }
                        }
                    }
                }
            }
        });
    }, []);

    useEffect(() => {
        const filteredData = calculateStats();
        updateChart(filteredData);
        updateHourlyChart(filteredData);
    }, [salesData, startDate, endDate, calculateStats, updateChart, updateHourlyChart]);
    
    const handleFilterChange = (newFilter: 'daily' | 'weekly' | 'monthly' | 'lastMonth' | 'allDates') => {
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
        } else if (newFilter === 'allDates') {
            // Show all available data - set a very early start date
            start = new Date(2000, 0, 1); // January 1st, 2000
            end = now; // Today
        } else { // monthly
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }
        const startStr = formatDateForInput(start);
        const endStr = formatDateForInput(end);
        setStartDate(startStr);
        setEndDate(endStr);

        // Save to Firebase
        dashboardPreferencesService.save({
            filter: newFilter,
            startDate: startStr,
            endDate: endStr
        }).catch(error => {
            console.error('Error saving dashboard filter to Firebase:', error);
        });
    };

    const handleRangeComplete = (range: { start: string; end: string }) => {
        setStartDate(range.start);
        setEndDate(range.end);
        setFilter('custom');
        setIsCalendarOpen(false);

        // Save to Firebase
        dashboardPreferencesService.save({
            filter: 'custom',
            startDate: range.start,
            endDate: range.end
        }).catch(error => {
            console.error('Error saving dashboard filter to Firebase:', error);
        });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setIsCalendarOpen(false);
            }
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
                setIsFilterDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getFilterLabel = (filterPeriod: string) => {
        switch (filterPeriod) {
            case 'daily': return 'Today';
            case 'weekly': return 'This Week';
            case 'monthly': return 'This Month';
            case 'lastMonth': return 'Last Month';
            case 'allDates': return 'All Dates';
            case 'custom': return 'Custom Range';
            default: return 'Select Period';
        }
    };

    // Show loading state
    if (salesLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center">
                <LoadingSpinner message="Loading sales data..." />
            </div>
        );
    }

    // Show error state
    if (salesError) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                    <p className="text-red-500 font-medium">Error loading sales data</p>
                    <p className="text-text-secondary text-sm mt-1">{salesError}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-3 sm:p-4 lg:p-6 xl:p-8 max-w-7xl mx-auto w-full">
             <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 sm:mb-6 lg:mb-8 gap-3 sm:gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold">Overview</h2>
                    <p className="text-text-secondary mt-0.5 sm:mt-1 text-xs sm:text-sm">A snapshot of your cafe's performance.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-wrap w-full sm:w-auto">
                    <div className="relative w-full sm:w-auto" ref={filterDropdownRef}>
                        <button
                            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                            className="w-full sm:w-auto bg-bg-tertiary border border-border-color rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium flex items-center justify-between gap-2 hover:bg-hover-bg transition"
                        >
                            <span className="text-text-primary">{getFilterLabel(filter)}</span>
                            <ChevronDownIcon className={`w-4 h-4 text-text-secondary transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isFilterDropdownOpen && (
                            <div className="absolute top-full mt-1 left-0 w-full sm:w-48 bg-bg-secondary border border-border-color rounded-lg shadow-lg z-10 overflow-hidden">
                                <button
                                    onClick={() => { handleFilterChange('daily'); setIsFilterDropdownOpen(false); }}
                                    className={`w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-hover-bg transition ${filter === 'daily' ? 'bg-accent-blue/10 text-accent-blue font-medium' : 'text-text-primary'}`}
                                >
                                    Today
                                </button>
                                <button
                                    onClick={() => { handleFilterChange('weekly'); setIsFilterDropdownOpen(false); }}
                                    className={`w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-hover-bg transition ${filter === 'weekly' ? 'bg-accent-blue/10 text-accent-blue font-medium' : 'text-text-primary'}`}
                                >
                                    This Week
                                </button>
                                <button
                                    onClick={() => { handleFilterChange('monthly'); setIsFilterDropdownOpen(false); }}
                                    className={`w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-hover-bg transition ${filter === 'monthly' ? 'bg-accent-blue/10 text-accent-blue font-medium' : 'text-text-primary'}`}
                                >
                                    This Month
                                </button>
                                <button
                                    onClick={() => { handleFilterChange('lastMonth'); setIsFilterDropdownOpen(false); }}
                                    className={`w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-hover-bg transition ${filter === 'lastMonth' ? 'bg-accent-blue/10 text-accent-blue font-medium' : 'text-text-primary'}`}
                                >
                                    Last Month
                                </button>
                                <button
                                    onClick={() => { handleFilterChange('allDates'); setIsFilterDropdownOpen(false); }}
                                    className={`w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-hover-bg transition ${filter === 'allDates' ? 'bg-accent-blue/10 text-accent-blue font-medium' : 'text-text-primary'}`}
                                >
                                    All Dates
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="relative w-full sm:w-auto" ref={calendarRef}>
                        <button
                            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                            className="w-full sm:w-auto bg-bg-tertiary border border-border-color rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium flex items-center justify-between sm:justify-start gap-2 hover:bg-hover-bg transition"
                            aria-label="Select date range"
                        >
                            <CalendarDaysIcon className="w-4 h-4 sm:w-5 sm:h-5 text-text-secondary flex-shrink-0" />
                            <span className="text-text-primary truncate">
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

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 xl:gap-6 mb-4 sm:mb-6 lg:mb-8">
                <StatCard title="Net Sales" value={formatPeso(stats.netSales)} icon={CurrencyPesoIcon} color="blue" />
                <StatCard title="Gross Sales" value={formatPeso(stats.grossSales)} icon={CurrencyPesoIcon} color="purple" />
                <StatCard title="Total Profit" value={formatPeso(stats.totalProfit)} icon={ArrowTrendingUpIcon} color="green" />
                <StatCard
                    title="Cost of Goods"
                    value={formatPeso(stats.totalCOGS)}
                    icon={BanknotesIcon}
                    color="orange"
                    tooltip={
                        stats.creditCardFees > 0 ? (
                            <div className="text-left text-[11px] leading-snug mt-1">
                                <div>
                                    <span className="text-text-secondary">Credit Card Fees:</span>{' '}
                                    <span className="font-semibold text-text-primary">{formatPeso(stats.creditCardFees)}</span>
                                </div>
                            </div>
                        ) : undefined
                    }
                />
                <StatCard
                    title="Service Charge"
                    value={formatPeso(stats.serviceCharge)}
                    icon={SparklesIcon}
                    color="yellow"
                    tooltip={
                        <div className="text-left text-[11px] leading-snug mt-1">
                            <div>
                                <span className="text-text-secondary">Employee:</span>{' '}
                                <span className="font-semibold text-text-primary">{formatPeso(stats.serviceChargeEmployee)}</span>
                            </div>
                            <div>
                                <span className="text-text-secondary">Ghost:</span>{' '}
                                <span className="font-semibold text-text-primary">{formatPeso(stats.serviceChargeGhost)}</span>
                            </div>
                        </div>
                    }
                />
            </div>

            <div
                className={`bg-bg-secondary p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl border border-border-color transition-all duration-500 ease-out transform ${
                    isSalesContainerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
            >
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-semibold">Sales Overview</h3>
                    <div className="flex items-center gap-1 bg-bg-tertiary rounded-lg p-1 border border-border-color">
                        <button
                            onClick={() => setSalesViewFilter('daily')}
                            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded transition-all ${
                                salesViewFilter === 'daily'
                                    ? 'bg-accent-blue text-white shadow-sm'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-hover-bg'
                            }`}
                        >
                            Daily
                        </button>
                        <button
                            onClick={() => setSalesViewFilter('weekly')}
                            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded transition-all ${
                                salesViewFilter === 'weekly'
                                    ? 'bg-accent-blue text-white shadow-sm'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-hover-bg'
                            }`}
                        >
                            Weekly
                        </button>
                        <button
                            onClick={() => setSalesViewFilter('monthly')}
                            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded transition-all ${
                                salesViewFilter === 'monthly'
                                    ? 'bg-accent-blue text-white shadow-sm'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-hover-bg'
                            }`}
                        >
                            Monthly
                        </button>
                    </div>
                </div>
                <div
                    className={`h-64 sm:h-72 lg:h-80 transition-all duration-500 ease-out transform ${
                        isSalesChartVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                >
                    <canvas ref={chartRef}></canvas>
                </div>
            </div>

            <div
                className={`bg-bg-secondary p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl border border-border-color transition-all duration-500 ease-out transform mt-4 sm:mt-6 lg:mt-8 ${
                    isHourlyChartVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
            >
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-semibold">Customer Activity by Hour</h3>
                    <p className="text-xs sm:text-sm text-text-secondary">Transaction volume during operating hours</p>
                </div>
                <div className="h-64 sm:h-72 lg:h-80">
                    <canvas ref={hourlyChartRef}></canvas>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;





