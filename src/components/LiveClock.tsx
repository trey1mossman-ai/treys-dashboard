import { useState, useEffect } from 'react';

export function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="live-clock" style={{
      fontFamily: 'Georgia, serif',
      textAlign: 'center',
      padding: '0.75rem 1.25rem',
      background: 'rgba(15, 23, 42, 0.95)',
      borderRadius: '12px',
      border: '2px solid var(--accent-500)',
      boxShadow: '0 0 20px rgba(96, 165, 250, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    }}>
      <div style={{
        fontSize: 'clamp(18px, 2.5vw, 24px)',
        fontWeight: 600,
        color: '#ffffff',
        letterSpacing: '0.05em',
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
      }}>
        {formatTime(time)}
      </div>
      <div style={{
        fontSize: 'clamp(12px, 1.5vw, 14px)',
        color: '#e2e8f0',
        marginTop: '0.25rem',
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
      }}>
        {formatDate(time)}
      </div>
    </div>
  );
}