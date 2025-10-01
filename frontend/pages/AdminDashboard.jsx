import React, { useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AdminAuthContext } from "../src/AdminAuthContext";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { adminUser, setAdminUser } = useContext(AdminAuthContext);

  useEffect(() => {
    if (!adminUser) {
      navigate("/adminsignin"); // Redirect if not logged in
    }
  }, [adminUser, navigate]);

  if (!adminUser) return null; // Avoid rendering before redirect

  const handleLogout = () => {
    setAdminUser(null);
    navigate("/adminsignin");
  };

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
      userSelect: "none",
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
      height: "auto",
      width: "auto",
    },
    card: {
      background: "rgba(255, 255, 255, 0.1)",
      padding: "20px",
      borderRadius: "10px",
      textAlign: "center",
      transition: "transform 0.3s ease",
      cursor: "pointer",
      userSelect: "none",
    },
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <h3>Admin Panel</h3>
        <div
          style={styles.sidebarItem}
          onClick={() => navigate("/admindashboard")}
          onMouseEnter={(e) => (e.target.style.background = "#666")}
          onMouseLeave={(e) => (e.target.style.background = "#444")}
        >
          Dashboard
        </div>
        <div
          style={styles.sidebarItem}
          onClick={() => navigate("/usershowpage")}
          onMouseEnter={(e) => (e.target.style.background = "#666")}
          onMouseLeave={(e) => (e.target.style.background = "#444")}
        >
          Users
        </div>

        <div
          style={styles.sidebarItem}
          onClick={handleLogout}
          onMouseEnter={(e) => (e.target.style.background = "#666")}
          onMouseLeave={(e) => (e.target.style.background = "#444")}
        >
          Logout
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        <h2>Welcome, {adminUser.email || adminUser.username}!</h2>
        <p>This is your admin dashboard.</p>

        {/* Cards Section */}
        <div style={styles.cardContainer}>
          <div
            style={styles.card}
            onClick={() => navigate("/ShowContactus")}
            onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
          >
            <h3>Contact Us Details</h3>
          </div>
          <div
            style={styles.card}
            onClick={() => navigate("/ShowFeedback")}
            onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
          >
            <h3>Feedback Details</h3>
          </div>
          <div
            style={styles.card}
            onClick={() => navigate("/paymentdetails")}
            onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
          >
            <h3>Payment Details</h3>
          </div>

          <div
            style={styles.card}
            onClick={() => navigate("/creatediscount")}
            onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
          >
            <h3>Discount Create</h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
