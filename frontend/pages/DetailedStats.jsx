import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AdminAuthContext } from "../src/AdminAuthContext"; // Adjust path as needed
import NavBar from "../component/Navbar";

const DetailedStats = () => {
  const navigate = useNavigate();
  const { adminUser, isLoading, refreshSession, logoutAdmin } = useContext(AdminAuthContext);

  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState("all"); // all, today, week, month, year

  // Debug logs
  useEffect(() => {
    console.log('DetailedStats - Auth state:', { adminUser, isLoading });
  }, [adminUser, isLoading]);

  // Authentication check effect
  useEffect(() => {
    console.log('Auth check effect running:', { isLoading, adminUser: !!adminUser });

    // Wait for context to finish loading
    if (isLoading) {
      console.log('Still loading auth context...');
      return;
    }

    // If loading is complete and no admin user, redirect to login
    if (!adminUser) {
      console.log('No admin user found, redirecting to login');
      navigate("/adminsignin", { replace: true });
      return;
    }

    // If we have an admin user, refresh the session
    console.log('Admin user found, refreshing session');
    if (refreshSession) {
      refreshSession();
    }
  }, [adminUser, isLoading, navigate, refreshSession]);

  // Data fetching effect
  useEffect(() => {
    console.log('Data fetch effect running:', { isLoading, adminUser: !!adminUser });

    // Only fetch data when we have a confirmed admin user and auth loading is complete
    if (!isLoading && adminUser) {
      console.log('Fetching data...');
      fetchData();
    }
  }, [adminUser, isLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersResponse, adminsResponse] = await Promise.all([
        axios.get("http://localhost:5555/api/auth/users"),
        axios.get("http://localhost:5555/api/admin/admins")
      ]);

      if (usersResponse.data.success) {
        setUsers(usersResponse.data.users);
      }
      if (adminsResponse.data.success) {
        setAdmins(adminsResponse.data.admins);
      }
    } catch (err) {
      setError("Error fetching data");
      console.error("Fetch Error:", err);
    }
    setLoading(false);
  };

  // Filter users based on date range
  const getFilteredUsers = () => {
    if (dateRange === "all") return users;

    const now = new Date();
    const filterDate = new Date();

    switch (dateRange) {
      case "today":
        filterDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        filterDate.setDate(now.getDate() - 7);
        break;
      case "month":
        filterDate.setMonth(now.getMonth() - 1);
        break;
      case "year":
        filterDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return users;
    }

    return users.filter(user => {
      if (!user.createdAt) return false;
      return new Date(user.createdAt) >= filterDate;
    });
  };

  // Statistics calculations
  const filteredUsers = getFilteredUsers();
  const approvedUsers = filteredUsers.filter(u => u.status === "approved");
  const pendingUsers = filteredUsers.filter(u => (u.status || "pending") === "pending");
  const declinedUsers = filteredUsers.filter(u => u.status === "declined");

  // User type statistics
  const individualUsers = filteredUsers.filter(u => u.userType === "Individual");
  const companyUsers = filteredUsers.filter(u => u.userType === "Company");
  const agencyUsers = filteredUsers.filter(u => u.userType === "Agency");

  // Registration trends (last 7 days)
  const getRegistrationTrend = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = users.filter(user => {
        if (!user.createdAt) return false;
        const userDate = new Date(user.createdAt);
        return userDate >= date && userDate < nextDate;
      }).length;

      last7Days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count
      });
    }
    return last7Days;
  };

  const registrationTrend = getRegistrationTrend();

  // Most recent registrations
  const recentUsers = [...users]
    .filter(user => user.createdAt)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const styles = {
    container: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f8fafc 0%, #ffffffff 100%)",
      color: "#462929ff",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      padding: "42px",
    },
    header: {
      marginBottom: "40px",
      textAlign: "left",
    },
    backButton: {
      position: "absolute",
      top: "32px",
      left: "32px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "12px 20px",
      backgroundColor: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      color: "#64748b",
      fontSize: "14px",
      cursor: "pointer",
      transition: "all 0.2s ease",
      textDecoration: "none",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    },
    title: {
      fontSize: "36px",
      fontWeight: "bold",
      color: "#1e293b",
      margin: "0 0 8px 0",
    },
    subtitle: {
      color: "#64748b",
      fontSize: "16px",
      margin: 0,
    },
    dateFilter: {
      display: "flex",
      justifyContent: "left",
      gap: "12px",
      marginBottom: "40px",
      flexWrap: "wrap",
    },
    filterButton: {
      padding: "8px 16px",
      backgroundColor: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "20px",
      color: "#64748b",
      fontSize: "14px",
      cursor: "pointer",
      transition: "all 0.2s ease",
    },
    filterButtonActive: {
      backgroundColor: "#3b82f6",
      color: "#ffffff",
      borderColor: "#3b82f6",
    },
    mainStats: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "24px",
      marginBottom: "40px",
    },
    statCard: {
      backgroundColor: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "24px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      textAlign: "center",
      transition: "transform 0.2s ease",
    },
    statIcon: {
      fontSize: "32px",
      marginBottom: "12px",
    },
    statValue: {
      fontSize: "36px",
      fontWeight: "bold",
      marginBottom: "8px",
    },
    statLabel: {
      fontSize: "14px",
      color: "#64748b",
      fontWeight: "500",
    },
    statSubtext: {
      fontSize: "12px",
      color: "#94a3b8",
      marginTop: "4px",
    },
    chartsContainer: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
      gap: "24px",
      marginBottom: "40px",
    },
    chartCard: {
      backgroundColor: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "24px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    },
    chartTitle: {
      fontSize: "18px",
      fontWeight: "600",
      color: "#1e293b",
      marginBottom: "20px",
      textAlign: "center",
    },
    trendContainer: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "end",
      height: "200px",
      padding: "20px 0",
      borderBottom: "1px solid #e2e8f0",
    },
    trendBar: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "8px",
      flex: 1,
    },
    bar: {
      width: "24px",
      backgroundColor: "#3b82f6",
      borderRadius: "2px 2px 0 0",
      transition: "all 0.3s ease",
    },
    barLabel: {
      fontSize: "12px",
      color: "#64748b",
      textAlign: "center",
    },
    barValue: {
      fontSize: "12px",
      fontWeight: "600",
      color: "#1e293b",
    },
    recentUsersContainer: {
      backgroundColor: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "0px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    },
    recentUsersList: {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    },
    recentUserItem: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px",
      backgroundColor: "#f8fafc",
      borderRadius: "8px",
      border: "1px solid #e2e8f0",
    },
    userInfo: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    userAvatar: {
      width: "40px",
      height: "40px",
      backgroundColor: "#3b82f6",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#ffffff",
      fontWeight: "600",
      fontSize: "14px",
    },
    userName: {
      fontWeight: "500",
      color: "#1e293b",
    },
    userEmail: {
      fontSize: "12px",
      color: "#64748b",
    },
    userDate: {
      fontSize: "12px",
      color: "#64748b",
    },
    statusBadge: {
      padding: "4px 8px",
      borderRadius: "12px",
      fontSize: "12px",
      fontWeight: "500",
    },
    loadingContainer: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "64px",
    },
    spinner: {
      width: "48px",
      height: "48px",
      border: "2px solid #e2e8f0",
      borderTop: "2px solid #3b82f6",
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
    },
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved": return { backgroundColor: "#dcfce7", color: "#166534" };
      case "declined": return { backgroundColor: "#fee2e2", color: "#dc2626" };
      default: return { backgroundColor: "#fef3c7", color: "#d97706" };
    }
  };

  const maxTrendValue = Math.max(...registrationTrend.map(day => day.count), 1);

  // Show loading screen while authentication context is loading
  if (isLoading) {
    console.log('Showing auth loading screen');
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <span style={{ marginLeft: "16px", color: "#64748b" }}>Checking authentication...</span>
        </div>
      </div>
    );
  }

  // If auth is loaded but no admin user, component will redirect via useEffect
  // Show loading briefly to prevent flash
  if (!adminUser) {
    console.log('No admin user, should redirect soon');
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <span style={{ marginLeft: "16px", color: "#64748b" }}>Redirecting...</span>
        </div>
      </div>
    );
  }

  // Show loading screen while fetching data
  if (loading) {
    console.log('Showing data loading screen');
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <span style={{ marginLeft: "16px", color: "#64748b" }}>Loading statistics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: "center", color: "#dc2626", padding: "64px" }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .stat-card:hover {
            transform: translateY(-4px);
          }
          
          .trend-bar:hover .bar {
            backgroundColor: #1e40af !important;
          }
          
          @media (max-width: 768px) {
            .charts-container {
              grid-template-columns: 1fr !important;
            }
            .main-stats {
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
            }
          }
        `}
      </style>


      <NavBar adminUser={adminUser} logoutAdmin={logoutAdmin} />


      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>📊 Detailed Statistics</h1>
        <p style={styles.subtitle}>Comprehensive analytics and insights</p>
      </div>

      {/* Date Filter */}
      <div style={styles.dateFilter}>
        {[
          { key: "all", label: "All Time" },
          { key: "today", label: "Today" },
          { key: "week", label: "Last 7 Days" },
          { key: "month", label: "Last Month" },
          { key: "year", label: "Last Year" },
        ].map((filter) => (
          <button
            key={filter.key}
            style={{
              ...styles.filterButton,
              ...(dateRange === filter.key ? styles.filterButtonActive : {}),
            }}
            onClick={() => setDateRange(filter.key)}
            onMouseEnter={(e) => {
              if (dateRange !== filter.key) {
                e.target.style.backgroundColor = "#f1f5f9";
                e.target.style.color = "#3b82f6";
              }
            }}
            onMouseLeave={(e) => {
              if (dateRange !== filter.key) {
                e.target.style.backgroundColor = "#ffffff";
                e.target.style.color = "#64748b";
              }
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Main Statistics */}
      <div className="main-stats" style={styles.mainStats}>
        <div className="stat-card" style={{ ...styles.statCard, borderLeft: "4px solid #10b981" }}>
          <div style={{ ...styles.statIcon, color: "#10b981" }}>✅</div>
          <div style={{ ...styles.statValue, color: "#10b981" }}>
            {approvedUsers.length}
          </div>
          <div style={styles.statLabel}>Approved Users</div>
          <div style={styles.statSubtext}>
            {filteredUsers.length > 0 ? Math.round((approvedUsers.length / filteredUsers.length) * 100) : 0}% of total
          </div>
        </div>

        <div className="stat-card" style={{ ...styles.statCard, borderLeft: "4px solid #f59e0b" }}>
          <div style={{ ...styles.statIcon, color: "#f59e0b" }}>⏳</div>
          <div style={{ ...styles.statValue, color: "#f59e0b" }}>
            {pendingUsers.length}
          </div>
          <div style={styles.statLabel}>Pending Users</div>
          <div style={styles.statSubtext}>
            {filteredUsers.length > 0 ? Math.round((pendingUsers.length / filteredUsers.length) * 100) : 0}% of total
          </div>
        </div>

        <div className="stat-card" style={{ ...styles.statCard, borderLeft: "4px solid #ef4444" }}>
          <div style={{ ...styles.statIcon, color: "#ef4444" }}>❌</div>
          <div style={{ ...styles.statValue, color: "#ef4444" }}>
            {declinedUsers.length}
          </div>
          <div style={styles.statLabel}>Declined Users</div>
          <div style={styles.statSubtext}>
            {filteredUsers.length > 0 ? Math.round((declinedUsers.length / filteredUsers.length) * 100) : 0}% of total
          </div>
        </div>

        <div className="stat-card" style={{ ...styles.statCard, borderLeft: "4px solid #3b82f6" }}>
          <div style={{ ...styles.statIcon, color: "#3b82f6" }}>👥</div>
          <div style={{ ...styles.statValue, color: "#3b82f6" }}>
            {filteredUsers.length}
          </div>
          <div style={styles.statLabel}>Total Users</div>
          <div style={styles.statSubtext}>
            {dateRange === "all" ? "All registrations" : `In selected period`}
          </div>
        </div>

        <div className="stat-card" style={{ ...styles.statCard, borderLeft: "4px solid #8b5cf6" }}>
          <div style={{ ...styles.statIcon, color: "#8b5cf6" }}>👤</div>
          <div style={{ ...styles.statValue, color: "#8b5cf6" }}>
            {individualUsers.length}
          </div>
          <div style={styles.statLabel}>Individual Users</div>
          <div style={styles.statSubtext}>Personal accounts</div>
        </div>

        <div className="stat-card" style={{ ...styles.statCard, borderLeft: "4px solid #06b6d4" }}>
          <div style={{ ...styles.statIcon, color: "#06b6d4" }}>🏢</div>
          <div style={{ ...styles.statValue, color: "#06b6d4" }}>
            {companyUsers.length}
          </div>
          <div style={styles.statLabel}>Company Users</div>
          <div style={styles.statSubtext}>Business accounts</div>
        </div>

        <div className="stat-card" style={{ ...styles.statCard, borderLeft: "4px solid #84cc16" }}>
          <div style={{ ...styles.statIcon, color: "#84cc16" }}>🏛️</div>
          <div style={{ ...styles.statValue, color: "#84cc16" }}>
            {agencyUsers.length}
          </div>
          <div style={styles.statLabel}>Agency Users</div>
          <div style={styles.statSubtext}>Agency accounts</div>
        </div>

        <div className="stat-card" style={{ ...styles.statCard, borderLeft: "4px solid #f97316" }}>
          <div style={{ ...styles.statIcon, color: "#f97316" }}>👨‍💼</div>
          <div style={{ ...styles.statValue, color: "#f97316" }}>
            {admins.length}
          </div>
          <div style={styles.statLabel}>Total Admins</div>
          <div style={styles.statSubtext}>System administrators</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-container" style={styles.chartsContainer}>
        {/* Registration Trend */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Registration Trend (Last 7 Days)</h3>
          <div style={styles.trendContainer}>
            {registrationTrend.map((day, index) => (
              <div key={index} className="trend-bar" style={styles.trendBar}>
                <div style={styles.barValue}>{day.count}</div>
                <div
                  className="bar"
                  style={{
                    ...styles.bar,
                    height: `${(day.count / maxTrendValue) * 150}px`,
                  }}
                ></div>
                <div style={styles.barLabel}>{day.date}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Users */}
        <div style={styles.recentUsersContainer}>
          <h3 style={styles.chartTitle}>Recent Registrations</h3>
          <div style={styles.recentUsersList}>
            {recentUsers.length > 0 ? (
              recentUsers.map((user, index) => (
                <div key={index} style={styles.recentUserItem}>
                  <div style={styles.userInfo}>
                    <div style={styles.userAvatar}>
                      {(user.firstName?.[0] || user.email?.[0] || "U").toUpperCase()}
                    </div>
                    <div>
                      <div style={styles.userName}>
                        {user.firstName} {user.lastName} {user.firstName || user.lastName ? "" : user.email}
                      </div>
                      <div style={styles.userEmail}>{user.email}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        ...styles.statusBadge,
                        ...getStatusColor(user.status || "pending"),
                      }}
                    >
                      {(user.status || "pending").charAt(0).toUpperCase() + (user.status || "pending").slice(1)}
                    </div>
                    <div style={styles.userDate}>
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : "No date"}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
                No recent registrations found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedStats;