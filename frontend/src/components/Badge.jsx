import React from 'react';
import './Badge.css';

export function Badge({ children, type = 'default', className = '' }) {
  // Types: sell, test, ignore, emerging, growing, peaking, declining
  return (
    <span className={`predictive-badge badge-${type.toLowerCase()} ${className}`}>
      {children}
    </span>
  );
}
