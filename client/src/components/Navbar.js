import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setIsOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar when navigating on mobile. Deliberately keyed on the path
  // alone: adding isMobile would also fire this on every breakpoint crossing,
  // which handleResize above already covers.
  useEffect(() => {
    if (isMobile) setIsOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/materials', label: 'Materials', icon: '🧱' },
    { path: '/locations', label: 'Locations', icon: '📍' },
    { path: '/categories', label: 'Categories', icon: '🗂️' },
    { path: '/users', label: 'Users', icon: '👥' },
    { path: '/billing', label: 'Billing', icon: '💳' },
  ];

  const linkStyle = (path) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 16px',
    borderRadius: '8px',
    textDecoration: 'none',
    color: location.pathname === path ? '#ffffff' : '#94a3b8',
    backgroundColor: location.pathname === path ? '#3b82f6' : 'transparent',
    marginBottom: '4px',
    fontSize: '14px',
    fontWeight: location.pathname === path ? '600' : '400',
  });

  const sidebarContent = (
    <>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: '#ffffff', fontSize: '16px', fontWeight: '700', lineHeight: '1.3' }}>
          📦 Inventory Manager Pro
        </h1>
        {isMobile && (
          <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        )}
      </div>

      <nav style={{ flex: 1 }}>
        {navItems.map((item) => (
          <Link key={item.path} to={item.path} style={linkStyle(item.path)}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div style={{ borderTop: '1px solid #334155', paddingTop: '16px' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Hamburger button - mobile only */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            zIndex: 1000,
            backgroundColor: '#1e293b',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '20px',
            cursor: 'pointer',
          }}
        >
          ☰
        </button>
      )}

      {/* Overlay - mobile only */}
      {isMobile && isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 998,
          }}
        />
      )}

      {/* Sidebar */}
      <div style={{
        width: '240px',
        backgroundColor: '#1e293b',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        flexShrink: 0,
        height: '100vh',
        position: isMobile ? 'fixed' : 'relative',
        left: isMobile ? (isOpen ? '0' : '-240px') : '0',
        top: 0,
        zIndex: 999,
        transition: 'left 0.3s ease',
      }}>
        {sidebarContent}
      </div>
    </>
  );
};

export default Navbar;