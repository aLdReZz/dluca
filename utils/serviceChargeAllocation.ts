import type { AttendanceRecord, Employee, SalesData, ServiceChargeBreakdown, ServiceChargeDayDetail } from '../types';
import { extractDateKey, extractServiceCharge, parseNumericValue } from './salesData';

const BREAK_THRESHOLD_MINUTES = 4 * 60;
const DEDUCTED_BREAK_MINUTES = 60;
const GHOST_EMPLOYEE_COUNT = 2;
const GHOST_EMPLOYEE_MINUTES = 12 * 60;
const DAILY_GHOST_MINUTES = GHOST_EMPLOYEE_COUNT * GHOST_EMPLOYEE_MINUTES;

const timeStringToMinutes = (timeStr?: string): number | null => {
    if (!timeStr) return null;
    const normalizedTime = timeStr.trim().toUpperCase();

    const ampmMatch = normalizedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
    if (ampmMatch) {
        let hours = parseInt(ampmMatch[1], 10);
        const minutes = parseInt(ampmMatch[2], 10);
        const period = ampmMatch[3];
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    }

    const twentyFourHourMatch = normalizedTime.match(/^(\d{1,2}):(\d{2})$/);
    if (twentyFourHourMatch) {
        const hours = parseInt(twentyFourHourMatch[1], 10);
        const minutes = parseInt(twentyFourHourMatch[2], 10);
        return hours * 60 + minutes;
    }

    return null;
};

const computePaidMinutes = (
    employee: Employee,
    attendance: AttendanceRecord | undefined,
    dateKey: string
): number => {
    if (!attendance || !attendance.timeIn || !attendance.timeOut) {
        return 0;
    }

    const actualIn = timeStringToMinutes(attendance.timeIn);
    const actualOut = timeStringToMinutes(attendance.timeOut);
    if (actualIn === null || actualOut === null || actualOut <= actualIn) {
        return 0;
    }

    const totalLogin = actualOut - actualIn;
    const schedule = employee.schedule?.[dateKey];

    let paidRegular = 0;
    if (!schedule || schedule.off || !schedule.timeIn || !schedule.timeOut) {
        paidRegular = totalLogin;
        if (totalLogin > BREAK_THRESHOLD_MINUTES) {
            paidRegular = Math.max(0, totalLogin - DEDUCTED_BREAK_MINUTES);
        }
    } else {
        const scheduledIn = timeStringToMinutes(schedule.timeIn);
        const scheduledOut = timeStringToMinutes(schedule.timeOut);
        if (scheduledIn === null || scheduledOut === null) {
            return 0;
        }
        const effectiveIn = Math.max(actualIn, scheduledIn);
        const baseWorked = Math.max(0, Math.min(actualOut, scheduledOut) - effectiveIn);
        paidRegular = baseWorked;
        if (totalLogin > BREAK_THRESHOLD_MINUTES) {
            paidRegular = Math.max(0, baseWorked - DEDUCTED_BREAK_MINUTES);
        }
    }

    const approvedOTMinutes = employee.approvedOvertime?.[dateKey] || 0;
    if (approvedOTMinutes > 0) {
        return Math.max(0, paidRegular) + approvedOTMinutes;
    }

    if (schedule && schedule.timeOut) {
        const scheduledOut = timeStringToMinutes(schedule.timeOut);
        if (scheduledOut !== null && actualOut > scheduledOut) {
            return Math.max(0, paidRegular) + Math.max(0, actualOut - scheduledOut);
        }
    }

    return Math.max(0, paidRegular);
};

export interface DistributionInput {
    employees: Employee[];
    attendanceRecords: AttendanceRecord[];
    salesData: SalesData[];
    start: string;
    end: string;
    dailyServiceChargeTotals?: Record<string, number>;
}

export interface ServiceChargeDistributionResult {
    allocations: Record<number, ServiceChargeBreakdown>;
    dailyServiceChargeTotals: Record<string, number>;
    dailyMinutes: Record<
        string,
        {
            totalMinutes: number;
            teamMinutes: number;
            attendanceMinutes: number;
            employeeMinutes: Record<number, number>;
            ghostMinutes: number;
        }
    >;
}

export const buildDailyServiceChargeTotals = (salesData: SalesData[]): Record<string, number> => {
    const aggregates: Record<string, number[]> = {};
    for (const row of salesData) {
        const dateKey = extractDateKey(row);
        if (!dateKey) continue;
        const amount = (() => {
            const exactKey = Object.keys(row).find(key => key.trim().toLowerCase() === 'service amount');
            if (exactKey) {
                return parseNumericValue(row[exactKey]);
            }
            return extractServiceCharge(row);
        })();
        if (!Number.isFinite(amount) || amount <= 0) continue;
        (aggregates[dateKey] ||= []).push(amount);
    }

    const map: Record<string, number> = {};
    for (const [dateKey, values] of Object.entries(aggregates)) {
        const uniqueValues = Array.from(new Set(values.map(v => Number(v.toFixed(2)))));
        map[dateKey] = uniqueValues.reduce((sum, value) => sum + (value > 0 ? value : 0), 0);
    }
    return map;
};

export const calculateServiceChargeDistribution = ({
    employees,
    attendanceRecords,
    salesData,
    start,
    end,
    dailyServiceChargeTotals,
}: DistributionInput): ServiceChargeDistributionResult => {
    if (!start || !end) {
        return {
            allocations: {},
            dailyServiceChargeTotals: {},
            dailyMinutes: {},
        };
    }

    const attendanceByEmployee = attendanceRecords.reduce<Record<string, AttendanceRecord[]>>((acc, record) => {
        const key = record.employee.trim().toLowerCase();
        (acc[key] ||= []).push(record);
        return acc;
    }, {});

    const sourceTotals: Record<string, number> =
        dailyServiceChargeTotals && Object.keys(dailyServiceChargeTotals).length > 0
            ? dailyServiceChargeTotals
            : buildDailyServiceChargeTotals(salesData);

    const allocations: Record<number, ServiceChargeBreakdown> = {};
    const dailyMinutes: Record<
        string,
        {
            totalMinutes: number;
            teamMinutes: number;
            attendanceMinutes: number;
            employeeMinutes: Record<number, number>;
            ghostMinutes: number;
        }
    > = {};
    const rangeTotals: Record<string, number> = {};

    const startDate = new Date(start + 'T00:00:00Z');
    const endDate = new Date(end + 'T00:00:00Z');

    for (let cursor = new Date(startDate); cursor <= endDate; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
        const dateKey = cursor.toISOString().split('T')[0];
        const pool = sourceTotals[dateKey];
        const perDay = {
            totalMinutes: 0,
            teamMinutes: 0,
            attendanceMinutes: 0,
            employeeMinutes: {} as Record<number, number>,
            ghostMinutes: 0,
        };

        for (const employee of employees) {
            const records = attendanceByEmployee[employee.name.trim().toLowerCase()] || [];
            const attendance = records.find(r => r.date === dateKey);
            const minutes = computePaidMinutes(employee, attendance, dateKey);
            if (minutes > 0) {
                perDay.teamMinutes += minutes;
                perDay.employeeMinutes[employee.id] = minutes;
            }

            if (attendance && attendance.timeIn && attendance.timeOut) {
                const rawIn = timeStringToMinutes(attendance.timeIn);
                const rawOut = timeStringToMinutes(attendance.timeOut);
                if (rawIn !== null && rawOut !== null && rawOut > rawIn) {
                    perDay.attendanceMinutes += rawOut - rawIn;
                }
            }
        }

        if (perDay.teamMinutes > 0) {
            perDay.ghostMinutes = DAILY_GHOST_MINUTES;
            perDay.totalMinutes = perDay.teamMinutes + perDay.ghostMinutes;
            dailyMinutes[dateKey] = perDay;
        } else {
            dailyMinutes[dateKey] = { ...perDay };
        }

        if (!pool || pool <= 0 || Object.keys(perDay.employeeMinutes).length === 0) continue;

        rangeTotals[dateKey] = pool;

        for (const [employeeIdStr, minutes] of Object.entries(perDay.employeeMinutes)) {
            const employeeId = Number(employeeIdStr);
            if (minutes <= 0) continue;
            const share = pool * (minutes / perDay.totalMinutes);
            const entry: ServiceChargeDayDetail = {
                dateKey,
                pool,
                totalMinutes: perDay.totalMinutes,
                teamMinutes: perDay.teamMinutes,
                attendanceMinutes: perDay.attendanceMinutes,
                employeeMinutes: minutes,
                share,
                ghostMinutes: perDay.ghostMinutes,
            };
            if (!allocations[employeeId]) {
                allocations[employeeId] = {
                    totalShare: 0,
                    totalPool: 0,
                    coveredDays: 0,
                    details: [],
                };
            }
            allocations[employeeId].totalShare += share;
            allocations[employeeId].totalPool += pool;
            allocations[employeeId].coveredDays += 1;
            allocations[employeeId].details.push(entry);
        }
    }

    return {
        allocations,
        dailyServiceChargeTotals: rangeTotals,
        dailyMinutes,
    };
};
