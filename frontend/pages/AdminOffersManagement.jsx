import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import NavBar from '../component/Navbar';
import { AdminAuthContext } from '../src/AdminAuthContext';

const AdminOffersManagement = () => {

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');
  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    declined: 0
  });
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [adminComments, setAdminComments] = useState('');
  const [processing, setProcessing] = useState(false);

  // Edit offer states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editOfferData, setEditOfferData] = useState({
    title: '',
    discount: '',
    category: '',
    startDate: '',
    endDate: '',
    isActive: true
  });

  const { adminUser, isLoading, logoutAdmin } = useContext(AdminAuthContext);

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
    spinnerSmall: {
      display: 'inline-block',
      width: '16px',
      height: '16px',
      border: '2px solid transparent',
      borderTop: '2px solid currentColor',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginRight: '8px',
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
    offersList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
    },
    noOffers: {
      textAlign: 'center',
      padding: '4rem 2rem',
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      borderRadius: '16px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
      color: '#64748b',
      border: '1px solid #e2e8f0',
    },
    noOffersIcon: {
      fontSize: '4rem',
      marginBottom: '1rem',
      opacity: '0.5',
    },
    offerCard: {
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      borderRadius: '16px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      border: '1px solid #e2e8f0',
      position: 'relative',
    },
    offerCardHeader: {
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: '1.5rem',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: '1rem',
    },
    offerTitleSection: {
      flex: '1',
      minWidth: '300px',
    },
    offerTitle: {
      margin: '0 0 0.75rem 0',
      color: '#1e293b',
      fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
      fontWeight: '700',
      lineHeight: '1.3',
      letterSpacing: '-0.01em',
    },
    offerDiscount: {
      background: 'linear-gradient(135deg, #10b981, #059669)',
      color: 'white',
      padding: '0.5rem 1rem',
      borderRadius: '9999px',
      fontWeight: '700',
      fontSize: '1rem',
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
    statusPending: {
      backgroundColor: '#fef3c7',
      color: '#d97706',
      border: '1px solid #fed7aa',
    },
    statusApproved: {
      backgroundColor: '#d1fae5',
      color: '#059669',
      border: '1px solid #a7f3d0',
    },
    statusDeclined: {
      backgroundColor: '#fecaca',
      color: '#dc2626',
      border: '1px solid #f87171',
    },
    offerCardBody: {
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
    businessIcon: {
      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      color: 'white',
    },
    userIcon: {
      background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      color: 'white',
    },
    offerIcon: {
      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
      color: 'white',
    },
    reviewIcon: {
      background: 'linear-gradient(135deg, #10b981, #059669)',
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
    adminComments: {
      fontStyle: 'italic',
      textAlign: 'left',
      background: '#fffbeb',
      padding: '0.75rem',
      borderRadius: '8px',
      borderLeft: '4px solid #f59e0b',
      fontSize: '0.875rem',
    },
    actionsContainer: {
      display: 'flex',
      gap: '0.75rem',
      justifyContent: 'center',
      paddingTop: '2rem',
      borderTop: '2px solid #e2e8f0',
      flexWrap: 'wrap',
    },
    // Enhanced Button Styles
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
    btnApprove: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
      color: 'white',
      boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
    },
    btnDecline: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
      color: 'white',
      boxShadow: '0 8px 32px rgba(239, 68, 68, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
    },
    btnEdit: {
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
      color: 'white',
      boxShadow: '0 8px 32px rgba(245, 158, 11, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
      border: '1px solid rgba(245, 158, 11, 0.3)',
    },
    btnDelete: {
      background: 'linear-gradient(135deg, #64748b 0%, #475569 50%, #334155 100%)',
      color: 'white',
      boxShadow: '0 8px 32px rgba(100, 116, 139, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
      border: '1px solid rgba(100, 116, 139, 0.3)',
    },
    btnSecondary: {
      background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%)',
      color: '#475569',
      boxShadow: '0 8px 32px rgba(148, 163, 184, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      border: '1px solid rgba(148, 163, 184, 0.3)',
    },
    modalOverlay: {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '1000',
      backdropFilter: 'blur(8px)',
    },
    modal: {
      background: 'white',
      borderRadius: '16px',
      width: '90%',
      maxWidth: '600px',
      maxHeight: '90vh',
      overflowY: 'auto',
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
    offerSummary: {
      background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
      padding: '1.5rem',
      borderRadius: '12px',
      marginBottom: '1.5rem',
      border: '1px solid #0ea5e9',
    },
    modalFooter: {
      padding: '1.5rem 2rem',
      borderTop: '1px solid #e2e8f0',
      display: 'flex',
      gap: '1rem',
      justifyContent: 'flex-end',
      background: '#f8fafc',
      borderRadius: '0 0 16px 16px',
      flexWrap: 'wrap',
    },
    textarea: {
      width: '100%',
      padding: '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontFamily: 'inherit',
      fontSize: '0.875rem',
      lineHeight: '1.6',
      resize: 'vertical',
      transition: 'all 0.3s ease',
      boxSizing: 'border-box',
    },
    input: {
      width: '100%',
      padding: '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontFamily: 'inherit',
      fontSize: '0.875rem',
      transition: 'all 0.3s ease',
      boxSizing: 'border-box',
    },
    formGroup: {
      marginBottom: '1.5rem',
    },
    formLabel: {
      display: 'block',
      marginBottom: '0.5rem',
      fontWeight: '600',
      color: '#374151',
      fontSize: '0.875rem',
    },
    validationError: {
      color: '#dc2626',
      fontSize: '0.75rem',
      marginTop: '0.25rem',
      fontWeight: '500',
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

  useEffect(() => {
    fetchOffers();
  }, [filter]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('Fetching offers for filter:', filter);

      const response = await axios.get('http://localhost:5555/api/admin/offers', {
        params: {
          status: filter === 'all' ? undefined : filter,
          limit: 50
        }
      });

      console.log('Fetch response:', response.data);

      if (response.data.success) {
        setOffers(response.data.offers);
        setCounts(response.data.counts);
      } else {
        setError(response.data.message || 'Failed to fetch offers');
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      setError(error.response?.data?.message || 'Error fetching offers');
    } finally {
      setLoading(false);
    }
  };

  const openActionModal = (offer, action) => {
    setSelectedOffer(offer);
    setActionType(action);
    setAdminComments('');
    setShowModal(true);
    setError('');
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOffer(null);
    setActionType('');
    setAdminComments('');
    setError('');
  };

  const openEditModal = (offer) => {
    setSelectedOffer(offer);
    setEditOfferData({
      title: offer.title || '',
      discount: offer.discount || '',
      category: offer.category || '',
      startDate: offer.startDate ? new Date(offer.startDate).toISOString().split('T')[0] : '',
      endDate: offer.endDate ? new Date(offer.endDate).toISOString().split('T')[0] : '',
      isActive: offer.isActive !== undefined ? offer.isActive : true
    });
    setShowEditModal(true);
    setError('');
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedOffer(null);
    setEditOfferData({
      title: '',
      discount: '',
      category: '',
      startDate: '',
      endDate: '',
      isActive: true
    });
    setError('');
  };

  const handleEditOffer = async () => {
    if (!selectedOffer || !editOfferData.title || !editOfferData.discount) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setProcessing(true);
      setError('');

      console.log('Updating offer:', selectedOffer._id, editOfferData);

      const response = await axios.put(`http://localhost:5555/api/admin/offers/${selectedOffer._id}`, editOfferData);

      console.log('Edit response:', response.data);

      if (response.data && response.data.success) {
        console.log('Offer updated successfully');
        setSuccess('Offer updated successfully!');
        closeEditModal();
        await fetchOffers();
      } else {
        const errorMessage = response.data?.message || 'Failed to update offer';
        console.error('Edit offer failed:', errorMessage);
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error updating offer:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error updating offer';
      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteOffer = async (offerId) => {
    if (!window.confirm('Are you sure you want to delete this offer? This action cannot be undone.')) {
      return;
    }

    try {
      setError('');
      setProcessing(true);

      console.log('Deleting offer:', offerId);

      const response = await axios.delete(`http://localhost:5555/api/admin/offers/${offerId}`);

      console.log('Delete response:', response.data);

      if (response.data && response.data.success) {
        console.log('Offer deleted successfully');
        setSuccess(`Offer "${response.data.deletedOffer?.title || 'Unknown'}" deleted successfully!`);
        await fetchOffers();
      } else {
        const errorMessage = response.data?.message || 'Failed to delete offer';
        console.error('Delete offer failed:', errorMessage);
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting offer:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error deleting offer';
      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handleAction = async () => {
    if (!selectedOffer || !actionType) {
      setError('Missing offer or action type');
      return;
    }

    if (actionType === 'decline' && !adminComments.trim()) {
      setError('Please provide comments when declining an offer');
      return;
    }

    try {
      setProcessing(true);
      setError('');

      console.log(`Processing ${actionType} for offer:`, selectedOffer._id);

      const endpoint = `http://localhost:5555/api/admin/offers/${selectedOffer._id}/${actionType}`;
      const requestData = {
        adminComments: adminComments.trim(),
        reviewedBy: adminUser?.username || 'Admin'
      };

      console.log('Sending request to:', endpoint);
      console.log('Request data:', requestData);

      const response = await axios.patch(endpoint, requestData);

      console.log('Response received:', response.data);

      if (response.data && response.data.success) {
        console.log(`Offer ${actionType}d successfully`);
        setSuccess(`Offer "${selectedOffer.title}" ${actionType}d successfully!`);
        closeModal();
        await fetchOffers();
      } else {
        const errorMessage = response.data?.message || `Failed to ${actionType} offer`;
        console.error(`${actionType} offer failed:`, errorMessage);
        setError(errorMessage);
      }
    } catch (error) {
      console.error(`Error ${actionType}ing offer:`, error);

      let errorMessage;
      if (error.response) {
        errorMessage = error.response.data?.message || error.response.statusText || `Server error: ${error.response.status}`;
        console.error('Server error response:', error.response.data);
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
        console.error('No response received:', error.request);
      } else {
        errorMessage = error.message || `Error ${actionType}ing offer`;
        console.error('Request setup error:', error.message);
      }

      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { style: { ...styles.statusBadge, ...styles.statusPending }, text: 'Pending Review', icon: '⏳' },
      'approved': { style: { ...styles.statusBadge, ...styles.statusApproved }, text: 'Approved', icon: '✅' },
      'approved-active': { style: { ...styles.statusBadge, ...styles.statusApproved }, text: 'Live', icon: '🔴' },
      'approved-scheduled': { style: { ...styles.statusBadge, ...styles.statusApproved }, text: 'Scheduled', icon: '📅' },
      'approved-expired': { style: { ...styles.statusBadge, ...styles.statusDeclined }, text: 'Expired', icon: '⏰' },
      'approved-inactive': { style: { ...styles.statusBadge, ...styles.statusPending }, text: 'Inactive', icon: '⏸️' },
      'declined': { style: { ...styles.statusBadge, ...styles.statusDeclined }, text: 'Declined', icon: '❌' }
    };

    const config = statusConfig[status] || statusConfig['pending'];
    return (
      <span style={config.style}>
        <span>{config.icon}</span>
        {config.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFilteredOffers = () => {
    if (filter === 'all') return offers;
    return offers.filter(offer => offer.adminStatus === filter);
  };

  const getAvailableActions = (offer) => {
    const actions = [];

    // Always allow edit and delete
    actions.push(
      <button
        key="edit"
        style={{
          ...styles.btn,
          ...styles.btnEdit,
          ...(processing ? { opacity: '0.6', cursor: 'not-allowed' } : {})
        }}
        onClick={() => openEditModal(offer)}
        title="Edit offer details"
        disabled={processing}
        className="btn-enhanced btn-edit"
      >
        <span style={{ marginRight: '8px', fontSize: '1rem' }}>📝</span>
        {processing ? 'Processing...' : 'Edit'}
      </button>,
      <button
        key="delete"
        style={{
          ...styles.btn,
          ...styles.btnDelete,
          ...(processing ? { opacity: '0.6', cursor: 'not-allowed' } : {})
        }}
        onClick={() => handleDeleteOffer(offer._id)}
        title="Delete offer permanently"
        disabled={processing}
        className="btn-enhanced btn-delete"
      >
        <span style={{ marginRight: '8px', fontSize: '1rem' }}>🗑️</span>
        {processing ? 'Processing...' : 'Delete'}
      </button>
    );

    // Add approve/decline actions based on current status
    if (offer.adminStatus === 'pending') {
      actions.unshift(
        <button
          key="approve"
          style={{
            ...styles.btn,
            ...styles.btnApprove,
            ...(processing ? { opacity: '0.6', cursor: 'not-allowed' } : {})
          }}
          onClick={() => openActionModal(offer, 'approve')}
          title="Approve this offer"
          disabled={processing}
          className="btn-enhanced btn-approve"
        >
          <span style={{ marginRight: '8px', fontSize: '1rem' }}>✅</span>
          {processing ? 'Processing...' : 'Approve'}
        </button>,
        <button
          key="decline"
          style={{
            ...styles.btn,
            ...styles.btnDecline,
            ...(processing ? { opacity: '0.6', cursor: 'not-allowed' } : {})
          }}
          onClick={() => openActionModal(offer, 'decline')}
          title="Decline this offer"
          disabled={processing}
          className="btn-enhanced btn-decline"
        >
          <span style={{ marginRight: '8px', fontSize: '1rem' }}>❌</span>
          {processing ? 'Processing...' : 'Decline'}
        </button>
      );
    } else if (offer.adminStatus === 'approved') {
      actions.unshift(
        <button
          key="decline"
          style={{
            ...styles.btn,
            ...styles.btnDecline,
            ...(processing ? { opacity: '0.6', cursor: 'not-allowed' } : {})
          }}
          onClick={() => openActionModal(offer, 'decline')}
          title="Decline this approved offer"
          disabled={processing}
          className="btn-enhanced btn-decline"
        >
          <span style={{ marginRight: '8px', fontSize: '1rem' }}>❌</span>
          {processing ? 'Processing...' : 'Decline'}
        </button>
      );
    } else if (offer.adminStatus === 'declined') {
      actions.unshift(
        <button
          key="approve"
          style={{
            ...styles.btn,
            ...styles.btnApprove,
            ...(processing ? { opacity: '0.6', cursor: 'not-allowed' } : {})
          }}
          onClick={() => openActionModal(offer, 'approve')}
          title="Approve this declined offer"
          disabled={processing}
          className="btn-enhanced btn-approve"
        >
          <span style={{ marginRight: '8px', fontSize: '1rem' }}>✅</span>
          {processing ? 'Processing...' : 'Re-approve'}
        </button>
      );
    }

    return actions;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingSpinner}>
          <div style={styles.spinner}></div>
          <p>Loading offers...</p>
        </div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <NavBar adminUser={adminUser} logoutAdmin={logoutAdmin} />
      
      {/* Statistics Dashboard */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{offers.length}</div>
          <div style={styles.statLabel}>Total Offers</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{counts.pending || 0}</div>
          <div style={styles.statLabel}>Pending Review</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{counts.approved || 0}</div>
          <div style={styles.statLabel}>Approved</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{counts.declined || 0}</div>
          <div style={styles.statLabel}>Declined</div>
        </div>
      </div>

      {error && (
        <div style={{...styles.alertContainer, ...styles.errorAlert}}>
          <span style={styles.alertIcon}>⚠️</span>
          {error}
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
        {['all', 'pending', 'approved', 'declined'].map((filterType) => (
          <button
            key={filterType}
            style={{
              ...styles.filterTab,
              ...(filter === filterType ? styles.filterTabActive : {})
            }}
            onClick={() => setFilter(filterType)}
            className="filter-tab-enhanced"
          >
            {filterType === 'all' ? `All Offers (${offers.length})` :
              `${filterType.charAt(0).toUpperCase() + filterType.slice(1)} (${counts[filterType] || 0})`}
          </button>
        ))}
      </div>

      {/* Offers List */}
      <div style={styles.offersList}>
        {getFilteredOffers().length === 0 ? (
          <div style={styles.noOffers}>
            <div style={styles.noOffersIcon}>📋</div>
            <h3>No offers found</h3>
            <p>No offers match the current filter criteria.</p>
          </div>
        ) : (
          getFilteredOffers().map(offer => (
            <div key={offer._id} style={styles.offerCard}>
              <div style={styles.offerCardHeader}>
                <div style={styles.offerTitleSection}>
                  <h3 style={styles.offerTitle}>{offer.title}</h3>
                  <div style={styles.offerDiscount}>{offer.discount} OFF</div>
                </div>
                <div>
                  {getStatusBadge(offer.computedStatus)}
                </div>
              </div>

              <div style={styles.offerCardBody}>
                <div style={styles.sectionsContainer}>
                  {/* Business Details Section */}
                  <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                      <div style={{...styles.sectionIcon, ...styles.businessIcon}}>🏢</div>
                      <h4 style={styles.sectionTitle}>Business Information</h4>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.label}>Business Name:</span>
                      <span style={styles.value}>{offer.businessId?.name || 'N/A'}</span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.label}>Category:</span>
                      <span style={styles.value}>{offer.businessId?.category || offer.category || 'N/A'}</span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.label}>Address:</span>
                      <span style={styles.value}>{offer.businessId?.address || 'N/A'}</span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.label}>Phone:</span>
                      <span style={styles.value}>{offer.businessId?.phone || 'N/A'}</span>
                    </div>
                    <div style={{...styles.detailItem, ...styles.detailItemLast}}>
                      <span style={styles.label}>Email:</span>
                      <span style={styles.value}>{offer.businessId?.email || 'N/A'}</span>
                    </div>
                  </div>

                  {/* User Details Section */}
                  <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                      <div style={{...styles.sectionIcon, ...styles.userIcon}}>👤</div>
                      <h4 style={styles.sectionTitle}>User Information</h4>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.label}>User ID:</span>
                      <span style={styles.value}>#{offer.userDetails?.userId}</span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.label}>Name:</span>
                      <span style={styles.value}>
                        {offer.userDetails?.firstName} {offer.userDetails?.lastName}
                      </span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.label}>Email:</span>
                      <span style={styles.value}>{offer.userDetails?.email}</span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.label}>Business Name:</span>
                      <span style={styles.value}>{offer.userDetails?.businessName || 'N/A'}</span>
                    </div>
                    <div style={{...styles.detailItem, ...styles.detailItemLast}}>
                      <span style={styles.label}>User Type:</span>
                      <span style={styles.value}>{offer.userDetails?.userType}</span>
                    </div>
                  </div>

                  {/* Offer Details Section */}
                  <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                      <div style={{...styles.sectionIcon, ...styles.offerIcon}}>🎯</div>
                      <h4 style={styles.sectionTitle}>Offer Details</h4>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.label}>Offer ID:</span>
                      <span style={styles.value}>#{offer.offerId}</span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.label}>Start Date:</span>
                      <span style={styles.value}>{formatDate(offer.startDate)}</span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.label}>End Date:</span>
                      <span style={styles.value}>{formatDate(offer.endDate)}</span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.label}>Created:</span>
                      <span style={styles.value}>{formatDate(offer.createdAt)}</span>
                    </div>
                    <div style={{...styles.detailItem, ...styles.detailItemLast}}>
                      <span style={styles.label}>Active:</span>
                      <span style={styles.value}>{offer.isActive ? '✅ Yes' : '❌ No'}</span>
                    </div>
                  </div>

                  {/* Admin Review Section */}
                  {(offer.adminStatus === 'approved' || offer.adminStatus === 'declined') && (
                    <div style={styles.section}>
                      <div style={styles.sectionHeader}>
                        <div style={{...styles.sectionIcon, ...styles.reviewIcon}}>👨‍💼</div>
                        <h4 style={styles.sectionTitle}>Admin Review</h4>
                      </div>
                      <div style={styles.detailItem}>
                        <span style={styles.label}>Reviewed by:</span>
                        <span style={styles.value}>{offer.reviewedBy || 'N/A'}</span>
                      </div>
                      <div style={styles.detailItem}>
                        <span style={styles.label}>Review Date:</span>
                        <span style={styles.value}>{formatDate(offer.reviewedAt)}</span>
                      </div>
                      {offer.adminComments && (
                        <div style={{...styles.detailItem, ...styles.detailItemLast}}>
                          <span style={styles.label}>Comments:</span>
                          <span style={{...styles.value, ...styles.adminComments}}>{offer.adminComments}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={styles.actionsContainer}>
                  {getAvailableActions(offer)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action Modal (Approve/Decline) */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {actionType === 'approve' ? '✅ Approve Offer' : '❌ Decline Offer'}
              </h3>
              <button
                style={styles.modalClose}
                onClick={closeModal}
                className="modal-close-enhanced"
              >
                ×
              </button>
            </div>

            <div style={styles.modalBody}>
              {error && (
                <div style={{...styles.alertContainer, ...styles.errorAlert}}>
                  <span style={styles.alertIcon}>⚠️</span>
                  {error}
                </div>
              )}

              <div style={styles.offerSummary}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#0ea5e9', fontSize: '1.25rem', fontWeight: '700' }}>
                  "{selectedOffer?.title}"
                </h4>
                <p style={{ margin: '0.5rem 0', color: '#475569' }}>
                  <strong>Business:</strong> {selectedOffer?.businessId?.name}
                </p>
                <p style={{ margin: '0.5rem 0', color: '#475569' }}>
                  <strong>Discount:</strong> {selectedOffer?.discount} OFF
                </p>
                <p style={{ margin: '0.5rem 0', color: '#475569' }}>
                  <strong>Current Status:</strong> <strong>{selectedOffer?.adminStatus}</strong>
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  htmlFor="adminComments"
                  style={styles.formLabel}
                >
                  {actionType === 'approve' ? 'Comments (Optional)' : 'Comments (Required) *'}
                </label>
                <textarea
                  id="adminComments"
                  value={adminComments}
                  onChange={(e) => setAdminComments(e.target.value)}
                  placeholder={
                    actionType === 'approve'
                      ? "Add any approval comments or notes..."
                      : "Please explain why this offer is being declined..."
                  }
                  rows="4"
                  style={{
                    ...styles.textarea,
                    ...(actionType === 'decline' && !adminComments.trim() ?
                      { borderColor: '#dc2626' } : {})
                  }}
                  className="textarea-enhanced"
                />
                {actionType === 'decline' && !adminComments.trim() && (
                  <p style={styles.validationError}>
                    Comments are required when declining an offer
                  </p>
                )}
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                style={{
                  ...styles.btn,
                  ...styles.btnSecondary,
                  ...(processing ? { opacity: '0.6', cursor: 'not-allowed' } : {})
                }}
                onClick={closeModal}
                disabled={processing}
                className="btn-enhanced btn-secondary"
              >
                Cancel
              </button>
              <button
                style={{
                  ...styles.btn,
                  ...(actionType === 'approve' ? styles.btnApprove : styles.btnDecline),
                  ...(processing || (actionType === 'decline' && !adminComments.trim()) ?
                    { opacity: '0.6', cursor: 'not-allowed' } : {})
                }}
                onClick={handleAction}
                disabled={processing || (actionType === 'decline' && !adminComments.trim())}
                className={`btn-enhanced ${actionType === 'approve' ? 'btn-approve' : 'btn-decline'}`}
              >
                {processing ? (
                  <>
                    <span style={styles.spinnerSmall}></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <span style={{ marginRight: '8px', fontSize: '1rem' }}>
                      {actionType === 'approve' ? '✅' : '❌'}
                    </span>
                    {`${actionType === 'approve' ? 'Approve' : 'Decline'} Offer`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div style={styles.modalOverlay} onClick={(e) => {
          if (e.target === e.currentTarget) closeEditModal();
        }}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>📝 Edit Offer</h3>
              <button
                style={styles.modalClose}
                onClick={closeEditModal}
                className="modal-close-enhanced"
              >
                ×
              </button>
            </div>

            <div style={styles.modalBody}>
              {error && (
                <div style={{...styles.alertContainer, ...styles.errorAlert}}>
                  <span style={styles.alertIcon}>⚠️</span>
                  {error}
                </div>
              )}

              <div style={styles.offerSummary}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#0ea5e9', fontSize: '1.25rem', fontWeight: '700' }}>
                  Editing: "{selectedOffer?.title}"
                </h4>
                <p style={{ margin: '0.5rem 0', color: '#475569' }}>
                  <strong>Business:</strong> {selectedOffer?.businessId?.name}
                </p>
                <p style={{ margin: '0.5rem 0', color: '#475569' }}>
                  <strong>Current Status:</strong> <strong>{selectedOffer?.adminStatus}</strong>
                </p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Title *</label>
                <input
                  type="text"
                  value={editOfferData.title}
                  onChange={(e) => setEditOfferData({ ...editOfferData, title: e.target.value })}
                  placeholder="Enter offer title"
                  style={styles.input}
                  required
                  className="input-enhanced"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Discount *</label>
                <input
                  type="text"
                  value={editOfferData.discount}
                  onChange={(e) => setEditOfferData({ ...editOfferData, discount: e.target.value })}
                  placeholder="e.g., 20%, $50, Buy 1 Get 1"
                  style={styles.input}
                  required
                  className="input-enhanced"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Category</label>
                <input
                  type="text"
                  value={editOfferData.category}
                  onChange={(e) => setEditOfferData({ ...editOfferData, category: e.target.value })}
                  placeholder="Enter category (optional)"
                  style={styles.input}
                  className="input-enhanced"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Start Date</label>
                <input
                  type="date"
                  value={editOfferData.startDate}
                  onChange={(e) => setEditOfferData({ ...editOfferData, startDate: e.target.value })}
                  style={styles.input}
                  className="input-enhanced"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>End Date</label>
                <input
                  type="date"
                  value={editOfferData.endDate}
                  onChange={(e) => setEditOfferData({ ...editOfferData, endDate: e.target.value })}
                  style={styles.input}
                  className="input-enhanced"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={{ ...styles.formLabel, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={editOfferData.isActive}
                    onChange={(e) => setEditOfferData({ ...editOfferData, isActive: e.target.checked })}
                    style={{ width: 'auto' }}
                  />
                  ✅ Active Offer
                </label>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                style={{
                  ...styles.btn,
                  ...styles.btnSecondary,
                  ...(processing ? { opacity: '0.6', cursor: 'not-allowed' } : {})
                }}
                onClick={closeEditModal}
                disabled={processing}
                className="btn-enhanced btn-secondary"
              >
                Cancel
              </button>
              <button
                style={{
                  ...styles.btn,
                  ...styles.btnEdit,
                  ...(processing || !editOfferData.title || !editOfferData.discount ?
                    { opacity: '0.6', cursor: 'not-allowed' } : {})
                }}
                onClick={handleEditOffer}
                disabled={processing || !editOfferData.title || !editOfferData.discount}
                className="btn-enhanced btn-edit"
              >
                {processing ? (
                  <>
                    <span style={styles.spinnerSmall}></span>
                    Updating...
                  </>
                ) : (
                  <>
                    <span style={{ marginRight: '8px', fontSize: '1rem' }}>📝</span>
                    Update Offer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced CSS Animations and Button Styles */}
      <style>
        {`
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

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes buttonPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.02); }
            100% { transform: scale(1); }
          }

          @keyframes shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }

          @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.3); }
            50% { box-shadow: 0 0 30px rgba(102, 126, 234, 0.6); }
          }

          /* Enhanced Button Styles */
          .btn-enhanced {
            position: relative;
            overflow: hidden;
            transform-style: preserve-3d;
            will-change: transform;
          }

          .btn-enhanced::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.3),
              transparent
            );
            transition: left 0.5s;
            z-index: 1;
          }

          .btn-enhanced::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            transform: translate(-50%, -50%);
            transition: width 0.3s ease, height 0.3s ease;
            z-index: 0;
          }

          .btn-enhanced:hover::before {
            left: 100%;
          }

          .btn-enhanced:active::after {
            width: 300px;
            height: 300px;
          }

          .btn-enhanced:hover:not(:disabled) {
            transform: translateY(-3px) scale(1.02);
            animation: buttonPulse 0.6s ease-in-out infinite alternate;
          }

          .btn-approve:hover:not(:disabled) {
            box-shadow: 
              0 12px 40px rgba(16, 185, 129, 0.5),
              0 0 0 1px rgba(16, 185, 129, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.3);
            background: linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%);
          }

          .btn-decline:hover:not(:disabled) {
            box-shadow: 
              0 12px 40px rgba(239, 68, 68, 0.5),
              0 0 0 1px rgba(239, 68, 68, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.3);
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%);
          }

          .btn-edit:hover:not(:disabled) {
            box-shadow: 
              0 12px 40px rgba(245, 158, 11, 0.5),
              0 0 0 1px rgba(245, 158, 11, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.3);
            background: linear-gradient(135deg, #d97706 0%, #b45309 50%, #92400e 100%);
          }

          .btn-delete:hover:not(:disabled) {
            box-shadow: 
              0 12px 40px rgba(100, 116, 139, 0.5),
              0 0 0 1px rgba(100, 116, 139, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.3);
            background: linear-gradient(135deg, #475569 0%, #334155 50%, #1e293b 100%);
          }

          .btn-secondary:hover:not(:disabled) {
            box-shadow: 
              0 12px 40px rgba(148, 163, 184, 0.4),
              0 0 0 1px rgba(148, 163, 184, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.6);
            background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 50%, #94a3b8 100%);
            color: #334155;
          }

          /* Filter Tab Enhancements */
          .filter-tab-enhanced {
            position: relative;
            z-index: 1;
          }

          .filter-tab-enhanced:hover:not(.active) {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            color: #334155;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(148, 163, 184, 0.3);
          }

          /* Modal Close Button Enhancement */
          .modal-close-enhanced:hover {
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            color: #1e293b;
            transform: scale(1.1) rotate(90deg);
          }

          /* Form Input Enhancements */
          .input-enhanced:focus,
          .textarea-enhanced:focus {
            border-color: #667eea;
            box-shadow: 
              0 0 0 3px rgba(102, 126, 234, 0.1),
              0 4px 12px rgba(102, 126, 234, 0.15);
            transform: translateY(-1px);
          }

          .input-enhanced:hover,
          .textarea-enhanced:hover {
            border-color: #94a3b8;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          /* Card Hover Effects */
          .offer-card {
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            animation: fadeIn 0.3s ease-out;
          }

          /* Scrollbar Styling */
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

          /* Button Focus States for Accessibility */
          .btn-enhanced:focus-visible {
            outline: 2px solid #667eea;
            outline-offset: 2px;
            box-shadow: 
              0 0 0 4px rgba(102, 126, 234, 0.2),
              0 8px 32px rgba(102, 126, 234, 0.4);
          }

          /* Enhanced Ripple Effect */
          @keyframes ripple {
            0% {
              transform: scale(0);
              opacity: 1;
            }
            100% {
              transform: scale(4);
              opacity: 0;
            }
          }

          .btn-enhanced:active {
            transform: scale(0.98);
          }

          /* Loading Button State */
          .btn-enhanced:disabled {
            cursor: not-allowed;
            opacity: 0.6;
            transform: none !important;
            animation: none !important;
          }

          /* Mobile responsive styles */
          @media (max-width: 768px) {
            .btn-enhanced {
              min-width: 120px;
              padding: 0.75rem 1.5rem;
              font-size: 0.8rem;
            }

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
            
            .filter-tabs {
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
              scrollbar-width: none;
              -ms-overflow-style: none;
            }
            
            .filter-tabs::-webkit-scrollbar {
              display: none;
            }
            
            .detail-item {
              flex-direction: column !important;
              align-items: flex-start !important;
              gap: 0.5rem;
            }
            
            .value {
              text-align: left !important;
              margin-left: 0 !important;
            }
            
            .actions-container {
              flex-direction: column !important;
              gap: 0.75rem !important;
            }
            
            .btn-enhanced {
              width: 100% !important;
              min-width: auto !important;
            }
            
            .modal {
              width: 95% !important;
              margin: 1rem !important;
            }
            
            .modal-footer {
              flex-direction: column !important;
              gap: 0.75rem !important;
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
            
            .filter-tab-enhanced {
              min-width: 100px !important;
              padding: 0.5rem 1rem !important;
            }
            
            .offer-card-header {
              flex-direction: column !important;
              align-items: flex-start !important;
            }
            
            .offer-title-section {
              min-width: 100% !important;
              margin-bottom: 1rem;
            }

            .btn-enhanced {
              padding: 0.7rem 1.2rem;
              font-size: 0.75rem;
              border-radius: 12px;
            }
          }

          /* Hover effects for desktop only */
          @media (min-width: 769px) {
            .offer-card:hover {
              transform: translateY(-6px) !important;
              box-shadow: 
                0 20px 60px rgba(0, 0, 0, 0.15),
                0 0 0 1px rgba(102, 126, 234, 0.1) !important;
            }
            
            .stat-card:hover {
              transform: translateY(-4px) !important;
              box-shadow: 
                0 12px 40px rgba(0, 0, 0, 0.12),
                0 0 0 1px rgba(102, 126, 234, 0.1) !important;
            }
          }

          /* Enhanced gradient animations */
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          .header {
            background-size: 200% 200%;
            animation: gradientShift 6s ease infinite;
          }

          /* Card entrance animations with stagger */
          .offer-card {
            animation: slideInUp 0.6s ease-out;
            animation-fill-mode: both;
          }

          .offer-card:nth-child(1) { animation-delay: 0.1s; }
          .offer-card:nth-child(2) { animation-delay: 0.2s; }
          .offer-card:nth-child(3) { animation-delay: 0.3s; }
          .offer-card:nth-child(4) { animation-delay: 0.4s; }
          .offer-card:nth-child(5) { animation-delay: 0.5s; }

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

          /* Enhanced modal animations */
          .modal {
            animation: modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          @keyframes modalSlideIn {
            from {
              opacity: 0;
              transform: scale(0.7) translateY(-50px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }

          /* Status badge pulse for pending */
          .status-pending {
            animation: pulse 2s infinite;
          }

          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
          }

          /* Button Loading Animation */
          .btn-enhanced.loading {
            pointer-events: none;
            position: relative;
          }

          .btn-enhanced.loading::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 16px;
            height: 16px;
            margin: -8px 0 0 -8px;
            border: 2px solid transparent;
            border-top: 2px solid currentColor;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          /* Micro-interactions */
          .btn-enhanced {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .btn-enhanced:active:not(:disabled) {
            transform: translateY(-1px) scale(0.98);
            transition: all 0.1s ease;
          }

          /* Enhanced shadow depths */
          .btn-approve {
            box-shadow: 
              0 4px 14px 0 rgba(16, 185, 129, 0.39),
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }

          .btn-decline {
            box-shadow: 
              0 4px 14px 0 rgba(239, 68, 68, 0.39),
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }

          .btn-edit {
            box-shadow: 
              0 4px 14px 0 rgba(245, 158, 11, 0.39),
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }

          .btn-delete {
            box-shadow: 
              0 4px 14px 0 rgba(100, 116, 139, 0.39),
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }

          .btn-secondary {
            box-shadow: 
              0 4px 14px 0 rgba(148, 163, 184, 0.29),
              inset 0 1px 0 rgba(255, 255, 255, 0.6);
          }

          /* Smooth color transitions */
          * {
            transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
          }

          /* Enhanced focus indicators */
          .filter-tab-enhanced:focus-visible {
            outline: 2px solid #667eea;
            outline-offset: 2px;
          }

          /* Button text animation */
          .btn-enhanced span {
            transition: all 0.2s ease;
          }

          .btn-enhanced:hover:not(:disabled) span {
            transform: translateY(-1px);
          }

          /* Improved accessibility */
          @media (prefers-reduced-motion: reduce) {
            .btn-enhanced,
            .filter-tab-enhanced,
            .offer-card,
            .modal {
              animation: none !important;
              transition: none !important;
            }
          }

          /* High contrast mode support */
          @media (prefers-contrast: high) {
            .btn-enhanced {
              border: 2px solid currentColor;
            }
          }
        `}
      </style>
    </div>
  );
};

export default AdminOffersManagement;