import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  animation?: 'pulse' | 'wave' | 'none';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export function Skeleton({
  className,
  variant = 'rectangular',
  animation = 'pulse',
  width,
  height,
  count = 1
}: SkeletonProps) {
  const baseStyles = cn(
    'bg-muted/50',
    animation === 'pulse' && 'animate-pulse',
    animation === 'wave' && 'skeleton-wave',
    variant === 'circular' && 'rounded-full',
    variant === 'text' && 'rounded h-4',
    variant === 'rectangular' && 'rounded',
    variant === 'card' && 'rounded-xl',
    className
  );

  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={baseStyles}
      style={{
        width: width || (variant === 'circular' ? '40px' : '100%'),
        height: height || (variant === 'circular' ? '40px' : variant === 'text' ? '16px' : '100px'),
        marginBottom: count > 1 && i < count - 1 ? '8px' : undefined
      }}
    />
  ));

  return <>{skeletons}</>;
}

// Email skeleton component
export function EmailSkeleton() {
  return (
    <div className="p-3 border-b border-border/5">
      <div className="flex items-start gap-3">
        <Skeleton variant="circular" width={32} height={32} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <Skeleton variant="text" width="140px" />
            <Skeleton variant="text" width="60px" />
          </div>
          <Skeleton variant="text" width="80%" className="mb-1" />
          <Skeleton variant="text" width="60%" height="14px" className="opacity-60" />
        </div>
      </div>
    </div>
  );
}

// Event skeleton component
export function EventSkeleton() {
  return (
    <div className="p-3 border-b border-border/5">
      <div className="flex items-start gap-3">
        <div className="w-1 h-full bg-primary/20 rounded" />
        <div className="flex-1">
          <Skeleton variant="text" width="70%" className="mb-2" />
          <div className="flex items-center gap-2 mb-1">
            <Skeleton variant="text" width="40px" height="12px" />
            <Skeleton variant="text" width="80px" height="12px" />
          </div>
          <Skeleton variant="text" width="120px" height="12px" className="opacity-60" />
        </div>
      </div>
    </div>
  );
}

// Card skeleton component
export function CardSkeleton() {
  return (
    <div className="p-4 border border-border/50 rounded-xl bg-card/60">
      <div className="flex items-center justify-between mb-3">
        <Skeleton variant="text" width="120px" />
        <Skeleton variant="circular" width={24} height={24} />
      </div>
      <Skeleton variant="rectangular" height="60px" className="mb-3" />
      <div className="flex items-center gap-2">
        <Skeleton variant="text" width="80px" height="14px" />
        <Skeleton variant="text" width="60px" height="14px" />
      </div>
    </div>
  );
}

// List skeleton with multiple items
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <EmailSkeleton key={i} />
      ))}
    </div>
  );
}