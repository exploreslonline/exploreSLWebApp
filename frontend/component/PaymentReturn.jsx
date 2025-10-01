import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const PaymentReturn = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState('verifying');
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // Get parameters from PayHere return URL
  const orderId = searchParams.get('order_id');
  const statusCode = searchParams.get('status_code');
  const paymentId = searchParams.get('payment_id');
  const amount = searchParams.get('payhere_amount');

  useEffect(() => {
    const handlePaymentReturn = async () => {
      console.log('PayHere return data:', { orderId, statusCode, paymentId });

      // Handle immediate failure cases
      if (statusCode === '-1') {
        setVerificationStatus('cancelled');
        return;
      }
      
      if (statusCode === '-2') {
        setVerificationStatus('failed');
        return;
      }

      // For successful or pending payments, verify with backend
      if (statusCode === '2' || statusCode === '0') {
        await verifyPaymentStatus();
      } else {
        setVerificationStatus('unknown');
        setError(`Unknown payment status code: ${statusCode}`);
      }
    };

    const verifyPaymentStatus = async () => {
      if (!orderId) {
        setError('No order ID received from payment gateway');
        setVerificationStatus('failed');
        return;
      }

      try {
        console.log(`Verifying payment status for order: ${orderId}, attempt: ${retryCount + 1}`);
        
        const response = await fetch(`http://localhost:5555/check-payment-status/${orderId}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to verify payment status');
        }

        console.log('Payment verification response:', data);

        if (data.success) {
          if (data.status === 'completed' && data.subscription) {
            setSubscription(data.subscription);
            setVerificationStatus('success');
            console.log('Payment verification successful');
          } else if (data.status === 'pending' || data.status === 'active') {
            // PayHere notification might still be processing
            if (retryCount < 15) { // Increased retry limit
              console.log('Payment still processing, retrying in 2 seconds...');
              setTimeout(() => {
                setRetryCount(prev => prev + 1);
              }, 2000);
            } else {
              setError('Payment verification timed out. Please contact support if you were charged.');
              setVerificationStatus('timeout');
            }
          } else {
            setError(`Payment status: ${data.status}`);
            setVerificationStatus('failed');
          }
        } else {
          throw new Error(data.message || 'Payment verification failed');
        }

      } catch (error) {
        console.error('Payment verification error:', error);
        setError(error.message || 'Failed to verify payment status');
        setVerificationStatus('failed');
      }
    };

    handlePaymentReturn();
  }, [orderId, statusCode, retryCount]);

  const getStatusContent = () => {
    switch (verificationStatus) {
      case 'verifying':
        return {
          icon: '⏳',
          title: 'Verifying Payment...',
          message: 'Please wait while we confirm your payment with the bank.',
          color: '#007bff',
          showSpinner: true
        };
      case 'success':
        return {
          icon: '✅',
          title: 'Payment Successful!',
          message: subscription?.autoRenew 
            ? `Your ${subscription.planName} with auto-renewal has been activated successfully.`
            : `Your ${subscription.planName} subscription has been activated successfully.`,
          color: '#28a745'
        };
      case 'cancelled':
        return {
          icon: '❌',
          title: 'Payment Cancelled',
          message: 'You cancelled the payment process.',
          color: '#ffc107'
        };
      case 'failed':
        return {
          icon: '❌',
          title: 'Payment Failed',
          message: error || 'Payment could not be processed. Please try again.',
          color: '#dc3545'
        };
      case 'timeout':
        return {
          icon: '⚠️',
          title: 'Verification Timeout',
          message: error || 'Payment verification took longer than expected.',
          color: '#fd7e14'
        };
      case 'unknown':
      default:
        return {
          icon: '❓',
          title: 'Unknown Status',
          message: error || 'Please contact support for assistance.',
          color: '#6c757d'
        };
    }
  };

  const statusContent = getStatusContent();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{
          ...styles.statusHeader,
          backgroundColor: `${statusContent.color}20`,
          borderColor: statusContent.color
        }}>
          <div style={styles.iconContainer}>
            {statusContent.showSpinner ? (
              <div style={{
                ...styles.spinner,
                borderTopColor: statusContent.color
              }}></div>
            ) : (
              <span style={styles.icon}>{statusContent.icon}</span>
            )}
          </div>
          <h2 style={{
            ...styles.title,
            color: statusContent.color
          }}>
            {statusContent.title}
          </h2>
        </div>

        <p style={styles.message}>{statusContent.message}</p>

        {/* Show subscription details for successful payments */}
        {subscription && verificationStatus === 'success' && (
          <div style={styles.subscriptionDetails}>
            <h3 style={styles.detailsTitle}>Subscription Details</h3>
            <div style={styles.detailsGrid}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Plan:</span>
                <span style={styles.detailValue}>{subscription.planName}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Amount:</span>
                <span style={styles.detailValue}>
                  {subscription.currency} {subscription.amount.toLocaleString()}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Status:</span>
                <span style={{
                  ...styles.detailValue,
                  color: '#28a745',
                  fontWeight: 'bold'
                }}>
                  {subscription.status.toUpperCase()}
                </span>
              </div>
              {subscription.autoRenew && (
                <>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Auto-Renewal:</span>
                    <span style={{
                      ...styles.detailValue,
                      color: '#28a745'
                    }}>
                      ✓ Enabled
                    </span>
                  </div>
                  {subscription.nextBillingDate && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Next Billing:</span>
                      <span style={styles.detailValue}>
                        {new Date(subscription.nextBillingDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </>
              )}
              {subscription.endDate && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Valid Until:</span>
                  <span style={styles.detailValue}>
                    {new Date(subscription.endDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Show retry information during verification */}
        {verificationStatus === 'verifying' && retryCount > 0 && (
          <div style={styles.retryInfo}>
            Verification attempt {retryCount + 1} of 15...
            <br />
            <small>This may take a few moments as we wait for payment confirmation.</small>
          </div>
        )}

        {/* Action buttons */}
        <div style={styles.actions}>
          {verificationStatus === 'success' ? (
            <>
              <button
                onClick={() => navigate('/profile')}
                style={styles.primaryButton}
              >
                Go to Profile
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                style={styles.secondaryButton}
              >
                Go to Dashboard
              </button>
            </>
          ) : verificationStatus === 'verifying' ? (
            <div style={styles.loadingText}>
              Please wait, do not close this page...
            </div>
          ) : (
            <>
              <button
                onClick={() => navigate('/subscription')}
                style={styles.primaryButton}
              >
                Back to Subscription
              </button>
              {(verificationStatus === 'failed' || verificationStatus === 'timeout') && (
                <button
                  onClick={() => window.location.reload()}
                  style={styles.secondaryButton}
                >
                  Try Again
                </button>
              )}
            </>
          )}
        </div>

        {/* Support information for failed payments */}
        {(verificationStatus === 'failed' || verificationStatus === 'timeout') && (
          <div style={styles.supportInfo}>
            <h4>Need Help?</h4>
            <p>
              If you were charged but your subscription isn't active, please contact support with:
            </p>
            <ul>
              <li>Order ID: <strong>{orderId}</strong></li>
              <li>Payment ID: <strong>{paymentId}</strong></li>
              <li>Amount: <strong>{amount}</strong></li>
            </ul>
          </div>
        )}

        {/* Debug info for development */}
        {process.env.NODE_ENV === 'development' && (
          <details style={styles.debugInfo}>
            <summary>Debug Information</summary>
            <pre>{JSON.stringify({
              orderId,
              statusCode,
              paymentId,
              amount,
              retryCount,
              verificationStatus
            }, null, 2)}</pre>
          </details>
        )}
      </div>
    </div>
  );
};

// 2. Styles for PaymentReturn component
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '20px',
    fontFamily: '"Inter", "Segoe UI", sans-serif'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    maxWidth: '600px',
    width: '100%'
  },
  statusHeader: {
    border: '2px solid',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    marginBottom: '30px'
  },
  iconContainer: {
    marginBottom: '16px'
  },
  icon: {
    fontSize: '48px',
    display: 'inline-block'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f4f6',
    borderRadius: '50%',
    borderTopColor: '#007bff',
    animation: 'spin 1s linear infinite',
    margin: '0 auto'
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 'bold'
  },
  message: {
    fontSize: '18px',
    color: '#64748b',
    lineHeight: '1.6',
    textAlign: 'center',
    marginBottom: '30px'
  },
  subscriptionDetails: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '30px'
  },
  detailsTitle: {
    margin: '0 0 20px 0',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e293b'
  },
  detailsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '8px',
    borderBottom: '1px solid #e2e8f0'
  },
  detailLabel: {
    fontWeight: '500',
    color: '#64748b'
  },
  detailValue: {
    fontWeight: '600',
    color: '#1e293b'
  },
  retryInfo: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: '14px',
    margin: '20px 0',
    padding: '16px',
    backgroundColor: '#f1f5f9',
    borderRadius: '8px'
  },
  actions: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  primaryButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '14px 28px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    color: '#64748b',
    border: '2px solid #e2e8f0',
    padding: '12px 26px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  loadingText: {
    color: '#64748b',
    fontSize: '14px',
    textAlign: 'center'
  },
  supportInfo: {
    marginTop: '30px',
    padding: '20px',
    backgroundColor: '#fef3cd',
    borderRadius: '8px',
    border: '1px solid #fde68a'
  },
  debugInfo: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#64748b'
  }
};
export default PaymentReturn;