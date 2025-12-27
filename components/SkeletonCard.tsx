import React from 'react';

export interface SkeletonCardProps {
  variant?: 'metric' | 'transaction' | 'inventory' | 'accounting' | 'employee' | 'default';
  count?: number;
  className?: string;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({
  variant = 'default',
  count = 1,
  className = '',
}) => {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  const renderMetricSkeleton = () => (
    <div className="bg-bg-secondary border border-border-color rounded-lg lg:rounded-xl p-4 lg:p-5 animate-pulse">
      <div className="space-y-3">
        <div className="h-4 bg-bg-tertiary rounded w-1/2"></div>
        <div className="h-8 bg-bg-tertiary rounded w-3/4"></div>
        <div className="h-3 bg-bg-tertiary rounded w-1/3"></div>
      </div>
    </div>
  );

  const renderTransactionSkeleton = () => (
    <div className="bg-bg-secondary border border-border-color rounded-lg lg:rounded-xl p-4 lg:p-5 animate-pulse">
      <div className="space-y-2">
        <div className="flex justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-bg-tertiary rounded w-1/3"></div>
            <div className="h-3 bg-bg-tertiary rounded w-1/2"></div>
          </div>
          <div className="h-6 bg-bg-tertiary rounded w-20"></div>
        </div>
        <div className="h-6 bg-bg-tertiary rounded w-24"></div>
      </div>
    </div>
  );

  const renderInventorySkeleton = () => (
    <div className="bg-bg-secondary border border-border-color rounded-lg lg:rounded-xl p-4 lg:p-5 animate-pulse">
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="w-16 h-16 bg-bg-tertiary rounded-lg flex-shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-bg-tertiary rounded w-3/4"></div>
            <div className="h-3 bg-bg-tertiary rounded w-1/2"></div>
            <div className="h-4 bg-bg-tertiary rounded w-16"></div>
          </div>
          <div className="space-y-2">
            <div className="h-5 bg-bg-tertiary rounded w-16"></div>
            <div className="h-3 bg-bg-tertiary rounded w-12"></div>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-3 bg-bg-tertiary rounded w-full"></div>
          <div className="h-2 bg-bg-tertiary rounded-full w-full"></div>
        </div>
      </div>
    </div>
  );

  const renderAccountingSkeleton = () => (
    <div className="bg-bg-secondary border border-border-color rounded-lg lg:rounded-xl p-4 lg:p-5 animate-pulse">
      <div className="space-y-2">
        <div className="flex gap-3">
          <div className="w-10 h-10 bg-bg-tertiary rounded-lg flex-shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-bg-tertiary rounded w-2/3"></div>
            <div className="h-3 bg-bg-tertiary rounded w-1/3"></div>
          </div>
          <div className="space-y-2">
            <div className="h-5 bg-bg-tertiary rounded w-20"></div>
            <div className="h-3 bg-bg-tertiary rounded w-16"></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEmployeeSkeleton = () => (
    <div className="bg-bg-secondary border border-border-color rounded-lg lg:rounded-xl p-4 lg:p-5 animate-pulse">
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="w-14 h-14 bg-bg-tertiary rounded-full flex-shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-bg-tertiary rounded w-2/3"></div>
            <div className="h-3 bg-bg-tertiary rounded w-1/2"></div>
            <div className="h-4 bg-bg-tertiary rounded w-16"></div>
          </div>
          <div className="space-y-2">
            <div className="h-5 bg-bg-tertiary rounded w-16"></div>
            <div className="h-3 bg-bg-tertiary rounded w-12"></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDefaultSkeleton = () => (
    <div className="bg-bg-secondary border border-border-color rounded-lg lg:rounded-xl p-4 lg:p-5 animate-pulse">
      <div className="space-y-3">
        <div className="h-4 bg-bg-tertiary rounded w-3/4"></div>
        <div className="h-3 bg-bg-tertiary rounded w-full"></div>
        <div className="h-3 bg-bg-tertiary rounded w-5/6"></div>
      </div>
    </div>
  );

  const renderSkeleton = () => {
    switch (variant) {
      case 'metric':
        return renderMetricSkeleton();
      case 'transaction':
        return renderTransactionSkeleton();
      case 'inventory':
        return renderInventorySkeleton();
      case 'accounting':
        return renderAccountingSkeleton();
      case 'employee':
        return renderEmployeeSkeleton();
      default:
        return renderDefaultSkeleton();
    }
  };

  return (
    <>
      {skeletons.map((index) => (
        <div key={index} className={className} aria-busy="true" aria-label="Loading...">
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
};

export default SkeletonCard;
