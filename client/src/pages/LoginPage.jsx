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
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: 'bold', textAlign: 'center' }}>Welcome Back</h2>
        <input style={inputStyle} placeholder="Email" type="email" onChange={(e) => setEmail(e.target.value)} />
        <input style={inputStyle} placeholder="Password" type="password" onChange={(e) => setPassword(e.target.value)} />
        <button style={buttonStyle} onClick={handleLogin}>Login</button>
        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#64748b' }}>
          Don't have an account? <Link to="/register" style={{ color: '#4f46e5' }}>Register</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;