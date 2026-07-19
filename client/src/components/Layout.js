import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import SubscriptionBanner from './SubscriptionBanner';

const Layout = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc' }}>
      <Navbar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: isMobile ? '64px' : '24px',
        }}>
          <SubscriptionBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;