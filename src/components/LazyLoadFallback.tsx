import { LoadingState } from './LoadingState';

export const LazyLoadFallback = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingState variant="full" />
    </div>
  );
};
