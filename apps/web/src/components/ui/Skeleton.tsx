import { cn } from '../../lib/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse-soft rounded-2xl bg-white/5', className)} aria-hidden="true" />;
}