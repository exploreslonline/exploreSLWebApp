import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminAuthContext } from '../src/AdminAuthContext';
import NavBar from '../component/Navbar';

const AdminSubscriptionsManagement = () => {
  // State declarations
  const [subscriptions, setSubscriptions] = useState([]);
  const [freeUsers, setFreeUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('premium'); // New state for tab switching
  const [stats, setStats] = useState({
    totalAutoRenewal: 0,
    activeAutoRenewal: 0,
    pendingRenewal: 0,
    failedRenewal: 0,
    totalSubscriptions: 0
  });
  const [freeUserStats, setFreeUserStats] = useState({}); // New state for free user stats
  const [monitoring, setMonitoring] = useState({
    dueTomorrow: 0,
    dueThisWeek: 0,
    failedRenewals: 0,
    cancelledDueToFailure: 0,
    totalAutoRenewalSubscriptions: 0
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 20
  });
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const { adminUser, isLoading, logoutAdmin } = useContext(AdminAuthContext);
  const navigate = useNavigate();

  // API base URL
  const API_BASE_URL = 'http://localhost:5555';

  // Enhanced styles
  const styles = {
    container: {
      fontSize: '16px',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      padding: '2rem',
    },
    header: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '2rem',
      borderRadius: '16px',
      textAlign: 'center',
      marginBottom: '2rem',
      boxShadow: '0 10px 25px rgba(102, 126, 234, 0.25)',
      position: 'relative',
      overflow: 'hidden',
    },
    headerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
      zIndex: 1,
    },
    headerContent: {
      position: 'relative',
      zIndex: 2,
    },
    headerTitle: {
      margin: '0 0 0.5rem 0',
      fontSize: 'clamp(2rem, 4vw, 3rem)',
      fontWeight: '700',
      letterSpacing: '-0.02em',
      textShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    headerSubtitle: {
      margin: '0',
      fontSize: 'clamp(1rem, 2vw, 1.25rem)',
      opacity: '0.9',
      fontWeight: '400',
    },
    tabContainer: {
      display: 'flex',
      gap: '0.5rem',
      marginBottom: '2rem',
      background: 'white',
      padding: '0.5rem',
      borderRadius: '20px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
      border: '1px solid #e5e7eb',
    },
    tab: {
      padding: '1rem 2rem',
      border: 'none',
      background: 'transparent',
      color: '#6b7280',
      borderRadius: '16px',
      cursor: 'pointer',
      fontWeight: '700',
      fontSize: '1rem',
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      whiteSpace: 'nowrap',
      position: 'relative',
      overflow: 'hidden',
      minWidth: 'fit-content',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    tabActive: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      boxShadow: '0 8px 24px rgba(102, 126, 234, 0.35), 0 0 0 1px rgba(102, 126, 234, 0.1)',
      transform: 'scale(1.05)',
    },
    statsContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem',
    },
    statCard: {
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      padding: '1.5rem',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.5)',
      textAlign: 'center',
      transition: 'all 0.3s ease',
    },
    statNumber: {
      fontSize: '2.5rem',
      fontWeight: '800',
      margin: '0 0 0.5rem 0',
      background: 'linear-gradient(135deg, #667eea, #764ba2)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    statLabel: {
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    loadingSpinner: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4rem 2rem',
      color: '#64748b',
    },
    spinner: {
      width: '48px',
      height: '48px',
      border: '4px solid #e2e8f0',
      borderTop: '4px solid #667eea',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '1rem',
    },
    alertContainer: {
      padding: '1rem 1.5rem',
      borderRadius: '12px',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      fontWeight: '500',
      border: '1px solid',
    },
    errorAlert: {
      backgroundColor: '#fef2f2',
      color: '#dc2626',
      borderColor: '#fecaca',
    },
    successAlert: {
      backgroundColor: '#f0fdf4',
      color: '#16a34a',
      borderColor: '#bbf7d0',
    },
    alertIcon: {
      marginRight: '12px',
      fontSize: '1.25rem',
    },
    monitoringContainer: {
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      padding: '2rem',
      borderRadius: '16px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
      marginBottom: '2rem',
      border: '1px solid #e2e8f0',
    },
    monitoringTitle: {
      margin: '0 0 1.5rem 0',
      color: '#1e293b',
      fontSize: '1.5rem',
      fontWeight: '700',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    monitoringGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem',
    },
    monitoringItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
    },
    filterTabs: {
      display: 'flex',
      gap: '0.5rem',
      marginBottom: '2rem',
      background: 'white',
      padding: '0.5rem',
      borderRadius: '20px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
      overflowX: 'auto',
      border: '1px solid #e5e7eb',
    },
    filterTab: {
      padding: '0.875rem 1.75rem',
      border: 'none',
      background: 'transparent',
      color: '#6b7280',
      borderRadius: '16px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '0.875rem',
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      whiteSpace: 'nowrap',
      position: 'relative',
      overflow: 'hidden',
      minWidth: 'fit-content',
    },
    filterTabActive: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      boxShadow: '0 8px 24px rgba(102, 126, 234, 0.35), 0 0 0 1px rgba(102, 126, 234, 0.1)',
      transform: 'scale(1.05)',
    },
    subscriptionsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
    },
    noSubscriptions: {
      textAlign: 'center',
      padding: '4rem 2rem',
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      borderRadius: '16px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
      color: '#64748b',
      border: '1px solid #e2e8f0',
    },
    noSubscriptionsIcon: {
      fontSize: '4rem',
      marginBottom: '1rem',
      opacity: '0.5',
    },
    subscriptionCard: {
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      borderRadius: '16px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      border: '1px solid #e2e8f0',
      position: 'relative',
    },
    cardHeader: {
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: '1.5rem',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: '1rem',
    },
    userSection: {
      flex: '1',
      minWidth: '300px',
    },
    cardTitle: {
      margin: '0 0 0.75rem 0',
      color: '#1e293b',
      fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
      fontWeight: '700',
      lineHeight: '1.3',
      letterSpacing: '-0.01em',
    },
    planBadge: {
      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      color: 'white',
      padding: '0.5rem 1rem',
      borderRadius: '9999px',
      fontWeight: '700',
      fontSize: '0.875rem',
      display: 'inline-flex',
      alignItems: 'center',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
      letterSpacing: '0.025em',
    },
    freePlanBadge: {
      background: 'linear-gradient(135deg, #10b981, #059669)',
      color: 'white',
      padding: '0.5rem 1rem',
      borderRadius: '9999px',
      fontWeight: '700',
      fontSize: '0.875rem',
      display: 'inline-flex',
      alignItems: 'center',
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
      letterSpacing: '0.025em',
    },
    statusBadge: {
      padding: '0.5rem 1rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.375rem',
    },
    statusActive: {
      backgroundColor: '#d1fae5',
      color: '#059669',
      border: '1px solid #a7f3d0',
    },
    statusInactive: {
      backgroundColor: '#fef3c7',
      color: '#d97706',
      border: '1px solid #fed7aa',
    },
    statusCancelled: {
      backgroundColor: '#fecaca',
      color: '#dc2626',
      border: '1px solid #f87171',
    },
    statusPendingRenewal: {
      backgroundColor: '#ddd6fe',
      color: '#7c3aed',
      border: '1px solid #c4b5fd',
    },
    statusPaymentFailed: {
      backgroundColor: '#fecaca',
      color: '#dc2626',
      border: '1px solid #f87171',
    },
    limitBadge: {
      padding: '0.25rem 0.75rem',
      borderRadius: '12px',
      fontSize: '0.75rem',
      fontWeight: '600',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      margin: '0.25rem',
    },
    limitExceeded: {
      backgroundColor: '#fef2f2',
      color: '#dc2626',
      border: '1px solid #fecaca',
    },
    limitNormal: {
      backgroundColor: '#f0fdf4',
      color: '#16a34a',
      border: '1px solid #bbf7d0',
    },
    usageBar: {
      width: '100%',
      height: '8px',
      backgroundColor: '#f1f5f9',
      borderRadius: '4px',
      overflow: 'hidden',
      marginTop: '0.5rem',
    },
    usageProgress: {
      height: '100%',
      borderRadius: '4px',
      transition: 'width 0.3s ease',
    },
    cardBody: {
      padding: '2rem',
    },
    sectionsContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem',
    },
    section: {
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      padding: '1.5rem',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
      position: 'relative',
    },
    sectionHeader: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '1.25rem',
      paddingBottom: '0.75rem',
      borderBottom: '2px solid #e2e8f0',
    },
    sectionIcon: {
      width: '2rem',
      height: '2rem',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: '0.75rem',
      fontSize: '1rem',
      fontWeight: '600',
    },
    subscriptionIcon: {
      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      color: 'white',
    },
    userIcon: {
      background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      color: 'white',
    },
    renewalIcon: {
      background: 'linear-gradient(135deg, #10b981, #059669)',
      color: 'white',
    },
    paymentIcon: {
      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
      color: 'white',
    },
    usageIcon: {
      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
      color: 'white',
    },
    businessIcon: {
      background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      color: 'white',
    },
    sectionTitle: {
      margin: '0',
      color: '#1e293b',
      fontSize: '1.125rem',
      fontWeight: '700',
      letterSpacing: '-0.01em',
    },
    detailItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '0.75rem',
      paddingBottom: '0.75rem',
      borderBottom: '1px solid #f1f5f9',
    },
    detailItemLast: {
      marginBottom: '0',
      borderBottom: 'none',
      paddingBottom: '0',
    },
    label: {
      fontWeight: '600',
      color: '#475569',
      minWidth: '120px',
      flexShrink: '0',
      fontSize: '0.875rem',
    },
    value: {
      color: '#1e293b',
      textAlign: 'right',
      flex: '1',
      marginLeft: '1rem',
      wordBreak: 'break-word',
      fontSize: '0.875rem',
      fontWeight: '500',
    },
    actionsContainer: {
      display: 'flex',
      gap: '0.75rem',
      justifyContent: 'center',
      paddingTop: '2rem',
      borderTop: '2px solid #e2e8f0',
      flexWrap: 'wrap',
    },
    btn: {
      position: 'relative',
      padding: '0.875rem 2rem',
      border: 'none',
      borderRadius: '14px',
      fontWeight: '700',
      fontSize: '0.875rem',
      cursor: 'pointer',
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '140px',
      textDecoration: 'none',
      overflow: 'hidden',
      letterSpacing: '0.025em',
      textTransform: 'uppercase',
      fontFamily: 'inherit',
      outline: 'none',
      backgroundSize: '200% 100%',
      backgroundPosition: 'left center',
    },
    btnPrimary: {
      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #1e40af 100%)',
      color: 'white',
      boxShadow: '0 8px 32px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
    },
    btnSecondary: {
      background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%)',
      color: '#475569',
      boxShadow: '0 8px 32px rgba(148, 163, 184, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      border: '1px solid rgba(148, 163, 184, 0.3)',
    },
    btnTest: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
      color: 'white',
      boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
    },
    pagination: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '1rem',
      marginTop: '2rem',
      padding: '2rem',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    },
    paginationButton: {
      padding: '0.75rem 1.5rem',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      background: 'white',
      cursor: 'pointer',
      fontWeight: '600',
      transition: 'all 0.3s ease',
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(8px)',
    },
    modalContent: {
      background: 'white',
      borderRadius: '16px',
      width: '90%',
      maxWidth: '800px',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
      animation: 'modalAppear 0.3s ease-out',
    },
    modalHeader: {
      padding: '2rem',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
      borderRadius: '16px 16px 0 0',
    },
    modalTitle: {
      margin: '0',
      color: '#1e293b',
      fontSize: '1.5rem',
      fontWeight: '700',
      letterSpacing: '-0.01em',
    },
    modalClose: {
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      color: '#64748b',
      cursor: 'pointer',
      padding: '0.5rem',
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease',
    },
    modalBody: {
      padding: '2rem',
    },
    warningBox: {
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      padding: '1rem',
      marginTop: '1rem',
    },
    businessList: {
      maxHeight: '150px',
      overflow: 'auto',
      background: '#f8fafc',
      padding: '0.75rem',
      borderRadius: '6px',
      fontSize: '0.75rem',
      marginTop: '0.5rem',
    },
    businessItem: {
      padding: '0.25rem 0',
      borderBottom: '1px solid #e2e8f0',
    },
    businessItemLast: {
      borderBottom: 'none',
    },
  };

  // Clear success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Fetch data when component mounts or filter changes
  useEffect(() => {
    if (activeTab === 'premium') {
      fetchSubscriptions();
      fetchMonitoringData();
    } else if (activeTab === 'free') {
      fetchFreeUsers();
    }
  }, [filter, pagination.currentPage, activeTab]);

  // API functions
  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('Fetching subscriptions with filter:', filter);

      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
      });

      if (filter !== 'all') {
        params.append('status', filter);
      }

      const url = `${API_BASE_URL}/api/admin/auto-renewal-subscriptions?${params}`;
      console.log('Fetching from URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Received data:', data);

      if (data.success) {
        setSubscriptions(data.subscriptions || []);
        setStats(data.stats || {});
        setPagination(prev => ({
          ...prev,
          ...data.pagination
        }));
        console.log(`Set ${data.subscriptions?.length || 0} subscriptions`);
      } else {
        console.error('API returned success: false');
        setError(data.message || 'Failed to fetch subscriptions');
      }
    } catch (error) {
      console.error('Fetch subscriptions error:', error);
      setError(`Failed to fetch subscriptions: ${error.message}`);
      setSubscriptions([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  // New function to fetch free users
  const fetchFreeUsers = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('Fetching free users with filter:', filter);

      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
      });

      if (filter !== 'all') {
        params.append('status', filter);
      }

      const url = `${API_BASE_URL}/api/admin/free-subscription-users?${params}`;
      console.log('Fetching from URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Received free users data:', data);

      if (data.success) {
        setFreeUsers(data.freeUsers || []);
        setFreeUserStats(data.stats || {});
        setPagination(prev => ({
          ...prev,
          ...data.pagination
        }));
        console.log(`Set ${data.freeUsers?.length || 0} free users`);
      } else {
        console.error('API returned success: false');
        setError(data.message || 'Failed to fetch free users');
      }
    } catch (error) {
      console.error('Fetch free users error:', error);
      setError(`Failed to fetch free users: ${error.message}`);
      setFreeUsers([]);
      setFreeUserStats({});
    } finally {
      setLoading(false);
    }
  };

  const fetchMonitoringData = async () => {
    try {
      console.log('Fetching monitoring data...');
      const response = await fetch(`${API_BASE_URL}/api/admin/renewal-monitoring`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Monitoring data received:', data);
        if (data.success) {
          setMonitoring(data.monitoring || {});
        }
      } else {
        console.warn('Failed to fetch monitoring data:', response.status);
      }
    } catch (error) {
      console.error('Monitoring fetch error:', error);
    }
  };

  const testConnection = async () => {
    try {
      setError('');
      setSuccess('');
      console.log('Testing connection...');
      
      const response = await fetch(`${API_BASE_URL}/api/admin/debug-subscriptions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      console.log('Test response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Test response data:', data);
        setSuccess(`Connection successful! Found ${data.totalSubscriptions || 0} total subscriptions in database`);
        setTimeout(() => setSuccess(''), 5000);
      } else {
        const errorText = await response.text();
        console.error('Test connection failed:', errorText);
        setError(`Connection failed: HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Test connection error:', error);
      setError(`Connection failed: ${error.message}`);
    }
  };

  // Utility functions
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount, currency = 'LKR') => {
    if (!amount && amount !== 0) return 'N/A';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'LKR'
      }).format(amount);
    } catch {
      return `${amount} ${currency}`;
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'active': { style: styles.statusActive, text: 'Active', icon: '✅' },
      'inactive': { style: styles.statusInactive, text: 'Inactive', icon: '⏸️' },
      'cancelled': { style: styles.statusCancelled, text: 'Cancelled', icon: '❌' },
      'pending_renewal': { style: styles.statusPendingRenewal, text: 'Pending Renewal', icon: '⏳' },
      'payment_failed': { style: styles.statusPaymentFailed, text: 'Payment Failed', icon: '⚠️' },
    };

    const config = statusConfig[status] || statusConfig['active'];
    return (
      <span style={{ ...styles.statusBadge, ...config.style }}>
        <span>{config.icon}</span>
        {config.text}
      </span>
    );
  };

  const getUsageProgressColor = (percentage) => {
    if (percentage >= 100) return 'linear-gradient(135deg, #dc2626, #b91c1c)';
    if (percentage >= 80) return 'linear-gradient(135deg, #d97706, #b45309)';
    if (percentage >= 60) return 'linear-gradient(135deg, #ca8a04, #a16207)';
    return 'linear-gradient(135deg, #059669, #047857)';
  };

  // Event handlers
  const handleFilterChange = (newFilter) => {
    console.log('Changing filter to:', newFilter);
    setFilter(newFilter);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleTabChange = (newTab) => {
    console.log('Changing tab to:', newTab);
    setActiveTab(newTab);
    setFilter('all');
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    setError('');
    setSuccess('');
  };

  const handlePageChange = (newPage) => {
    console.log('Changing page to:', newPage);
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  };

  const openModal = (subscription) => {
    console.log('Opening modal for subscription:', subscription._id);
    setSelectedSubscription(subscription);
    setShowDetailsModal(true);
  };

  const closeModal = () => {
    setSelectedSubscription(null);
    setShowDetailsModal(false);
  };

  // Get filtered data based on active tab
  const getFilteredData = () => {
    if (activeTab === 'premium') {
      if (filter === 'all') return subscriptions;
      return subscriptions.filter(sub => sub.status === filter);
    } else {
      if (filter === 'all') return freeUsers;
      return freeUsers.filter(user => user.status === filter);
    }
  };

  const getFilterCount = (filterType) => {
    const data = activeTab === 'premium' ? subscriptions : freeUsers;
    if (filterType === 'all') return data.length;
    return data.filter(item => item.status === filterType).length;
  };

  // Get current stats based on active tab
  const getCurrentStats = () => {
    if (activeTab === 'premium') {
      return [
        { number: stats.totalSubscriptions || subscriptions.length, label: 'Total Subscriptions' },
        { number: stats.activeAutoRenewal || 0, label: 'Active Auto-Renewal' },
        { number: stats.pendingRenewal || 0, label: 'Pending Renewal' },
        { number: stats.failedRenewal || 0, label: 'Failed Renewals' }
      ];
    } else {
      return [
        { number: freeUserStats.totalFreeUsers || freeUsers.length, label: 'Total Free Users' },
        { number: freeUserStats.activeFreeUsers || 0, label: 'Active Free Users' },
        { number: freeUserStats.usersExceedingLimits || 0, label: 'Exceeding Limits' },
        { number: freeUserStats.conversionOpportunity || 0, label: 'Conversion Opportunity' }
      ];
    }
  };

  // Get available filters based on active tab
  const getAvailableFilters = () => {
    if (activeTab === 'premium') {
      return ['all', 'active', 'pending_renewal', 'payment_failed', 'cancelled', 'inactive'];
    } else {
      return ['all', 'active', 'inactive'];
    }
  };

  // Render loading state
  if (loading && ((activeTab === 'premium' && subscriptions.length === 0) || (activeTab === 'free' && freeUsers.length === 0))) {
    return (
      <div style={styles.container}>
        <NavBar adminUser={adminUser} logoutAdmin={logoutAdmin} />
        <div style={styles.loadingSpinner}>
          <div style={styles.spinner}></div>
          <p>Loading {activeTab} users...</p>
          <button 
            onClick={testConnection}
            style={{...styles.btn, ...styles.btnTest, marginTop: '1rem'}}
            className="btn-enhanced"
          >
            Test Connection
          </button>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <NavBar adminUser={adminUser} logoutAdmin={logoutAdmin} />
      
      {/* Header
      <div style={styles.header}>
        <div style={styles.headerOverlay}></div>
        <div style={styles.headerContent}>
          <h1 style={styles.headerTitle}>User Management Dashboard</h1>
          <p style={styles.headerSubtitle}>Monitor and manage both premium subscriptions and free users</p>
        </div>
      </div> */}

      {/* Tab Navigation */}
      <div style={styles.tabContainer}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'premium' ? styles.tabActive : {})
          }}
          onClick={() => handleTabChange('premium')}
          className="tab-enhanced"
        >
          💳 Premium Subscriptions
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'free' ? styles.tabActive : {})
          }}
          onClick={() => handleTabChange('free')}
          className="tab-enhanced"
        >
          🆓 Free Users
        </button>
      </div>

      {/* Statistics */}
      <div style={styles.statsContainer}>
        {getCurrentStats().map((stat, index) => (
          <div key={index} style={styles.statCard} className="stat-card-enhanced">
            <div style={styles.statNumber}>{stat.number}</div>
            <div style={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Premium Tab - Renewal Monitoring (only show for premium tab) */}
      {activeTab === 'premium' && (
        <div style={styles.monitoringContainer}>
          <h2 style={styles.monitoringTitle}>
            <span>📊</span>
            Renewal Monitoring Dashboard
          </h2>
          <div style={styles.monitoringGrid}>
            <div style={styles.monitoringItem}>
              <span style={{fontWeight: '600', color: '#475569'}}>Due Tomorrow:</span>
              <strong style={{color: '#dc2626', fontSize: '1.125rem'}}>{monitoring.dueTomorrow || 0}</strong>
            </div>
            <div style={styles.monitoringItem}>
              <span style={{fontWeight: '600', color: '#475569'}}>Due This Week:</span>
              <strong style={{color: '#d97706', fontSize: '1.125rem'}}>{monitoring.dueThisWeek || 0}</strong>
            </div>
            <div style={styles.monitoringItem}>
              <span style={{fontWeight: '600', color: '#475569'}}>Failed Renewals:</span>
              <strong style={{color: '#7c3aed', fontSize: '1.125rem'}}>{monitoring.failedRenewals || 0}</strong>
            </div>
            <div style={styles.monitoringItem}>
              <span style={{fontWeight: '600', color: '#475569'}}>Cancelled (30 days):</span>
              <strong style={{color: '#059669', fontSize: '1.125rem'}}>{monitoring.cancelledDueToFailure || 0}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Free Users Tab - Summary (only show for free tab) */}
      {activeTab === 'free' && (
        <div style={styles.monitoringContainer}>
          <h2 style={styles.monitoringTitle}>
            <span>📈</span>
            Free Users Summary
          </h2>
          <div style={styles.monitoringGrid}>
            <div style={styles.monitoringItem}>
              <span style={{fontWeight: '600', color: '#475569'}}>Average Businesses:</span>
              <strong style={{color: '#3b82f6', fontSize: '1.125rem'}}>{freeUserStats.averageBusinessesPerUser || '0.0'}</strong>
            </div>
            <div style={styles.monitoringItem}>
              <span style={{fontWeight: '600', color: '#475569'}}>Average Offers:</span>
              <strong style={{color: '#8b5cf6', fontSize: '1.125rem'}}>{freeUserStats.averageOffersPerUser || '0.0'}</strong>
            </div>
            <div style={styles.monitoringItem}>
              <span style={{fontWeight: '600', color: '#475569'}}>Users with Businesses:</span>
              <strong style={{color: '#10b981', fontSize: '1.125rem'}}>{freeUserStats.usersWithBusinesses || 0}</strong>
            </div>
            <div style={styles.monitoringItem}>
              <span style={{fontWeight: '600', color: '#475569'}}>Users with Offers:</span>
              <strong style={{color: '#f59e0b', fontSize: '1.125rem'}}>{freeUserStats.usersWithOffers || 0}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div style={{...styles.alertContainer, ...styles.errorAlert}}>
          <span style={styles.alertIcon}>⚠️</span>
          <div style={{flex: 1}}>
            <div>{error}</div>
            <button 
              onClick={testConnection}
              style={{
                ...styles.btn,
                ...styles.btnSecondary,
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                padding: '0.5rem 1rem',
                minWidth: 'auto'
              }}
              className="btn-enhanced"
            >
              🔍 Test Connection
            </button>
          </div>
        </div>
      )}

      {success && (
        <div style={{...styles.alertContainer, ...styles.successAlert}}>
          <span style={styles.alertIcon}>✅</span>
          {success}
        </div>
      )}

      {/* Filter Tabs */}
      <div style={styles.filterTabs}>
        {getAvailableFilters().map((filterType) => (
          <button
            key={filterType}
            style={{
              ...styles.filterTab,
              ...(filter === filterType ? styles.filterTabActive : {})
            }}
            onClick={() => handleFilterChange(filterType)}
            className="filter-tab-enhanced"
          >
            {filterType === 'all' 
              ? `All (${getFilterCount('all')})`
              : `${filterType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} (${getFilterCount(filterType)})`
            }
          </button>
        ))}
      </div>

      {/* Users List */}
      <div style={styles.subscriptionsList}>
        {getFilteredData().length === 0 ? (
          <div style={styles.noSubscriptions}>
            <div style={styles.noSubscriptionsIcon}>{activeTab === 'premium' ? '💳' : '🆓'}</div>
            <h3>No {activeTab} users found</h3>
            <p>
              {(activeTab === 'premium' ? subscriptions : freeUsers).length === 0 
                ? `No ${activeTab} user data available. Check your backend connection and database.`
                : `No ${activeTab} users match the current filter criteria.`
              }
            </p>
            {(activeTab === 'premium' ? subscriptions : freeUsers).length === 0 && (
              <div style={{marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap'}}>
                <button 
                  onClick={testConnection}
                  style={{...styles.btn, ...styles.btnTest}}
                  className="btn-enhanced"
                >
                  🔍 Test Connection
                </button>
                <button 
                  onClick={() => {
                    setError('');
                    setSuccess('');
                    if (activeTab === 'premium') {
                      fetchSubscriptions();
                    } else {
                      fetchFreeUsers();
                    }
                  }}
                  style={{...styles.btn, ...styles.btnPrimary}}
                  className="btn-enhanced"
                >
                  🔄 Retry Fetch
                </button>
              </div>
            )}
          </div>
        ) : (
          getFilteredData().map((item, index) => (
            <div key={item._id || index} style={styles.subscriptionCard} className="subscription-card-enhanced">
              {/* Render Premium Subscription Card */}
              {activeTab === 'premium' ? (
                <>
                  <div style={styles.cardHeader}>
                    <div style={styles.userSection}>
                      <h3 style={styles.cardTitle}>
                        {item.userDetails?.firstName || 'Unknown'} {item.userDetails?.lastName || 'User'}
                      </h3>
                      <div style={styles.planBadge}>
                        {item.planName || `Plan ${item.planId}` || 'Unknown Plan'}
                      </div>
                    </div>
                    <div>
                      {getStatusBadge(item.status)}
                    </div>
                  </div>

                  <div style={styles.cardBody}>
                    <div style={styles.sectionsContainer}>
                      {/* Subscription Details Section */}
                      <div style={styles.section}>
                        <div style={styles.sectionHeader}>
                          <div style={{...styles.sectionIcon, ...styles.subscriptionIcon}}>💳</div>
                          <h4 style={styles.sectionTitle}>Subscription Details</h4>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.label}>Plan ID:</span>
                          <span style={styles.value}>{item.planId || 'N/A'}</span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.label}>Amount:</span>
                          <span style={styles.value}>
                            {formatCurrency(item.amount, item.currency)}
                          </span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.label}>Billing Cycle:</span>
                          <span style={styles.value}>
                            {item.billingCycle || 'Monthly'}
                          </span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.label}>Auto Renew:</span>
                          <span style={styles.value}>
                            {item.autoRenew ? '✅ Enabled' : '❌ Disabled'}
                          </span>
                        </div>
                        <div style={{...styles.detailItem, ...styles.detailItemLast}}>
                          <span style={styles.label}>Created:</span>
                          <span style={styles.value}>
                            {formatDate(item.createdAt || item.startDate)}
                          </span>
                        </div>
                      </div>

                      {/* User Information Section */}
                      <div style={styles.section}>
                        <div style={styles.sectionHeader}>
                          <div style={{...styles.sectionIcon, ...styles.userIcon}}>👤</div>
                          <h4 style={styles.sectionTitle}>User Information</h4>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.label}>User ID:</span>
                          <span style={styles.value}>#{item.userId || 'N/A'}</span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.label}>Email:</span>
                          <span style={styles.value}>
                            {item.userDetails?.email || item.userEmail || 'N/A'}
                          </span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.label}>Business:</span>
                          <span style={styles.value}>
                            {item.userDetails?.businessName || 'N/A'}
                          </span>
                        </div>
                        <div style={{...styles.detailItem, ...styles.detailItemLast}}>
                          <span style={styles.label}>User Type:</span>
                          <span style={styles.value}>
                            {item.userDetails?.userType || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Renewal Information Section */}
                      <div style={styles.section}>
                        <div style={styles.sectionHeader}>
                          <div style={{...styles.sectionIcon, ...styles.renewalIcon}}>🔄</div>
                          <h4 style={styles.sectionTitle}>Renewal Information</h4>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.label}>Next Billing:</span>
                          <span style={styles.value}>
                            {formatDate(item.nextBillingDate)}
                          </span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.label}>Days Until:</span>
                          <span style={styles.value}>
                            {item.daysUntilRenewal !== null && item.daysUntilRenewal !== undefined
                              ? `${item.daysUntilRenewal} days`
                              : 'N/A'
                            }
                          </span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.label}>End Date:</span>
                          <span style={styles.value}>
                            {formatDate(item.endDate)}
                          </span>
                        </div>
                        <div style={{...styles.detailItem, ...styles.detailItemLast}}>
                          <span style={styles.label}>Renewal Token:</span>
                          <span style={styles.value}>
                            {item.payhereRecurringToken ? '✅ Active' : '❌ None'}
                          </span>
                        </div>
                      </div>

                      {/* Payment Information Section */}
                      <div style={styles.section}>
                        <div style={styles.sectionHeader}>
                          <div style={{...styles.sectionIcon, ...styles.paymentIcon}}>💰</div>
                          <h4 style={styles.sectionTitle}>Payment Information</h4>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.label}>Payment Method:</span>
                          <span style={styles.value}>
                            {item.paymentMethod || 'PayHere'}
                          </span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.label}>Renewal Attempts:</span>
                          <span style={styles.value}>
                            {item.renewalAttempts || 0} / {item.maxRenewalAttempts || 3}
                          </span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.label}>Last Renewal:</span>
                          <span style={styles.value}>
                            {formatDate(item.lastRenewalDate)}
                          </span>
                        </div>
                        <div style={{...styles.detailItem, ...styles.detailItemLast}}>
                          <span style={styles.label}>Payment Failure:</span>
                          <span style={styles.value}>
                            {item.paymentFailure ? '⚠️ Yes' : '✅ No'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Issues Warning */}
                    {(item.renewalAttempts > 0 || item.paymentFailure) && (
                      <div style={styles.warningBox}>
                        <h4 style={{ color: '#dc2626', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          ⚠️ Payment Issues Detected
                        </h4>
                        {item.renewalAttempts > 0 && (
                          <p style={{margin: '0.25rem 0', fontSize: '0.875rem'}}>
                            <strong>Renewal Attempts:</strong> {item.renewalAttempts} of {item.maxRenewalAttempts || 3}
                          </p>
                        )}
                        {item.paymentFailure && (
                          <p style={{margin: '0.25rem 0', fontSize: '0.875rem'}}>
                            <strong>Payment Status:</strong> Failed - requires attention
                          </p>
                        )}
                        <p style={{margin: '0.25rem 0', fontSize: '0.875rem', color: '#7c2d12'}}>
                          This subscription may require manual intervention or customer contact.
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={styles.actionsContainer}>
                      <button
                        onClick={() => openModal(item)}
                        style={{...styles.btn, ...styles.btnPrimary}}
                        className="btn-enhanced"
                        disabled={processing}
                      >
                        📋 View Details
                      </button>
                      
                      {item.userDetails?.email && (
                        <button
                          onClick={() => {
                            const email = item.userDetails.email;
                            const subject = `Regarding your ${item.planName} subscription`;
                            const body = `Dear ${item.userDetails.firstName || 'Customer'},\n\nWe are contacting you regarding your subscription.\n\nBest regards,\nSupport Team`;
                            window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
                          }}
                          style={{...styles.btn, ...styles.btnSecondary}}
                          className="btn-enhanced"
                          disabled={processing}
                        >
                          📧 Contact User
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* Render Free User Card */
                <>
                  <div style={styles.cardHeader}>
                    <div style={styles.userSection}>
                      <h3 style={styles.cardTitle}>
                        {item.userDetails?.firstName || 'Unknown'} {item.userDetails?.lastName || 'User'}
                      </h3>
                      <div style={styles.freePlanBadge}>
                        Free Plan
                      </div>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end'}}>
                      {getStatusBadge(item.status)}
                      <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                        <span style={{
                          ...styles.limitBadge, 
                          ...(item.exceedsBusinessLimit ? styles.limitExceeded : styles.limitNormal)
                        }}>
                          🏢 {item.businessCount}/{item.freeLimits?.maxBusinesses || 1}
                        </span>
                        <span style={{
                          ...styles.limitBadge, 
                          ...(item.exceedsOfferLimit ? styles.limitExceeded : styles.limitNormal)
                        }}>
                          🎯 {item.offerCount}/{item.freeLimits?.maxOffers || 3}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.cardBody}>
                    <div style={styles.sectionsContainer}>
                      {/* User Information Section */}
                      <div style={styles.section}>
                        <div style={styles.sectionHeader}>
                          <div style={{...styles.sectionIcon, ...styles.userIcon}}>👤</div>
                          <h4 style={styles.sectionTitle}>User Information</h4>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.label}>User ID:</span>
                          <span style={styles.value}>#{item.userId || 'N/A'}</span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.label}>Email:</span>
                          <span style={styles.value}>
                            {item.userDetails?.email || 'N/A'}
                          </span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.label}>Business Name:</span>
                          <span style={styles.value}>
                            {item.userDetails?.businessName || 'N/A'}
                          </span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.label}>User Type:</span>
                          <span style={styles.value}>
                            {item.userDetails?.userType || 'N/A'}
                          </span>
                        </div>
                        <div style={{...styles.detailItem, ...styles.detailItemLast}}>
                          <span style={styles.label}>Last Login:</span>
                          <span style={styles.value}>
                            {formatDate(item.userDetails?.lastLoginDate)}
                          </span>
                        </div>
                      </div>

                      {/* Usage Statistics Section */}
                      <div style={styles.section}>
                        <div style={styles.sectionHeader}>
                          <div style={{...styles.sectionIcon, ...styles.usageIcon}}>📊</div>
                          <h4 style={styles.sectionTitle}>Usage Statistics</h4>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.label}>Businesses:</span>
                          <div style={{flex: 1, marginLeft: '1rem'}}>
                            <span style={styles.value}>
                              {item.businessCount} / {item.freeLimits?.maxBusinesses || 1} 
                              {item.exceedsBusinessLimit && ' ⚠️ Limit Exceeded'}
                            </span>
                            <div style={styles.usageBar}>
                              <div 
                                style={{
                                  ...styles.usageProgress,
                                  width: `${Math.min(item.usagePercentage?.businesses || 0, 100)}%`,
                                  background: getUsageProgressColor(item.usagePercentage?.businesses || 0)
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.label}>Offers:</span>
                          <div style={{flex: 1, marginLeft: '1rem'}}>
                            <span style={styles.value}>
                              {item.offerCount} / {item.freeLimits?.maxOffers || 3}
                              {item.exceedsOfferLimit && ' ⚠️ Limit Exceeded'}
                            </span>
                            <div style={styles.usageBar}>
                              <div 
                                style={{
                                  ...styles.usageProgress,
                                  width: `${Math.min(item.usagePercentage?.offers || 0, 100)}%`,
                                  background: getUsageProgressColor(item.usagePercentage?.offers || 0)
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <div style={{...styles.detailItem, ...styles.detailItemLast}}>
                          <span style={styles.label}>Subscription Date:</span>
                          <span style={styles.value}>
                            {formatDate(item.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Business Details Section */}
                      {item.businessesData && item.businessesData.length > 0 && (
                        <div style={styles.section}>
                          <div style={styles.sectionHeader}>
                            <div style={{...styles.sectionIcon, ...styles.businessIcon}}>🏢</div>
                            <h4 style={styles.sectionTitle}>Businesses ({item.businessesData.length})</h4>
                          </div>
                          <div style={styles.businessList}>
                            {item.businessesData.map((business, idx) => (
                              <div 
                                key={business._id || idx} 
                                style={{
                                  ...styles.businessItem,
                                  ...(idx === item.businessesData.length - 1 ? styles.businessItemLast : {})
                                }}
                              >
                                <strong>{business.name || 'Unnamed Business'}</strong>
                                <br />
                                <span style={{color: '#64748b'}}>
                                  Status: {business.status || 'N/A'} | 
                                  Category: {business.category || 'N/A'} | 
                                  Created: {formatDate(business.createdAt)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Offers Details Section */}
                      {item.offersData && item.offersData.length > 0 && (
                        <div style={styles.section}>
                          <div style={styles.sectionHeader}>
                            <div style={{...styles.sectionIcon, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white'}}>🎯</div>
                            <h4 style={styles.sectionTitle}>Offers ({item.offersData.length})</h4>
                          </div>
                          <div style={styles.businessList}>
                            {item.offersData.map((offer, idx) => (
                              <div 
                                key={offer._id || idx} 
                                style={{
                                  ...styles.businessItem,
                                  ...(idx === item.offersData.length - 1 ? styles.businessItemLast : {})
                                }}
                              >
                                <strong>{offer.title || 'Unnamed Offer'}</strong>
                                <br />
                                <span style={{color: '#64748b'}}>
                                  Discount: {offer.discountPercentage || 0}% | 
                                  Status: {offer.status || 'N/A'} | 
                                  Created: {formatDate(offer.createdAt)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Limit Exceeded Warning */}
                    {item.exceedsLimits && (
                      <div style={styles.warningBox}>
                        <h4 style={{ color: '#dc2626', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          ⚠️ Usage Limits Exceeded
                        </h4>
                        {item.exceedsBusinessLimit && (
                          <p style={{margin: '0.25rem 0', fontSize: '0.875rem'}}>
                            <strong>Business Limit:</strong> {item.businessCount} businesses (limit: {item.freeLimits?.maxBusinesses || 1})
                          </p>
                        )}
                        {item.exceedsOfferLimit && (
                          <p style={{margin: '0.25rem 0', fontSize: '0.875rem'}}>
                            <strong>Offer Limit:</strong> {item.offerCount} offers (limit: {item.freeLimits?.maxOffers || 3})
                          </p>
                        )}
                        <p style={{margin: '0.25rem 0', fontSize: '0.875rem', color: '#7c2d12'}}>
                          This user is a potential candidate for premium plan conversion.
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={styles.actionsContainer}>
                      <button
                        onClick={() => openModal(item)}
                        style={{...styles.btn, ...styles.btnPrimary}}
                        className="btn-enhanced"
                        disabled={processing}
                      >
                        📋 View Details
                      </button>
                      
                      {item.userDetails?.email && (
                        <button
                          onClick={() => {
                            const email = item.userDetails.email;
                            const subject = item.exceedsLimits 
                              ? `Upgrade to Premium - Unlock More Features`
                              : `Hello from our team`;
                            const body = item.exceedsLimits 
                              ? `Dear ${item.userDetails.firstName || 'Valued Customer'},\n\nWe noticed you're actively using our platform and have reached your free plan limits. Consider upgrading to our premium plan to unlock unlimited businesses and offers.\n\nBest regards,\nSupport Team`
                              : `Dear ${item.userDetails.firstName || 'Customer'},\n\nThank you for using our platform.\n\nBest regards,\nSupport Team`;
                            window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
                          }}
                          style={{...styles.btn, ...styles.btnSecondary}}
                          className="btn-enhanced"
                          disabled={processing}
                        >
                          {item.exceedsLimits ? '🚀 Promote Upgrade' : '📧 Contact User'}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => handlePageChange(Math.max(1, pagination.currentPage - 1))}
            disabled={pagination.currentPage === 1}
            style={{
              ...styles.paginationButton,
              ...(pagination.currentPage === 1 ? {opacity: '0.5', cursor: 'not-allowed'} : {})
            }}
            className="pagination-btn-enhanced"
          >
            ← Previous
          </button>

          <span style={{
            padding: '0.75rem 1rem',
            color: '#475569',
            fontWeight: '600',
            fontSize: '0.875rem'
          }}>
            Page {pagination.currentPage} of {pagination.totalPages}
            ({pagination.totalItems} total)
          </span>

          <button
            onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.currentPage + 1))}
            disabled={pagination.currentPage === pagination.totalPages}
            style={{
              ...styles.paginationButton,
              ...(pagination.currentPage === pagination.totalPages ? {opacity: '0.5', cursor: 'not-allowed'} : {})
            }}
            className="pagination-btn-enhanced"
          >
            Next →
          </button>
        </div>
      )}

      {/* Detailed View Modal */}
      {showDetailsModal && selectedSubscription && (
        <div style={styles.modal} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {activeTab === 'premium' ? '📋 Subscription Details' : '📋 Free User Details'}
              </h3>
              <button
                onClick={closeModal}
                style={styles.modalClose}
                className="modal-close-enhanced"
              >
                ×
              </button>
            </div>
            
            <div style={styles.modalBody}>
              {activeTab === 'premium' ? (
                /* Premium Subscription Modal Content */
                <>
                  {/* Subscription Summary */}
                  <div style={{
                    background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    marginBottom: '2rem',
                    border: '1px solid #0ea5e9',
                  }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#0ea5e9', fontSize: '1.25rem', fontWeight: '700' }}>
                      {selectedSubscription.planName || 'Subscription'} - {selectedSubscription.userDetails?.firstName} {selectedSubscription.userDetails?.lastName}
                    </h4>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center'}}>
                      {getStatusBadge(selectedSubscription.status)}
                      <span style={{
                        background: selectedSubscription.autoRenew ? '#d1fae5' : '#fef3c7',
                        color: selectedSubscription.autoRenew ? '#059669' : '#d97706',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {selectedSubscription.autoRenew ? '🔄 Auto-Renewal ON' : '⏸️ Auto-Renewal OFF'}
                      </span>
                    </div>
                  </div>

                  {/* Raw Data for Debugging */}
                  <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                      <div style={{...styles.sectionIcon, background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: 'white'}}>🔍</div>
                      <h4 style={styles.sectionTitle}>Raw Data (Debug)</h4>
                    </div>
                    <pre style={{
                      background: '#f8fafc',
                      padding: '1rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      overflow: 'auto',
                      maxHeight: '300px',
                      border: '1px solid #e2e8f0'
                    }}>
                      {JSON.stringify(selectedSubscription, null, 2)}
                    </pre>
                  </div>
                </>
              ) : (
                /* Free User Modal Content */
                <>
                  {/* User Summary */}
                  <div style={{
                    background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    marginBottom: '2rem',
                    border: '1px solid #22c55e',
                  }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#22c55e', fontSize: '1.25rem', fontWeight: '700' }}>
                      Free User - {selectedSubscription.userDetails?.firstName} {selectedSubscription.userDetails?.lastName}
                    </h4>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center'}}>
                      {getStatusBadge(selectedSubscription.status)}
                      {selectedSubscription.exceedsLimits && (
                        <span style={{
                          background: '#fef2f2',
                          color: '#dc2626',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          border: '1px solid #fecaca'
                        }}>
                          ⚠️ Exceeds Limits - Conversion Opportunity
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Complete Usage Statistics */}
                  <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                      <div style={{...styles.sectionIcon, ...styles.usageIcon}}>📊</div>
                      <h4 style={styles.sectionTitle}>Complete Usage Analysis</h4>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.label}>Business Usage:</span>
                      <span style={styles.value}>
                        {selectedSubscription.businessCount} / {selectedSubscription.freeLimits?.maxBusinesses || 1} 
                        ({selectedSubscription.usagePercentage?.businesses || 0}%)
                      </span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.label}>Offer Usage:</span>
                      <span style={styles.value}>
                        {selectedSubscription.offerCount} / {selectedSubscription.freeLimits?.maxOffers || 3}
                        ({selectedSubscription.usagePercentage?.offers || 0}%)
                      </span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.label}>Exceeds Business Limit:</span>
                      <span style={styles.value}>
                        {selectedSubscription.exceedsBusinessLimit ? '⚠️ Yes' : '✅ No'}
                      </span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.label}>Exceeds Offer Limit:</span>
                      <span style={styles.value}>
                        {selectedSubscription.exceedsOfferLimit ? '⚠️ Yes' : '✅ No'}
                      </span>
                    </div>
                    <div style={{...styles.detailItem, ...styles.detailItemLast}}>
                      <span style={styles.label}>Conversion Candidate:</span>
                      <span style={styles.value}>
                        {selectedSubscription.exceedsLimits ? '🎯 High Priority' : '💡 Monitor'}
                      </span>
                    </div>
                  </div>

                  {/* Raw Data for Debugging */}
                  <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                      <div style={{...styles.sectionIcon, background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: 'white'}}>🔍</div>
                      <h4 style={styles.sectionTitle}>Raw Data (Debug)</h4>
                    </div>
                    <pre style={{
                      background: '#f8fafc',
                      padding: '1rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      overflow: 'auto',
                      maxHeight: '300px',
                      border: '1px solid #e2e8f0'
                    }}>
                      {JSON.stringify(selectedSubscription, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced CSS */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes modalAppear {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .header {
          background-size: 200% 200%;
          animation: gradientShift 6s ease infinite;
        }

        .subscription-card-enhanced {
          animation: slideInUp 0.6s ease-out;
          animation-fill-mode: both;
        }

        .subscription-card-enhanced:nth-child(1) { animation-delay: 0.1s; }
        .subscription-card-enhanced:nth-child(2) { animation-delay: 0.2s; }
        .subscription-card-enhanced:nth-child(3) { animation-delay: 0.3s; }
        .subscription-card-enhanced:nth-child(4) { animation-delay: 0.4s; }
        .subscription-card-enhanced:nth-child(5) { animation-delay: 0.5s; }

        .btn-enhanced {
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .btn-enhanced::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s;
          z-index: 1;
        }

        .btn-enhanced:hover:not(:disabled)::before {
          left: 100%;
        }

        .btn-enhanced:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .tab-enhanced:hover:not(.active) {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          color: #334155;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(148, 163, 184, 0.3);
        }

        .filter-tab-enhanced:hover:not(.active) {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          color: #334155;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(148, 163, 184, 0.3);
        }

        .modal-close-enhanced:hover {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          color: #1e293b;
          transform: scale(1.1) rotate(90deg);
        }

        .stat-card-enhanced:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(102, 126, 234, 0.1);
        }

        .pagination-btn-enhanced:hover:not(:disabled) {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        @media (max-width: 768px) {
          .container {
            padding: 1rem !important;
          }
          
          .stats-container {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1rem !important;
          }
          
          .sections-container {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          
          .monitoring-grid {
            grid-template-columns: 1fr !important;
          }
          
          .card-header {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          
          .actions-container {
            flex-direction: column !important;
            gap: 0.75rem !important;
          }
          
          .btn-enhanced {
            width: 100% !important;
            min-width: auto !important;
          }
          
          .modal-content {
            width: 95% !important;
            margin: 1rem !important;
          }
          
          .header-title {
            font-size: 2rem !important;
          }
          
          .header-subtitle {
            font-size: 1rem !important;
          }
        }

        @media (max-width: 480px) {
          .stats-container {
            grid-template-columns: 1fr !important;
          }
          
          .filter-tab-enhanced, .tab-enhanced {
            min-width: 100px !important;
            padding: 0.5rem 1rem !important;
          }
          
          .card-header {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          
          .user-section {
            min-width: 100% !important;
            margin-bottom: 1rem;
          }

          .btn-enhanced {
            padding: 0.7rem 1.2rem;
            font-size: 0.75rem;
            border-radius: 12px;
          }
        }

        @media (min-width: 769px) {
          .subscription-card-enhanced:hover {
            transform: translateY(-6px) !important;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(102, 126, 234, 0.1) !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .btn-enhanced,
          .filter-tab-enhanced,
          .tab-enhanced,
          .subscription-card-enhanced,
          .modal-content {
            animation: none !important;
            transition: none !important;
          }
        }

        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #5a6fd8, #6c42a0);
        }

        .btn-enhanced:focus-visible {
          outline: 2px solid #667eea;
          outline-offset: 2px;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2);
        }

        .filter-tab-enhanced:focus-visible, .tab-enhanced:focus-visible {
          outline: 2px solid #667eea;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
};

export default AdminSubscriptionsManagement;