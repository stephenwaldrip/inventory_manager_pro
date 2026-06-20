import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const cards = [
    { label: 'Materials', icon: '🧱', path: '/materials', color: '#3b82f6' },
    { label: 'Locations', icon: '📍', path: '/locations', color: '#22c55e' },
    { label: 'Categories', icon: '🗂️', path: '/categories', color: '#f59e0b' },
    { label: 'Users', icon: '👥', path: '/users', color: '#8b5cf6' },
  ];

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>Dashboard</h1>
        <p style={{ color: '#64748b', marginTop: '4px' }}>
          Welcome back, {user?.email || 'Admin'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        {cards.map((card) => (
          <div
            key={card.path}
            onClick={() => navigate(card.path)}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderLeft: `4px solid ${card.color}`,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>{card.icon}</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>{card.label}</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>View all →</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;