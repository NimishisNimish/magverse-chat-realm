import { useState, useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions<T> {
  fetchData: (page: number, pageSize: number) => Promise<T[]>;
  pageSize?: number;
  initialPage?: number;
  threshold?: number; // pixels from bottom to trigger load
}

export const useInfiniteScroll = <T>({
  fetchData,
  pageSize = 20,
  initialPage = 0,
  threshold = 300,
}: UseInfiniteScrollOptions<T>) => {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const newData = await fetchData(page, pageSize);
      
      if (newData.length === 0 || newData.length < pageSize) {
        setHasMore(false);
      }

      setData(prev => [...prev, ...newData]);
      setPage(prev => prev + 1);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading more data:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, loading, hasMore, fetchData]);

  useEffect(() => {
    loadMore();
  }, []); // Initial load

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      entries => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      {
        rootMargin: `${threshold}px`,
      }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observerRef.current.observe(currentRef);
    }

    return () => {
      if (observerRef.current && currentRef) {
        observerRef.current.unobserve(currentRef);
      }
    };
  }, [loadMore, hasMore, loading, threshold]);

  const reset = useCallback(() => {
    setData([]);
    setPage(initialPage);
    setHasMore(true);
    setError(null);
  }, [initialPage]);

  return {
    data,
    loading,
    hasMore,
    error,
    loadMoreRef,
    reset,
    loadMore,
  };
};
