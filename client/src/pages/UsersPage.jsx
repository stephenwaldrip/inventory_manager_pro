import React, { useEffect, useState, useContext } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { AuthContext } from '../context/AuthContext';

const UsersPage = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'user' });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axiosInstance.get('/users');
        setUsers(res.data);
      } catch (err) {
        console.error('Failed to fetch users', err);
      }
    };

    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axiosInstance.post('/auth/register', formData);
      setFormData({ name: '', email: '', password: '', role: 'user' });
      setUsers(prev => [...prev, res.data.user || {}]);
    } catch (err) {
      console.error(err);
      alert('Failed to add user.');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444', fontSize: '18px' }}>
        Access Denied. Admins only.
      </div>
    );
  }

  const inputStyle = {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  const btnStyle = (color) => ({
    padding: '8px 16px',
    backgroundColor: color,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  });

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>Users</h1>
        <p style={{ color: '#64748b', marginTop: '4px' }}>Manage user accounts</p>
      </div>

      {/* Add User Form */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>
          Add New User
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <input style={inputStyle} name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} required />
            <input style={inputStyle} name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
            <input style={inputStyle} name="password" type="password" placeholder="Password" value={formData.password} onChange={handleChange} required />
            <select style={inputStyle} name="role" value={formData.role} onChange={handleChange}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" style={btnStyle('#3b82f6')}>+ Add User</button>
        </form>
      </div>

      {/* Users Table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              {['Name', 'Email', 'Role'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u, i) => (
                <tr key={u._id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1e293b', borderBottom: '1px solid #e2e8f0' }}>👤 {u.name || u.username || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{u.email}</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: u.role === 'admin' ? '#dbeafe' : '#f0fdf4',
                      color: u.role === 'admin' ? '#1d4ed8' : '#15803d',
                    }}>
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersPage;