import { useState, useContext } from 'react';
import axios from '../utils/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

function LoginPage() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const res = await axios.post('/auth/login', { email, password });
      login(res.data.token);
      navigate('/');
    } catch (err) {
      alert('Login failed: ' + err.message);
    }
  };

  const handleDemoLogin = async () => {
    try {
      const res = await axios.post('/auth/login', {
        email: 'demo@inventorymanagerpro.com',
        password: 'Demo1234!',
      });
      login(res.data.token);
      navigate('/');
    } catch (err) {
      alert('Demo login failed. Please try again.');
    }
  };

  const inputStyle = {
    display: 'block',
    width: '100%',
    padding: '10px 12px',
    marginBottom: '12px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  const buttonStyle = {
    width: '100%',
    padding: '10px',
    backgroundColor: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
    marginBottom: '10px',
  };

  const demoButtonStyle = {
    width: '100%',
    padding: '10px',
    backgroundColor: 'white',
    color: '#4f46e5',
    border: '2px solid #4f46e5',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
    marginBottom: '10px',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ marginBottom: '8px', fontSize: '24px', fontWeight: 'bold', textAlign: 'center' }}>Welcome Back</h2>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
          Sign in to Inventory Manager Pro
        </p>

        <input
          style={inputStyle}
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          style={inputStyle}
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button style={buttonStyle} onClick={handleLogin}>Login</button>

        <p style={{ textAlign: 'right', marginTop: '-6px', marginBottom: '12px', fontSize: '13px' }}>
          <Link to="/forgot-password" style={{ color: '#4f46e5', textDecoration: 'none' }}>
            Forgot password?
          </Link>
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
          <span style={{ color: '#94a3b8', fontSize: '12px' }}>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
        </div>

        <button style={demoButtonStyle} onClick={handleDemoLogin}>
          🎮 Try Demo Account
        </button>

        <p style={{ textAlign: 'center', marginTop: '8px', fontSize: '12px', color: '#94a3b8' }}>
          Demo credentials: demo@inventorymanagerpro.com
        </p>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#64748b' }}>
          Don't have an account? <Link to="/register" style={{ color: '#4f46e5' }}>Register</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;