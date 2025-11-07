import type { SalesData } from '../types';

export const SERVICE_CHARGE_DEDUCTION_RATE = 0;
export const SERVICE_CHARGE_DISTRIBUTION_RATE = 1;
export const SERVICE_CHARGE_VIRTUAL_EMPLOYEES = 2;
export const SERVICE_CHARGE_VIRTUAL_MINUTES = SERVICE_CHARGE_VIRTUAL_EMPLOYEES * 12 * 60;

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

const normalizeYear = (rawYear: number) => {
    if (rawYear < 100) {
        return rawYear + (rawYear >= 70 ? 1900 : 2000);
    }
    return rawYear;
};

export const parseSalesDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const trimmed = dateStr.trim();
    if (!trimmed) return null;

    const nativeParsed = new Date(trimmed);
    if (!Number.isNaN(nativeParsed.getTime())) {
        return nativeParsed;
    }

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
            const year = normalizeYear(part1);
            const month = part2 - 1;
            const day = part3;
            if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
                return new Date(year, month, day);
            }
        } else {
            let month = part1;
            let day = part2;
            const year = normalizeYear(part3);

            if (month > 12 && day <= 12) {
                [month, day] = [day, month];
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

export const parseNumericValue = (value?: string): number => {
    if (!value) return 0;
    const cleaned = value.replace(/[^0-9.-]+/g, '');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
};

export const getSalesFieldValue = (
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

export const TOTAL_HEADERS = ['total'];
export const TOTAL_INCLUDE = ['total'];
export const TOTAL_EXCLUDE = ['service', 'profit', 'tax', 'vat', 'charge', 'discount', 'fee', 'cost'];

export const SERVICE_HEADERS = ['service amount'];
export const SERVICE_INCLUDE = ['service'];

export const COGS_HEADERS = ['cogs', 'cost of goods', 'cost'];
export const COGS_INCLUDE = ['cogs', 'cost'];
export const COGS_EXCLUDE = ['service', 'discount', 'charge'];

export const DATE_HEADERS = ['date', 'transaction date', 'sales date', 'order date'];
export const DATE_INCLUDE = ['date'];

const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const extractDateKey = (row: SalesData): string | null => {
    const dateValue = getSalesFieldValue(row, DATE_INCLUDE, [], DATE_HEADERS) ?? row.Date;
    if (!dateValue) return null;
    const parsed = parseSalesDate(dateValue);
    if (!parsed) return null;
    return formatDateKey(parsed);
};

export const extractServiceCharge = (row: SalesData): number => {
    const value = getSalesFieldValue(row, SERVICE_INCLUDE, [], SERVICE_HEADERS);
    return parseNumericValue(value);
};
