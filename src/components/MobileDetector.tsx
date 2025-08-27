import { useEffect, useState } from 'react';
import { MobileOnlyDashboard } from '@/pages/MobileOnlyDashboard';

interface MobileDetectorProps {
  children: React.ReactNode;
}

export function MobileDetector({ children }: MobileDetectorProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      try {
        // Check multiple mobile indicators
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        const screenWidth = window.innerWidth <= 768;
        const touchDevice = 'ontouchstart' in window;
        
        // More aggressive mobile detection
        const mobileDevice = mobileUA || screenWidth || touchDevice;
        
        console.log('Mobile Detection:', {
          userAgent: mobileUA,
          screenWidth: screenWidth,
          touchDevice: touchDevice,
          finalResult: mobileDevice,
          windowWidth: window.innerWidth
        });
        
        setIsMobile(mobileDevice);
        setIsLoading(false);
      } catch (error) {
        console.error('Mobile detection error:', error);
        // Default to desktop on error
        setIsMobile(false);
        setIsLoading(false);
      }
    };

    // Check immediately
    checkMobile();
    
    // Check on resize
    const handleResize = () => {
      const screenWidth = window.innerWidth <= 768;
      if (screenWidth !== isMobile && !isLoading) {
        checkMobile();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile, isLoading]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0a0e1a',
        color: '#f0f4ff',
        fontFamily: 'Georgia, serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '18px', 
            marginBottom: '8px',
            color: '#00d4ff'
          }}>
            Loading...
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#94a3b8'
          }}>
            Optimizing for your device
          </div>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return <MobileOnlyDashboard />;
  }

  return <>{children}</>;
}