import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

function DashboardPage() {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">📋 Dashboard</h1>

      <div className="grid grid-cols-2 gap-4">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded shadow"
          onClick={() => navigate('/materials')}
        >
          Materials
        </button>
        <button
          className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded shadow"
          onClick={() => navigate('/locations')}
        >
          Locations
        </button>
        <button
          className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded shadow"
          onClick={() => navigate('/users')}
        >
          Users
        </button>
        <button
          className="bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded shadow"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default DashboardPage;
