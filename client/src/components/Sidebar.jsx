// src/components/Sidebar.jsx
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Sidebar = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="w-64 bg-gray-800 text-white p-4">
      <h2 className="text-2xl font-bold mb-6">Inventory Manager Pro</h2>
      <ul>
        <li className="mb-2"><Link to="/">Dashboard</Link></li>
        <li className="mb-2"><Link to="/materials">Materials</Link></li>
        <li className="mb-2"><Link to="/locations">Locations</Link></li>
        <li className="mb-2"><Link to="/categories">Categories</Link></li>
        <li className="mb-2"><Link to="/users">Users</Link></li>

        {user?.role === 'admin' && (
          <li className="mb-2"><Link to="/add-user">Add User</Link></li> // ✅ Admin only
        )}

        <li className="mt-6 text-sm text-gray-400">
          Logged in as: {user?.username || 'Guest'} ({user?.role || 'none'})
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
