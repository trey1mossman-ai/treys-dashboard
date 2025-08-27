import { ReactNode } from 'react';

interface InfoPillProps {
  label: string;
  children: ReactNode;
  type?: 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function InfoPill({ label, children, type = 'primary', className = '' }: InfoPillProps) {
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          border: '2px solid var(--success-500)',
          boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)'
        };
      case 'warning':
        return {
          border: '2px solid var(--warn-500)',
          boxShadow: '0 0 15px rgba(245, 158, 11, 0.2)'
        };
      case 'danger':
        return {
          border: '2px solid var(--error-500)',
          boxShadow: '0 0 15px rgba(239, 68, 68, 0.2)'
        };
      default:
        return {
          border: '2px solid var(--accent-500)',
          boxShadow: '0 0 15px rgba(96, 165, 250, 0.2)'
        };
    }
  };

  return (
    <div 
      className={`info-pill ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-2) var(--space-3)',
        background: 'rgba(15, 23, 42, 0.9)',
        borderRadius: 'var(--radius-medium)',
        fontFamily: 'Georgia, serif',
        ...getTypeStyles()
      }}
    >
      <span style={{
        fontSize: 'var(--font-body)',
        color: '#e2e8f0',
        fontWeight: 500
      }}>
        {label}:
      </span>
      {children}
    </div>
  );
}

interface ProgressPillProps {
  label: string;
  value: number;
  unit?: string;
  type?: 'primary' | 'success' | 'warning' | 'danger';
}

export function ProgressPill({ label, value, unit = '%', type = 'primary' }: ProgressPillProps) {
  const getProgressColor = () => {
    switch (type) {
      case 'success': return 'var(--success-500)';
      case 'warning': return 'var(--warn-500)';
      case 'danger': return 'var(--error-500)';
      default: return 'var(--accent-500)';
    }
  };

  return (
    <InfoPill label={label} type={type}>
      <div style={{
        width: '80px',
        height: '5px',
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '3px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div style={{
          height: '100%',
          background: getProgressColor(),
          width: `${value}%`,
          borderRadius: '3px',
          boxShadow: `0 0 6px ${getProgressColor()}40`
        }} />
      </div>
      <span style={{
        color: '#93c5fd',
        fontSize: 'var(--font-body)',
        fontWeight: 600,
        fontFamily: 'Georgia, monospace'
      }}>
        {value}{unit}
      </span>
    </InfoPill>
  );
}