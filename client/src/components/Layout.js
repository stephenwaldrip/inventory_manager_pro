import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import SubscriptionBanner from './SubscriptionBanner';

const SUPPORT_EMAIL = 'support@rhyamtechco.com';

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

          <footer style={{
            marginTop: '48px',
            paddingTop: '16px',
            borderTop: '1px solid #e2e8f0',
            fontSize: '13px',
            color: '#94a3b8',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            <span>Inventory Manager Pro</span>
            
              href={`mailto:${SUPPORT_EMAIL}?subject=Inventory%20Manager%20Pro%20support`}
              style={{ color: '#64748b', textDecoration: 'none' }}
            >
              Need help? Contact support
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Layout;