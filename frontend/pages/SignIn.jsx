import React, { useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../src/AuthContext"; // Adjust path as needed

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();

  // Get login function from AuthContext
  const { login } = useContext(AuthContext);

  const adminlogin = () => {
    navigate("/adminsignin");
  };

  // REPLACE the handleSubmit function in your SignIn.js component with this:
// REPLACE your handleSubmit function in your Login component with this:

const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setIsLoggingIn(true);

  try {
    const response = await axios.post("http://localhost:5555/api/auth/login", {
      email,
      password,
    });

    if (response.data.success) {
      // Create user object with available data
      const userData = {
        email: email,
        status: response.data.status,
        firstName: response.data.user?.firstName || '',
        lastName: response.data.user?.lastName || '',
        phone: response.data.user?.phone || '',
        userId: response.data.user?.userId || response.data.user?._id,
        _id: response.data.user?._id,
        // Include all user data from response
        ...response.data.user
      };

      console.log('🔐 Login successful, processing server response...');
      console.log('Server response:', {
        subscriptionStatus: response.data.subscriptionStatus,
        redirectTo: response.data.redirectTo,
        hasSubscription: !!response.data.subscription
      });

      // ✅ Use the enhanced login function from AuthContext with server response
      const subscriptionResult = await login(userData, {
        subscriptionStatus: response.data.subscriptionStatus,
        redirectTo: response.data.redirectTo,
        subscription: response.data.subscription
      });

      console.log('📊 Final subscription result:', subscriptionResult);

      // SUCCESS MESSAGE
      alert("Login Successful!");

      // ✅ FIXED ROUTING: Use server's redirect instruction
      if (response.data.redirectTo === 'business-profile') {
        console.log('➡️  Redirecting to Business Profile (user has active subscription)');
        navigate("/Business-Profile");
      } else {
        // All non-activated users (including newly registered) go to subscription page
        console.log('➡️  Redirecting to Subscription Page (non-activated user)');
        navigate("/SubscriptionPage");
      }

    } else {
      setError(response.data.message);
    }
  } catch (error) {
    setError("Invalid login credentials");
    console.error("❌ Login Error:", error);
  } finally {
    setIsLoggingIn(false);
  }
};

  return (
    <div style={styles.container}>
      <div style={styles.background}></div>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.title}>Sign In</h2>
        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.formGroup}>
          <label style={styles.label}>Email:</label>
          <input
            type="email"
            style={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoggingIn}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Password:</label>
          <input
            type="password"
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoggingIn}
          />
        </div>

        <button
          type="submit"
          style={{
            ...styles.button,
            ...(isLoggingIn ? styles.buttonDisabled : {})
          }}
          disabled={isLoggingIn}
        >
          {isLoggingIn ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={styles.spinner}></div>
              Signing In...
            </div>
          ) : (
            'Log In'
          )}
        </button>

        <a href="/register" style={styles.link}>Sign Up</a>
        <a href="/forgot-password" style={{ color: 'blue' }}>forgot password</a>

        {/* ADD ADMIN LOGIN BUTTON */}
        {/* <button 
          type="button"
          onClick={adminlogin}
          style={styles.adminButton}
          disabled={isLoggingIn}
        >
          Admin Login
        </button> */}
      </form>
    </div>
  );
};

// Styles remain the same...
const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    position: "relative",
    overflow: "hidden",
    background: "linear-gradient(135deg,rgb(136, 199, 225),rgb(172, 166, 166))",
  },
  background: {
    position: "absolute",
    width: "100%",
    height: "100%",
    top: 0,
    left: 0,
    background: "url('https://source.unsplash.com/1600x900/?abstract,technology')",
    backgroundSize: "cover",
    filter: "blur(8px)",
    zIndex: 0,
  },
  link: {
    color: "#ff4d4d",
    fontSize: "16px",
    display: "block",
    marginTop: "10px",
    textDecoration: "none",
    fontWeight: "bold",
    border: '1px solid blue',
    padding: '10px 20px',
  },
  form: {
    position: "relative",
    backgroundColor: "rgba(245, 240, 240, 0.85)",
    padding: "30px",
    borderRadius: "12px",
    boxShadow: "0px 4px 20px rgba(30, 26, 26, 0.2)",
    width: "350px",
    textAlign: "center",
    zIndex: 1,
    animation: "fadeIn 0.8s ease-in-out",
  },
  title: {
    marginBottom: "20px",
    color: "#333",
    fontSize: "24px",
    fontWeight: "bold",
  },
  formGroup: {
    marginBottom: "15px",
    textAlign: "left",
  },
  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: "bold",
    color: "#555",
  },
  input: {
    width: "100%",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "5px",
    fontSize: "16px",
    marginTop: "5px",
    transition: "0.3s",
    backgroundColor: "rgba(247, 245, 251, 0.7)",
  },
  button: {
    width: "100%",
    padding: "10px",
    backgroundColor: "rgba(35, 115, 206, 0.7)",
    color: "white",
    border: "none",
    borderRadius: "5px",
    fontSize: "16px",
    cursor: "pointer",
    transition: "background 0.3s ease",
    marginBottom: "10px",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
    backgroundColor: "#ccc",
  },
  adminButton: {
    width: "100%",
    padding: "10px",
    backgroundColor: "rgba(108, 117, 125, 0.8)",
    color: "white",
    border: "none",
    borderRadius: "5px",
    fontSize: "14px",
    cursor: "pointer",
    marginTop: "15px",
    transition: "background 0.3s ease",
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #ffffff',
    borderTop: '2px solid transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '8px',
  },
  buttonHover: {
    backgroundColor: "#e04e50",
  },
  error: {
    color: "red",
    marginBottom: "10px",
  },
};

// Add CSS animation for spinner
const styleSheet = document.styleSheets[0];
if (styleSheet) {
  try {
    styleSheet.insertRule(`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `, styleSheet.cssRules.length);
  } catch (e) {
    // Ignore if rule already exists
  }
}

export default SignIn;