import { useEffect, useRef, useState } from 'react';
import axios from '../utils/axiosInstance';
import { useParams, Link } from 'react-router-dom';

function VerifyEmailPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');
  // StrictMode double-invokes effects in development; the token is single-use,
  // so a second call would fail and show an error after a real success.
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    axios
      .post(`/auth/verify-email/${token}`)
      .then(() => setStatus('verified'))
      .catch((err) => {
        setError(err.response?.data?.message || 'Something went wrong');
        setStatus('failed');
      });
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        {status === 'verifying' && (
          <p style={{ color: '#64748b', fontSize: '14px' }}>Confirming your email address…</p>
        )}

        {status === 'verified' && (
          <>
            <h2 style={{ marginBottom: '8px', fontSize: '24px', fontWeight: 'bold' }}>Email confirmed</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
              Your account is fully set up. You can now invite your team.
            </p>
          </>
        )}

        {status === 'failed' && (
          <>
            <h2 style={{ marginBottom: '8px', fontSize: '24px', fontWeight: 'bold' }}>Link didn't work</h2>
            <p style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '14px' }}>
              {error}
            </p>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
              Sign in and use the banner at the top to send yourself a new link.
            </p>
          </>
        )}

        <Link to="/login" style={{ color: '#4f46e5', fontSize: '14px' }}>Go to Login</Link>
      </div>
    </div>
  );
}

export default VerifyEmailPage;
