import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../src/AuthContext';
import { useNavigate } from 'react-router-dom';
import { subscriptionUtils } from '../src/subscriptionUtils';
import SubscriptionCancellationManager from './SubscriptionCancellationManager'; // Import the new component

function SubscriptionPage() {
  const { user, isAuthLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    selectedPlan: '',
    billingCycle: 'monthly',
    agreement: false,
    paymentMethod: 'payhere',
    enableAutoRenew: true // Always enabled by default
  });

  const [plans] = useState([
    {
      id: 1,
      name: 'Free Plan',
      monthlyPrice: 0,
      features: ['1 highlight ad', 'Standard position in listings', 'Add one discount or promo code', 'Set start and end date for promotions'],
      description: 'Perfect for individuals getting started',
      popular: false,
      autoRenewalAvailable: false
    },
    {
      id: 2,
      name: 'Premium Plan',
      monthlyPrice: 1500,
      features: [
        '3 highlight ads', 
        'Priority position in listings and category pages', 
        'Multiple Promotions can be added', 
        'Premium Features',
        '✨ Auto-renewal included'
      ],
      description: 'Ideal for growing businesses with automatic monthly billing included',
      popular: true,
      autoRenewalAvailable: true
    }
  ]);

  const [totalAmount, setTotalAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const modalRef = useRef(null);

  // Enhanced state for subscription management
  const [userSubscription, setUserSubscription] = useState(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [cancellationInfo, setCancellationInfo] = useState(null);
  const [isInGracePeriod, setIsInGracePeriod] = useState(false);

  // Enhanced subscription check with cancellation status
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (user && user.email) {
        try {
          setSubscriptionLoading(true);
          // Use enhanced subscription check that includes cancellation status
          const subscriptionInfo = await subscriptionUtils.checkUserSubscriptionWithCancellation(user.email, user.userId);
          
          setHasActiveSubscription(subscriptionInfo.hasActiveSubscription);
          setUserSubscription(subscriptionInfo.subscription);
          setCancellationInfo(subscriptionInfo.cancellationInfo);
          setIsInGracePeriod(subscriptionInfo.isInGracePeriod || false);

          // Auto-select premium plan if user has expired premium or is free user
          if (subscriptionInfo.subscription) {
            const plan = subscriptionInfo.subscription.plan || subscriptionInfo.subscription.planName;
            if (plan && plan.toLowerCase() === 'free') {
              setFormData(prev => ({ ...prev, selectedPlan: '2', enableAutoRenew: true }));
            } else if (plan && plan.toLowerCase() === 'premium' && isSubscriptionExpired(subscriptionInfo.subscription)) {
              setFormData(prev => ({ ...prev, selectedPlan: '2', enableAutoRenew: true }));
            }
          }
        } catch (error) {
          console.error('Error checking subscription:', error);
          setHasActiveSubscription(false);
          setUserSubscription(null);
          setCancellationInfo(null);
          setIsInGracePeriod(false);
        } finally {
          setSubscriptionLoading(false);
        }
      }
    };

    if (!isAuthLoading()) {
      checkSubscriptionStatus();
    }
  }, [user, isAuthLoading]);

  // Refresh subscription data (called by child components)
  const refreshSubscriptionData = async () => {
    if (user && user.email) {
      try {
        const subscriptionInfo = await subscriptionUtils.checkUserSubscriptionWithCancellation(user.email, user.userId);
        setHasActiveSubscription(subscriptionInfo.hasActiveSubscription);
        setUserSubscription(subscriptionInfo.subscription);
        setCancellationInfo(subscriptionInfo.cancellationInfo);
        setIsInGracePeriod(subscriptionInfo.isInGracePeriod || false);
      } catch (error) {
        console.error('Error refreshing subscription:', error);
      }
    }
  };

  // Helper function to check if subscription is expired
  const isSubscriptionExpired = (subscription) => {
    if (!subscription || !subscription.endDate) return false;
    const now = new Date();
    const endDate = new Date(subscription.endDate);
    return now > endDate;
  };

  // Enhanced helper function to check if user is premium with active subscription
  const isPremiumWithActiveSubscription = () => {
    if (!userSubscription) return false;
    const plan = userSubscription.plan || userSubscription.planName;
    const isActive = userSubscription.status === 'active' && !isSubscriptionExpired(userSubscription);
    const isPremium = plan && plan.toLowerCase() === 'premium';
    
    // If in grace period, still consider as premium user
    return isPremium && (isActive || isInGracePeriod);
  };

  // Helper function to check if user is free user
  const isFreeUser = () => {
    if (!userSubscription) return true;
    const plan = userSubscription.plan || userSubscription.planName;
    return !plan || plan.toLowerCase() === 'free';
  };

  // Helper function to check if user has expired premium
  const hasExpiredPremium = () => {
    if (!userSubscription) return false;
    const plan = userSubscription.plan || userSubscription.planName;
    return plan && plan.toLowerCase() === 'premium' && isSubscriptionExpired(userSubscription) && !isInGracePeriod;
  };

  // Helper function to check if plan should be disabled
  const isPlanDisabled = (planId) => {
    // If user has active premium subscription (including grace period), they shouldn't access this page
    if (isPremiumWithActiveSubscription() && !isInGracePeriod) {
      return true;
    }

    // If user already has free plan, disable free plan selection
    if (planId === 1 && isFreeUser() && hasActiveSubscription) {
      return true;
    }

    return false;
  };

  // Helper function to get plan disabled message
  const getPlanDisabledMessage = (planId) => {
    if (isPremiumWithActiveSubscription() && !isInGracePeriod) {
      return "You already have the Premium plan - the best package available!";
    }

    if (planId === 1 && isFreeUser() && hasActiveSubscription) {
      return "You already have the Free plan activated. Upgrade to Premium for more features!";
    }

    return "";
  };

  const getAvailablePlans = () => {
    // If user is in grace period, they can renew premium
    if (isInGracePeriod) {
      return plans.filter(plan => plan.id !== 1); // Remove free plan, allow premium renewal
    }

    // If user is already on free plan, only show premium plan
    if (isFreeUser() && hasActiveSubscription) {
      return plans.filter(plan => plan.id !== 1);
    }

    // For premium users with expired subscription, show only premium plan
    if (hasExpiredPremium()) {
      return plans.filter(plan => plan.id !== 1);
    }

    // For new users (non-activated), show all plans
    return plans;
  };

  // Pre-fill user data if available
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : prev.name,
        email: user.email || prev.email,
        phoneNumber: user.phone || prev.phoneNumber,
        enableAutoRenew: true // Always keep auto-renew enabled
      }));
    }
  }, [user]);

  useEffect(() => {
    const checkPayHereSDK = () => {
      if (typeof window.payhere === 'undefined') {
        console.warn('PayHere SDK not loaded. Retrying...');
        setTimeout(() => {
          if (typeof window.payhere === 'undefined') {
            setError('PayHere payment system failed to load. Please refresh the page.');
          } else {
            console.log('PayHere SDK loaded successfully (retry)');
          }
        }, 2000);
      } else {
        console.log('PayHere SDK loaded successfully');
      }
    };

    const timer1 = setTimeout(checkPayHereSDK, 1000);
    const timer2 = setTimeout(checkPayHereSDK, 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Calculate total amount (always monthly now)
  useEffect(() => {
    const selectedPlan = plans.find(plan => plan.id === parseInt(formData.selectedPlan));
    if (selectedPlan) {
      const amount = selectedPlan.monthlyPrice;
      setTotalAmount(amount);
    } else {
      setTotalAmount(0);
    }
  }, [formData.selectedPlan, plans]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Don't allow changing enableAutoRenew for premium plans
    if (name === 'enableAutoRenew' && formData.selectedPlan === '2') {
      return; // Keep it always enabled for premium
    }
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  // Handle plan selection
  const handlePlanSelect = (planId) => {
    if (isPlanDisabled(planId)) {
      const message = getPlanDisabledMessage(planId);
      if (message) {
        alert(message);
      }
      return;
    }

    // Always enable auto-renew for premium plans
    const enableAutoRenew = planId === 2 ? true : false;

    setFormData({
      ...formData,
      selectedPlan: planId.toString(),
      enableAutoRenew: enableAutoRenew,
    });
    setError('');
  };

  const initiatePayHereSDKPayment = (paymentData) => {
    try {
      console.log('Initializing PayHere SDK payment...');

      if (typeof window.payhere === 'undefined') {
        throw new Error('PayHere SDK not loaded. Please refresh the page and try again.');
      }

      console.log('PayHere payment object:', {
        ...paymentData,
        hash: paymentData.hash ? paymentData.hash.substring(0, 10) + '...' : 'No hash'
      });

      window.payhere.onCompleted = null;
      window.payhere.onDismissed = null;
      window.payhere.onError = null;

      window.payhere.onCompleted = function onCompleted(orderId) {
        console.log("Payment completed successfully. OrderID:", orderId);
        setPaymentStatus('success');
        setIsProcessing(false);

        createSubscriptionRecord({
          userId: user?.userId || null,
          userEmail: formData.email,
          planId: formData.selectedPlan,
          planName: plans.find(p => p.id === parseInt(formData.selectedPlan))?.name,
          billingCycle: formData.billingCycle,
          amount: parseFloat(paymentData.amount),
          currency: paymentData.currency,
          paymentMethod: 'payhere',
          payhereOrderId: orderId,
          payhereRecurringToken: paymentData.recurring_token || null,
          enableAutoRenew: true // Always true for premium
        }).then(() => {
          console.log('Subscription record created successfully');
          setTimeout(() => {
            navigate(`/payment-success?plan=premium&orderId=${orderId}`);
          }, 1500);
        }).catch(error => {
          console.error('Failed to create subscription record:', error);
          setTimeout(() => {
            navigate(`/payment-success?plan=premium&orderId=${orderId}&warning=subscription_record_failed`);
          }, 1500);
        });
      };

      window.payhere.onDismissed = function onDismissed() {
        console.log("Payment dismissed by user");
        setPaymentStatus('cancelled');
        setError('Payment was cancelled. You can try again anytime.');
        setIsProcessing(false);
      };

      window.payhere.onError = function onError(error) {
        console.log("PayHere Error:", error);
        setPaymentStatus('error');
        setError(`Payment failed: ${error}`);
        setIsProcessing(false);
      };

      console.log('Starting PayHere SDK payment...');
      window.payhere.startPayment(paymentData);

    } catch (error) {
      console.error('PayHere SDK initialization error:', error);
      setError(`Payment initialization failed: ${error.message}`);
      setPaymentStatus('error');
      setIsProcessing(false);
    }
  };

  const createSubscriptionRecord = async (subscriptionData) => {
    try {
      console.log('Creating subscription record...');

      const response = await fetch('http://localhost:5555/api/subscription/create-subscription-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...subscriptionData,
          payhereOrderId: subscriptionData.payhereOrderId,
          payhereRecurringToken: subscriptionData.payhereRecurringToken,
          enableAutoRenew: subscriptionData.enableAutoRenew
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log('Subscription record created:', result.subscriptionId);
        return result;
      } else {
        throw new Error(result.message || 'Failed to create subscription record');
      }
    } catch (error) {
      console.error('Error creating subscription record:', error);
      throw error;
    }
  };

  // Create PayHere payment - Always use recurring for premium plans
  const createPayHerePayment = async () => {
    try {
      setIsProcessing(true);
      setError('');
      setPaymentStatus('processing');

      console.log('Starting PayHere payment process...');

      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        throw new Error(validationErrors[0]);
      }

      const selectedPlan = plans.find(plan => plan.id === parseInt(formData.selectedPlan));
      if (!selectedPlan) {
        throw new Error('Selected plan not found');
      }

      const amount = selectedPlan.monthlyPrice;

      if (amount < 1) {
        throw new Error('Payment amount must be at least LKR 1.00');
      }

      const paymentRequest = {
        amount: amount,
        currency: 'LKR',
        planId: formData.selectedPlan,
        billingCycle: formData.billingCycle,
        enableAutoRenew: true, // Always true for premium
        customerData: {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phoneNumber: formData.phoneNumber.trim(),
          address: 'Colombo, Sri Lanka',
          userId: user?.userId || null
        }
      };

      console.log('Sending payment request to backend...');

      // Always use recurring payment for premium plans
      const endpoint = 'http://localhost:5555/create-payhere-recurring-payment';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();

      if (!responseData.success) {
        throw new Error(responseData.error || responseData.message || 'Payment creation failed');
      }

      if (!responseData.paymentData) {
        throw new Error('Payment data not received from server');
      }

      console.log('Payment data received, initializing PayHere SDK...');
      setPaymentStatus('redirecting');

      setTimeout(() => {
        initiatePayHereSDKPayment(responseData.paymentData);
      }, 500);

    } catch (error) {
      console.error('PayHere payment error:', error);
      setError(error.message || 'Payment creation failed. Please try again.');
      setPaymentStatus('error');
      setIsProcessing(false);
    }
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.selectedPlan) {
      errors.push('Please select a subscription plan');
    }

    if (!formData.name?.trim()) {
      errors.push('Full name is required');
    }

    if (!formData.email?.trim()) {
      errors.push('Email address is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.push('Please enter a valid email address');
      }
    }

    if (!formData.phoneNumber?.trim()) {
      errors.push('Phone number is required');
    }

    if (!formData.agreement) {
      errors.push('Please agree to the terms and conditions');
    }

    return errors;
  };

  // Create free subscription
  const createFreeSubscription = async () => {
    try {
      setIsProcessing(true);
      setError('');
      setPaymentStatus('processing');

      console.log('Creating free subscription...');

      const response = await fetch('http://localhost:5555/api/subscription/create-free-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerData: {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phoneNumber: formData.phoneNumber.trim(),
            userId: user?.userId || null
          },
          billingCycle: formData.billingCycle
        }),
      });

      const result = await response.json();

      if (result.success) {
        setPaymentStatus('success');

        try {
          await createSubscriptionRecord({
            userId: user?.userId || null,
            userEmail: formData.email,
            planId: '1',
            planName: 'Free Plan',
            billingCycle: formData.billingCycle,
            amount: 0,
            currency: 'LKR',
            paymentMethod: 'free',
            enableAutoRenew: false
          });
        } catch (error) {
          console.error('Failed to create subscription record:', error);
        }

        setTimeout(() => {
          navigate('/payment-success?plan=free');
        }, 2000);
      } else {
        throw new Error(result.error || 'Failed to create free subscription');
      }

    } catch (error) {
      console.error('Free subscription error:', error);
      setError(error.message);
      setPaymentStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    console.log('Form submission started');

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }

    const selectedPlan = plans.find(plan => plan.id === parseInt(formData.selectedPlan));
    if (!selectedPlan) {
      setError('Please select a valid subscription plan');
      return;
    }

    if (selectedPlan.id === 1) {
      console.log('Processing free subscription');
      await createFreeSubscription();
    } else {
      console.log('Processing PayHere payment with auto-renewal');
      await createPayHerePayment();
    }
  };

  // Show loading if auth is still being checked
  if (isAuthLoading() || subscriptionLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p>Loading your subscription page...</p>
        </div>
      </div>
    );
  };

  // Enhanced redirect logic for premium users
  if (isPremiumWithActiveSubscription() && !isInGracePeriod) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
        flexDirection: 'column',
        gap: '20px',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          color: '#155724',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <h2>You Already Have Premium!</h2>
          <p>You currently have an active Premium subscription with auto-renewal enabled!</p>
          <p>You cannot make changes to your subscription at this time.</p>
          <button
            onClick={() => navigate('/profile')}
            style={{
              marginTop: '15px',
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  // Get button text
  const getButtonText = () => {
    if (isProcessing) {
      if (paymentStatus === 'processing') return 'Processing...';
      if (paymentStatus === 'redirecting') return 'Redirecting to PayHere...';
      return 'Processing...';
    }

    const selectedPlan = plans.find(plan => plan.id === parseInt(formData.selectedPlan));
    if (!selectedPlan) return 'Select a Plan';

    if (selectedPlan.id === 1) {
      if (isFreeUser() && hasActiveSubscription) {
        return 'Already Activated';
      }
      return 'Activate Free Plan';
    }

    if (hasExpiredPremium()) {
      return 'Renew Premium (Auto-Renewal)';
    }

    if (isInGracePeriod) {
      return 'Reactivate Premium (Auto-Renewal)';
    }

    return 'Upgrade to Premium (Auto-Renewal)';
  };

  // Get status alert
  const getStatusAlert = () => {
    if (error) {
      return (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #fca5a5',
          color: '#dc2626',
          padding: '15px',
          borderRadius: '8px',
          margin: '20px',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <div>
            <strong>Error:</strong> {error}
            {error.includes('PayHere') && (
              <div style={{ fontSize: '14px', marginTop: '5px', opacity: 0.8 }}>
                If this issue persists, please refresh the page and try again.
              </div>
            )}
          </div>
        </div>
      );
    }

    if (paymentStatus === 'processing') {
      return (
        <div style={{
          backgroundColor: '#dbeafe',
          border: '1px solid #93c5fd',
          color: '#2563eb',
          padding: '15px',
          borderRadius: '8px',
          margin: '20px',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #2563eb',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <strong>Processing your payment request...</strong>
        </div>
      );
    }

    if (paymentStatus === 'redirecting') {
      return (
        <div style={{
          backgroundColor: '#dbeafe',
          border: '1px solid #93c5fd',
          color: '#2563eb',
          padding: '15px',
          borderRadius: '8px',
          margin: '20px',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #2563eb',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <strong>Opening PayHere payment gateway...</strong>
        </div>
      );
    }

    if (paymentStatus === 'success') {
      return (
        <div style={{
          backgroundColor: '#d1fae5',
          border: '1px solid #86efac',
          color: '#059669',
          padding: '15px',
          borderRadius: '8px',
          margin: '20px',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '18px' }}>✅</span>
          <strong>Payment successful! Redirecting to confirmation page...</strong>
        </div>
      );
    }

    return null;
  };

  // Enhanced subscription status banner
  const getSubscriptionStatusBanner = () => {
    if (!userSubscription) return null;

    // Grace period banner (highest priority)
    if (isInGracePeriod && cancellationInfo) {
      const daysRemaining = cancellationInfo.daysRemaining || 0;
      return (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          color: '#856404',
          padding: '15px',
          borderRadius: '8px',
          margin: '20px',
          textAlign: 'center'
        }}>
          <strong>⏰ Subscription Ending Soon:</strong> Your premium features will end in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} 
          ({new Date(cancellationInfo.effectiveDate).toLocaleDateString()}). 
          You can reactivate your subscription below with auto-renewal to continue enjoying premium features!
        </div>
      );
    }

    if (isFreeUser()) {
      return (
        <div style={{
          backgroundColor: '#e3f2fd',
          border: '1px solid #90caf9',
          color: '#1565c0',
          padding: '15px',
          borderRadius: '8px',
          margin: '20px',
          textAlign: 'center'
        }}>
          <strong>Current Status:</strong> You have a Free plan. Upgrade to Premium with auto-renewal to unlock more features!
        </div>
      );
    }

    if (hasExpiredPremium()) {
      return (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          color: '#856404',
          padding: '15px',
          borderRadius: '8px',
          margin: '20px',
          textAlign: 'center'
        }}>
          <strong>Subscription Expired:</strong> Your Premium subscription has expired. Renew now with auto-renewal to continue enjoying premium features!
        </div>
      );
    }

    return null;
  };

  const styles = {
    app: {
      textAlign: 'center',
      fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
      backgroundColor: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
    },
    header: {
      color: 'white',
      padding: '20px',
      position: 'relative',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    backButton: {
      backgroundColor: 'rgba(18, 32, 235, 0.63)',
      color: 'white',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '14px',
    },
    h1: {
      margin: 0,
      fontSize: '2.5em',
      fontWeight: 'bold',
    },
    subtitle: {
      margin: '10px 0 0 0',
      fontSize: '1.1em',
      opacity: 0.9,
    },
    plansContainer: {
      display: 'flex',
      justifyContent: 'center',
      gap: '30px',
      margin: '40px 20px',
      flexWrap: 'wrap',
    },
    planCard: {
      backgroundColor: 'white',
      border: '2px solid transparent',
      borderRadius: '12px',
      padding: '30px 20px',
      width: '300px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      position: 'relative',
      textAlign: 'center',
    },
    planCardDisabled: {
      backgroundColor: '#f8f9fa',
      border: '2px solid #e9ecef',
      borderRadius: '12px',
      padding: '30px 20px',
      width: '300px',
      cursor: 'not-allowed',
      transition: 'all 0.3s ease',
      position: 'relative',
      textAlign: 'center',
      opacity: 0.6,
    },
    disabledBadge: {
      position: 'absolute',
      top: '-10px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#6c757d',
      color: 'white',
      padding: '5px 15px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 'bold',
    },
    popularBadge: {
      position: 'absolute',
      top: '-10px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '5px 20px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 'bold',
    },
    planName: {
      fontSize: '1.5em',
      fontWeight: 'bold',
      color: '#1e293b',
      marginBottom: '10px',
    },
    planDescription: {
      color: '#64748b',
      fontSize: '14px',
      marginBottom: '20px',
    },
    planPrice: {
      fontSize: '2.5em',
      fontWeight: 'bold',
      color: '#3b82f6',
      marginBottom: '5px',
    },
    planPeriod: {
      color: '#64748b',
      fontSize: '14px',
      marginBottom: '15px',
    },
    featuresList: {
      listStyle: 'none',
      padding: 0,
      margin: '20px 0',
      textAlign: 'left',
    },
    featureItem: {
      padding: '8px 0',
      borderBottom: '1px solid #f1f5f9',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    checkIcon: {
      color: '#22c55e',
      fontWeight: 'bold',
      fontSize: '16px',
    },
    mainContent: {
      display: 'flex',
      justifyContent: 'center',
      gap: '40px',
      margin: '40px 20px',
      flexWrap: 'wrap',
    },
    formContainer: {
      backgroundColor: 'white',
      padding: '40px',
      borderRadius: '12px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
      maxWidth: '500px',
      width: '100%',
    },
    input: {
      width: '100%',
      padding: '12px',
      marginBottom: '20px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '16px',
      transition: 'border-color 0.3s ease',
      boxSizing: 'border-box',
    },
    autoRenewNotice: {
      marginBottom: '20px',
      padding: '15px',
      backgroundColor: '#e8f5e8',
      borderRadius: '8px',
      border: '1px solid #c3e6cb',
      color: '#155724',
    },
    termsContainer: {
      marginBottom: '20px',
      textAlign: 'left',
    },
    termsButton: {
      background: 'none',
      border: 'none',
      color: '#3b82f6',
      textDecoration: 'underline',
      cursor: 'pointer',
      fontSize: 'inherit',
    },
    button: {
      width: '100%',
      padding: '15px',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '18px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'background-color 0.3s ease',
      position: 'relative',
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
    summary: {
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '12px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
      maxWidth: '300px',
      width: '100%',
      height: 'fit-content',
      position: 'sticky',
      top: '20px',
    },
    loadingSpinner: {
      display: 'inline-block',
      width: '20px',
      height: '20px',
      border: '3px solid #ffffff',
      borderRadius: '50%',
      borderTopColor: 'transparent',
      animation: 'spin 1s ease-in-out infinite',
      marginRight: '10px',
    },
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <button
          type="button"
          onClick={() => navigate('/profile')}
          style={styles.backButton}
        >
          ← Back to Profile
        </button>
      </header>

      {/* Status alerts */}
      {getStatusAlert()}
      {getSubscriptionStatusBanner()}

      {/* Grace Period Management */}
      {userSubscription && userSubscription.planId === '2' && (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
          <SubscriptionCancellationManager 
            subscription={userSubscription}
            onUpdate={refreshSubscriptionData}
          />
        </div>
      )}

      {/* Plans Selection */}
      <div style={styles.plansContainer}>
        {getAvailablePlans().map((plan) => {
          const currentPrice = plan.monthlyPrice;
          const isSelected = formData.selectedPlan === plan.id.toString();
          const isDisabled = isPlanDisabled(plan.id);

          return (
            <div
              key={plan.id}
              onClick={() => handlePlanSelect(plan.id)}
              style={{
                ...(isDisabled ? styles.planCardDisabled : styles.planCard),
                borderColor: isSelected ? '#3b82f6' : 'transparent',
                transform: isSelected && !isDisabled ? 'translateY(-5px)' : 'none',
                boxShadow: isSelected && !isDisabled
                  ? '0 8px 25px rgba(59, 130, 246, 0.15)'
                  : '0 4px 15px rgba(0,0,0,0.1)'
              }}
            >
              {/* Show disabled badge for disabled plans */}
              {isDisabled && plan.id === 1 && (
                <div style={styles.disabledBadge}>Already Activated</div>
              )}

              {/* Show popular/renewal badge for premium plan */}
              {plan.popular && !isDisabled && (
                <div style={styles.popularBadge}>
                  {hasExpiredPremium() ? 'Renew Now' : isInGracePeriod ? 'Reactivate' : 'Most Popular'}
                </div>
              )}

              <div style={styles.planName}>{plan.name}</div>
              <div style={styles.planDescription}>
                {isDisabled && plan.id === 1
                  ? "You already have this plan activated"
                  : isInGracePeriod && plan.id === 2
                  ? "Reactivate your premium subscription with auto-renewal"
                  : plan.description
                }
              </div>

              <div style={styles.planPrice}>
                {plan.id === 1 ? 'Free' : `LKR ${currentPrice.toLocaleString()}`}
              </div>
              <div style={styles.planPeriod}>
                {plan.id === 1 ? 'Forever' : 'per month'}
              </div>

              <ul style={styles.featuresList}>
                {plan.features.map((feature, index) => (
                  <li key={index} style={styles.featureItem}>
                    <span style={styles.checkIcon}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div style={styles.mainContent}>
        <div style={styles.formContainer}>
          <h2><b>
            {hasExpiredPremium() ? 'Renew Your Subscription' : 
             isInGracePeriod ? 'Reactivate Your Subscription' :
             'Complete Your Subscription'}
          </b></h2>

          <form onSubmit={handleSubmit}>
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleInputChange}
              style={styles.input}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleInputChange}
              style={styles.input}
              required
            />
            <input
              type="tel"
              name="phoneNumber"
              placeholder="Phone Number (e.g., 0771234567)"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              style={styles.input}
              required
            />

            {/* Auto-Renewal Notice for Premium Plan */}
            {formData.selectedPlan === '2' && (
              <div style={styles.autoRenewNotice}>
                <strong>🔄 Auto-Renewal Included</strong>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                  Your Premium subscription includes automatic monthly renewal for uninterrupted service. 
                  You can manage or cancel your subscription anytime through your account settings.
                  {isInGracePeriod && (
                    <><br /><strong>Note:</strong> This will reactivate your subscription immediately.</>
                  )}
                </p>
              </div>
            )}

            {/* Payment security notice for paid plans */}
            {formData.selectedPlan === '2' && (
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <p style={{ margin: 0 }}>
                  <strong>🔒 Secure Payment:</strong>
                  We use PayHere's secure payment gateway with bank-level encryption.
                  PayHere is the most trusted payment solution in Sri Lanka.
                  <br /><br /><strong>Auto-Renewal:</strong> Convenient monthly billing with full control. Manage or cancel anytime through your account.
                </p>
              </div>
            )}

            {/* Terms and Conditions */}
            <div style={styles.termsContainer}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="agreement"
                  checked={formData.agreement}
                  onChange={handleInputChange}
                  style={{ width: '18px', height: '18px' }}
                />
                <span>I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    style={styles.termsButton}
                  >
                    terms and conditions
                  </button>
                </span>
              </label>
            </div>

            <button
              type="submit"
              style={{
                ...styles.button,
                ...((!formData.selectedPlan || !formData.agreement || isProcessing || isPlanDisabled(parseInt(formData.selectedPlan))) ? styles.buttonDisabled : {}),
                backgroundColor: formData.selectedPlan === '1' ? '#10b981' : '#3b82f6'
              }}
              disabled={!formData.selectedPlan || !formData.agreement || isProcessing || isPlanDisabled(parseInt(formData.selectedPlan))}
            >
              {isProcessing && <div style={styles.loadingSpinner}></div>}
              {getButtonText()}
            </button>
          </form>
        </div>

        <div style={styles.summary}>
          <h2>Order Summary</h2>
          <div style={{ textAlign: 'left', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span>Selected Plan:</span>
              <span style={{ fontWeight: 'bold' }}>
                {getAvailablePlans().find(p => p.id === parseInt(formData.selectedPlan))?.name || 'No plan selected'}
              </span>
            </div>

            {/* Show current subscription status */}
            {userSubscription && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Current Plan:</span>
                <span style={{ 
                  fontWeight: 'bold', 
                  color: hasExpiredPremium() ? '#dc3545' : isInGracePeriod ? '#ffa500' : '#28a745' 
                }}>
                  {(userSubscription.plan || userSubscription.planName || 'Free').charAt(0).toUpperCase() +
                    (userSubscription.plan || userSubscription.planName || 'Free').slice(1)}
                  {hasExpiredPremium() && ' (Expired)'}
                  {isInGracePeriod && ' (Ending Soon)'}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span>Billing Cycle:</span>
              <span style={{ fontWeight: 'bold' }}>Monthly</span>
            </div>
            
            {/* Show auto-renewal status */}
            {formData.selectedPlan === '2' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Auto-Renewal:</span>
                <span style={{ fontWeight: 'bold', color: '#28a745' }}>
                  Included
                </span>
              </div>
            )}
            
            {formData.selectedPlan === '2' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Payment Method:</span>
                <span style={{ fontWeight: 'bold' }}>PayHere</span>
              </div>
            )}
          </div>
          <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.2em' }}>Total:</span>
              <span style={{ fontSize: '2em', fontWeight: 'bold', color: formData.selectedPlan === '1' ? '#10b981' : '#3b82f6' }}>
                {formData.selectedPlan === '1' ? 'Free' : `LKR ${totalAmount.toLocaleString()}`}
              </span>
            </div>
            <div style={{ fontSize: '14px', color: '#64748b', textAlign: 'center', marginTop: '5px' }}>
              {formData.selectedPlan === '1' 
                ? 'No payment required' 
                : isInGracePeriod
                ? 'Reactivates immediately'
                : 'Auto-renews monthly'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Terms Modal */}
      {showTerms && (
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
          <div ref={modalRef} style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto',
            margin: '20px'
          }}>
            <h3>Terms and Conditions</h3>
            <div style={{ textAlign: 'left', lineHeight: '1.6' }}>
              <h4>1. Subscription Terms</h4>
              <p>By subscribing to our service, you agree to pay the selected subscription fee in Sri Lankan Rupees (LKR) according to your chosen billing cycle (monthly).</p>

              <h4>2. Payment & Auto-Renewal</h4>
              <p>Payments are processed securely through PayHere. Premium subscriptions automatically include auto-renewal for uninterrupted service. Your subscription will automatically renew monthly using your saved payment method unless cancelled.</p>

              <h4>3. Auto-Renewal & Grace Period</h4>
              <p>Premium subscriptions include automatic monthly renewal. If you schedule a cancellation, you'll continue to enjoy premium features until your next billing date, after which your account will automatically switch to the Free plan.</p>

              <h4>4. Billing Cycles</h4>
              <p>Monthly subscriptions renew every 30 days with auto-renewal enabled by default for Premium plans.</p>

              <h4>5. Currency</h4>
              <p>All prices are listed in Sri Lankan Rupees (LKR) and processed through PayHere's secure gateway.</p>

              <h4>6. Cancellation & Grace Period</h4>
              <p>You may cancel your auto-renewal subscription at any time through your account settings. When you schedule a cancellation, you'll continue to enjoy all premium features until your next billing date. After that, your account will automatically switch to the Free plan. You can reactivate your premium subscription anytime before the cancellation takes effect.</p>

              <h4>7. Refunds</h4>
              <p>Refunds are available within 7 days of purchase for monthly plans, subject to our refund policy.</p>

              <h4>8. Plan Changes</h4>
              <p>Free users can upgrade to Premium at any time with auto-renewal included. Premium users can manage their auto-renewal settings and schedule cancellations through their account.</p>
            </div>
            <button
              onClick={() => setShowTerms(false)}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add CSS for loading spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default SubscriptionPage;