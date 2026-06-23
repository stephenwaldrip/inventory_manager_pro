import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MaterialsPage from './pages/MaterialsPage';
import UsersPage from './pages/UsersPage';
import LocationsPage from './pages/LocationsPage';
import CategoriesPage from './pages/CategoriesPage';
import DashboardPage from './pages/DashboardPage';
import Layout from './components/Layout.js';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  const PrivateRoute = ({ element }) => {
    return isAuthenticated ? element : <Navigate to="/login" />;
  };

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

          <Route element={<Layout />}>
            <Route path="/" element={<PrivateRoute element={<DashboardPage />} />} />
            <Route path="/materials" element={<PrivateRoute element={<MaterialsPage />} />} />
            <Route path="/users" element={<PrivateRoute element={<UsersPage />} />} />
            <Route path="/locations" element={<PrivateRoute element={<LocationsPage />} />} />
            <Route path="/categories" element={<PrivateRoute element={<CategoriesPage />} />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;