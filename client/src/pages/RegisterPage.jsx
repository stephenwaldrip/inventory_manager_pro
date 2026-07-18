import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const RegisterPage = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    organizationName: '',
    name: '',
    username: '',
    email: '',
    password: '',
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const res = await fetch(apiUrl + '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        toast.success('Organization created!');
        navigate('/');
        window.location.reload();
      } else {
        toast.error(data.message || 'Registration failed');
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Server error');
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
        <h2 style={{ marginBottom: '8px', fontSize: '24px', fontWeight: 'bold', textAlign: 'center' }}>Create Your Organization</h2>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
          You'll be the administrator. Invite your team once you're in.
        </p>
        <form onSubmit={handleSubmit}>
          <input style={inputStyle} type="text" name="organizationName" placeholder="Organization Name" onChange={handleChange} required />
          <input style={inputStyle} type="text" name="name" placeholder="Your Full Name" onChange={handleChange} required />
          <input style={inputStyle} type="email" name="email" placeholder="Email" onChange={handleChange} required />
          <input style={inputStyle} type="password" name="password" placeholder="Password (min 8 characters)" onChange={handleChange} required minLength={8} />
          <button style={buttonStyle} type="submit">Create Organization</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#64748b' }}>
          Already have an account? <a href="/login" style={{ color: '#4f46e5' }}>Sign in</a>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;