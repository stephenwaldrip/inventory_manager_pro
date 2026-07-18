import { useNavigate } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import axiosInstance from '../utils/axiosInstance';
import { useToast } from '../context/ToastContext';

function DashboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useContext(AuthContext);
  const [activities, setActivities] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '', pinned: false });
  const [showForm, setShowForm] = useState(false);
  const [stats, setStats] = useState({ materials: 0, locations: 0, categories: 0, users: 0 });

  useEffect(() => {
    fetchActivities();
    fetchAnnouncements();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [materials, locations, categories, users] = await Promise.all([
        axiosInstance.get('/materials'),
        axiosInstance.get('/locations'),
        axiosInstance.get('/categories'),
        axiosInstance.get('/users'),
      ]);
      setStats({
        materials: materials.data.length,
        locations: locations.data.length,
        categories: categories.data.length,
        users: users.data.length,
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await axiosInstance.get('/activity');
      setActivities(res.data);
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await axiosInstance.get('/announcements');
      setAnnouncements(res.data);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    }
  };

  const handlePostAnnouncement = async () => {
    try {
      await axiosInstance.post('/announcements', newAnnouncement);
      setNewAnnouncement({ title: '', message: '', pinned: false });
      setShowForm(false);
      fetchAnnouncements();
      toast.success('Announcement posted.');
    } catch (err) {
      toast.error('Failed to post announcement.');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      await axiosInstance.delete(`/announcements/${id}`);
      fetchAnnouncements();
      toast.success('Announcement deleted.');
    } catch (err) {
      toast.error('Failed to delete announcement.');
    }
  };

  const activityIcon = (type) => {
    const icons = {
      material_added: '🧱',
      material_updated: '✏️',
      material_deleted: '🗑️',
      user_login: '🔐',
      user_added: '👤',
      low_inventory: '⚠️',
    };
    return icons[type] || '📋';
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const cards = [
    { label: 'Materials', icon: '🧱', path: '/materials', color: '#3b82f6', count: stats.materials },
    { label: 'Locations', icon: '📍', path: '/locations', color: '#22c55e', count: stats.locations },
    { label: 'Categories', icon: '🗂️', path: '/categories', color: '#f59e0b', count: stats.categories },
    { label: 'Users', icon: '👥', path: '/users', color: '#8b5cf6', count: stats.users },
  ];

  const inputStyle = {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    marginBottom: '10px',
  };

  const isAdmin = ['admin', 'superadmin'].includes(user?.role);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>Dashboard</h1>
        <p style={{ color: '#64748b', marginTop: '4px' }}>Welcome back, {user?.email || 'Admin'}</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
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
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '32px' }}>{card.icon}</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: card.color }}>{card.count}</div>
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginTop: '12px' }}>{card.label}</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>View all →</div>
          </div>
        ))}
      </div>

      {/* Bottom two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

        {/* Announcements */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>📢 Announcements</h2>
            {isAdmin && (
              <button
                onClick={() => setShowForm(!showForm)}
                style={{ padding: '6px 12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
              >
                + Post
              </button>
            )}
          </div>

          {showForm && isAdmin && (
            <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <input style={inputStyle} placeholder="Title" value={newAnnouncement.title} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} />
              <textarea
                style={{ ...inputStyle, height: '80px', resize: 'vertical' }}
                placeholder="Message"
                value={newAnnouncement.message}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <input type="checkbox" id="pinned" checked={newAnnouncement.pinned} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, pinned: e.target.checked })} />
                <label htmlFor="pinned" style={{ fontSize: '13px', color: '#64748b' }}>Pin this announcement</label>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handlePostAnnouncement} style={{ padding: '8px 16px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Post</button>
                <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', backgroundColor: '#94a3b8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {announcements.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>No announcements yet.</p>
            ) : (
              announcements.map((ann) => (
                <div key={ann._id} style={{ padding: '12px', backgroundColor: ann.pinned ? '#fef3c7' : '#f8fafc', borderRadius: '8px', borderLeft: `3px solid ${ann.pinned ? '#f59e0b' : '#3b82f6'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>
                        {ann.pinned && '📌 '}{ann.title}
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{ann.message}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>Posted by {ann.postedBy} · {timeAgo(ann.createdAt)}</div>
                    </div>
                    {isAdmin && (
                      <button onClick={() => handleDeleteAnnouncement(ann._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '16px' }}>✕</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '16px' }}>⚡ What's New</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activities.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>No recent activity.</p>
            ) : (
              activities.map((act) => (
                <div key={act._id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{activityIcon(act.type)}</span>
                  <div>
                    <div style={{ fontSize: '13px', color: '#1e293b' }}>{act.message}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{act.user} · {timeAgo(act.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default DashboardPage;