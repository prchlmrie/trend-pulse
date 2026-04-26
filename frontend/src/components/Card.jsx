import React from 'react';
import './Card.css';

export function Card({ children, className = '', variant = 'low', padding = 'normal' }) {
  const baseClass = 'predictive-card';
  const variantClass = `card-variant-${variant}`; // 'low' or 'lowest' or 'highest'
  const paddingClass = padding === 'none' ? '' : 'card-padding';
  
  return (
    <div className={`${baseClass} ${variantClass} ${paddingClass} ${className}`}>
      {children}
    </div>
  );
}
