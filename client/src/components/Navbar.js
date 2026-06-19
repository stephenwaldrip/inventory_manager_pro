// src/components/Navbar.js
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="bg-blue-700 text-white px-6 py-3 flex justify-between items-center shadow">
      <div className="space-x-4">
        <Link to="/" className="hover:underline">🏠 Dashboard</Link>
        <Link to="/materials" className="hover:underline">📦 Materials</Link>
        <Link to="/users" className="hover:underline">👥 Users</Link>
        <Link to="/locations" className="hover:underline">📍 Locations</Link>
        <Link to="/categories" className="hover:underline">🗂 Categories</Link>
      </div>
      <button onClick={handleLogout} className="bg-red-600 px-3 py-1 rounded hover:bg-red-700">
        Logout
      </button>
    </nav>
  );
};

export default Navbar;
