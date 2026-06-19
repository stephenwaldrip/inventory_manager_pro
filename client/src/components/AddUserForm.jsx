// src/components/AddUserForm.jsx
import { useState } from 'react';
import axios from 'axios';

const AddUserForm = ({ onUserAdded }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = JSON.parse(localStorage.getItem('user'))?.token;
      await axios.post(
        '/api/auth/register',
        { username, email, password, role },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUsername('');
      setEmail('');
      setPassword('');
      setRole('user');
      onUserAdded(); // Optional callback to refresh user list

    } catch (err) {
      console.error(err);
      alert('Failed to add user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleAddUser} className="p-4 bg-white rounded shadow-md mb-4">
      <h3 className="text-lg font-semibold mb-2">Add New User</h3>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
        className="block w-full border p-2 mb-2"
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="block w-full border p-2 mb-2"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="block w-full border p-2 mb-2"
        required
      />
      <select
        value={role}
        onChange={e => setRole(e.target.value)}
        className="block w-full border p-2 mb-4"
      >
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        disabled={loading}
      >
        {loading ? 'Creating...' : 'Add User'}
      </button>
    </form>
  );
};

export default AddUserForm;
