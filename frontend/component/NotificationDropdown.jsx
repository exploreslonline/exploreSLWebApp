import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const NotificationDropdown = ({ isOpen, onClose, onNavigateToOffers }) => {
  const [recentOffers, setRecentOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchRecentOffers();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const fetchRecentOffers = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get('http://localhost:5555/api/admin/notifications/recent?limit=10');
      
      if (response.data.success) {
        setRecentOffers(response.data.recentOffers);
      } else {
        setError('Failed to fetch recent offers');
      }
    } catch (err) {
      console.error('Error fetching recent offers:', err);
      setError('Error loading notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAllOffers = () => {
    onNavigateToOffers();
    onClose();
  };

  const handleOfferClick = (offer) => {
    console.log('Clicked offer:', offer.title);
    onNavigateToOffers();
    onClose();
  };

  const styles = {
    dropdown: {
      position: "absolute",
      top: "100%",
      right: 0,
      width: "380px",
      maxHeight: "500px",
      backgroundColor: "white",
      borderRadius: "16px",
      boxShadow: "0 25px 50px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
      border: "1px solid #e5e7eb",
      zIndex: 1001,
      overflow: "hidden",
      transform: isOpen ? "translateY(8px) scale(1)" : "translateY(0) scale(0.95)",
      opacity: isOpen ? 1 : 0,
      visibility: isOpen ? "visible" : "hidden",
      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      backdropFilter: "blur(10px)",
    },

    header: {
      padding: "20px 24px 16px",
      borderBottom: "1px solid #f1f5f9",
      background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
    },

    headerTitle: {
      margin: "0 0 4px 0",
      fontSize: "18px",
      fontWeight: "700",
      color: "#1e293b",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },

    headerSubtitle: {
      margin: 0,
      fontSize: "14px",
      color: "#64748b",
    },

    content: {
      maxHeight: "320px",
      overflowY: "auto",
      className: "notification-dropdown-content",
    },

    loadingContainer: {
      padding: "40px 24px",
      textAlign: "center",
      color: "#64748b",
    },

    spinner: {
      width: "24px",
      height: "24px",
      border: "2px solid #e2e8f0",
      borderTop: "2px solid #667eea",
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
      margin: "0 auto 12px",
    },

    errorContainer: {
      padding: "40px 24px",
      textAlign: "center",
      color: "#dc2626",
    },

    emptyContainer: {
      padding: "40px 24px",
      textAlign: "center",
      color: "#64748b",
    },

    emptyIcon: {
      fontSize: "48px",
      marginBottom: "12px",
      opacity: 0.5,
    },

    offerItem: {
      padding: "16px 24px",
      borderBottom: "1px solid #f8fafc",
      cursor: "pointer",
      transition: "all 0.2s ease",
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
    },

    offerIcon: {
      width: "40px",
      height: "40px",
      borderRadius: "10px",
      background: "linear-gradient(135deg, #f59e0b, #d97706)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "18px",
      flexShrink: 0,
      marginTop: "2px",
    },

    offerContent: {
      flex: 1,
      minWidth: 0,
    },

    offerTitle: {
      margin: "0 0 4px 0",
      fontSize: "14px",
      fontWeight: "600",
      color: "#1e293b",
      lineHeight: "1.4",
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
    },

    offerMeta: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "4px",
      flexWrap: "wrap",
    },

    offerBusiness: {
      fontSize: "12px",
      color: "#667eea",
      fontWeight: "500",
    },

    offerDiscount: {
      fontSize: "12px",
      background: "linear-gradient(135deg, #10b981, #059669)",
      color: "white",
      padding: "2px 8px",
      borderRadius: "12px",
      fontWeight: "600",
    },

    offerTime: {
      fontSize: "11px",
      color: "#94a3b8",
      marginTop: "2px",
    },

    footer: {
      padding: "16px 24px",
      borderTop: "1px solid #f1f5f9",
      background: "#fafbfc",
    },

    viewAllButton: {
      width: "100%",
      padding: "12px 20px",
      background: "linear-gradient(135deg, #667eea, #764ba2)",
      color: "white",
      border: "none",
      borderRadius: "12px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
    },

    badge: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: "20px",
      height: "20px",
      background: "#ef4444",
      color: "white",
      borderRadius: "10px",
      fontSize: "11px",
      fontWeight: "700",
      padding: "0 6px",
    },

    // Mobile responsiveness
    "@media (max-width: 480px)": {
      dropdown: {
        width: "320px",
        right: "-20px",
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef} 
      style={styles.dropdown}
      onClick={(e) => e.stopPropagation()} // Prevent dropdown from closing when clicking inside
    >
      <div style={styles.header}>
        <h3 style={styles.headerTitle}>
          🔔 New Offers
          {recentOffers.length > 0 && (
            <span style={styles.badge}>{recentOffers.length}</span>
          )}
        </h3>
        <p style={styles.headerSubtitle}>
          Recent offers awaiting review
        </p>
      </div>

      <div style={styles.content} className="notification-dropdown-content">
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>Loading notifications...</p>
          </div>
        ) : error ? (
          <div style={styles.errorContainer}>
            <p>⚠️ {error}</p>
            <button 
              onClick={fetchRecentOffers}
              style={{
                marginTop: "8px",
                padding: "6px 12px",
                background: "#667eea",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
              Retry
            </button>
          </div>
        ) : recentOffers.length === 0 ? (
          <div style={styles.emptyContainer}>
            <div style={styles.emptyIcon}>🎉</div>
            <h4 style={{ margin: "0 0 8px 0", color: "#1e293b" }}>All caught up!</h4>
            <p style={{ margin: 0, fontSize: "14px" }}>No pending offers at the moment.</p>
          </div>
        ) : (
          recentOffers.map((offer, index) => (
            <div
              key={offer._id}
              style={{
                ...styles.offerItem,
                ...(index === recentOffers.length - 1 ? { borderBottom: "none" } : {})
              }}
              onClick={() => handleOfferClick(offer)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f8fafc";
                e.currentTarget.style.transform = "translateX(4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.transform = "translateX(0)";
              }}
            >
              <div style={styles.offerIcon}>🎁</div>
              <div style={styles.offerContent}>
                <h4 style={styles.offerTitle}>{offer.title}</h4>
                <div style={styles.offerMeta}>
                  <span style={styles.offerBusiness}>{offer.businessName}</span>
                  <span style={styles.offerDiscount}>{offer.discount} OFF</span>
                </div>
                <p style={styles.offerTime}>{offer.timeAgo}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={styles.footer}>
        <button
          style={styles.viewAllButton}
          onClick={handleViewAllOffers}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-1px)";
            e.target.style.boxShadow = "0 8px 25px rgba(102, 126, 234, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "none";
          }}
        >
          <span>📋</span>
          View All Offers ({recentOffers.length})
        </button>
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          /* Custom scrollbar for the dropdown */
          .notification-dropdown-content::-webkit-scrollbar {
            width: 6px;
          }
          
          .notification-dropdown-content::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 3px;
          }
          
          .notification-dropdown-content::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
          }
          
          .notification-dropdown-content::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}
      </style>
    </div>
  );
};

export default NotificationDropdown;