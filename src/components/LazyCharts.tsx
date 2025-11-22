import { lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Lazy load chart components
const ResponseTimeChart = lazy(() => import('@/components/ResponseTimeChart').then(module => ({ default: module.ResponseTimeChart })));
const ModelPerformanceLeaderboard = lazy(() => import('@/components/ModelPerformanceLeaderboard').then(module => ({ default: module.ModelPerformanceLeaderboard })));

// Chart loading fallback
const ChartLoadingFallback = () => (
  <Card className="glass-card">
    <CardContent className="flex items-center justify-center h-[300px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </CardContent>
  </Card>
);

// Wrapped lazy chart components with suspense
export const LazyResponseTimeChart = (props: any) => (
  <Suspense fallback={<ChartLoadingFallback />}>
    <ResponseTimeChart {...props} />
  </Suspense>
);

export const LazyModelPerformanceLeaderboard = (props: any) => (
  <Suspense fallback={<ChartLoadingFallback />}>
    <ModelPerformanceLeaderboard {...props} />
  </Suspense>
);
