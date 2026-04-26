import React from 'react';
import './PulseIndicator.css';

export function PulseIndicator({ size = 'medium' }) {
  return (
    <div className={`pulse-container pulse-${size}`}>
      <div className="pulse-dot"></div>
      <div className="pulse-ring"></div>
    </div>
  );
}
