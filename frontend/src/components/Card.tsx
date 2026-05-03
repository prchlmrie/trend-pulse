import type { HTMLAttributes, ReactNode } from 'react';
import './Card.css';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
  variant?: 'low' | 'lowest' | 'highest';
  padding?: 'normal' | 'none';
};

export function Card({
  children,
  className = '',
  variant = 'low',
  padding = 'normal',
  ...rest
}: CardProps) {
  const baseClass = 'predictive-card';
  const variantClass = `card-variant-${variant}`;
  const paddingClass = padding === 'none' ? '' : 'card-padding';

  return (
    <div className={`${baseClass} ${variantClass} ${paddingClass} ${className}`} {...rest}>
      {children}
    </div>
  );
}
