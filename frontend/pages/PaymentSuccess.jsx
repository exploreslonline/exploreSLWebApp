import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../src/AuthContext';

function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useContext(AuthContext);
  
  // Get parameters from URL
  const plan = searchParams.get('plan');
  const orderId = searchParams.get('orderId');
  const warning = searchParams.get('warning');
  
  const [verificationStatus, setVerificationStatus] = useState('verifying'); // verifying, success, failed
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // Verify payment status
// In PaymentSuccess.js - enhance the verification logic
useEffect(() => {
  const verifyPayment = async () => {
    if (!orderId) {
      setVerificationStatus('success');
      return;
    }

    try {
      console.log('Verifying payment status for order:', orderId);
      
      const response = await fetch(`http://localhost:5555/check-payment-status/${orderId}`);
      const data = await response.json();
      
      if (data.success) {
        if (data.status === 'completed' && data.subscription) {
          console.log('Payment verification successful');
          setSubscription(data.subscription);
          setVerificationStatus('success');
        } else if (data.status === 'pending') {
          console.log('Payment still processing...');
          // Increase retry limit since backend is now more reliable
          if (retryCount < 15) { // Increased from 10 to 15
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, 3000);
          } else {
            setError('Payment verification timed out. Please contact support if you were charged.');
            setVerificationStatus('failed');
          }
        }
      } else {
        throw new Error(data.message || 'Failed to verify payment');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setError('Failed to verify payment status. Please contact support if you were charged.');
      setVerificationStatus('failed');
    }
  };

  verifyPayment();
}, [orderId, retryCount]);

  const getStatusContent = () => {
    if (verificationStatus === 'verifying') {
      return {
        icon: '⏳',
        title: 'Verifying Payment...',
        message: 'Please wait while we confirm your payment.',
        color: '#2563eb',
        backgroundColor: '#dbeafe'
      };
    }

    if (verificationStatus === 'failed') {
      return {
        icon: '⚠️',
        title: 'Something Went Wrong',
        message: error || "We couldn't verify your payment status. Please contact support if you were charged.",
        color: '#dc2626',
        backgroundColor: '#fee2e2'
      };
    }

    // Success cases
    if (plan === 'free') {
      return {
        icon: '🎉',
        title: 'Welcome to the Free Plan!',
        message: 'Your free account has been activated successfully.',
        color: '#059669',
        backgroundColor: '#d1fae5'
      };
    }

    return {
      icon: '🎉',
      title: 'Payment Successful!',
      message: `Your ${subscription?.planName || 'Premium'} subscription has been activated successfully.`,
      color: '#059669',
      backgroundColor: '#d1fae5'
    };
  };

  const statusContent = getStatusContent();

  const styles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
      padding: '20px'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '40px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
      textAlign: 'center',
      maxWidth: '500px',
      width: '100%'
    },
    statusBanner: {
      backgroundColor: statusContent.backgroundColor,
      color: statusContent.color,
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '30px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '15px'
    },
    icon: {
      fontSize: '32px'
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      margin: 0
    },
    message: {
      fontSize: '16px',
      color: '#64748b',
      marginBottom: '30px',
      lineHeight: '1.6'
    },
    detailsCard: {
      backgroundColor: '#f8fafc',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '30px',
      textAlign: 'left'
    },
    detailRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '10px',
      fontSize: '14px'
    },
    button: {
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      padding: '12px 30px',
      borderRadius: '6px',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'background-color 0.3s ease',
      marginRight: '15px'
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      color: '#64748b',
      border: '1px solid #e2e8f0',
      padding: '12px 30px',
      borderRadius: '6px',
      fontSize: '16px',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    loadingSpinner: {
      width: '24px',
      height: '24px',
      border: '3px solid #e2e8f0',
      borderTop: '3px solid #3b82f6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    warningBanner: {
      backgroundColor: '#fef3cd',
      color: '#856404',
      padding: '15px',
      borderRadius: '6px',
      marginBottom: '20px',
      fontSize: '14px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.statusBanner}>
          {verificationStatus === 'verifying' ? (
            <div style={styles.loadingSpinner}></div>
          ) : (
            <span style={styles.icon}>{statusContent.icon}</span>
          )}
          <div>
            <h1 style={styles.title}>{statusContent.title}</h1>
          </div>
        </div>

        {warning === 'subscription_record_failed' && (
          <div style={styles.warningBanner}>
            Warning: Payment was successful, but there was an issue creating your subscription record. 
            Please contact support to ensure your subscription is properly activated.
          </div>
        )}

        <p style={styles.message}>{statusContent.message}</p>

        {/* Show subscription details if available */}
        {subscription && verificationStatus === 'success' && (
          <div style={styles.detailsCard}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '16px' }}>Subscription Details</h3>
            <div style={styles.detailRow}>
              <span>Plan:</span>
              <strong>{subscription.planName}</strong>
            </div>
            <div style={styles.detailRow}>
              <span>Status:</span>
              <strong style={{ color: '#059669', textTransform: 'capitalize' }}>
                {subscription.status}
              </strong>
            </div>
            <div style={styles.detailRow}>
              <span>Amount:</span>
              <strong>LKR {subscription.amount.toLocaleString()}</strong>
            </div>
            {subscription.endDate && (
              <div style={styles.detailRow}>
                <span>Next Billing:</span>
                <strong>{new Date(subscription.endDate).toLocaleDateString()}</strong>
              </div>
            )}
            {orderId && (
              <div style={styles.detailRow}>
                <span>Order ID:</span>
                <strong>{orderId}</strong>
              </div>
            )}
          </div>
        )}

        {/* Show order details for free plan */}
        {plan === 'free' && verificationStatus === 'success' && (
          <div style={styles.detailsCard}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '16px' }}>Plan Details</h3>
            <div style={styles.detailRow}>
              <span>Plan:</span>
              <strong>Free Plan</strong>
            </div>
            <div style={styles.detailRow}>
              <span>Cost:</span>
              <strong>Free Forever</strong>
            </div>
            <div style={styles.detailRow}>
              <span>Features:</span>
              <strong>1 highlight ad, Standard listings</strong>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ marginTop: '30px' }}>
          {verificationStatus === 'success' ? (
            <>
              {/* <button
                onClick={() => navigate('/dashboard')}
                style={styles.button}
                onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
              >
                Go to Dashboard
              </button> */}
              <button
                onClick={() => navigate('/profile')}
                style={styles.secondaryButton}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#f1f5f9';
                  e.target.style.borderColor = '#cbd5e1';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.borderColor = '#e2e8f0';
                }}
              >
                View Profile
              </button>
            </>
          ) : verificationStatus === 'failed' ? (
            <>
              <button
                onClick={() => window.location.reload()}
                style={styles.button}
                onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/profile')}
                style={styles.secondaryButton}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#f1f5f9';
                  e.target.style.borderColor = '#cbd5e1';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.borderColor = '#e2e8f0';
                }}
              >
                Back to Profile
              </button>
            </>
          ) : (
            <div style={{ color: '#64748b', fontSize: '14px' }}>
              Verification in progress... (Attempt {retryCount + 1}/10)
            </div>
          )}
        </div>

        {/* Additional help text */}
        {verificationStatus === 'failed' && (
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            backgroundColor: '#f8fafc', 
            borderRadius: '6px',
            fontSize: '14px',
            color: '#64748b'
          }}>
            <p style={{ margin: 0, marginBottom: '10px' }}>
              <strong>Need Help?</strong>
            </p>
            <p style={{ margin: 0 }}>
              If you were charged but your subscription isn't showing, please contact our support team with your order ID: <strong>{orderId}</strong>
            </p>
          </div>
        )}
      </div>

      {/* CSS for loading spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default PaymentSuccess;