import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AdminAuthContext } from "../src/AdminAuthContext"; // Adjust path
import AdminRegister from "./AdminRegister"; // Adjust path if needed
import Register from "./Register";
import NavBar from "../component/Navbar";

const UserShowpage = () => {
  const navigate = useNavigate();
  const { adminUser, isLoading, logoutAdmin } = useContext(AdminAuthContext);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [adminSearchTerm, setAdminSearchTerm] = useState("");
  const [showAdminRegister] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("users"); // Add this line
  const [admins, setAdmins] = useState([]); // Add this line
  const [editingUser, setEditingUser] = useState(null);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editUserForm, setEditUserForm] = useState({});
  const [editAdminForm, setEditAdminForm] = useState({});
  const [showUserRegisterPopup, setShowUserRegisterPopup] = useState(false);
  const [showAdminRegisterPopup, setShowAdminRegisterPopup] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);


  useEffect(() => {
    if (!isLoading && !adminUser) {
      navigate("/adminsignin");
    }
  }, [adminUser, isLoading, navigate]);

  useEffect(() => {
    if (adminUser) {
      fetchUsers();
      fetchAdmins();
    }
  }, [adminUser]);


  const debugUserDates = () => {
    console.log('=== USER DATE DEBUG ===');
    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`, {
        name: `${user.firstName} ${user.lastName}`,
        createdAt_raw: user.createdAt,
        createdAt_type: typeof user.createdAt,
        createdAt_formatted: formatDate(user.createdAt),
        createdAt_datetime: formatDateTime(user.createdAt)
      });
    });
    console.log('======================');
  };

  const getSubscriptionBadgeStyle = (subscription) => {
    if (!subscription || subscription.planName === 'No Subscription') {
      return { ...additionalStyles.subscriptionBadge, ...additionalStyles.noPlanBadge };
    }

    if (subscription.isExpired) {
      return { ...additionalStyles.subscriptionBadge, ...additionalStyles.expiredBadge };
    }

    if (subscription.planName === 'Premium Plan') {
      return { ...additionalStyles.subscriptionBadge, ...additionalStyles.premiumBadge };
    }

    if (subscription.planName === 'Free Plan') {
      return { ...additionalStyles.subscriptionBadge, ...additionalStyles.freeBadge };
    }

    return { ...additionalStyles.subscriptionBadge, ...additionalStyles.noPlanBadge };
  };
  const fetchAdmins = async () => {
    try {
      const response = await axios.get("http://localhost:5555/api/admin/admins"); // Adjust endpoint as needed
      if (response.data.success) {
        setAdmins(response.data.admins);
      } else {
        setError("Failed to load admins");
      }
    } catch (err) {
      setError("Error fetching admins");
      console.error("Fetch Admins Error:", err);
    }
  };
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:5555/api/auth/users");
      console.log('Full API response:', response.data);

      if (response.data.success) {
        console.log('Users data:', response.data.users);
        console.log('First user sample:', response.data.users[0]);

        // Log specific date fields
        response.data.users.forEach((user, index) => {
          console.log(`User ${index + 1} dates:`, {
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            createdAt_type: typeof user.createdAt
          });
        });

        setUsers(response.data.users);
      } else {
        setError("Failed to load users");
      }
    } catch (err) {
      console.error("Fetch Users Error:", err);
      setError("Error fetching users");
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        const response = await axios.delete(`http://localhost:5555/api/auth/users/${id}`);
        if (response.data.success) {
          setUsers(users.filter((user) => user._id !== id));
        } else {
          alert("Failed to delete user");
        }
      } catch (error) {
        console.error("Delete User Error:", error);
        alert("Error deleting user");
      }
    }
  };
  const handleDeleteAdmin = async (id) => {
    if (window.confirm("Are you sure you want to delete this admin?")) {
      try {
        const response = await axios.delete(`http://localhost:5555/api/admin/admins/${id}`);
        if (response.data.success) {
          setAdmins(admins.filter((admin) => admin._id !== id));
        } else {
          alert("Failed to delete admin");
        }
      } catch (error) {
        console.error("Delete Admin Error:", error);
        alert("Error deleting admin");
      }
    }
  };

  const updateStatus = async (id, action) => {
    try {
      const response = await axios.patch(`http://localhost:5555/api/auth/users/${id}/${action}`);
      if (response.data.success) {
        fetchUsers(); // refresh after update
      }
    } catch (err) {
      console.error(`Failed to ${action} user`, err);
    }
  };

  // Add these functions after the existing handler functions

  const handleEditUser = (user) => {
    setEditingUser(user._id);
    setEditUserForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      address: user.address || '',
      email: user.email || '',
      phone: user.phone || '',
      businessName: user.businessName || '',
      businessRegNo: user.businessRegNo || '',
      businessAddress: user.businessAddress || '',
      userType: user.userType || '',

    });
  };



  const formatDate = (dateString) => {
    console.log('formatDate input:', dateString, 'type:', typeof dateString);

    if (!dateString) {
      console.log('No date string provided');
      return "-";
    }

    try {
      const date = new Date(dateString);
      console.log('Parsed date:', date);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return "Invalid Date";
      }

      const formatted = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      console.log('Formatted date:', formatted);
      return formatted;
    } catch (error) {
      console.error('Date formatting error:', error, 'for date:', dateString);
      return "Error";
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "-";

      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Time formatting error:', error);
      return "-";
    }
  };

  const handleUpdateUser = async (id) => {
    try {
      const response = await axios.put(`http://localhost:5555/api/auth/users/${id}`, editUserForm);
      if (response.data.success) {
        fetchUsers(); // refresh the list
        setEditingUser(null);
        setEditUserForm({});
        alert('User updated successfully');
      } else {
        alert(response.data.message || 'Failed to update user');
      }
    } catch (error) {
      console.error('Update User Error:', error);
      alert(error.response?.data?.message || 'Error updating user');
    }
  };

  const handleEditAdmin = (admin) => {
    setEditingAdmin(admin._id);
    setEditAdminForm({
      username: admin.username || '',
      email: admin.email || '',
      password: ''
    });
  };

  const handleUpdateAdmin = async (id) => {
    try {
      const response = await axios.put(`http://localhost:5555/api/admin/admins/${id}`, editAdminForm);
      if (response.data.success) {
        fetchAdmins(); // refresh the list
        setEditingAdmin(null);
        setEditAdminForm({});
        alert('Admin updated successfully');
      } else {
        alert(response.data.message || 'Failed to update admin');
      }
    } catch (error) {
      console.error('Update Admin Error:', error);
      alert(error.response?.data?.message || 'Error updating admin');
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditingAdmin(null);
    setEditUserForm({});
    setEditAdminForm({});
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const resetPagination = () => {
    setCurrentPage(1);
  };

  useEffect(() => {
    resetPagination();
  }, [activeTab, statusFilter, userSearchTerm, adminSearchTerm]);

  const PaginationComponent = () => {
    const getPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 5;
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      return pages;
    };

    if (totalPages <= 1) return null;

    return (
      <div style={styles.paginationContainer}>
        <div style={styles.paginationInfo}>
          Showing {startIndex + 1} to {Math.min(endIndex, currentData.length)} of {currentData.length} {activeTab}
        </div>
        <div style={styles.paginationControls}>
          <button
            style={{
              ...styles.paginationButton,
              ...(currentPage === 1 ? styles.paginationButtonDisabled : {})
            }}
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            onMouseEnter={(e) => {
              if (currentPage !== 1) {
                e.target.style.backgroundColor = "#f3f4f6";
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== 1) {
                e.target.style.backgroundColor = "#ffffff";
              }
            }}
          >
            Previous
          </button>

          {getPageNumbers().map(pageNum => (
            <button
              key={pageNum}
              style={{
                ...styles.paginationButton,
                ...(currentPage === pageNum ? styles.paginationButtonActive : {})
              }}
              onClick={() => handlePageChange(pageNum)}
              onMouseEnter={(e) => {
                if (currentPage !== pageNum) {
                  e.target.style.backgroundColor = "#f3f4f6";
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== pageNum) {
                  e.target.style.backgroundColor = "#ffffff";
                }
              }}
            >
              {pageNum}
            </button>
          ))}

          <button
            style={{
              ...styles.paginationButton,
              ...(currentPage === totalPages ? styles.paginationButtonDisabled : {})
            }}
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            onMouseEnter={(e) => {
              if (currentPage !== totalPages) {
                e.target.style.backgroundColor = "#f3f4f6";
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== totalPages) {
                e.target.style.backgroundColor = "#ffffff";
              }
            }}
          >
            Next
          </button>
        </div>
      </div>
    );
  };
  // Filter users based on status and search term
  const filteredUsers = users.filter((user) => {
    const matchesStatus = statusFilter === "all" || (user.status || "pending") === statusFilter;
    const searchLower = userSearchTerm.toLowerCase();
    const matchesSearch =
      (user.email && user.email.toLowerCase().includes(searchLower)) ||
      (user.firstName && user.firstName.toLowerCase().includes(searchLower)) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchLower)) ||
      (user.phone && user.phone.toLowerCase().includes(searchLower)) ||
      (user.businessName && user.businessName.toLowerCase().includes(searchLower)) ||
      (user.businessRegNo && user.businessRegNo.toLowerCase().includes(searchLower)) ||
      (user.businessAddress && user.businessAddress.toLowerCase().includes(searchLower)) ||
      (user.userType && user.userType.toLowerCase().includes(searchLower)) ||
      (user.createdAt && formatDate(user.createdAt).toLowerCase().includes(searchLower)); // Add this line

    return matchesStatus && (userSearchTerm === "" || matchesSearch);
  });

  const filteredAdmins = admins.filter((admin) => {
    const searchLower = adminSearchTerm.toLowerCase();
    const matchesSearch =
      (admin.username && admin.username.toLowerCase().includes(searchLower)) ||
      (admin.email && admin.email.toLowerCase().includes(searchLower));

    return adminSearchTerm === "" || matchesSearch;
  });


  const currentData = activeTab === "users" ? filteredUsers : filteredAdmins;
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = currentData.slice(startIndex, endIndex);

  const displayUsers = activeTab === "users" ? paginatedData : [];
  const displayAdmins = activeTab === "admins" ? paginatedData : [];
  const getStatusColor = (status) => {
    switch (status) {
      case "approved": return "#10b981";
      case "declined": return "#ef4444";
      default: return "#f59e0b";
    }
  };

  const styles = {
    container: {
      fontSize: '16px',
      minHeight: "100vh",
      background: "linear-gradient(135deg, #ffffffff 0%, #ffffffff 50%, #ffffffff 100%)",
      color: "#1e293b",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",

    },
    mobileMenuButton: {
      position: "fixed",
      top: "16px",
      left: "16px",
      zIndex: 50,
      display: "none",
      padding: "12px", // Increased
      borderRadius: "8px",
      backgroundColor: "#ffffff",
      color: "#1e293b",
      border: "1px solid #e2e8f0",
      cursor: "pointer",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      transition: "all 0.3s ease",
      fontSize: "18px", // Added
    },
    sidebar: {
      position: "fixed",
      top: 0,
      left: sidebarOpen ? 0 : "-256px",
      width: "256px",
      height: "100vh",
      background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
      boxShadow: "2px 0 20px rgba(0, 0, 0, 0.1)",
      borderRight: "1px solid #e2e8f0",
      zIndex: 40,
      transition: "left 0.3s ease",
      display: "flex",
      flexDirection: "column", // Add this
    },
    sidebarHeader: {
      padding: "24px",
      borderBottom: "1px solid #e2e8f0",
    },
    sidebarLogo: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    logoIcon: {
      width: "40px",
      height: "40px",
      background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "20px",
      color: "#ffffff",
    },
    logoText: {
      fontSize: "18px",
      fontWeight: "bold",
      color: "#1e293b",
      margin: 0,
    },
    logoSubtext: {
      fontSize: "14px",
      color: "#64748b",
      margin: 0,
    },
    sidebarNav: {
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      height: "calc(100vh - 300px)", // Fixed height instead of flex: 1
      overflowY: "auto",
    },
    navItem: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "12px",
      borderRadius: "8px",
      cursor: "pointer",
      transition: "all 0.2s ease",
      color: "#64748b",
      fontSize: "14px",
      fontWeight: "500",
    },
    navItemActive: {
      backgroundColor: "#f1f5f9",
      color: "#3b82f6",
      boxShadow: "inset 0 2px 4px rgba(59, 130, 246, 0.1)",
      borderLeft: "3px solid #3b82f6",
    },
    navItemHover: {
      backgroundColor: "#f8fafc",
      color: "#3b82f6",
    },
    navIcon: {
      width: "20px",
      height: "20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "16px",
    },
    sidebarFooter: {
      padding: "16px",
      borderTop: "1px solid #e2e8f0",
      backgroundColor: "#f8fafc",
      // Remove marginTop: "auto" and position properties
    },

    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.3)",
      zIndex: 30,
      display: sidebarOpen ? "block" : "none",
    },
    mainContent: {
      marginLeft: "0px", // Added
      padding: "42px",
      minHeight: "100vh",
      transition: "margin-left 0.3s ease", // Added
    },
    header: {
      marginBottom: "40px",
    },
    headerTop: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "8px",
    },
    title: {
      fontSize: "32px",
      fontWeight: "bold",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      margin: 0,
    },
    userCount: {
      fontSize: "14px",
      color: "#64748b",
      backgroundColor: "#f1f5f9",
      padding: "4px 12px",
      borderRadius: "20px",
      border: "1px solid #e2e8f0",
    },
    subtitle: {
      color: "#64748b",
      fontSize: "16px",
      margin: 0,
    },
    controls: {
      marginBottom: "32px",
    },
    searchFilterContainer: {
      display: "",
      flexDirection: "column",
      gap: "16px",
      alignItems: "center",
      marginBottom: "16px",
    },
    searchContainer: {
      position: "relative",
      width: "100%",
      maxWidth: "400px",
    },
    searchIcon: {
      position: "absolute",
      left: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#64748b",
      fontSize: "20px",
    },
    searchInput: {
      width: "100%",
      paddingLeft: "40px",
      paddingRight: "16px",
      paddingTop: "12px",
      paddingBottom: "12px",
      backgroundColor: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      color: "#1e293b",
      fontSize: "14px",
      outline: "none",
      transition: "all 0.3s ease",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
    },
    filterContainer: {
      position: "relative",

    },
    filterIcon: {
      position: "absolute",
      left: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#64748b",
      fontSize: "16px",
    },
    filterSelect: {
      paddingLeft: "40px",
      paddingRight: "32px",
      paddingTop: "12px",
      paddingBottom: "12px",
      backgroundColor: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      color: "#1e293b",
      fontSize: "14px",
      outline: "none",
      cursor: "pointer",
      appearance: "none",
      backgroundImage: "url('data:image/svg+xml;utf8,<svg fill=\"%2364748b\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path d=\"M7 10l5 5 5-5z\"/></svg>')",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 8px center",
      backgroundSize: "20px",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
    },
    toggleButton: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "12px 24px",
      background: "#0063B4",
      border: "none",
      borderRadius: "8px",
      color: "#ffffff",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "all 0.2s ease",

    },
    adminRegisterContainer: {
      marginBottom: "32px",
      padding: "24px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      border: "1px solid #e2e8f0",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
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
    errorContainer: {
      backgroundColor: "#fef2f2",
      border: "1px solid #fecaca",
      borderRadius: "8px",
      padding: "16px",
      color: "#dc2626",
      textAlign: "center",
    },
    emptyContainer: {
      backgroundColor: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      padding: "48px",
      textAlign: "center",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
    },
    emptyIcon: {
      fontSize: "64px",
      color: "#cbd5e1",
      marginBottom: "16px",
    },
    emptyTitle: {
      color: "#64748b",
      fontSize: "18px",
      marginBottom: "8px",
      fontWeight: "600",
    },
    emptySubtitle: {
      color: "#94a3b8",
      fontSize: "14px",
    },
    tableContainer: {
      backgroundColor: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(255, 255, 255, 0.1)",
      overflow: "hidden",
      overflowX: "auto", // Add this
      maxWidth: "100%",   // Add this
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    tableHeader: {
      background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
      borderBottom: "1px solid #e2e8f0",
    },
    th: {
      padding: "16px 24px",
      textAlign: "left",
      fontSize: "14px",
      fontWeight: "600",
      color: "#374151",
      borderRight: "1px solid #e2e8f0",
    },
    thLast: {
      borderRight: "none",
    },
    tbody: {
      backgroundColor: "#ffffff",
    },
    tr: {
      borderBottom: "1px solid #f1f5f9",
      transition: "background-color 0.2s ease",
    },
    td: {
      padding: "16px 24px",
      verticalAlign: "top",
      borderRight: "1px solid #f1f5f9",
    },
    tdLast: {
      borderRight: "none",
    },
    userInfo: {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    },
    userName: {
      fontWeight: "500",
      color: "#1e293b",
      fontSize: "14px",
    },
    userDetail: {
      fontSize: "12px",
      color: "#64748b",
    },
    statusBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      padding: "4px 8px",
      borderRadius: "12px",
      fontSize: "12px",
      fontWeight: "500",
      border: "1px solid",
    },
    typeBadge: {
      padding: "4px 8px",
      borderRadius: "12px",
      fontSize: "12px",
      fontWeight: "500",
      backgroundColor: "#dbeafe",
      color: "#1e40af",
      border: "1px solid #bfdbfe",
    },
    actionsContainer: {
      display: "flex",
      justifyContent: "center",
      gap: "8px",
    },
    actionButton: {
      padding: "10px 12px", // Increased from 8px
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      fontSize: "14px",
      transition: "all 0.2s ease",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: "70px", // Added
      textAlign: "center", // Added
    },
    approveButton: {
      backgroundColor: "#10b981",
      color: "#ffffff",
    },
    declineButton: {
      backgroundColor: "#f59e0b",
      color: "#ffffff",
    },
    deleteButton: {
      backgroundColor: "#ef4444",
      color: "#ffffff",
    },
    editButton: {
      backgroundColor: "#3b82f6",
      color: "#ffffff",
    },
    saveButton: {
      backgroundColor: "#10b981",
      color: "#ffffff",
    },
    cancelButton: {
      backgroundColor: "#6b7280",
      color: "#ffffff",
    },
    editInput: {
      width: "100%",
      padding: "4px 8px",
      backgroundColor: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      color: "#1e293b",
      fontSize: "12px",
      outline: "none",
    },
    editCell: {
      padding: "8px",
    },
    statsContainer: {
      marginTop: "32px",
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "16px",
    },
    statCard: {
      backgroundColor: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      padding: "16px",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
    },
    statValue: {
      fontSize: "28px",
      fontWeight: "bold",
      marginBottom: "4px",
    },
    statLabel: {
      fontSize: "14px",
      color: "#64748b",
      fontWeight: "500",
    },
    tabContainer: {
      display: "flex",
      marginBottom: "32px",
      borderBottom: "1px solid #e2e8f0",
      backgroundColor: "#ffffff",
      borderRadius: "8px 8px 0 0",
      overflow: "hidden",
      marginTop: '40px',
    },
    tab: {
      padding: "12px 24px",
      backgroundColor: "transparent",
      border: "none",
      borderBottom: "2px solid transparent",
      color: "#64748b",
      cursor: "pointer",
      fontSize: "1.2rem",
      fontWeight: "500",
      transition: "all 0.2s ease",
    },
    tabActive: {
      color: "#3b82f6",
      borderBottomColor: "#3b82f6",
      backgroundColor: "#f8fafc",
    },
    popup: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(80, 77, 77, 0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    },
    popupContent: {
      backgroundColor: "#ffffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "24px",
      maxWidth: "500px",
      width: "90%",
      maxHeight: "80vh",
      overflowY: "auto",
      position: "relative",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
      color: "#000000ff",
    },
    popupHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "20px",
      paddingBottom: "12px",
      borderBottom: "1px solid #e2e8f0",
    },
    popupTitle: {
      fontSize: "20px",
      fontWeight: "bold",
      color: "#0063B4",
      margin: 0,
    },
    closeButton: {
      background: "none",
      border: "none",
      fontSize: "24px",
      color: "#64748b",
      cursor: "pointer",
      padding: "4px",
      borderRadius: "4px",
      transition: "all 0.2s ease",
    },


    paginationContainer: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "24px",
      padding: "16px 0",
      borderTop: "1px solid #e2e8f0",
    },
    paginationInfo: {
      fontSize: "14px",
      color: "#64748b",
    },
    paginationControls: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    paginationButton: {
      padding: "8px 12px",
      backgroundColor: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "6px",
      color: "#374151",
      fontSize: "14px",
      cursor: "pointer",
      transition: "all 0.2s ease",
      minWidth: "40px",
      textAlign: "center",
    },
    paginationButtonActive: {
      backgroundColor: "#3b82f6",
      color: "#ffffff",
      borderColor: "#3b82f6",
    },
    paginationButtonDisabled: {
      backgroundColor: "#f9fafb",
      color: "#9ca3af",
      cursor: "not-allowed",
    },

    dateInfo: {
      display: "flex",
      flexDirection: "column",
      gap: "2px",
    },
    dateMain: {
      fontWeight: "500",
      color: "#1e293b",
      fontSize: "14px",
    },
    dateDetail: {
      fontSize: "12px",
      color: "#64748b",
    },

  };
  const additionalStyles = {
    subscriptionBadge: {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 'bold',
      textAlign: 'center',
      display: 'inline-block',
      minWidth: '70px'
    },
    premiumBadge: {
      backgroundColor: '#dcfce7',
      color: '#166534',
      border: '1px solid #bbf7d0'
    },
    freeBadge: {
      backgroundColor: '#dbeafe',
      color: '#1e40af',
      border: '1px solid #bfdbfe'
    },
    noPlanBadge: {
      backgroundColor: '#f3f4f6',
      color: '#6b7280',
      border: '1px solid #e5e7eb'
    },
    expiredBadge: {
      backgroundColor: '#fee2e2',
      color: '#dc2626',
      border: '1px solid #fecaca'
    },
    daysRemaining: {
      fontSize: '10px',
      color: '#059669',
      fontWeight: '500',
      marginTop: '2px'
    },
    expiredText: {
      fontSize: '10px',
      color: '#dc2626',
      fontWeight: '500',
      marginTop: '2px'
    },
    activeDateInfo: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px'
    }
  };

  // CSS animations
  const cssAnimations = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @media (max-width: 1024px) {
  .mobile-menu-button { 
    display: block !important; 
  }
  .main-content { 
    margin-left: 0 !important; 
    padding: 16px !important;
  }
  .search-filter-container { 
    flex-direction: column !important; 
    align-items: stretch !important; 
    gap: 12px !important;
  }
  .search-container { 
    max-width: none !important; 
  }
  /* Make the main container stack vertically on smaller screens */
  .search-and-add-container {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 16px !important;
  }
}
  
  @media (max-width: 768px) {
    .table-container {
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch;
    }
    
    .table-container table {
      min-width: 800px !important;
    }
    
    .main-content h1 {
      font-size: 24px !important;
    }
    
    .action-button {
      padding: 6px 8px !important;
      font-size: 12px !important;
      min-width: 60px !important;
    }
    
    .pagination-container {
      flex-direction: column !important;
      gap: 16px !important;
      text-align: center !important;
    }
    
    .pagination-controls {
      justify-content: center !important;
      flex-wrap: wrap !important;
    }
    
    .edit-input {
      font-size: 14px !important;
      padding: 8px !important;
    }
    
    .status-badge {
      font-size: 10px !important;
      padding: 2px 6px !important;
    }
    
    .header-top {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 12px !important;
    }
      
  }
  
  @media (max-width: 480px) {
    .main-content {
      padding: 12px !important;
    }
    
    .search-filter-container {
      gap: 8px !important;
    }
    
    .pagination-button {
      padding: 6px 8px !important;
      font-size: 12px !important;
      min-width: 32px !important;
    }
    
    .table th:nth-child(3),
    .table td:nth-child(3) {
      display: none !important;
    }
    
    .popup-content {
      width: 95% !important;
      margin: 10px !important;
      padding: 16px !important;
    }
  }
`;

  if (!adminUser) {
    return null;
  }

  return (
    <div style={styles.container}>
      <style>{cssAnimations}</style>

      <button
        className="mobile-menu-button"
        style={styles.mobileMenuButton}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        ☰
      </button>

      {/* Sidebar */}
      <div style={styles.sidebar}>
        {/* Header */}
        <div style={styles.sidebarHeader}>
          <div style={styles.sidebarLogo}>
            <div>
              <h3 style={styles.logoText}>Admin Panel</h3>
              <p style={styles.logoSubtext}>Management System</p>
            </div>
          </div>
        </div>

        {/* Navigation - Main Items */}
        <nav style={styles.sidebarNav}>

          <div
            style={{
              ...styles.navItem,
              ...styles.navItemActive,
            }}
          >
            <div style={styles.navIcon}>👥</div>
            <span>Users</span>
          </div>
        </nav>

        {/* 3. Replace the sidebarFooter section with this updated version: */}
        <div style={styles.sidebarFooter}>
          {/* User Info */}
          <div style={{ marginBottom: "16px", textAlign: "center" }}>
            <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: "#64748b" }}>Welcome back,</p>
            <p style={{
              fontWeight: "600",
              color: "#1e293b",
              margin: "0 0 16px 0",
              fontSize: "14px",
              padding: "8px",
              backgroundColor: "#f1f5f9",
              borderRadius: "6px",
              border: "1px solid #e2e8f0"
            }}>
              {adminUser?.username || adminUser?.name || 'Admin'}
            </p>
          </div>

          {/* Logout Button */}
          <button
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              padding: "12px 16px",
              backgroundColor: "#fee2e2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#dc2626",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onClick={() => {
              if (window.confirm("Are you sure you want to logout?")) {
                logoutAdmin();
                navigate("/adminsignin");
              }
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#fecaca";
              e.target.style.borderColor = "#f87171";
              e.target.style.color = "#b91c1c";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#fee2e2";
              e.target.style.borderColor = "#fecaca";
              e.target.style.color = "#dc2626";
            }}
          >
            <span style={{ fontSize: "16px" }}>🚪</span>
            <span>Logout</span>
          </button>
        </div>


      </div>
      {/* Overlay for mobile */}
      <div
        style={styles.overlay}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Main Content */}
      <div className="main-content" style={styles.mainContent}>

        <NavBar adminUser={adminUser} logoutAdmin={logoutAdmin} />

        <h1 style={{ fontSize: '30px' }}><b> User dashboard</b></h1>


        {/* User Registration Popup */}
        {showUserRegisterPopup && (
          <div style={styles.popup} onClick={() => setShowUserRegisterPopup(false)}>
            <div style={styles.popupContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.popupHeader}>
                <h3 style={styles.popupTitle}>Add New User</h3>
                <button
                  style={styles.closeButton}
                  onClick={() => setShowUserRegisterPopup(false)}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#374151"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                >
                  ✕
                </button>
              </div>
              {/* You need to replace this with your actual User Registration component */}
              <Register onSuccess={() => {
                setShowUserRegisterPopup(false);
                fetchUsers(); // Refresh users list
              }} />
            </div>
          </div>
        )}

        {/* Admin Registration Popup */}
        {showAdminRegisterPopup && (
          <div style={styles.popup} onClick={() => setShowAdminRegisterPopup(false)}>
            <div style={styles.popupContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.popupHeader}>
                <h3 style={styles.popupTitle}>Add New Admin</h3>
                <button
                  style={styles.closeButton}
                  onClick={() => setShowAdminRegisterPopup(false)}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#374151"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                >
                  ✕
                </button>
              </div>
              <AdminRegister onSuccess={() => {
                setShowAdminRegisterPopup(false);
                fetchAdmins(); // Refresh admins list
              }} />
            </div>
          </div>
        )}
        {/* Tab Navigation */}
        <div style={styles.tabContainer}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === "users" ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab("users")}
          >
            Users ({filteredUsers.length})
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === "admins" ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab("admins")}
          >
            Admins ({filteredAdmins.length})
          </button>
        </div>

        {/* Search and Filter */}
        <div className="search-and-add-container" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', marginBottom: '32px' }}>

          {/* Left side - Search and Filter */}
          <div style={{ flex: 1, maxWidth: '60%' }}>
            <div className="search-filter-container" style={{
              ...styles.searchFilterContainer,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div className="search-container" style={{
                ...styles.searchContainer,
                flex: 1,
                maxWidth: '400px'
              }}>
                <div style={styles.searchIcon}>🔍</div>
                <input
                  type="text"
                  placeholder={activeTab === "users" ? "Search users..." : "Search admins..."}
                  value={activeTab === "users" ? userSearchTerm : adminSearchTerm}
                  onChange={(e) => {
                    if (activeTab === "users") {
                      setUserSearchTerm(e.target.value);
                    } else {
                      setAdminSearchTerm(e.target.value);
                    }
                  }}
                  style={styles.searchInput}
                  onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                  onBlur={(e) => e.target.style.borderColor = "#334155"}
                />
              </div>

              {/* Conditionally render filter only for users tab */}
              {activeTab === "users" && (
                <div style={styles.filterContainer}>
                  <div style={styles.filterIcon}>🔽</div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={styles.filterSelect}
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Add Button */}
          <div style={{ flexShrink: 0 }}>
            <button
              style={styles.toggleButton}
              onClick={() => {
                if (activeTab === "users") {
                  setShowUserRegisterPopup(true);
                } else {
                  setShowAdminRegisterPopup(true);
                }
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 8px 15px -3px rgba(0, 0, 0, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
              }}
            >
              <span>➕</span>
              <span>{activeTab === "users" ? "Add New User" : "Add New Admin"}</span>
            </button>
          </div>
        </div>


        {/* Content */}
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <span style={{ marginLeft: "16px", color: "#cbd5e1" }}>Loading...</span>
          </div>
        ) : error ? (
          <div style={styles.errorContainer}>
            {error}
          </div>
        ) : activeTab === "users" ? (
          // Users Table (your existing table code)
          filteredUsers.length === 0 ? (
            <div style={styles.emptyContainer}>
              <div style={styles.emptyIcon}>👥</div>
              <p style={styles.emptyTitle}>No users found</p>
              <p style={styles.emptySubtitle}>
                {userSearchTerm ? "Try adjusting your search term" : "Try adjusting your search or filters"}
              </p>
            </div>
          ) : (
            <div className="table-container" style={styles.tableContainer}>
              <table style={styles.table} className="table">
                <thead style={styles.tableHeader}>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Contact</th>
                    <th style={styles.th}>Business</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Subscription</th>
                    <th style={styles.th}>Active Date</th>
                    <th style={styles.th}>Created Date</th>
                    <th style={styles.th}>Status</th>
                    <th style={{ ...styles.th, ...styles.thLast, textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody style={styles.tbody}>
                  {displayUsers.map((user, index) => (
                    <tr
                      key={index}
                      style={styles.tr}
                      onMouseEnter={(e) => e.target.parentElement.style.backgroundColor = "#ffffffff"}
                      onMouseLeave={(e) => e.target.parentElement.style.backgroundColor = "#ffffffff"}
                    >
                      <td style={styles.td}>
                        {editingUser === user._id ? (
                          <div style={styles.editCell}>
                            <input
                              style={styles.editInput}
                              value={editUserForm.firstName}
                              onChange={(e) => setEditUserForm({ ...editUserForm, firstName: e.target.value })}
                              placeholder="First Name"
                            />
                            <input
                              style={{ ...styles.editInput, marginTop: '4px' }}
                              value={editUserForm.lastName}
                              onChange={(e) => setEditUserForm({ ...editUserForm, lastName: e.target.value })}
                              placeholder="Last Name"
                            />
                            <input
                              style={{ ...styles.editInput, marginTop: '4px' }}
                              value={editUserForm.address}
                              onChange={(e) => setEditUserForm({ ...editUserForm, address: e.target.value })}
                              placeholder="Address"
                            />
                          </div>
                        ) : (
                          <div style={styles.userInfo}>
                            <div style={styles.userName}>
                              {user.firstName} {user.lastName}
                            </div>
                            <div style={styles.userDetail}>{user.address || "-"}</div>
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>
                        {editingUser === user._id ? (
                          <div style={styles.editCell}>
                            <input
                              style={styles.editInput}
                              value={editUserForm.email}
                              onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                              placeholder="Email"
                            />
                            <input
                              style={{ ...styles.editInput, marginTop: '4px' }}
                              value={editUserForm.phone}
                              onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                              placeholder="Phone"
                            />
                          </div>
                        ) : (
                          <div style={styles.userInfo}>
                            <div style={styles.userName}>{user.email}</div>
                            <div style={styles.userDetail}>{user.phone || "-"}</div>
                          </div>
                        )}
                      </td>

                      <td style={styles.td}>
                        {editingUser === user._id ? (
                          <div style={styles.editCell}>
                            <input
                              style={styles.editInput}
                              value={editUserForm.businessName}
                              onChange={(e) => setEditUserForm({ ...editUserForm, businessName: e.target.value })}
                              placeholder="Business Name"
                            />
                            <input
                              style={{ ...styles.editInput, marginTop: '4px' }}
                              value={editUserForm.businessRegNo}
                              onChange={(e) => setEditUserForm({ ...editUserForm, businessRegNo: e.target.value })}
                              placeholder="Registration No"
                            />
                            <input
                              style={{ ...styles.editInput, marginTop: '4px' }}
                              value={editUserForm.businessAddress}
                              onChange={(e) => setEditUserForm({ ...editUserForm, businessAddress: e.target.value })}
                              placeholder="Business Address"
                            />
                          </div>
                        ) : (
                          <div style={styles.userInfo}>
                            <div style={styles.userName}>{user.businessName || "-"}</div>
                            <div style={styles.userDetail}>{user.businessRegNo || "-"}</div>
                            <div style={styles.userDetail}>{user.businessAddress || "-"}</div>
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>
                        {editingUser === user._id ? (
                          <select
                            style={styles.editInput}
                            value={editUserForm.userType}
                            onChange={(e) =>
                              setEditUserForm({ ...editUserForm, userType: e.target.value })
                            }
                            required
                          >
                            <option value="Individual">Individual</option>
                            <option value="Company">Company</option>
                            <option value="Agency">Agency</option>
                          </select>
                        ) : (
                          <span style={styles.typeBadge}>
                            {user.userType || "-"}
                          </span>
                        )}
                      </td>

                      {/* NEW SUBSCRIPTION COLUMN */}
                      <td style={styles.td}>
                        <div style={styles.userInfo}>
                          <div style={styles.userName}>
                            <span style={getSubscriptionBadgeStyle(user.subscription)}>
                              {user.subscription?.planName || 'No Plan'}
                            </span>
                          </div>
                          <div style={styles.userDetail}>
                            {user.subscription?.amount > 0 && (
                              <span style={{ fontSize: '10px', color: '#6b7280' }}>
                                {user.subscription.currency} {user.subscription.amount}/{user.subscription.billingCycle}
                              </span>
                            )}
                            {user.subscription?.amount === 0 && user.subscription?.planName === 'Free Plan' && (
                              <span style={{ fontSize: '10px', color: '#059669' }}>
                                Free Forever
                              </span>
                            )}
                          </div>
                          {user.subscription?.isExpired && (
                            <div style={{ ...styles.userDetail, color: '#dc2626', fontSize: '10px', fontWeight: '500' }}>
                              EXPIRED
                            </div>
                          )}
                          {user.subscription?.daysRemaining !== null && user.subscription?.daysRemaining > 0 && (
                            <div style={{ ...styles.userDetail, color: '#059669', fontSize: '10px', fontWeight: '500' }}>
                              {user.subscription.daysRemaining} days left
                            </div>
                          )}
                        </div>
                      </td>

                      {/* NEW ACTIVE DATE COLUMN */}
                      <td style={styles.td}>
                        <div style={styles.userInfo}>
                          <div style={styles.userName}>
                            {user.subscription?.startDate ?
                              formatDate(user.subscription.startDate) :
                              "-"
                            }
                          </div>
                          <div style={styles.userDetail}>
                            {user.subscription?.startDate ?
                              formatTime(user.subscription.startDate) :
                              "Not activated"
                            }
                          </div>
                          {user.subscription?.endDate && (
                            <div style={{
                              ...styles.userDetail,
                              fontSize: '10px',
                              color: user.subscription?.isExpired ? '#dc2626' : '#6b7280'
                            }}>
                              Expires: {formatDate(user.subscription.endDate)}
                            </div>
                          )}
                          {user.subscription?.planName === 'Free Plan' && (
                            <div style={{
                              ...styles.userDetail,
                              fontSize: '10px',
                              color: '#059669'
                            }}>
                              Never expires
                            </div>
                          )}
                        </div>
                      </td>

                      <td style={styles.td}>
                        <div style={styles.userInfo}>
                          <div style={styles.userName}>
                            {user.createdAt ? formatDate(user.createdAt) : "No createdAt"}
                          </div>
                          <div style={styles.userDetail}>
                            {user.createdAt ? formatTime(user.createdAt) : "-"}
                          </div>
                          {/* Remove or keep debug info as needed */}
                          <div style={{ ...styles.userDetail, fontSize: '10px', color: '#ff0000', fontFamily: 'monospace' }}>
                            Debug: {user.createdAt ? `"${user.createdAt}"` : 'NULL/UNDEFINED'}
                          </div>
                          {user.updatedAt && (
                            <div style={{ ...styles.userDetail, fontSize: '10px', color: '#00ff00', fontFamily: 'monospace' }}>
                              Updated: {user.updatedAt ? `"${user.updatedAt}"` : 'NULL'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            backgroundColor: `${getStatusColor(user.status || "pending")}20`,
                            color: getStatusColor(user.status || "pending"),
                            borderColor: getStatusColor(user.status || "pending"),
                          }}
                        >
                          <span>
                            {user.status === "approved" ? "✓" : user.status === "declined" ? "✗" : "⏳"}
                          </span>
                          <span style={{ textTransform: "capitalize" }}>{user.status || "pending"}</span>
                        </span>
                      </td>

                      <td style={{ ...styles.td, ...styles.tdLast }}>
                        <div style={styles.actionsContainer}>
                          {editingUser === user._id ? (
                            <>
                              <button
                                style={{ ...styles.actionButton, ...styles.saveButton }}
                                onClick={() => handleUpdateUser(user._id)}
                                title="Save"
                                onMouseEnter={(e) => e.target.style.backgroundColor = "#047857"}
                                onMouseLeave={(e) => e.target.style.backgroundColor = "#059669"}
                              >
                                Save
                              </button>
                              <button
                                style={{ ...styles.actionButton, ...styles.cancelButton }}
                                onClick={handleCancelEdit}
                                title="Cancel"
                                onMouseEnter={(e) => e.target.style.backgroundColor = "#4b5563"}
                                onMouseLeave={(e) => e.target.style.backgroundColor = "#6b7280"}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                style={{ ...styles.actionButton, ...styles.approveButton }}
                                onClick={() => updateStatus(user._id, "approve")}
                                title="Approve"
                                onMouseEnter={(e) => e.target.style.backgroundColor = "#047857"}
                                onMouseLeave={(e) => e.target.style.backgroundColor = "#059669"}
                              >
                                Accept
                              </button>
                              <button
                                style={{ ...styles.actionButton, ...styles.declineButton }}
                                onClick={() => updateStatus(user._id, "decline")}
                                title="Decline"
                                onMouseEnter={(e) => e.target.style.backgroundColor = "#b45309"}
                                onMouseLeave={(e) => e.target.style.backgroundColor = "#d97706"}
                              >
                                Decline
                              </button>
                              <button
                                style={{ ...styles.actionButton, ...styles.editButton }}
                                onClick={() => handleEditUser(user)}
                                title="Edit"
                                onMouseEnter={(e) => e.target.style.backgroundColor = "#2563eb"}
                                onMouseLeave={(e) => e.target.style.backgroundColor = "#3b82f6"}
                              >
                                Edit
                              </button>
                              <button
                                style={{ ...styles.actionButton, ...styles.deleteButton }}
                                onClick={() => handleDelete(user._id)}
                                title="Delete"
                                onMouseEnter={(e) => e.target.style.backgroundColor = "#b91c1c"}
                                onMouseLeave={(e) => e.target.style.backgroundColor = "#dc2626"}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          // Admins Table
          filteredAdmins.length === 0 ? (
            <div style={styles.emptyContainer}>
              <div style={styles.emptyIcon}>👨‍💼</div>
              <p style={styles.emptyTitle}>No admins found</p>
              <p style={styles.emptySubtitle}>
                {adminSearchTerm ? "Try adjusting your search term" : "No administrators registered yet"}
              </p>
            </div>
          ) : (
            <div className="table-container" style={styles.tableContainer}>
              <table style={styles.table} className="table">

                <thead style={styles.tableHeader}>
                  <tr>
                    <th style={styles.th}>Username</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Created Date / Password</th>
                    <th style={{ ...styles.th, ...styles.thLast, textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody style={styles.tbody}>
                  {displayAdmins.map((admin, index) => (
                    <tr
                      key={index}
                      style={styles.tr}
                      onMouseEnter={(e) => e.target.parentElement.style.backgroundColor = "#ffffffff"}
                      onMouseLeave={(e) => e.target.parentElement.style.backgroundColor = "#ffffffff"}
                    >
                      <td style={styles.td}>
                        {editingAdmin === admin._id ? (
                          <input
                            style={styles.editInput}
                            value={editAdminForm.username}
                            onChange={(e) => setEditAdminForm({ ...editAdminForm, username: e.target.value })}
                            placeholder="Username"
                          />
                        ) : (
                          <div style={styles.userName}>{admin.username}</div>
                        )}
                      </td>
                      <td style={styles.td}>
                        {editingAdmin === admin._id ? (
                          <input
                            style={styles.editInput}
                            value={editAdminForm.email}
                            onChange={(e) => setEditAdminForm({ ...editAdminForm, email: e.target.value })}
                            placeholder="Email"
                          />
                        ) : (
                          <div style={styles.userName}>{admin.email}</div>
                        )}
                      </td>
                      <td style={styles.td}>
                        {editingAdmin === admin._id ? (
                          <input
                            style={styles.editInput}
                            type="password"
                            value={editAdminForm.password}
                            onChange={(e) => setEditAdminForm({ ...editAdminForm, password: e.target.value })}
                            placeholder="New Password (optional)"
                          />
                        ) : (
                          <div style={styles.userDetail}>
                            {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : "-"}
                          </div>
                        )}
                      </td>
                      <td style={{ ...styles.td, ...styles.tdLast }}>
                        <div style={styles.actionsContainer}>
                          {editingAdmin === admin._id ? (
                            <>
                              <button
                                style={{ ...styles.actionButton, ...styles.saveButton }}
                                onClick={() => handleUpdateAdmin(admin._id)}
                                title="Save"
                                onMouseEnter={(e) => e.target.style.backgroundColor = "#047857"}
                                onMouseLeave={(e) => e.target.style.backgroundColor = "#059669"}
                              >
                                Save
                              </button>
                              <button
                                style={{ ...styles.actionButton, ...styles.cancelButton }}
                                onClick={handleCancelEdit}
                                title="Cancel"
                                onMouseEnter={(e) => e.target.style.backgroundColor = "#4b5563"}
                                onMouseLeave={(e) => e.target.style.backgroundColor = "#6b7280"}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                style={{ ...styles.actionButton, ...styles.editButton }}
                                onClick={() => handleEditAdmin(admin)}
                                title="Edit Admin"
                                onMouseEnter={(e) => e.target.style.backgroundColor = "#2563eb"}
                                onMouseLeave={(e) => e.target.style.backgroundColor = "#3b82f6"}
                              >
                                Edit
                              </button>
                              <button
                                style={{ ...styles.actionButton, ...styles.deleteButton }}
                                onClick={() => handleDeleteAdmin(admin._id)}
                                title="Delete Admin"
                                onMouseEnter={(e) => e.target.style.backgroundColor = "#b91c1c"}
                                onMouseLeave={(e) => e.target.style.backgroundColor = "#dc2626"}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        <PaginationComponent />
      </div>
    </div>
  );
};

export default UserShowpage;