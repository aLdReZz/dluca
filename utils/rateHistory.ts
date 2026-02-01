import type { Employee, RateHistoryEntry } from '../types';

/**
 * Get the effective rate for a specific date
 * Falls back to employee.rate if no rate history exists
 */
export function getRateForDate(employee: Employee, dateKey: string): number {
    if (!employee.rateHistory || employee.rateHistory.length === 0) {
        return employee.rate;
    }

    // Sort rate history by effectiveDate descending
    const sortedHistory = [...employee.rateHistory].sort(
        (a, b) => b.effectiveDate.localeCompare(a.effectiveDate)
    );

    // Find the most recent rate that is effective on or before the given date
    for (const entry of sortedHistory) {
        if (entry.effectiveDate <= dateKey) {
            return entry.rate;
        }
    }

    // If no rate history entry applies (date is before all entries), use the current rate
    return employee.rate;
}

/**
 * Add a new rate to history and update current rate if needed
 */
export function addRateChange(
    employee: Employee,
    newRate: number,
    effectiveDate: string,
    notes?: string
): Employee {
    const newEntry: RateHistoryEntry = {
        id: Date.now().toString(),
        rate: newRate,
        effectiveDate,
        notes,
    };

    const currentHistory = employee.rateHistory || [];
    const updatedHistory = [...currentHistory, newEntry].sort(
        (a, b) => a.effectiveDate.localeCompare(b.effectiveDate)
    );

    // Determine if current rate should be updated
    // (if effective date is today or earlier, and it's the latest rate)
    const today = new Date().toISOString().split('T')[0];
    const latestEffectiveRate = [...updatedHistory]
        .filter(entry => entry.effectiveDate <= today)
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];

    return {
        ...employee,
        rateHistory: updatedHistory,
        rate: latestEffectiveRate?.rate ?? employee.rate,
    };
}

/**
 * Remove a rate entry from history
 */
export function removeRateChange(employee: Employee, rateId: string): Employee {
    const currentHistory = employee.rateHistory || [];
    const updatedHistory = currentHistory.filter(r => r.id !== rateId);

    // Recalculate current rate from remaining history
    const today = new Date().toISOString().split('T')[0];
    const latestRate = [...updatedHistory]
        .filter(entry => entry.effectiveDate <= today)
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];

    return {
        ...employee,
        rateHistory: updatedHistory,
        rate: latestRate?.rate ?? employee.rate,
    };
}
