import React, { useState, useEffect } from 'react';
import { subscriptionUtils } from '../src/subscriptionUtils';

const AutoRenewalManager = ({ subscription, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [downgradeReason, setDowngradeReason] = useState('');
  const [downgradeImpact, setDowngradeImpact] = useState(null);
  
  // FIXED: Better state management for immediate UI updates
  const [pendingAutoRenewalState, setPendingAutoRenewalState] = useState(null);
  const [pendingDowngradeState, setPendingDowngradeState] = useState(null);
  const [lastProcessedSubscription, setLastProcessedSubscription] = useState(null);

  // FIXED: Better subscription change detection
  useEffect(() => {
    if (!subscription) return;

    // Create a signature of the current subscription
    const subscriptionSignature = {
      id: subscription._id,
      autoRenew: subscription.autoRenew,
      downgradeScheduled: subscription.downgradeScheduled,
      updatedAt: subscription.updatedAt
    };

    // Check if this is actually a new subscription update
    const lastSignature = lastProcessedSubscription ? {
      id: lastProcessedSubscription._id,
      autoRenew: lastProcessedSubscription.autoRenew,
      downgradeScheduled: lastProcessedSubscription.downgradeScheduled,
      updatedAt: lastProcessedSubscription.updatedAt
    } : null;

    const hasChanged = !lastSignature || 
      JSON.stringify(subscriptionSignature) !== JSON.stringify(lastSignature);

    if (hasChanged) {
      console.log('Subscription data changed, resetting pending states');
      setPendingAutoRenewalState(null);
      setPendingDowngradeState(null);
      setLastProcessedSubscription(subscription);
    }
  }, [subscription, lastProcessedSubscription]);

  // Return loading state if no subscription data
  if (!subscription) {
    return (
      <div style={styles.renewalManager}>
        <h4>Auto-Renewal & Plan Management</h4>
        <p>Loading subscription data...</p>
      </div>
    );
  }

  // FIXED: Use pending state for immediate UI updates, fallback to subscription data
  const currentAutoRenew = pendingAutoRenewalState !== null ? 
    pendingAutoRenewalState : subscription.autoRenew;
  const currentDowngradeScheduled = pendingDowngradeState !== null ? 
    pendingDowngradeState : subscription.downgradeScheduled;

  const isDowngradeScheduled = currentDowngradeScheduled === true;
  const downgradeDate = subscription.downgradeEffectiveDate;
  const autoRenewalDisabled = !currentAutoRenew || isDowngradeScheduled;

  // Calculate days remaining until downgrade
  const getDaysUntilDowngrade = () => {
    if (!downgradeDate) return 0;
    const today = new Date();
    const effective = new Date(downgradeDate);
    return Math.max(0, Math.ceil((effective - today) / (1000 * 60 * 60 * 24)));
  };

  const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 20px;
      background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
      color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
      border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      max-width: 400px;
      font-family: inherit;
      font-size: 14px;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        setTimeout(() => toast.parentNode.removeChild(toast), 300);
      }
    }, 5000);
  };

  // Fetch downgrade impact when modal opens
  const handleDowngradeClick = async () => {
    try {
      setIsLoading(true);
      const impact = await subscriptionUtils.getDowngradeImpact(subscription.userId);
      setDowngradeImpact(impact);
      setShowDowngradeModal(true);
    } catch (error) {
      console.error('Error getting downgrade impact:', error);
      showToast('Unable to calculate downgrade impact. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAutoRenewal = async () => {
    if (!cancelReason.trim()) {
      showToast('Please provide a reason for cancellation.', 'error');
      return;
    }

    try {
      setIsLoading(true);
      
      // FIXED: Set pending state for immediate UI feedback
      setPendingAutoRenewalState(false);
      
      console.log('Cancelling auto-renewal with data:', {
        userId: subscription.userId,
        userEmail: subscription.userEmail,
        reason: cancelReason.trim()
      });

      const result = await subscriptionUtils.cancelAutoRenewal(
        subscription.userId, 
        subscription.userEmail,
        cancelReason.trim()
      );
      
      console.log('Cancel auto-renewal result:', result);

      if (result.success) {
        showToast(result.message, 'success');
        setShowCancelModal(false);
        setCancelReason('');
        
        // Refresh parent component data after delay to ensure server sync
        if (onUpdate) {
          setTimeout(() => {
            console.log('Refreshing parent component data after auto-renewal cancellation');
            onUpdate();
          }, 1500);
        }
      } else {
        // FIXED: Reset pending state on failure
        setPendingAutoRenewalState(subscription.autoRenew);
        showToast(result.message || 'Failed to cancel auto-renewal', 'error');
      }
      
    } catch (error) {
      console.error('Error cancelling auto-renewal:', error);
      // FIXED: Reset pending state on error
      setPendingAutoRenewalState(subscription.autoRenew);
      showToast(error.message || 'Failed to cancel auto-renewal', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleDowngrade = async () => {
    if (!downgradeReason.trim()) {
      showToast('Please provide a reason for downgrading.', 'error');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Scheduling downgrade with reason:', downgradeReason.trim());
      
      // FIXED: Set pending states for immediate UI feedback
      setPendingDowngradeState(true);
      setPendingAutoRenewalState(false);
      
      const response = await subscriptionUtils.scheduleDowngradeToFree(
        subscription.userId,
        subscription.userEmail,
        downgradeReason.trim()
      );

      console.log('Schedule downgrade response:', response);

      if (response.success) {
        const message = response.autoRenewalDisabled 
          ? `${response.message} Auto-renewal has been disabled immediately.`
          : response.message;
          
        showToast(message, 'success');
        setShowDowngradeModal(false);
        setDowngradeReason('');
        
        // Refresh parent component data
        if (onUpdate) {
          setTimeout(() => onUpdate(), 1500);
        }
      } else {
        if (response.alreadyScheduled) {
          showToast(response.message, 'info');
          setShowDowngradeModal(false);
          if (onUpdate) onUpdate();
        } else {
          // FIXED: Reset pending states on failure
          setPendingDowngradeState(subscription.downgradeScheduled);
          setPendingAutoRenewalState(subscription.autoRenew);
          showToast(response.message || 'Failed to schedule downgrade', 'error');
        }
      }
    } catch (error) {
      console.error('Error scheduling downgrade:', error);
      // FIXED: Reset pending states on error
      setPendingDowngradeState(subscription.downgradeScheduled);
      setPendingAutoRenewalState(subscription.autoRenew);
      showToast(error.message || 'Failed to schedule downgrade. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivateAutoRenewal = async () => {
    try {
      setIsLoading(true);
      
      // FIXED: Set pending state for immediate UI feedback
      setPendingAutoRenewalState(true);
      
      const result = await subscriptionUtils.reactivateAutoRenewal(
        subscription.userId, 
        subscription.userEmail
      );
      
      if (result.success) {
        showToast(result.message, 'success');
        
        // Refresh the subscription data from parent
        if (onUpdate) {
          setTimeout(() => onUpdate(), 1500);
        }
      } else {
        // FIXED: Reset pending state on failure
        setPendingAutoRenewalState(subscription.autoRenew);
        showToast(result.message || 'Failed to reactivate auto-renewal', 'error');
      }
      
    } catch (error) {
      console.error('Error reactivating auto-renewal:', error);
      // FIXED: Reset pending state on error
      setPendingAutoRenewalState(subscription.autoRenew);
      showToast(error.message || 'Failed to reactivate auto-renewal', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelDowngrade = async () => {
    try {
      setIsLoading(true);
      console.log('Cancelling downgrade for userId:', subscription.userId);
      
      // FIXED: Set pending states for immediate UI feedback
      setPendingDowngradeState(false);
      setPendingAutoRenewalState(true);
      
      const response = await subscriptionUtils.cancelScheduledDowngrade(subscription.userId);
      
      console.log('Cancel downgrade response:', response);
      
      if (response.success) {
        showToast('Downgrade cancelled successfully! Your Premium subscription and auto-renewal have been restored.', 'success');
        
        // Refresh parent component data
        if (onUpdate) {
          setTimeout(() => onUpdate(), 1500);
        }
      } else {
        // FIXED: Reset pending states on failure
        setPendingDowngradeState(subscription.downgradeScheduled);
        setPendingAutoRenewalState(subscription.autoRenew);
        showToast(response.message || 'Failed to cancel downgrade', 'error');
      }
    } catch (error) {
      console.error('Error cancelling downgrade:', error);
      // FIXED: Reset pending states on error
      setPendingDowngradeState(subscription.downgradeScheduled);
      setPendingAutoRenewalState(subscription.autoRenew);
      showToast('Failed to cancel downgrade. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.renewalManager}>
      <h4>Auto-Renewal & Plan Management</h4>

      {/* Current Status */}
      <div style={styles.statusSection}>
        <div style={styles.statusItem}>
          <span style={styles.statusLabel}>Auto-Renewal:</span>
          <span style={!autoRenewalDisabled ? styles.statusActive : styles.statusInactive}>
            {!autoRenewalDisabled ? 'Enabled' : 'Disabled'}
            {isLoading && <span style={{ fontSize: '12px', marginLeft: '8px' }}>(Updating...)</span>}
            {pendingAutoRenewalState !== null && (
              <span style={{ fontSize: '12px', marginLeft: '8px', color: '#fd7e14' }}>
                (Pending sync...)
              </span>
            )}
          </span>
        </div>

        {/* Show reason for disabled auto-renewal */}
        {autoRenewalDisabled && (
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>Reason:</span>
            <span style={styles.statusWarning}>
              {isDowngradeScheduled ? 'Downgrade scheduled' : 'Manually disabled'}
            </span>
          </div>
        )}

        {subscription.nextBillingDate && !isDowngradeScheduled && !autoRenewalDisabled && (
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>Next Billing:</span>
            <span>{new Date(subscription.nextBillingDate).toLocaleDateString()}</span>
          </div>
        )}

        {subscription.endDate && (
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>Subscription Valid Until:</span>
            <span>{new Date(subscription.endDate).toLocaleDateString()}</span>
          </div>
        )}

        {/* Show downgrade status if scheduled */}
        {isDowngradeScheduled && downgradeDate && (
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>Downgrade Scheduled:</span>
            <span style={styles.statusWarning}>
              {new Date(downgradeDate).toLocaleDateString()} ({getDaysUntilDowngrade()} days remaining)
            </span>
          </div>
        )}
      </div>

      {/* Auto-renewal disabled warning */}
      {autoRenewalDisabled && !isDowngradeScheduled && (
        <div style={styles.warningBox}>
          <div style={styles.warningHeader}>⚠️ Auto-Renewal Disabled</div>
          <p>
            Your subscription will not automatically renew. You'll continue to enjoy Premium features until{' '}
            {subscription.endDate && (
              <strong>{new Date(subscription.endDate).toLocaleDateString()}</strong>
            )}
            , then your account will need to be manually renewed or will revert to Free plan.
          </p>
          <p>
            <strong>No future charges will be made to your payment method.</strong>
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div style={styles.actionButtons}>
        {currentAutoRenew && !isDowngradeScheduled ? (
          <button
            style={styles.cancelButton}
            onClick={() => setShowCancelModal(true)}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Cancel Auto-Renewal'}
          </button>
        ) : !isDowngradeScheduled ? (
          <button
            style={styles.reactivateButton}
            onClick={handleReactivateAutoRenewal}
            disabled={isLoading}
          >
            {isLoading ? 'Reactivating...' : 'Enable Auto-Renewal'}
          </button>
        ) : null}

        {/* Downgrade Button - Disabled if already scheduled */}
        {!isDowngradeScheduled ? (
          <button
            style={styles.downgradeButton}
            onClick={handleDowngradeClick}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Downgrade to Free'}
          </button>
        ) : (
          <button
            style={styles.disabledButton}
            disabled={true}
          >
            Downgrade Scheduled ({getDaysUntilDowngrade()} days)
          </button>
        )}

        {/* Cancel Downgrade Button - Show only if downgrade is scheduled */}
        {isDowngradeScheduled && (
          <button
            style={styles.reactivateButton}
            onClick={handleCancelDowngrade}
            disabled={isLoading}
          >
            {isLoading ? 'Cancelling...' : 'Cancel Downgrade'}
          </button>
        )}
      </div>

      {/* Downgrade Warning if scheduled */}
      {isDowngradeScheduled && downgradeDate && (
        <div style={styles.warningBox}>
          <div style={styles.warningHeader}>⚠️ Downgrade Scheduled</div>
          <p>
            Your subscription will downgrade to Free plan on{' '}
            <strong>{new Date(downgradeDate).toLocaleDateString()}</strong>
            {' '}({getDaysUntilDowngrade()} days remaining).
          </p>
          <p>
            <strong>Auto-renewal has been disabled</strong> - you will not be charged again.
            You'll continue to enjoy Premium features until then. 
            Click "Cancel Downgrade" above if you've changed your mind.
          </p>
          {subscription.downgradeReason && (
            <p style={{ fontSize: '0.9rem', color: '#6c757d' }}>
              <strong>Reason:</strong> {subscription.downgradeReason}
            </p>
          )}
        </div>
      )}

      {/* Cancel Auto-Renewal Modal */}
      {showCancelModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>Cancel Auto-Renewal</h3>
            <p>Your subscription will remain active until the current billing period ends, then it will not renew automatically. <strong>You will not be charged again.</strong></p>
            
            <div style={styles.formGroup}>
              <label>Reason for cancellation:</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={styles.textarea}
                placeholder="Please let us know why you're cancelling..."
                rows="3"
              />
            </div>

            <div style={styles.modalActions}>
              <button 
                style={styles.confirmButton} 
                onClick={handleCancelAutoRenewal}
                disabled={isLoading || !cancelReason.trim()}
              >
                {isLoading ? 'Cancelling...' : 'Cancel Auto-Renewal'}
              </button>
              <button 
                style={styles.modalCancelButton} 
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
                disabled={isLoading}
              >
                Keep Auto-Renewal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Downgrade Modal */}
      {showDowngradeModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>Downgrade to Free Plan</h3>
            
            {downgradeImpact && (
              <div style={styles.impactWarning}>
                <div style={styles.warningHeader}>⚠️ Impact of Downgrading</div>
                <ul>
                  <li>You currently have <strong>{downgradeImpact.currentBusinesses}</strong> businesses (Free plan allows 1)</li>
                  <li>You currently have <strong>{downgradeImpact.currentOffers}</strong> offers (Free plan allows 3)</li>
                  {downgradeImpact.businessesToRemove > 0 && (
                    <li style={{color: '#dc3545'}}>
                      <strong>{downgradeImpact.businessesToRemove}</strong> business(es) will be suspended
                    </li>
                  )}
                  {downgradeImpact.offersToRemove > 0 && (
                    <li style={{color: '#dc3545'}}>
                      <strong>{downgradeImpact.offersToRemove}</strong> offer(s) will be suspended
                    </li>
                  )}
                </ul>
              </div>
            )}

            <div style={styles.impactWarning}>
              <div style={styles.warningHeader}>💳 Important: Auto-Renewal Will Be Disabled</div>
              <p>
                <strong>When you schedule this downgrade, your auto-renewal will be disabled immediately.</strong>
                {' '}This means you will not be charged again, and your Premium subscription will end on{' '}
                {subscription.endDate ? (
                  <strong>{new Date(subscription.endDate).toLocaleDateString()}</strong>
                ) : subscription.nextBillingDate ? (
                  <strong>{new Date(subscription.nextBillingDate).toLocaleDateString()}</strong>
                ) : (
                  'your next billing cycle'
                )}.
              </p>
            </div>
            
            <div style={styles.formGroup}>
              <label>Reason for downgrading:</label>
              <select
                value={downgradeReason}
                onChange={(e) => setDowngradeReason(e.target.value)}
                style={styles.textarea}
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

            <div style={styles.modalActions}>
              <button 
                style={styles.confirmButton} 
                onClick={handleScheduleDowngrade}
                disabled={isLoading || !downgradeReason.trim()}
              >
                {isLoading ? 'Scheduling...' : 'Schedule Downgrade & Disable Auto-Renewal'}
              </button>
              <button 
                style={styles.modalCancelButton} 
                onClick={() => {
                  setShowDowngradeModal(false);
                  setDowngradeReason('');
                  setDowngradeImpact(null);
                }}
                disabled={isLoading}
              >
                Keep Premium
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles object
const styles = {
  renewalManager: {
    backgroundColor: 'white',
    border: '2px solid #e9ecef',
    borderRadius: '12px',
    padding: '1.5rem',
    marginTop: '1.5rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  statusSection: {
    marginBottom: '1.5rem'
  },
  statusItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #f8f9fa'
  },
  statusLabel: {
    fontWeight: '600',
    color: '#495057'
  },
  statusActive: {
    color: '#28a745',
    fontWeight: '600'
  },
  statusInactive: {
    color: '#dc3545',
    fontWeight: '600'
  },
  statusWarning: {
    color: '#fd7e14',
    fontWeight: '600'
  },
  actionButtons: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    marginBottom: '1rem'
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'background-color 0.2s ease'
  },
  reactivateButton: {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'background-color 0.2s ease'
  },
  downgradeButton: {
    padding: '10px 20px',
    backgroundColor: '#fd7e14',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'background-color 0.2s ease'
  },
  disabledButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'not-allowed',
    fontSize: '0.9rem',
    fontWeight: '500',
    opacity: 0.6
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '8px',
    padding: '1rem',
    marginTop: '1rem'
  },
  warningHeader: {
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: '0.5rem'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
  },
  formGroup: {
    marginBottom: '1.5rem'
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '0.95rem',
    minHeight: '40px',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  impactWarning: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem'
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    flexWrap: 'wrap'
  },
  confirmButton: {
    padding: '10px 20px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'background-color 0.2s ease'
  },
  modalCancelButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'background-color 0.2s ease'
  }
};

export default AutoRenewalManager;