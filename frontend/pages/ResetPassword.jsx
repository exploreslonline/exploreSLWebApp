import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`http://localhost:5555/api/auth/reset-password/${token}`, { password });
      if (res.data.success) {
        setMessage('Password reset successful! Redirecting to login...');
        setTimeout(() => navigate('/signin'), 2000);
      } else {
        setMessage(res.data.message);
      }
    } catch (err) {
      setMessage('Something went wrong.');
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleReset} style={styles.form}>
        <h2>Reset Password</h2>
        {message && <p>{message}</p>}
        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />
        <button type="submit" style={styles.button}>Reset</button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh',
    background: 'linear-gradient(135deg,#ffecd2,#fcb69f)',
  },
  form: {
    backgroundColor: '#fff', padding: '30px', borderRadius: '10px',
    boxShadow: '0 0 10px rgba(0,0,0,0.2)', width: '300px', textAlign: 'center'
  },
  input: {
    width: '100%', padding: '10px', marginBottom: '15px',
    border: '1px solid #ccc', borderRadius: '5px',
  },
  button: {
    width: '100%', padding: '10px', backgroundColor: '#2ecc71',
    color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer',
  },
};

export default ResetPassword;
