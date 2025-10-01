import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AdminAuthContext } from "../src/AdminAuthContext";

const AdminSignIn = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setAdminUser } = useContext(AdminAuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await axios.post("http://localhost:5555/api/admin/login", {
        username,
        password,
      });

      if (response.data.success) {
        setAdminUser({ 
  username, 
  loginTime: new Date().toISOString() 
}); // Set adminUser in context with timestamp// Set adminUser in context
        alert("Login Successful!");
        navigate("/usershowpage");
      } else {
        setError(response.data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError("Server error. Please try again.");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.background}></div>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.title}>Admin Sign In</h2>
        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.formGroup}>
          <label style={styles.label}>Username:</label>
          <input
            type="text"
            style={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
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
          />
        </div>

        <button type="submit" style={styles.button}>
          Sign In
        </button>
      </form>
    </div>
  );
};




// Same styles as before
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
    background: "url('https://source.unsplash.com/1600x900/?technology,abstract')",
    backgroundSize: "cover",
    filter: "blur(8px)",
    zIndex: 0,
  },
  form: {
    position: "relative",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: "30px",
    borderRadius: "12px",
    boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.3)",
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
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },
  button: {
    width: "100%",
    padding: "10px",
    backgroundColor: "#ff5e62",
    color: "white",
    border: "none",
    borderRadius: "5px",
    fontSize: "16px",
    cursor: "pointer",
    transition: "background 0.3s ease, transform 0.3s ease",
  },
  buttonHover: {
    backgroundColor: "#e04e50",
    transform: "scale(1.05)",
  },
  error: {
    color: "red",
    marginBottom: "10px",
  },
};

// Hover effect functions
const handleMouseEnter = (e) => {
  e.target.style.backgroundColor = styles.buttonHover.backgroundColor;
  e.target.style.transform = styles.buttonHover.transform;
};

const handleMouseLeave = (e) => {
  e.target.style.backgroundColor = styles.button.backgroundColor;
  e.target.style.transform = "scale(1)";
};

export default AdminSignIn;
