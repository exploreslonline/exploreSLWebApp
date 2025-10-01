import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const user = { email: "admin@example.com" }; // Dummy user for testing

  useEffect(() => {
    if (!user) {
      navigate("/signin"); // Redirect guest users to sign-in page
    }
  }, [user, navigate]);

  if (!user) return null; // Prevent UI from rendering before redirect

  const styles = {
    container: {
      display: "flex",
      height: "100vh",
      background: "linear-gradient(to right, #1e3c72, #2a5298)",
      color: "#fff",
      fontFamily: "Arial, sans-serif",
    },
    sidebar: {
      width: "250px",
      background: "#222",
      padding: "20px",
      boxShadow: "2px 0 10px rgba(0,0,0,0.2)",
      transition: "all 0.3s ease",
    },
    sidebarItem: {
      padding: "15px",
      margin: "10px 0",
      background: "#444",
      cursor: "pointer",
      borderRadius: "5px",
      textAlign: "center",
      transition: "background 0.3s ease",
    },
    sidebarItemHover: {
      background: "#666",
    },
    mainContent: {
      flex: 1,
      padding: "40px",
      textAlign: "center",
      animation: "fadeIn 0.8s ease-in-out",
    },
    cardContainer: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "20px",
      marginTop: "30px",
    },
    card: {
      background: "rgba(255, 255, 255, 0.1)",
      padding: "20px",
      borderRadius: "10px",
      textAlign: "center",
      transition: "transform 0.3s ease",
      cursor: "pointer",
    },
    cardHover: {
      transform: "scale(1.05)",
    },
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <h3>Admin Panel</h3>
        <div
          style={styles.sidebarItem}
          onMouseEnter={(e) => (e.target.style.background = "#666")}
          onMouseLeave={(e) => (e.target.style.background = "#444")}
        >
          Dashboard
        </div>
        <div
          style={styles.sidebarItem}
          onMouseEnter={(e) => (e.target.style.background = "#666")}
          onMouseLeave={(e) => (e.target.style.background = "#444")}
        >
          Users
        </div>
        <div
          style={styles.sidebarItem}
          onMouseEnter={(e) => (e.target.style.background = "#666")}
          onMouseLeave={(e) => (e.target.style.background = "#444")}
        >
          Settings
        </div>
        <div
          style={styles.sidebarItem}
          onMouseEnter={(e) => (e.target.style.background = "#666")}
          onMouseLeave={(e) => (e.target.style.background = "#444")}
        >
          Logout
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        <h2>Welcome, {user.email}!</h2>
        <p>This is your admin dashboard.</p>

        {/* Cards Section */}
        <div style={styles.cardContainer}>
          <div
            style={styles.card}
            onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
          >
            <h3>Total Users</h3>
            <p>1,230</p>
          </div>
          <div
            style={styles.card}
            onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
          >
            <h3>Active Sessions</h3>
            <p>89</p>
          </div>
          <div
            style={styles.card}
            onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
          >
            <h3>New Messages</h3>
            <p>15</p>
          </div>
          <div
            style={styles.card}
            onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
          >
            <h3>Server Status</h3>
            <p>Online</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
