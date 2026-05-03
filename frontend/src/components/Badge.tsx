import type { ReactNode } from 'react';
import './Badge.css';

type BadgeProps = {
  children: ReactNode;
  type?: string;
  className?: string;
};

export function Badge({ children, type = 'default', className = '' }: BadgeProps) {
  return <span className={`predictive-badge badge-${type.toLowerCase()} ${className}`}>{children}</span>;
}
