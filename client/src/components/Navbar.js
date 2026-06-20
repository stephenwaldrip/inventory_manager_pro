import { Link, useLocation, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

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

  return (
    <div style={{
      width: '240px',
      backgroundColor: '#1e293b',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      flexShrink: 0,
      height: '100vh',
    }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: '#ffffff', fontSize: '16px', fontWeight: '700', lineHeight: '1.3' }}>
          📦 Inventory Manager Pro
        </h1>
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
    </div>
  );
};

export default Navbar;