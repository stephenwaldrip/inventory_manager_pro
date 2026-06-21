import React, { useEffect, useState, useContext } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { AuthContext } from '../context/AuthContext';

const UsersPage = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'user' });
  const [editingUser, setEditingUser] = useState(null);
  const [resetUserId, setResetUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (['admin', 'superadmin'].includes(user?.role)) {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const res = await axiosInstance.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/auth/register', formData);
      setFormData({ name: '', email: '', password: '', role: 'user' });
      fetchUsers();
    } catch (err) {
      alert('Failed to add user.');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axiosInstance.put(`/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert('Failed to update role.');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await axiosInstance.delete(`/users/${userId}`);
      fetchUsers();
    } catch (err) {
      alert('Failed to delete user.');
    }
  };

  const handleEdit = (u) => {
    setEditingUser({ ...u });
  };

  const handleEditSave = async () => {
    try {
      await axiosInstance.put(`/users/${editingUser._id}`, {
        name: editingUser.name,
        email: editingUser.email,
      });
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      alert('Failed to update user.');
    }
  };

  const handleResetPassword = async (userId) => {
    if (!newPassword) return alert('Enter a new password.');
    try {
      await axiosInstance.put(`/users/${userId}/password`, { password: newPassword });
      setResetUserId(null);
      setNewPassword('');
      alert('Password reset successfully!');
    } catch (err) {
      alert('Failed to reset password.');
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      await axiosInstance.put(`/users/${userId}/status`);
      fetchUsers();
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  if (!['admin', 'superadmin'].includes(user?.role)) {
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
    padding: '6px 12px',
    backgroundColor: color,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
  });

  const roleBadge = (role) => {
    const styles = {
      superadmin: { backgroundColor: '#fef3c7', color: '#92400e' },
      admin: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
      user: { backgroundColor: '#f0fdf4', color: '#15803d' },
    };
    return {
      padding: '2px 10px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: '600',
      ...styles[role] || styles.user,
    };
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>Users</h1>
        <p style={{ color: '#64748b', marginTop: '4px' }}>Manage user accounts</p>
      </div>

      {/* Add User Form */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Add New User</h2>
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
          <button type="submit" style={{ ...btnStyle('#3b82f6'), padding: '8px 20px', fontSize: '14px' }}>+ Add User</button>
        </form>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', width: '400px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Edit User</h2>
            <input style={{ ...inputStyle, marginBottom: '12px' }} value={editingUser.name || ''} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} placeholder="Full Name" />
            <input style={{ ...inputStyle, marginBottom: '20px' }} value={editingUser.email || ''} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} placeholder="Email" />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleEditSave} style={btnStyle('#22c55e')}>Save</button>
              <button onClick={() => setEditingUser(null)} style={btnStyle('#94a3b8')}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetUserId && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', width: '400px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Reset Password</h2>
            <input style={{ ...inputStyle, marginBottom: '20px' }} type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => handleResetPassword(resetUserId)} style={btnStyle('#3b82f6')}>Reset</button>
              <button onClick={() => { setResetUserId(null); setNewPassword(''); }} style={btnStyle('#94a3b8')}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              {['Name', 'Email', 'Role', 'Status', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No users found.</td>
              </tr>
            ) : (
              users.map((u, i) => (
                <tr key={u._id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1e293b', borderBottom: '1px solid #e2e8f0' }}>👤 {u.name || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{u.email}</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                    {user?.role === 'superadmin' && u.role !== 'superadmin' ? (
                      <select value={u.role} onChange={(e) => handleRoleChange(u._id, e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span style={roleBadge(u.role)}>{u.role}</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: u.active === false ? '#fee2e2' : '#f0fdf4',
                      color: u.active === false ? '#dc2626' : '#15803d',
                    }}>
                      {u.active === false ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                    {u.role !== 'superadmin' && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button onClick={() => handleEdit(u)} style={btnStyle('#3b82f6')}>Edit</button>
                        <button onClick={() => setResetUserId(u._id)} style={btnStyle('#f59e0b')}>Reset PW</button>
                        <button onClick={() => handleToggleStatus(u._id)} style={btnStyle(u.active === false ? '#22c55e' : '#94a3b8')}>
                          {u.active === false ? 'Activate' : 'Suspend'}
                        </button>
                        <button onClick={() => handleDelete(u._id)} style={btnStyle('#ef4444')}>Delete</button>
                      </div>
                    )}
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