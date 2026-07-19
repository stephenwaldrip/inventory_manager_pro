import { useState } from 'react';
import axios from '../utils/axiosInstance';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';

function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  // Invite links reuse this page and endpoint; only the wording differs, since
  // a new user isn't "resetting" anything.
  const [searchParams] = useSearchParams();
  const isInvite = searchParams.get('invite') === '1';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`/auth/reset-password/${token}`, { password });
      setMessage(res.data.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ marginBottom: '8px', fontSize: '24px', fontWeight: 'bold', textAlign: 'center' }}>
          {isInvite ? 'Set Your Password' : 'Reset Password'}
        </h2>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
          {isInvite
            ? 'Choose a password to activate your account.'
            : 'Enter your new password below.'}
        </p>

        {message && (
          <p style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '14px' }}>
            {message} Redirecting to login...
          </p>
        )}
        {error && (
          <p style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '14px' }}>
            {error}
          </p>
        )}

        <input
          style={inputStyle}
          placeholder={isInvite ? 'Password' : 'New Password'}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          style={inputStyle}
          placeholder={isInvite ? 'Confirm Password' : 'Confirm New Password'}
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <button style={buttonStyle} onClick={handleSubmit} disabled={loading}>
          {loading
            ? 'Saving...'
            : isInvite
              ? 'Set Password'
              : 'Reset Password'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#64748b' }}>
          <Link to="/login" style={{ color: '#4f46e5' }}>Back to Login</Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPasswordPage;