import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MaterialsPage from './pages/MaterialsPage';
import UsersPage from './pages/UsersPage';
import LocationsPage from './pages/LocationsPage';
import CategoriesPage from './pages/CategoriesPage';
import DashboardPage from './pages/DashboardPage';
import LandingPage from './pages/LandingPage';
import Layout from './components/Layout.js';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import BillingPage from './pages/BillingPage';
import InventoryReport from './pages/InventoryReport';
import InstallPrompt from './components/InstallPrompt';

const PrivateRoute = ({ element }) => {
  const { isAuthenticated } = useContext(AuthContext);
  return isAuthenticated ? element : <Navigate to="/login" />;
};

// Public route that bounces logged-in users to their dashboard
const PublicRoute = ({ element }) => {
  const { isAuthenticated } = useContext(AuthContext);
  return isAuthenticated ? <Navigate to="/dashboard" /> : element;
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <InstallPrompt />
        <Router>
          <Routes>
            <Route path="/" element={<PublicRoute element={<LandingPage />} />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route path="/verify-email/:token" element={<VerifyEmailPage />} />

            <Route element={<Layout />}>
              <Route path="/dashboard" element={<PrivateRoute element={<DashboardPage />} />} />
              <Route path="/materials" element={<PrivateRoute element={<MaterialsPage />} />} />
              <Route path="/users" element={<PrivateRoute element={<UsersPage />} />} />
              <Route path="/locations" element={<PrivateRoute element={<LocationsPage />} />} />
              <Route path="/categories" element={<PrivateRoute element={<CategoriesPage />} />} />
              <Route path="/billing" element={<PrivateRoute element={<BillingPage />} />} />
              <Route path="/reports" element={<PrivateRoute element={<InventoryReport />} />} />
            </Route>
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;