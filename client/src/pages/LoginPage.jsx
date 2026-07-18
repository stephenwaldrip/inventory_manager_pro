import { useState, useContext } from 'react';
import axios from '../utils/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate, Link } from 'react-router-dom';

function LoginPage() {
  const { login } = useContext(AuthContext);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!email.trim() || !password) {
      toast.error('Please enter your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post('/auth/login', { email, password });
      login(res.data.token);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid email or password.');
      setSubmitting(false);
    }
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
  };

  const inputStyle = {
    display: 'block',
    width: '100%',
    padding: '10px 12px',
    marginBottom: '16px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  const buttonStyle = {
    width: '100%',
    padding: '10px',
    backgroundColor: submitting ? '#a5a1e8' : '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: submitting ? 'not-allowed' : 'pointer',
    marginBottom: '10px',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', padding: '16px', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ marginTop: 0, marginBottom: '8px', fontSize: '24px', fontWeight: 'bold', textAlign: 'center' }}>Welcome Back</h1>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
          Sign in to Inventory Manager Pro
        </p>

        <form onSubmit={handleLogin} noValidate>
          <label htmlFor="email" style={labelStyle}>Email</label>
          <input
            id="email"
            name="email"
            style={inputStyle}
            placeholder="Email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <Link
              to="/forgot-password"
              style={{ color: '#4f46e5', textDecoration: 'none', fontSize: '13px', padding: '4px 0' }}
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            style={inputStyle}
            placeholder="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" style={buttonStyle} disabled={submitting}>
            {submitting ? 'Signing in…' : 'Login'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '16px', marginBottom: 0, fontSize: '14px', color: '#64748b' }}>
          Don't have an account? <Link to="/register" style={{ color: '#4f46e5' }}>Create an organization</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
