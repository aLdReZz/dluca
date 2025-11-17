import { useState, useEffect, useCallback } from 'react';
import { isFirebaseConfigured } from '../utils/firebase';

/**
 * Custom hook for Firebase operations with loading and error states
 * @template T - Type of data being fetched
 */
export function useFirebaseData<T>(
    fetchFn: () => Promise<T>,
    dependencies?: React.DependencyList
) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isFirebaseConfigured) {
            setData(null);
            setLoading(false);
            return;
        }

        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);
                const result = await fetchFn();
                setData(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
                setData(null);
                console.error('Firebase data fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, dependencies || [fetchFn]);

    return { data: data as T, loading, error };
}

/**
 * Custom hook for Firebase mutations (add, update, delete)
 * @template T - Type of data being mutated
 */
export function useFirebaseMutation<T>(
    mutateFn: (data: T) => Promise<any>
) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (data: T) => {
            if (!isFirebaseConfigured) {
                setError('Firebase is not configured');
                return null;
            }

            try {
                setLoading(true);
                setError(null);
                const result = await mutateFn(data);
                return result;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'An error occurred';
                setError(errorMessage);
                console.error('Firebase mutation error:', err);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [mutateFn]
    );

    return { mutate, loading, error };
}

/**
 * Hook to check if Firebase is properly configured
 */
export function useFirebaseStatus() {
    return {
        isConfigured: isFirebaseConfigured,
        mode: isFirebaseConfigured ? 'firestore' : 'localStorage',
    };
}

/**
 * Hook for paginated Firebase queries
 */
export function useFirebasePagination<T>(
    fetchPageFn: (pageNumber: number) => Promise<T[]>,
    itemsPerPage = 10
) {
    const [items, setItems] = useState<T[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isFirebaseConfigured) return;

        const loadPage = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await fetchPageFn(currentPage);
                setItems(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        loadPage();
    }, [currentPage, fetchPageFn]);

    return {
        items,
        currentPage,
        setCurrentPage,
        totalItems,
        totalPages: Math.ceil(totalItems / itemsPerPage),
        loading,
        error,
    };
}
