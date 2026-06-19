// src/pages/UsersPage.jsx
import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const UsersPage = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'user' });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get('/api/users', {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
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
      const res = await axios.post('/api/auth/register', formData, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      alert('User added!');
      setFormData({ username: '', email: '', password: '', role: 'user' });
      setUsers(prev => [...prev, res.data.user || {}]);
    } catch (err) {
      console.error(err);
      alert('Failed to add user.');
    }
  };

  if (user?.role !== 'admin') {
    return <p>Access Denied. Admins only.</p>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">User Management</h2>

      <form onSubmit={handleSubmit} className="mb-6 space-y-2">
        <input
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          className="border p-2 block w-full"
          required
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="border p-2 block w-full"
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className="border p-2 block w-full"
          required
        />
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="border p-2 block w-full"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="bg-blue-500 text-white py-2 px-4 rounded">
          Add User
        </button>
      </form>

      <h3 className="font-semibold mb-2">Existing Users:</h3>
      <ul>
        {users.map((u) => (
          <li key={u._id}>{u.username} ({u.email}) - {u.role}</li>
        ))}
      </ul>
    </div>
  );
};

export default UsersPage;
