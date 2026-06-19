import { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AddUserPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user', // default role
  });

  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post('/api/users', formData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      alert('User added successfully!');
      navigate('/users');
    } catch (err) {
      console.error(err);
      alert('Failed to add user. Make sure you are an admin.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 border rounded shadow">
      <h2 className="text-xl font-bold mb-4">Add New User</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="username"
          placeholder="Username"
          className="block w-full p-2 mb-2 border"
          value={formData.username}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          className="block w-full p-2 mb-2 border"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          className="block w-full p-2 mb-2 border"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <select
          name="role"
          className="block w-full p-2 mb-4 border"
          value={formData.role}
          onChange={handleChange}
        >
          <option value="user">Standard User</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          Create User
        </button>
      </form>
    </div>
  );
};

export default AddUserPage;
