import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import NotificationDropdown from "./NotificationDropdown"; // Import the dropdown component

const NavBar = ({ adminUser, logoutAdmin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Notification states
  const [pendingOffersCount, setPendingOffersCount] = useState(0);
  const [showNotificationBadge, setShowNotificationBadge] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  
  // Notification dropdown state
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  // Handle screen size changes
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch notification counts
  const fetchNotificationCounts = async () => {
    try {
      setIsLoadingNotifications(true);
      const response = await axios.get('http://localhost:5555/api/admin/notifications/counts');
      
      if (response.data && response.data.success) {
        const newPendingCount = response.data.counts.pending || 0;
        console.log('Fetched notification count:', newPendingCount);
        setPendingOffersCount(newPendingCount);
        setShowNotificationBadge(newPendingCount > 0);
      }
    } catch (error) {
      console.error('Error fetching notification counts:', error);
      // Fallback: try to get count from offers endpoint
      try {
        const offersResponse = await axios.get('http://localhost:5555/api/admin/offers?status=pending&limit=1');
        if (offersResponse.data && offersResponse.data.success) {
          const pendingCount = offersResponse.data.counts?.pending || 0;
          setPendingOffersCount(pendingCount);
          setShowNotificationBadge(pendingCount > 0);
        }
      } catch (fallbackError) {
        console.error('Error with fallback notification fetch:', fallbackError);
      }
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  // Mark notifications as seen and reset count
  const markNotificationsAsSeen = async () => {
    try {
      const response = await axios.post('http://localhost:5555/api/admin/notifications/mark-seen', {
        adminId: adminUser?.id || adminUser?.username || 'admin',
        offerIds: [], // Could be expanded to track specific offers
        timestamp: new Date().toISOString()
      });
      
      if (response.data && response.data.success) {
        console.log('Notifications marked as seen:', response.data);
        return true;
      } else {
        console.error('Failed to mark notifications as seen:', response.data);
        return false;
      }
    } catch (error) {
      console.error('Error marking notifications as seen:', error);
      return false;
    }
  };

  // Initial fetch and periodic updates
  useEffect(() => {
    fetchNotificationCounts();
    
    // Update counts every 30 seconds
    const interval = setInterval(fetchNotificationCounts, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Reset count when visiting offers page
  useEffect(() => {
    if (location.pathname === '/admin/offers') {
      // Reset notification count immediately when visiting offers page
      setPendingOffersCount(0);
      setShowNotificationBadge(false);
      markNotificationsAsSeen();
      
      // Mark as seen
      markNotificationsAsSeen();
      
      // Refresh counts after a delay to ensure backend is updated
      const timer = setTimeout(() => {
        fetchNotificationCounts();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const styles = {
    navbar: {
      background: scrolled 
        ? "rgba(255, 255, 255, 0.95)" 
        : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      backdropFilter: scrolled ? "blur(10px)" : "none",
      position: "sticky",
      top: 0,
      zIndex: 1000,
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      boxShadow: scrolled 
        ? "0 8px 32px rgba(0, 0, 0, 0.12)" 
        : "0 4px 20px rgba(0, 0, 0, 0.1)",
    },

    header: {
      padding: "0px 0px",
    },

    headerTop: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 24px",
      borderBottom: scrolled ? "1px solid rgba(226, 232, 240, 0.3)" : "none",
    },

    rightSection: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
    },

    navButtonsContainer: {
      display: "flex",
      gap: "12px",
      padding: "20px 24px 24px",
      background: scrolled 
        ? "transparent" 
        : "linear-gradient(to right, rgba(255,255,255,0.1), rgba(255,255,255,0.05))",
      flexWrap: "wrap", // Allow buttons to wrap on smaller screens
    },

    mobileHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 20px",
      background: "inherit",
    },

    mobileMenuButton: {
      padding: "12px",
      background: "rgba(255, 255, 255, 0.2)",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      borderRadius: "12px",
      cursor: "pointer",
      fontSize: "18px",
      color: scrolled ? "#374151" : "#ffffff",
      transition: "all 0.3s ease",
      backdropFilter: "blur(10px)",
    },

    mobileMenuOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.6)",
      backdropFilter: "blur(4px)",
      zIndex: 999,
      display: mobileMenuOpen ? "block" : "none",
      animation: mobileMenuOpen ? "fadeIn 0.3s ease" : "fadeOut 0.3s ease",
    },

    mobileMenu: {
      position: "fixed",
      top: 0,
      right: mobileMenuOpen ? 0 : "-320px",
      width: "300px",
      minHeight: "100vh",
      background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
      boxShadow: "-8px 0 40px rgba(0, 0, 0, 0.15)",
      zIndex: 1000,
      transition: "right 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      display: "flex",
      flexDirection: "column",
    },

    mobileMenuHeader: {
      padding: "24px",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
    },

    mobileMenuContent: {
      flex: 1,
      padding: "24px",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      overflowY: "auto", // Allow scrolling for more menu items
    },

    mobileCloseButton: {
      position: "absolute",
      top: "20px",
      right: "20px",
      padding: "8px",
      background: "rgba(255, 255, 255, 0.2)",
      border: "none",
      borderRadius: "50%",
      fontSize: "18px",
      color: "#ffffff",
      cursor: "pointer",
      width: "36px",
      height: "36px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s ease",
    },

    userInfoBox: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "16px",
      background: scrolled 
        ? "rgba(248, 250, 252, 0.8)" 
        : "rgba(255, 255, 255, 0.2)",
      borderRadius: "16px",
      border: scrolled 
        ? "1px solid rgba(226, 232, 240, 0.5)" 
        : "1px solid rgba(255, 255, 255, 0.3)",
      backdropFilter: "blur(10px)",
      transition: "all 0.3s ease",
    },

    userIcon: {
      fontSize: "20px",
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
    },

    userName: {
      fontSize: "14px",
      fontWeight: "600",
      color: scrolled ? "#1e293b" : "#ffffff",
      margin: 0,
      transition: "color 0.3s ease",
    },

    navButtonContainer: {
      position: "relative",
      display: "inline-block",
    },

    desktopNavButton: {
      padding: "14px 28px",
      background: scrolled 
        ? "rgba(255, 255, 255, 0.9)" 
        : "rgba(255, 255, 255, 0.2)",
      border: scrolled 
        ? "1px solid rgba(226, 232, 240, 0.5)" 
        : "1px solid rgba(255, 255, 255, 0.3)",
      borderRadius: "12px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      color: scrolled ? "#374151" : "#ffffff",
      position: "relative",
      overflow: "hidden",
      backdropFilter: "blur(10px)",
      whiteSpace: "nowrap", // Prevent text wrapping
    },

    desktopNavButtonActive: {
      padding: "14px 28px",
      background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
      border: "1px solid transparent",
      borderRadius: "12px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      color: "#ffffff",
      boxShadow: "0 8px 25px rgba(59, 130, 246, 0.3)",
      position: "relative",
      overflow: "hidden",
      whiteSpace: "nowrap", // Prevent text wrapping
    },

    notificationBadge: {
      position: "absolute",
      top: "-8px",
      right: "-8px",
      background: "linear-gradient(135deg, #ef4444, #dc2626)",
      color: "white",
      borderRadius: "50%",
      width: "24px",
      height: "24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "11px",
      fontWeight: "700",
      boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4), 0 0 0 2px white",
      zIndex: 10,
      animation: showNotificationBadge ? "pulse 2s infinite" : "none",
      border: "2px solid white",
      cursor: "pointer",
      transition: "all 0.3s ease",
    },

    notificationBadgeMobile: {
      position: "absolute",
      top: "8px",
      right: "8px",
      background: "linear-gradient(135deg, #ef4444, #dc2626)",
      color: "white",
      borderRadius: "50%",
      width: "20px",
      height: "20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "10px",
      fontWeight: "700",
      boxShadow: "0 2px 8px rgba(239, 68, 68, 0.4)",
      zIndex: 10,
      animation: showNotificationBadge ? "pulse 2s infinite" : "none",
      cursor: "pointer",
      transition: "all 0.3s ease",
    },

    notificationLoader: {
      position: "absolute",
      top: "-4px",
      right: "-4px",
      width: "16px",
      height: "16px",
      border: "2px solid rgba(255, 255, 255, 0.3)",
      borderTop: "2px solid #ef4444",
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
      zIndex: 10,
    },

    mobileMenuItem: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
      padding: "16px 20px",
      borderRadius: "12px",
      cursor: "pointer",
      transition: "all 0.3s ease",
      color: "#374151",
      fontSize: "15px",
      fontWeight: "500",
      border: "1px solid #e2e8f0",
      background: "#ffffff",
      position: "relative",
      overflow: "hidden",
    },

    mobileMenuItemActive: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
      padding: "16px 20px",
      borderRadius: "12px",
      cursor: "pointer",
      transition: "all 0.3s ease",
      color: "#ffffff",
      fontSize: "15px",
      fontWeight: "600",
      border: "1px solid transparent",
      background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
      boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
    },

    menuItemIcon: {
      fontSize: "18px",
      width: "24px",
      textAlign: "center",
    },

    logoutButton: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
      padding: "16px 20px",
      background: "linear-gradient(135deg, #ef4444, #dc2626)",
      border: "none",
      borderRadius: "12px",
      color: "#ffffff",
      fontSize: "15px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
      marginTop: "auto",
      boxShadow: "0 4px 15px rgba(239, 68, 68, 0.3)",
    },

    desktopLogoutButton: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "12px 20px",
      background: scrolled 
        ? "linear-gradient(135deg, #ef4444, #dc2626)" 
        : "rgba(239, 68, 68, 0.2)",
      border: scrolled 
        ? "none" 
        : "1px solid rgba(255, 255, 255, 0.3)",
      borderRadius: "12px",
      color: "#ffffff",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
      backdropFilter: "blur(10px)",
      boxShadow: scrolled ? "0 4px 15px rgba(239, 68, 68, 0.3)" : "none",
    },

    logoutIcon: {
      fontSize: "16px",
    },

    logoImgStyle: {
      height: "auto",
      width: "90px",
      filter: scrolled ? "none" : "brightness(0) invert(1)",
      transition: "filter 0.3s ease",
      borderRadius: "8px",
    },
  };

  // CSS animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      @keyframes pulse {
        0%, 100% { 
          transform: scale(1);
          opacity: 1;
        }
        50% { 
          transform: scale(1.1);
          opacity: 0.8;
        }
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

const handleOffersNavigation = async () => {
  try {
    // Reset count immediately when navigating
    setPendingOffersCount(0);
    setShowNotificationBadge(false);
    
    navigate("/admin/offers");
    setMobileMenuOpen(false);
    setShowNotificationDropdown(false);
    
    // Mark as seen
    markNotificationsAsSeen();
    
    // Refresh after navigation
    setTimeout(fetchNotificationCounts, 1500);
  } catch (error) {
    console.error("Navigation error:", error);
    alert("Error navigating to offers page");
  }
};

  // Handle notification click to show dropdown and mark as seen
const handleNotificationClick = async (e) => {
  e.stopPropagation();
  
  if (pendingOffersCount > 0) {
    // IMMEDIATE reset for better UX
    setPendingOffersCount(0);
    setShowNotificationBadge(false);
    
    // Toggle dropdown
    setShowNotificationDropdown(!showNotificationDropdown);
    
    // Mark as seen (don't wait for response)
    markNotificationsAsSeen().catch(error => {
      console.error('Failed to mark as seen:', error);
      // Keep count at 0 for better UX even if API fails
    });
  } else {
    setShowNotificationDropdown(!showNotificationDropdown);
  }
};

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowNotificationDropdown(false);
    };

    if (showNotificationDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showNotificationDropdown]);

  const handleStatsNavigation = () => {
    try {
      navigate("/detailsstats");
      setMobileMenuOpen(false);
      setShowNotificationDropdown(false);
    } catch (error) {
      console.error("Navigation error:", error);
      alert("Error navigating to statistics page");
    }
  };

  const handleDashboardNavigation = () => {
    try {
      navigate("/usershowpage");
      setMobileMenuOpen(false);
      setShowNotificationDropdown(false);
    } catch (error) {
      console.error("Navigation error:", error);
      alert("Error navigating to Dashboard page");
    }
  };

  // NEW: Handle subscription management navigation
  const handleSubscriptionNavigation = () => {
    try {
      navigate("/admin/subscriptionmanagement");
      setMobileMenuOpen(false);
      setShowNotificationDropdown(false);
    } catch (error) {
      console.error("Navigation error:", error);
      alert("Error navigating to subscription management page");
    }
  };

  const handleLogout = async () => {
    try {
      const confirmLogout = window.confirm("Are you sure you want to logout?");
      if (confirmLogout) {
        if (typeof logoutAdmin === 'function') {
          await logoutAdmin();
          navigate("/adminsignin");
          setMobileMenuOpen(false);
          setShowNotificationDropdown(false);
        } else {
          navigate("/adminsignin");
        }
      }
    } catch (error) {
      console.error("Error during logout:", error);
      navigate("/adminsignin");
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setShowNotificationDropdown(false); // Close notification dropdown when opening mobile menu
  };

  const addHoverEffect = (e, isActive, isLogout = false) => {
    if (!isActive) {
      if (isLogout) {
        e.target.style.transform = "translateY(-2px) scale(1.02)";
        e.target.style.boxShadow = "0 8px 25px rgba(239, 68, 68, 0.4)";
      } else {
        e.target.style.transform = "translateY(-2px) scale(1.02)";
        e.target.style.boxShadow = "0 8px 25px rgba(59, 130, 246, 0.2)";
        e.target.style.background = scrolled 
          ? "rgba(59, 130, 246, 0.1)" 
          : "rgba(255, 255, 255, 0.3)";
      }
    }
  };

  const removeHoverEffect = (e, isActive, isLogout = false) => {
    if (!isActive) {
      e.target.style.transform = "translateY(0) scale(1)";
      e.target.style.boxShadow = "none";
      if (!isLogout) {
        e.target.style.background = scrolled 
          ? "rgba(255, 255, 255, 0.9)" 
          : "rgba(255, 255, 255, 0.2)";
      }
    }
  };

  // Notification badge component
  const NotificationBadge = ({ count, isMobile = false }) => {
    if (isLoadingNotifications) {
      return React.createElement('div', { style: styles.notificationLoader });
    }
    
    if (count > 0) {
      const badgeStyle = isMobile ? styles.notificationBadgeMobile : styles.notificationBadge;
      return React.createElement('div', {
        style: badgeStyle,
        onClick: (e) => {
          e.stopPropagation();
          handleNotificationClick(e);
        },
        onMouseEnter: (e) => {
          e.target.style.transform = "scale(1.1)";
          e.target.style.boxShadow = "0 6px 20px rgba(239, 68, 68, 0.6), 0 0 0 2px white";
        },
        onMouseLeave: (e) => {
          e.target.style.transform = "scale(1)";
          e.target.style.boxShadow = isMobile ? 
            "0 2px 8px rgba(239, 68, 68, 0.4)" : 
            "0 4px 12px rgba(239, 68, 68, 0.4), 0 0 0 2px white";
        },
        title: `${count} pending offer${count !== 1 ? 's' : ''} - Click to view and mark as seen`
      }, count > 99 ? "99+" : count);
    }
    
    return null;
  };

  return React.createElement('div', { style: styles.navbar },
    isMobile ? [
      React.createElement('div', { key: 'mobile-header', style: styles.mobileHeader },
        React.createElement('img', { src: "./Images/Logo.png", alt: "LOGO", style: styles.logoImgStyle }),
        React.createElement('button', {
          style: styles.mobileMenuButton,
          onClick: toggleMobileMenu,
          onMouseEnter: (e) => {
            e.target.style.background = "rgba(255, 255, 255, 0.3)";
            e.target.style.transform = "scale(1.1)";
          },
          onMouseLeave: (e) => {
            e.target.style.background = "rgba(255, 255, 255, 0.2)";
            e.target.style.transform = "scale(1)";
          }
        }, '☰')
      ),
      
      React.createElement('div', { 
        key: 'mobile-overlay',
        style: styles.mobileMenuOverlay, 
        onClick: () => setMobileMenuOpen(false) 
      }),

      React.createElement('div', { key: 'mobile-menu', style: styles.mobileMenu },
        React.createElement('button', {
          style: styles.mobileCloseButton,
          onClick: () => setMobileMenuOpen(false),
          onMouseEnter: (e) => {
            e.target.style.background = "rgba(255, 255, 255, 0.3)";
            e.target.style.transform = "rotate(90deg)";
          },
          onMouseLeave: (e) => {
            e.target.style.background = "rgba(255, 255, 255, 0.2)";
            e.target.style.transform = "rotate(0deg)";
          }
        }, '✕'),

        React.createElement('div', { style: styles.mobileMenuHeader },
          React.createElement('div', {
            style: {
              ...styles.userInfoBox,
              background: "rgba(255, 255, 255, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.3)"
            }
          },
            React.createElement('div', { style: styles.userIcon }, '👤'),
            React.createElement('div', null,
              React.createElement('div', {
                style: { ...styles.userName, color: "#ffffff" }
              }, adminUser?.username || adminUser?.name || "Admin")
            )
          )
        ),

        React.createElement('div', { style: styles.mobileMenuContent },
          React.createElement('button', {
            style: isActiveRoute("/usershowpage") ? styles.mobileMenuItemActive : styles.mobileMenuItem,
            onClick: handleDashboardNavigation,
            onMouseEnter: (e) => addHoverEffect(e, isActiveRoute("/usershowpage")),
            onMouseLeave: (e) => removeHoverEffect(e, isActiveRoute("/usershowpage"))
          },
            React.createElement('span', { style: styles.menuItemIcon }, '📊'),
            React.createElement('span', null, 'Dashboard')
          ),

          React.createElement('button', {
            style: isActiveRoute("/detailsstats") ? styles.mobileMenuItemActive : styles.mobileMenuItem,
            onClick: handleStatsNavigation,
            onMouseEnter: (e) => addHoverEffect(e, isActiveRoute("/detailsstats")),
            onMouseLeave: (e) => removeHoverEffect(e, isActiveRoute("/detailsstats"))
          },
            React.createElement('span', { style: styles.menuItemIcon }, '📈'),
            React.createElement('span', null, 'Detailed Statistics')
          ),

          React.createElement('div', { style: styles.navButtonContainer },
            React.createElement('button', {
              style: isActiveRoute("/admin/offers") ? styles.mobileMenuItemActive : styles.mobileMenuItem,
              onClick: handleOffersNavigation,
              onMouseEnter: (e) => addHoverEffect(e, isActiveRoute("/admin/offers")),
              onMouseLeave: (e) => removeHoverEffect(e, isActiveRoute("/admin/offers"))
            },
              React.createElement('span', { style: styles.menuItemIcon }, '🎁'),
              React.createElement('span', null, 'Offers Details')
            ),
            React.createElement(NotificationBadge, { count: pendingOffersCount, isMobile: true })
          ),

          // NEW: Subscription Management button for mobile
          React.createElement('button', {
            style: isActiveRoute("/admin/subscriptionmanagement") ? styles.mobileMenuItemActive : styles.mobileMenuItem,
            onClick: handleSubscriptionNavigation,
            onMouseEnter: (e) => addHoverEffect(e, isActiveRoute("/admin/subscriptionmanagement")),
            onMouseLeave: (e) => removeHoverEffect(e, isActiveRoute("/admin/subscriptionmanagement"))
          },
            React.createElement('span', { style: styles.menuItemIcon }, '💳'),
            React.createElement('span', null, 'Subscription Management')
          ),

          React.createElement('button', {
            style: styles.logoutButton,
            onClick: handleLogout,
            onMouseEnter: (e) => addHoverEffect(e, false, true),
            onMouseLeave: (e) => removeHoverEffect(e, false, true)
          },
            React.createElement('span', { style: styles.logoutIcon }, '🚪'),
            React.createElement('span', null, 'Logout')
          )
        )
      )
    ] : 
    React.createElement('div', { style: styles.header },
      React.createElement('div', { style: styles.headerTop },
        React.createElement('img', { src: "./Images/Logo.png", alt: "LOGO", style: styles.logoImgStyle }),
        React.createElement('div', { style: styles.rightSection },
          React.createElement('div', { style: styles.userInfoBox },
            React.createElement('div', { style: styles.userIcon }, '👤'),
            React.createElement('div', null,
              React.createElement('div', { style: styles.userName },
                adminUser?.username || adminUser?.name || "Admin"
              )
            )
          ),
          React.createElement('button', {
            style: styles.desktopLogoutButton,
            onClick: handleLogout,
            onMouseEnter: (e) => addHoverEffect(e, false, true),
            onMouseLeave: (e) => removeHoverEffect(e, false, true)
          },
            React.createElement('span', { style: styles.logoutIcon }, '🚪'),
            React.createElement('span', null, 'Logout')
          )
        )
      ),

      React.createElement('div', { style: styles.navButtonsContainer },
        React.createElement('button', {
          style: isActiveRoute("/usershowpage") ? styles.desktopNavButtonActive : styles.desktopNavButton,
          onClick: handleDashboardNavigation,
          onMouseEnter: (e) => addHoverEffect(e, isActiveRoute("/usershowpage")),
          onMouseLeave: (e) => removeHoverEffect(e, isActiveRoute("/usershowpage"))
        }, '📊 User Dashboard'),

        React.createElement('button', {
          style: isActiveRoute("/detailsstats") ? styles.desktopNavButtonActive : styles.desktopNavButton,
          onClick: handleStatsNavigation,
          onMouseEnter: (e) => addHoverEffect(e, isActiveRoute("/detailsstats")),
          onMouseLeave: (e) => removeHoverEffect(e, isActiveRoute("/detailsstats"))
        }, '📈 Detailed Statistics'),

        React.createElement('div', { 
          style: styles.navButtonContainer,
          onClick: (e) => e.stopPropagation() // Prevent event bubbling
        },
          React.createElement('button', {
            style: isActiveRoute("/admin/offers") ? styles.desktopNavButtonActive : styles.desktopNavButton,
            onClick: handleOffersNavigation,
            onMouseEnter: (e) => addHoverEffect(e, isActiveRoute("/admin/offers")),
            onMouseLeave: (e) => removeHoverEffect(e, isActiveRoute("/admin/offers"))
          }, '🎁 Offers Details'),
          React.createElement(NotificationBadge, { count: pendingOffersCount }),
          // Notification Dropdown
          showNotificationDropdown && React.createElement(NotificationDropdown, {
            isOpen: showNotificationDropdown,
            onClose: () => setShowNotificationDropdown(false),
            onNavigateToOffers: handleOffersNavigation
          })
        ),

        // NEW: Subscription Management button for desktop
        React.createElement('button', {
          style: isActiveRoute("/admin/subscriptionmanagement") ? styles.desktopNavButtonActive : styles.desktopNavButton,
          onClick: handleSubscriptionNavigation,
          onMouseEnter: (e) => addHoverEffect(e, isActiveRoute("/admin/subscriptionmanagement")),
          onMouseLeave: (e) => removeHoverEffect(e, isActiveRoute("/admin/subscriptionmanagement"))
        }, '💳 Subscription Management')
      )
    )
  );
};

export default NavBar;