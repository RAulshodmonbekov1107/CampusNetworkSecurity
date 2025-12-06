import { useState, useEffect, useCallback } from 'react';

interface UseApiOptions<T> {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    retryCount?: number;
    retryDelay?: number;
}

interface UseApiReturn<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    execute: (...args: any[]) => Promise<T | null>;
    reset: () => void;
}

export function useApi<T>(
    apiFunction: (...args: any[]) => Promise<T>,
    options: UseApiOptions<T> = {}
): UseApiReturn<T> {
    const { onSuccess, onError, retryCount = 0, retryDelay = 1000 } = options;

    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const execute = useCallback(
        async (...args: any[]): Promise<T | null> => {
            setLoading(true);
            setError(null);

            let lastError: Error | null = null;
            let attempts = 0;

            while (attempts <= retryCount) {
                try {
                    const result = await apiFunction(...args);
                    setData(result);
                    setLoading(false);
                    onSuccess?.(result);
                    return result;
                } catch (err) {
                    lastError = err instanceof Error ? err : new Error('Unknown error');
                    attempts++;

                    if (attempts <= retryCount) {
                        await new Promise((resolve) => setTimeout(resolve, retryDelay * attempts));
                    }
                }
            }

            setError(lastError);
            setLoading(false);
            onError?.(lastError!);
            return null;
        },
        [apiFunction, retryCount, retryDelay, onSuccess, onError]
    );

    const reset = useCallback(() => {
        setData(null);
        setError(null);
        setLoading(false);
    }, []);

    return { data, loading, error, execute, reset };
}
