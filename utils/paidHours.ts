import type { Employee } from '../types';
import { parseSalesDate } from './salesData';

export const parseCsvText = (text: string): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            if (inQuotes && text[i + 1] === '"') {
                currentCell += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell.replace(/^\uFEFF/, '').trim());
            currentCell = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && text[i + 1] === '\n') i++;
            currentRow.push(currentCell.replace(/^\uFEFF/, '').trim());
            rows.push(currentRow);
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }
    if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell.replace(/^\uFEFF/, '').trim());
        rows.push(currentRow);
    }
    return rows;
};

export const normalizeDateKey = (value: string): string | null => {
    if (!value) return null;
    let parsed = parseSalesDate(value);
    if (!parsed) {
        const currentYear = new Date().getFullYear();
        parsed = parseSalesDate(`${value} ${currentYear}`);
    }
    if (!parsed || Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().split('T')[0];
};

export const hoursStringToMinutes = (raw?: string): number => {
    if (!raw) return 0;
    const cleaned = raw.replace(/,/g, '');
    const numeric = Number(cleaned);
    if (!Number.isFinite(numeric)) return 0;
    return Math.round(numeric * 60);
};

export interface ParsedPaidHoursData {
    paidMinutesByDate: Record<string, Record<string, number>>;
    ghostMinutesByDate: Record<string, number>;
}

export const parsePaidHoursCsv = (csvText: string): ParsedPaidHoursData => {
    const rows = parseCsvText(csvText);
    const paidMinutesByDate: Record<string, Record<string, number>> = {};
    const ghostMinutesByDate: Record<string, number> = {};

    let inPaidSection = false;
    let headers: string[] | null = null;

    for (const row of rows) {
        if (!row || row.every(cell => !cell?.trim())) continue;
        const firstCell = row[0]?.trim().toLowerCase() || '';

        if (!inPaidSection) {
            if (firstCell.includes('paid hours')) {
                inPaidSection = true;
            }
            continue;
        }

        if (!headers) {
            if (firstCell === 'date') {
                headers = row;
            }
            continue;
        }

        if (!headers) continue;

        if (firstCell === 'total' || firstCell.includes('service charge')) {
            headers = null;
            if (firstCell.includes('service charge')) break;
            continue;
        }

        const dateKey = normalizeDateKey(row[0]);
        if (!dateKey) continue;

        const entry: Record<string, number> = {};
        let ghostMinutes = 0;
        for (let i = 2; i < headers.length; i++) {
            const columnName = headers[i]?.trim();
            if (!columnName) continue;
            const minutes = hoursStringToMinutes(row[i]);
            if (/^ghost/i.test(columnName)) {
                ghostMinutes += minutes;
                continue;
            }
            if (columnName.toLowerCase().includes('total')) continue;
            entry[columnName.trim()] = minutes;
        }

        paidMinutesByDate[dateKey] = entry;
        if (ghostMinutes > 0) {
            ghostMinutesByDate[dateKey] = ghostMinutes;
        }
    }

    return { paidMinutesByDate, ghostMinutesByDate };
};

export const mapPaidHoursToEmployees = (
    parsed: ParsedPaidHoursData,
    employees: Employee[],
): {
    manualPaidMinutes: Record<string, Record<number, number>>;
    manualGhostMinutes: Record<string, number>;
} => {
    const manualPaidMinutes: Record<string, Record<number, number>> = {};
    const nameToEmployee = employees.reduce<Record<string, Employee>>((acc, emp) => {
        acc[emp.name.trim().toLowerCase()] = emp;
        return acc;
    }, {});

    for (const [dateKey, entry] of Object.entries(parsed.paidMinutesByDate)) {
        const perEmployee: Record<number, number> = {};
        for (const employee of employees) {
            perEmployee[employee.id] = 0;
        }
        for (const [name, minutes] of Object.entries(entry)) {
            const employee = nameToEmployee[name.trim().toLowerCase()];
            if (!employee) continue;
            perEmployee[employee.id] = minutes;
        }
        manualPaidMinutes[dateKey] = perEmployee;
    }

    const manualGhostMinutes: Record<string, number> = {};
    for (const [dateKey, minutes] of Object.entries(parsed.ghostMinutesByDate)) {
        manualGhostMinutes[dateKey] = minutes;
    }

    return { manualPaidMinutes, manualGhostMinutes };
};
