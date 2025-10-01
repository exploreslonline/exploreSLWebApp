import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../src/AuthContext';
import { subscriptionUtils } from '../src/subscriptionUtils';

function SubscriptionCancellationManager({ subscription, onUpdate }) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [cancellationDetails, setCancellationDetails] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  // Add local state to track downgrade status
  const [localDowngradeScheduled, setLocalDowngradeScheduled] = useState(false);

  useEffect(() => {
    // Update local state when subscription prop changes
    setLocalDowngradeScheduled(subscription?.downgradeScheduled || false);
    
    if (subscription && subscription.downgradeScheduled) {
      loadCancellationDetails();
    } else {
      setCancellationDetails(null);
    }
  }, [subscription]);

  const loadCancellationDetails = async () => {
    try {
      // Updated to use downgrade instead of cancellation
      const result = await subscriptionUtils.getDowngradeDetails(user.userId);
      if (result.success) {
        setCancellationDetails(result.downgradeInfo);
      }
    } catch (error) {
      console.error('Error loading downgrade details:', error);
    }
  };

  const handleScheduleCancellation = async () => {
    if (!cancellationReason.trim()) {
      alert('Please provide a reason for downgrading to free plan');
      return;
    }

    setLoading(true);
    try {
      // Use the updated downgrade scheduling function
      const result = await subscriptionUtils.scheduleDowngradeToFree(
        user.userId || subscription.userId, 
        user.email || subscription.userEmail, 
        cancellationReason
      );

      if (result.success) {
        setShowConfirmModal(false);
        setCancellationReason('');
        // Update local state immediately
        setLocalDowngradeScheduled(true);
        // Then update parent component
        if (onUpdate) {
          await onUpdate();
        }
        alert(result.message);
      } else {
        alert('Error: ' + result.message);
      }
    } catch (error) {
      alert('Error scheduling downgrade: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelScheduledCancellation = async () => {
    setLoading(true);
    try {
      console.log('Cancelling downgrade for userId:', user.userId || subscription.userId);
      
      const result = await subscriptionUtils.cancelScheduledDowngrade(
        user.userId || subscription.userId
      );

      console.log('Cancel downgrade result:', result);

      if (result.success) {
        // Update local state immediately for instant UI feedback
        setLocalDowngradeScheduled(false);
        setCancellationDetails(null);
        
        // Show success message immediately
        alert(result.message);
        
        // Then update parent component data in background
        if (onUpdate) {
          // Use setTimeout to ensure state updates have processed
          setTimeout(async () => {
            try {
              await onUpdate();
            } catch (error) {
              console.error('Error refreshing parent component:', error);
            }
          }, 100);
        }
      } else {
        console.error('Cancel downgrade failed:', result.message);
        alert('Error: ' + result.message);
      }
    } catch (error) {
      console.error('Error cancelling scheduled downgrade:', error);
      alert('Error cancelling scheduled downgrade: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (!subscription || subscription.planId === '1') {
    return null; // Don't show for free users
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // FIXED: Calculate days until downgrade using subscription end date
  const getDaysUntilDowngrade = () => {
    let targetDate;
    
    if (subscription.downgradeEffectiveDate) {
      targetDate = new Date(subscription.downgradeEffectiveDate);
    } else if (subscription.endDate) {
      targetDate = new Date(subscription.endDate);
    } else if (subscription.nextBillingDate) {
      targetDate = new Date(subscription.nextBillingDate);
    } else {
      return 0;
    }

    const today = new Date();
    const diffTime = targetDate - today;
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const getEffectiveDowngradeDate = () => {
    if (subscription.downgradeEffectiveDate) {
      return subscription.downgradeEffectiveDate;
    } else if (subscription.endDate) {
      return subscription.endDate;
    } else if (subscription.nextBillingDate) {
      return subscription.nextBillingDate;
    } else {
      // Fallback calculation
      const startDate = new Date(subscription.startDate || Date.now());
      if (subscription.billingCycle === 'yearly') {
        return new Date(startDate.setFullYear(startDate.getFullYear() + 1));
      } else {
        return new Date(startDate.setMonth(startDate.getMonth() + 1));
      }
    }
  };

  const daysRemaining = getDaysUntilDowngrade();
  const effectiveDate = getEffectiveDowngradeDate();

  // Use local state for immediate UI updates, fallback to subscription prop
  const isDowngradeScheduled = localDowngradeScheduled || subscription.downgradeScheduled;

  return (
    <div style={{ 
      marginTop: '20px', 
      padding: '20px', 
      backgroundColor: isDowngradeScheduled ? '#fff3cd' : '#f8fafc', 
      borderRadius: '8px', 
      border: `1px solid ${isDowngradeScheduled ? '#ffeaa7' : '#e2e8f0'}` 
    }}>
      <h3>Subscription Management</h3>
      
      {/* Current Status */}
      <div style={{ marginBottom: '15px' }}>
        <p><strong>Current Plan:</strong> {subscription.planName}</p>
        <p><strong>Status:</strong> {subscription.status}</p>
        {subscription.endDate && (
          <p><strong>Subscription Valid Until:</strong> {formatDate(subscription.endDate)}</p>
        )}
        {subscription.nextBillingDate && (
          <p><strong>Next Billing Date:</strong> {formatDate(subscription.nextBillingDate)}</p>
        )}
        {subscription.autoRenew && !isDowngradeScheduled && (
          <p><strong>Auto-Renewal:</strong> ✅ Enabled</p>
        )}
      </div>

      {/* Downgrade Status */}
      {isDowngradeScheduled ? (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8d7da', 
          borderRadius: '5px', 
          border: '1px solid #f5c6cb',
          marginBottom: '15px'
        }}>
          <h4 style={{ color: '#721c24', margin: '0 0 10px 0' }}>
            ⚠️ Downgrade to Free Plan Scheduled
          </h4>
          <p style={{ margin: '5px 0' }}>
            Your premium features will continue until <strong>{formatDate(effectiveDate)}</strong>
          </p>
          <p style={{ margin: '5px 0' }}>
            After that date, your account will automatically switch to the Free plan.
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px', color: '#6c757d' }}>
            Days remaining with premium features: <strong>{daysRemaining}</strong>
          </p>
          
          {/* Show what will happen after downgrade */}
          <div style={{ 
            marginTop: '10px', 
            padding: '10px', 
            backgroundColor: '#e3f2fd', 
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            <strong>After downgrade, your account will have:</strong>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>1 active business (others will be suspended)</li>
              <li>3 active offers (others will be suspended)</li>
              <li>All suspended content can be reactivated by upgrading back to Premium</li>
            </ul>
          </div>
          
          {cancellationDetails && (
            <div style={{ marginTop: '10px', fontSize: '14px' }}>
              <p><strong>Downgrade Reason:</strong> {cancellationDetails.reason}</p>
              <p><strong>Scheduled On:</strong> {formatDate(cancellationDetails.scheduledDate)}</p>
            </div>
          )}

          <button
            onClick={handleCancelScheduledCancellation}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              marginTop: '10px'
            }}
          >
            {loading ? 'Processing...' : 'Keep Premium Subscription'}
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: '15px' }}>
          <p style={{ color: '#28a745', fontWeight: 'bold' }}>
            ✅ Your premium subscription is active
            {subscription.autoRenew && subscription.nextBillingDate && 
              ` and will auto-renew on ${formatDate(subscription.nextBillingDate)}`
            }
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {!isDowngradeScheduled && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            Downgrade to Free Plan
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            margin: '20px'
          }}>
            <h3 style={{ marginTop: 0 }}>Schedule Downgrade to Free Plan</h3>
            
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '5px', 
              marginBottom: '20px' 
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#1565c0' }}>What happens next:</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#1565c0' }}>
                <li>You'll continue to enjoy all premium features until {formatDate(effectiveDate)}</li>
                <li>No charges will be made on your next billing date</li>
                <li>Your account will automatically switch to the Free plan</li>
                <li>Only 1 business and 3 offers will remain active (others suspended)</li>
                <li>You can upgrade back to Premium anytime to restore all content</li>
              </ul>
            </div>

            {/* Premium benefits reminder */}
            <div style={{
              padding: '15px',
              backgroundColor: '#fff3cd',
              borderRadius: '5px',
              marginBottom: '20px'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>You'll lose these Premium benefits:</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#856404' }}>
                <li>2 additional businesses (total 3 → 1)</li>
                <li>6 additional offers (total 9 → 3)</li>
                <li>Priority customer support</li>
                <li>Advanced analytics and reporting</li>
              </ul>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Why are you downgrading? (Optional feedback)
              </label>
              <select
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">Select a reason...</option>
                <option value="too_expensive">Too expensive</option>
                <option value="not_using_features">Not using premium features enough</option>
                <option value="found_alternative">Found an alternative solution</option>
                <option value="temporary_pause">Temporary pause, will return later</option>
                <option value="business_closed">Business closed/changed</option>
                <option value="technical_issues">Technical issues</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setCancellationReason('');
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Keep Premium
              </button>
              <button
                onClick={handleScheduleCancellation}
                disabled={loading || !cancellationReason.trim()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: (loading || !cancellationReason.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (loading || !cancellationReason.trim()) ? 0.6 : 1
                }}
              >
                {loading ? 'Scheduling...' : 'Schedule Downgrade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grace Period Information */}
      <div style={{ 
        marginTop: '15px', 
        padding: '10px', 
        backgroundColor: '#e8f5e8', 
        borderRadius: '4px', 
        fontSize: '12px', 
        color: '#2d5a2d' 
      }}>
        <strong>Good to know:</strong> If you schedule a downgrade, you'll keep all premium features 
        until your subscription's natural end date ({formatDate(effectiveDate)}). This ensures you get the full value of what you've paid for!
      </div>
    </div>
  );
}

export default SubscriptionCancellationManager;