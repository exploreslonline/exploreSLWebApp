// src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import axios from 'axios';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const response = await axios.post('http://localhost:5555/api/auth/forgot-password', { email });
      if (response.data.success) {
        setMessage('Password reset link sent to your email.');
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('Something went wrong. Try again.');
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.title}>Forgot Password</h2>
        {message && <p style={styles.success}>{message}</p>}
        {error && <p style={styles.error}>{error}</p>}
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />
        <button type="submit" style={styles.button}>Send Reset Link</button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh',
    background: 'linear-gradient(135deg,#a1c4fd,#c2e9fb)',
  },
  form: {
    backgroundColor: '#fff', padding: '30px', borderRadius: '10px',
    boxShadow: '0 0 10px rgba(0,0,0,0.2)', width: '300px', textAlign: 'center'
  },
  title: { fontSize: '20px', marginBottom: '20px' },
  input: {
    width: '100%', padding: '10px', marginBottom: '15px',
    border: '1px solid #ccc', borderRadius: '5px',
  },
  button: {
    width: '100%', padding: '10px', backgroundColor: '#3498db',
    color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer',
  },
  success: { color: 'green', marginBottom: '10px' },
  error: { color: 'red', marginBottom: '10px' },
};

export default ForgotPassword;
