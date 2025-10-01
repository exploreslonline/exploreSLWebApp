// Enhanced subscriptionUtils with plan limit enforcement and fixed downgrade functions
import axios from 'axios';

export const subscriptionUtils = {
  // ==================== NEW PLAN LIMIT ENFORCEMENT FUNCTIONS ====================

  // Check plan limits on sign in
  checkPlanLimitsOnSignIn: async (userId) => {
    try {
      console.log('Checking plan limits for userId:', userId);
      
      const response = await axios.get(`http://localhost:5555/api/user/${userId}/plan-limits`);
      
      if (response.data.success) {
        return response.data.planLimits;
      }
      
      return { exceedsLimits: false };
    } catch (error) {
      console.error('Error checking plan limits:', error);
      return { exceedsLimits: false };
    }
  },

  // Enforce plan limits by deleting selected items
  enforcePlanLimits: async (userId, selectedBusinesses = [], selectedOffers = []) => {
    try {
      console.log('Enforcing plan limits for userId:', userId);
      
      const response = await axios.post(`http://localhost:5555/api/user/${userId}/enforce-plan-limits`, {
        selectedBusinesses,
        selectedOffers
      });
      
      return response.data;
    } catch (error) {
      console.error('Error enforcing plan limits:', error);
      throw new Error(error.response?.data?.message || 'Failed to enforce plan limits');
    }
  },

  // Reactivate suspended items when user upgrades
  reactivateSuspendedItems: async (userId) => {
    try {
      console.log('Reactivating suspended items for userId:', userId);
      
      const response = await axios.post(`http://localhost:5555/api/user/${userId}/reactivate-suspended-items`);
      
      return response.data;
    } catch (error) {
      console.error('Error reactivating suspended items:', error);
      throw new Error(error.response?.data?.message || 'Failed to reactivate suspended items');
    }
  },

  // Get plan enforcement message
  getPlanEnforcementMessage: (planLimitData) => {
    if (!planLimitData || !planLimitData.exceedsLimits) {
      return null;
    }

    const messages = [];
    
    if (planLimitData.exceedsBusinesses) {
      const excess = planLimitData.currentBusinesses - planLimitData.maxBusinesses;
      messages.push(`${excess} business${excess > 1 ? 'es' : ''} exceed${excess === 1 ? 's' : ''} your Free plan limit`);
    }
    
    if (planLimitData.exceedsOffers) {
      const excess = planLimitData.currentOffers - planLimitData.maxOffers;
      messages.push(`${excess} offer${excess > 1 ? 's' : ''} exceed${excess === 1 ? 's' : ''} your Free plan limit`);
    }

    return {
      title: 'Plan Limit Exceeded',
      message: messages.join(' and '),
      actionRequired: true,
      canUpgrade: true,
      canDelete: true
    };
  },

  // Check if downgrade will cause plan limit issues
  checkDowngradeImpact: async (userId) => {
    try {
      const response = await axios.get(`http://localhost:5555/api/subscription/downgrade-impact/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error checking downgrade impact:', error);
      throw error;
    }
  },

  // Check user subscription with plan limit warnings
  checkUserSubscriptionWithLimits: async (userEmail, userId) => {
    try {
      console.log('Checking subscription with limits for:', userEmail, 'userId:', userId);

      const response = await axios.post('http://localhost:5555/api/user/check-subscription-with-renewal', {
        email: userEmail,
        userId: userId
      });

      console.log('Subscription check response:', response.data);

      const baseResult = {
        hasSubscription: response.data.hasSubscription || false,
        hasActiveSubscription: response.data.hasActiveSubscription || false,
        isPremiumUser: response.data.isPremiumUser || false,
        isFreeUser: response.data.isFreeUser || false,
        isNonActivated: response.data.isNonActivated || false,
        userExists: response.data.userExists || true,
        subscription: response.data.subscription || null,
        autoRenewal: response.data.autoRenewal || null,
        renewalWarning: response.data.renewalWarning || false,
        paymentFailure: response.data.paymentFailure || false
      };

      // Include plan limit warning if present
      if (response.data.planLimitWarning) {
        baseResult.planLimitWarning = response.data.planLimitWarning;
        baseResult.requiresPlanEnforcement = response.data.planLimitWarning.exceedsLimits;
      }

      return baseResult;

    } catch (error) {
      console.error('Error checking subscription with limits:', error);
      return {
        hasSubscription: false,
        hasActiveSubscription: false,
        isPremiumUser: false,
        isFreeUser: false,
        isNonActivated: true,
        userExists: true,
        subscription: null,
        paymentFailure: false,
        requiresPlanEnforcement: false
      };
    }
  },

  // Handle plan limit modal actions
  handlePlanLimitActions: {
    // Option 1: Upgrade to Premium
    upgradeFromLimitModal: (navigate) => {
      navigate('/SubscriptionPage?reason=plan_limit_exceeded');
    },

    // Option 2: Delete selected items
    deleteSelectedItems: async (userId, selectedBusinesses, selectedOffers) => {
      try {
        const result = await subscriptionUtils.enforcePlanLimits(
          userId, 
          selectedBusinesses, 
          selectedOffers
        );
        return result;
      } catch (error) {
        throw new Error(error.message || 'Failed to delete selected items');
      }
    },

    // Option 3: Suspend items (alternative to deletion)
    suspendSelectedItems: async (userId, selectedBusinesses, selectedOffers) => {
      try {
        const response = await axios.post(`http://localhost:5555/api/user/${userId}/suspend-items`, {
          selectedBusinesses,
          selectedOffers,
          reason: 'User-initiated suspension due to plan limits'
        });
        return response.data;
      } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to suspend selected items');
      }
    }
  },

  // Validate plan limit selections
  validatePlanLimitSelections: (planLimitData, selectedBusinesses, selectedOffers) => {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!planLimitData || !planLimitData.exceedsLimits) {
      validation.errors.push('No plan limit enforcement required');
      validation.isValid = false;
      return validation;
    }

    const businessesToDelete = planLimitData.exceedsBusinesses ? 
      planLimitData.currentBusinesses - planLimitData.maxBusinesses : 0;
    const offersToDelete = planLimitData.exceedsOffers ? 
      planLimitData.currentOffers - planLimitData.maxOffers : 0;

    // Validate business selections
    if (businessesToDelete > 0) {
      if (selectedBusinesses.length !== businessesToDelete) {
        validation.errors.push(
          `You must select exactly ${businessesToDelete} business${businessesToDelete > 1 ? 'es' : ''} to delete`
        );
        validation.isValid = false;
      }
    }

    // Validate offer selections
    if (offersToDelete > 0) {
      if (selectedOffers.length !== offersToDelete) {
        validation.errors.push(
          `You must select exactly ${offersToDelete} offer${offersToDelete > 1 ? 's' : ''} to delete`
        );
        validation.isValid = false;
      }
    }

    // Add warnings about data loss
    if (selectedBusinesses.length > 0) {
      validation.warnings.push('Deleting businesses will also delete all their associated offers');
    }

    if (selectedOffers.length > 0) {
      validation.warnings.push('Deleted offers cannot be recovered');
    }

    return validation;
  },

  // Get plan enforcement options
  getPlanEnforcementOptions: (planLimitData) => {
    if (!planLimitData || !planLimitData.exceedsLimits) {
      return [];
    }

    return [
      {
        id: 'upgrade',
        title: 'Upgrade to Premium',
        description: 'Get unlimited businesses and offers with Premium plan',
        recommended: true,
        action: 'upgrade',
        buttonText: 'Upgrade Now',
        buttonStyle: 'success'
      },
      {
        id: 'delete',
        title: 'Delete Excess Items',
        description: 'Permanently delete businesses and offers to fit Free plan limits',
        recommended: false,
        action: 'delete',
        buttonText: 'Delete Items',
        buttonStyle: 'danger',
        requiresSelection: true
      },
      {
        id: 'suspend',
        title: 'Temporarily Suspend Items',
        description: 'Suspend excess items (can be reactivated with Premium)',
        recommended: false,
        action: 'suspend',
        buttonText: 'Suspend Items',
        buttonStyle: 'warning',
        requiresSelection: true,
        note: 'Suspended items can be reactivated when you upgrade to Premium'
      }
    ];
  },

  // Format plan limit summary for UI
  formatPlanLimitSummary: (planLimitData) => {
    if (!planLimitData) {
      return { message: 'Plan limits check unavailable', severity: 'info' };
    }

    if (!planLimitData.exceedsLimits) {
      return { 
        message: 'Within plan limits', 
        severity: 'success',
        details: `${planLimitData.currentBusinesses}/${planLimitData.maxBusinesses} businesses, ${planLimitData.currentOffers}/${planLimitData.maxOffers} offers`
      };
    }

    const issues = [];
    if (planLimitData.exceedsBusinesses) {
      const excess = planLimitData.currentBusinesses - planLimitData.maxBusinesses;
      issues.push(`${excess} business${excess > 1 ? 'es' : ''}`);
    }
    if (planLimitData.exceedsOffers) {
      const excess = planLimitData.currentOffers - planLimitData.maxOffers;
      issues.push(`${excess} offer${excess > 1 ? 's' : ''}`);
    }

    return {
      message: `Exceeds Free plan limits: ${issues.join(' and ')}`,
      severity: 'error',
      details: `Current: ${planLimitData.currentBusinesses} businesses, ${planLimitData.currentOffers} offers. Free plan allows: ${planLimitData.maxBusinesses} business, ${planLimitData.maxOffers} offers`,
      actionRequired: true
    };
  },

  // ==================== ENHANCED EXISTING FUNCTIONS ====================

  // Check if a user has an active subscription
  checkUserSubscription: async (userEmail, userId) => {
    try {
      console.log('Checking subscription for:', userEmail, 'userId:', userId);

      const response = await axios.post('http://localhost:5555/api/user/check-subscription-with-renewal', {
        email: userEmail,
        userId: userId
      });

      console.log('Subscription check response:', response.data);

      if (response.data.success) {
        return {
          hasSubscription: response.data.hasSubscription || false,
          hasActiveSubscription: response.data.hasActiveSubscription || false,
          isPremiumUser: response.data.isPremiumUser || false,
          isFreeUser: response.data.isFreeUser || false,
          isNonActivated: response.data.isNonActivated || false,
          userExists: response.data.userExists || true,
          subscription: response.data.subscription || null,
          autoRenewal: response.data.autoRenewal || null,
          renewalWarning: response.data.renewalWarning || false,
          paymentFailure: response.data.paymentFailure || false
        };
      }

      return {
        hasSubscription: false,
        hasActiveSubscription: false,
        isPremiumUser: false,
        isFreeUser: false,
        isNonActivated: true,
        userExists: true,
        subscription: null,
        paymentFailure: false
      };

    } catch (error) {
      console.error('Error checking subscription:', error);
      return {
        hasSubscription: false,
        hasActiveSubscription: false,
        isPremiumUser: false,
        isFreeUser: false,
        isNonActivated: true,
        userExists: true,
        subscription: null,
        paymentFailure: false
      };
    }
  },

  // Get subscription limits based on plan
  getSubscriptionLimits: (subscription) => {
    if (!subscription) {
      return { maxBusinesses: 0, maxOffers: 0 };
    }

    // Premium plan limits
    if (subscription.planId === '2' && 
        subscription.status === 'active' &&
        (!subscription.endDate || new Date(subscription.endDate) > new Date())) {
      return { maxBusinesses: 3, maxOffers: 9 };
    }

    // Free plan limits
    if (subscription.planId === '1' && subscription.status === 'active') {
      return { maxBusinesses: 1, maxOffers: 3 };
    }

    // Default to no access for expired/inactive subscriptions
    return { maxBusinesses: 0, maxOffers: 0 };
  },

  // ENHANCED: Check if user can add business (with suspended items consideration)
  canAddBusiness: (currentCount, subscription, suspendedCount = 0) => {
    const limits = subscriptionUtils.getSubscriptionLimits(subscription);
    const totalCount = currentCount + suspendedCount;
    console.log(`Business limit check: ${currentCount} active + ${suspendedCount} suspended = ${totalCount}/${limits.maxBusinesses} (can add: ${totalCount < limits.maxBusinesses})`);
    return totalCount < limits.maxBusinesses;
  },

  // ENHANCED: Check if user can add offer (with suspended items consideration)
  canAddOffer: (currentCount, subscription, suspendedCount = 0) => {
    const limits = subscriptionUtils.getSubscriptionLimits(subscription);
    const totalCount = currentCount + suspendedCount;
    console.log(`Offer limit check: ${currentCount} active + ${suspendedCount} suspended = ${totalCount}/${limits.maxOffers} (can add: ${totalCount < limits.maxOffers})`);
    return totalCount < limits.maxOffers;
  },

  // Get limit message for display
  getLimitMessage: (type, currentCount, subscription) => {
    const limits = subscriptionUtils.getSubscriptionLimits(subscription);
    
    if (!subscription) {
      return `Please activate a subscription plan to create ${type === 'business' ? 'businesses' : 'offers'}.`;
    }
    
    const planName = subscription.planName || 'Unknown';

    if (type === 'business') {
      return `${planName} allows maximum ${limits.maxBusinesses} business${limits.maxBusinesses !== 1 ? 'es' : ''}. You have ${currentCount}/${limits.maxBusinesses} businesses.`;
    } else if (type === 'offer') {
      return `${planName} allows maximum ${limits.maxOffers} offers. You have ${currentCount}/${limits.maxOffers} offers.`;
    }
  },

  // Check if user is premium
  isPremiumUser: (subscription) => {
    return subscription &&
           subscription.planId === '2' &&
           subscription.status === 'active' &&
           (!subscription.endDate || new Date(subscription.endDate) > new Date());
  },

  // Check if user is free user
  isFreeUser: (subscription) => {
    return subscription &&
           subscription.planId === '1' &&
           subscription.status === 'active';
  },

  // Check if user is non-activated
  isNonActivated: (subscription) => {
    return !subscription || subscription === null;
  },

  // Get downgrade impact for premium users
  getDowngradeImpact: async (userId) => {
    try {
      const response = await axios.get(`http://localhost:5555/api/subscription/downgrade-impact/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting downgrade impact:', error);
      throw error;
    }
  },

  // Get downgrade details
  getDowngradeDetails: async (userId) => {
    try {
      const response = await axios.get(`http://localhost:5555/api/subscription/downgrade-details/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting downgrade details:', error);
      throw error;
    }
  },

  // FIXED: Enhanced schedule downgrade function
  scheduleDowngradeToFree: async (userId, userEmail, reason, selections = null) => {
    try {
      console.log('Scheduling downgrade for userId:', userId);
      
      const response = await axios.post('http://localhost:5555/api/subscription/schedule-downgrade', {
        userId,
        userEmail,
        reason,
        selections,
        handlePlanLimits: true,
        disableAutoRenewal: true // Explicitly flag to disable auto-renewal
      });
      
      console.log('Downgrade scheduling response:', response.data);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          message: response.data.message,
          effectiveDate: response.data.effectiveDate,
          daysRemaining: response.data.daysRemaining,
          autoRenewalDisabled: true
        };
      } else {
        return {
          success: false,
          message: response.data?.message || 'Failed to schedule downgrade',
          alreadyScheduled: response.data?.alreadyScheduled || false
        };
      }
      
    } catch (error) {
      console.error('Error scheduling downgrade:', error);
      
      if (error.response) {
        return {
          success: false,
          message: error.response.data?.message || `Server error: ${error.response.status}`
        };
      }
      
      throw new Error(error.message || 'Failed to schedule downgrade');
    }
  },

  // FIXED: Enhanced cancel scheduled downgrade function
  cancelScheduledDowngrade: async (userId) => {
    try {
      console.log('Cancelling scheduled downgrade for userId:', userId);
      
      const response = await axios.post('http://localhost:5555/api/subscription/cancel-scheduled-downgrade', {
        userId: parseInt(userId)
      });
      
      console.log('Cancel downgrade response:', response.data);
      
      return {
        success: response.data?.success || false,
        message: response.data?.message || 'Operation completed'
      };
      
    } catch (error) {
      console.error('Error cancelling scheduled downgrade:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to cancel downgrade'
      };
    }
  },

  // NEW: Cancel auto-renewal without scheduling downgrade
  cancelAutoRenewal: async (userId, userEmail, reason = null) => {
    try {
      console.log('Cancelling auto-renewal for userId:', userId);
      
      const response = await axios.post('http://localhost:5555/api/subscription/cancel-auto-renewal', {
        userId,
        userEmail,
        reason: reason || 'User requested auto-renewal cancellation'
      });
      
      console.log('Auto-renewal cancellation response:', response.data);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          message: response.data.message,
          autoRenewalDisabled: true
        };
      } else {
        return {
          success: false,
          message: response.data?.message || 'Failed to cancel auto-renewal'
        };
      }
      
    } catch (error) {
      console.error('Error cancelling auto-renewal:', error);
      
      if (error.response) {
        return {
          success: false,
          message: error.response.data?.message || `Server error: ${error.response.status}`
        };
      }
      
      throw new Error(error.message || 'Failed to cancel auto-renewal');
    }
  },

  // NEW: Reactivate auto-renewal
  reactivateAutoRenewal: async (userId, userEmail) => {
    try {
      console.log('Reactivating auto-renewal for userId:', userId);
      
      const response = await axios.post('http://localhost:5555/api/subscription/reactivate-auto-renewal', {
        userId,
        userEmail
      });
      
      console.log('Auto-renewal reactivation response:', response.data);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          message: response.data.message,
          autoRenewalEnabled: true
        };
      } else {
        return {
          success: false,
          message: response.data?.message || 'Failed to reactivate auto-renewal'
        };
      }
      
    } catch (error) {
      console.error('Error reactivating auto-renewal:', error);
      
      if (error.response) {
        return {
          success: false,
          message: error.response.data?.message || `Server error: ${error.response.status}`
        };
      }
      
      throw new Error(error.message || 'Failed to reactivate auto-renewal');
    }
  },

  // Create subscription record after successful payment
  createSubscriptionRecord: async (subscriptionData) => {
    try {
      console.log('Creating subscription record:', subscriptionData);
      const response = await axios.post('http://localhost:5555/create-subscription-record', subscriptionData);
      console.log('Subscription record created:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating subscription record:', error);
      throw error;
    }
  },

  // Get subscription plans
  getSubscriptionPlans: async () => {
    try {
      const response = await axios.get('http://localhost:5555/plans');
      return response.data.plans || [];
    } catch (error) {
      console.error('Error fetching plans:', error);
      return [];
    }
  },

  // Enhanced PayHere payment creation (auto-renewal enabled by default)
  createPayHerePayment: async (paymentData) => {
    try {
      console.log('Creating PayHere payment with auto-renewal...');
      
      // Add auto-renewal flag to payment data
      const enhancedPaymentData = {
        ...paymentData,
        autoRenewal: true,
        recurringPayment: true
      };

      console.log('Payment data being sent:', {
        amount: enhancedPaymentData.amount,
        currency: enhancedPaymentData.currency,
        planId: enhancedPaymentData.planId,
        billingCycle: enhancedPaymentData.billingCycle,
        autoRenewal: enhancedPaymentData.autoRenewal,
        customerName: enhancedPaymentData.customerData?.name,
        customerEmail: enhancedPaymentData.customerData?.email,
        customerPhone: enhancedPaymentData.customerData?.phoneNumber
      });

      // Validate required fields before sending
      if (!enhancedPaymentData.amount || enhancedPaymentData.amount < 10) {
        throw new Error('Amount must be at least LKR 10.00');
      }

      if (!enhancedPaymentData.customerData?.name?.trim()) {
        throw new Error('Customer name is required');
      }

      if (!enhancedPaymentData.customerData?.email?.trim()) {
        throw new Error('Customer email is required');
      }

      if (!enhancedPaymentData.customerData?.phoneNumber?.trim()) {
        throw new Error('Customer phone number is required');
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(enhancedPaymentData.customerData.email.trim())) {
        throw new Error('Invalid email format');
      }

      // Make API call with timeout
      const response = await axios.post('http://localhost:5555/create-payhere-payment', enhancedPaymentData, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('PayHere API response:', {
        success: response.data.success,
        orderId: response.data.orderId,
        amount: response.data.amount,
        hasPaymentData: !!response.data.paymentData
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Payment creation failed');
      }

      if (!response.data.paymentData) {
        throw new Error('No payment data received from server');
      }

      // Validate critical payment fields
      const requiredFields = ['merchant_id', 'order_id', 'amount', 'currency', 'hash'];
      const missingFields = requiredFields.filter(field => !response.data.paymentData[field]);

      if (missingFields.length > 0) {
        throw new Error(`Missing payment fields: ${missingFields.join(', ')}`);
      }

      console.log('PayHere payment created successfully');
      return response.data;

    } catch (error) {
      console.error('PayHere payment creation failed:');

      if (error.response) {
        console.error('Server Error Response:', {
          status: error.response.status,
          data: error.response.data
        });

        const errorMessage = error.response.data?.error ||
          error.response.data?.message ||
          `Server error: ${error.response.status}`;
        throw new Error(errorMessage);
      } else if (error.request) {
        console.error('Network Error:', error.request);
        throw new Error('Network error: Unable to reach payment server');
      } else {
        console.error('Error:', error.message);
        throw error;
      }
    }
  },

  // Process automatic renewal payment
  processAutomaticRenewal: async (subscriptionId, userId) => {
    try {
      const response = await axios.post('http://localhost:5555/api/subscription/process-renewal', {
        subscriptionId,
        userId
      });
      return response.data;
    } catch (error) {
      console.error('Error processing automatic renewal:', error);
      throw error;
    }
  },

  // Handle payment failure
  handlePaymentFailure: async (userId, subscriptionId, failureReason) => {
    try {
      const response = await axios.post('http://localhost:5555/api/subscription/payment-failure', {
        userId,
        subscriptionId,
        failureReason
      });
      return response.data;
    } catch (error) {
      console.error('Error handling payment failure:', error);
      throw error;
    }
  },

  // Check for payment failures and send notifications
  checkPaymentFailures: async () => {
    try {
      const response = await axios.get('http://localhost:5555/api/subscription/check-payment-failures');
      return response.data;
    } catch (error) {
      console.error('Error checking payment failures:', error);
      return { success: false, failures: [] };
    }
  },

  // Format subscription status for display
  formatSubscriptionStatus: (subscription) => {
    if (!subscription) return 'Non-Activated User';

    const status = subscription.status?.charAt(0).toUpperCase() +
      (subscription.status?.slice(1) || '');
    const planName = subscription.planName || 'Unknown Plan';

    if (subscription.endDate) {
      const endDate = new Date(subscription.endDate);
      const now = new Date();
      const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

      if (daysLeft > 0) {
        return `${planName} (${status}) - ${daysLeft} days remaining`;
      } else {
        return `${planName} (Expired)`;
      }
    }

    return `${planName} (${status})`;
  },

  // Check if subscription is about to expire (within 7 days)
  isSubscriptionExpiring: (subscription) => {
    if (!subscription || !subscription.endDate) return false;

    const endDate = new Date(subscription.endDate);
    const now = new Date();
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

    return daysLeft <= 7 && daysLeft > 0;
  },

  // Create free subscription
  createFreeSubscription: async (userData) => {
    try {
      console.log('Creating free subscription for user:', userData.email);
      
      const response = await axios.post('http://localhost:5555/create-free-subscription', {
        customerData: {
          userId: userData.userId || userData._id,
          email: userData.email,
          name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'User'
        }
      });

      if (response.data.success) {
        console.log('Free subscription created successfully');
        return response.data;
      } else {
        console.error('Failed to create free subscription:', response.data.error);
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      console.error('Error creating free subscription:', error);
      return { success: false, error: error.message };
    }
  },

  // Get user type string for display
  getUserTypeString: (subscription) => {
    if (!subscription) return 'Non-Activated User';
    
    if (subscription.planId === '2' && subscription.status === 'active') {
      return 'Premium User';
    } else if (subscription.planId === '1' && subscription.status === 'active') {
      return 'Free User';
    }
    
    return 'Non-Activated User';
  },

  // Validate payment data before submission
  validatePaymentData: (formData, plans, user) => {
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
    } else {
      const cleanPhone = formData.phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length < 9 || cleanPhone.length > 12) {
        errors.push('Please enter a valid Sri Lankan phone number');
      }
    }

    if (!formData.agreement) {
      errors.push('Please agree to the terms and conditions');
    }

    if (formData.selectedPlan) {
      const selectedPlan = plans.find(plan => plan.id === parseInt(formData.selectedPlan));
      if (!selectedPlan) {
        errors.push('Selected plan is not valid');
      } else {
        const amount = selectedPlan.monthlyPrice;

        if (amount > 0 && amount < 10) {
          errors.push('Payment amount must be at least LKR 10.00');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  },

  // Format phone number for PayHere
  formatPhoneForPayHere: (phoneNumber) => {
    if (!phoneNumber) return '0771234567';

    let cleanPhone = phoneNumber.toString().replace(/\D/g, '');

    if (cleanPhone.startsWith('94')) {
      return '0' + cleanPhone.substring(2);
    } else if (cleanPhone.startsWith('0')) {
      return cleanPhone;
    } else if (cleanPhone.length >= 9) {
      return '0' + cleanPhone;
    }

    return '0771234567';
  },

  // Debug payment submission
  debugPaymentSubmission: (paymentData) => {
    console.log('=== PAYMENT SUBMISSION DEBUG ===');
    console.log('1. Payment Data Structure:', typeof paymentData);
    console.log('2. Payment Data Keys:', Object.keys(paymentData || {}));

    if (paymentData) {
      console.log('3. Required Fields Check:');
      const requiredFields = ['amount', 'currency', 'planId', 'customerData'];
      requiredFields.forEach(field => {
        console.log(`   ${field}: ${paymentData[field] ? 'OK' : 'MISSING'} (${typeof paymentData[field]})`);
      });

      if (paymentData.customerData) {
        console.log('4. Customer Data Check:');
        const customerFields = ['name', 'email', 'phoneNumber'];
        customerFields.forEach(field => {
          const value = paymentData.customerData[field];
          console.log(`   ${field}: ${value ? 'OK' : 'MISSING'} (${typeof value}) - "${value}"`);
        });
      }

      console.log('5. Amount Validation:');
      console.log(`   Amount: ${paymentData.amount}`);
      console.log(`   Is Number: ${!isNaN(paymentData.amount)}`);
      console.log(`   Is >= 10: ${parseFloat(paymentData.amount) >= 10}`);
    }

    console.log('=====================================');
  },

  // Submit form to PayHere with enhanced error handling
  submitToPayHere: (paymentData, onSuccess, onError) => {
    try {
      console.log('Submitting to PayHere...');

      if (!paymentData || typeof paymentData !== 'object') {
        throw new Error('Invalid payment data structure');
      }

      const requiredFields = [
        'merchant_id', 'return_url', 'cancel_url', 'notify_url',
        'order_id', 'items', 'currency', 'amount',
        'first_name', 'last_name', 'email', 'phone',
        'address', 'city', 'country', 'hash'
      ];

      const missingFields = requiredFields.filter(field =>
        !paymentData[field] || paymentData[field].toString().trim() === ''
      );

      if (missingFields.length > 0) {
        throw new Error(`Missing PayHere fields: ${missingFields.join(', ')}`);
      }

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://sandbox.payhere.lk/pay/checkout';
      form.target = '_self';
      form.style.display = 'none';

      let fieldCount = 0;
      Object.entries(paymentData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value.toString().trim();
          form.appendChild(input);
          fieldCount++;
        }
      });

      if (fieldCount === 0) {
        throw new Error('No valid fields to submit to PayHere');
      }

      document.body.appendChild(form);

      console.log(`Submitting form with ${fieldCount} fields to PayHere`);
      console.log(`URL: ${form.action}`);

      form.submit();

      if (onSuccess) onSuccess();

      setTimeout(() => {
        try {
          if (document.body.contains(form)) {
            document.body.removeChild(form);
          }
        } catch (cleanupError) {
          console.error('Form cleanup error:', cleanupError);
        }
      }, 5000);

    } catch (error) {
      console.error('PayHere form submission error:', error);
      if (onError) onError(error);
      throw error;
    }
  },

  // Check PayHere payment status
  checkPaymentStatus: async (orderId) => {
    try {
      const response = await axios.get(`http://localhost:5555/payhere-status/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Error checking payment status:', error);
      return { success: false, status: 'unknown' };
    }
  },

  // Test PayHere configuration
  testPayHereConfig: async () => {
    try {
      console.log('Testing PayHere configuration...');

      const testPaymentData = {
        amount: 100,
        currency: 'LKR',
        planId: '2',
        customerData: {
          name: 'Test User',
          email: 'test@example.com',
          phoneNumber: '0771234567',
          address: 'Test Address',
          userId: null
        }
      };

      const result = await subscriptionUtils.createPayHerePayment(testPaymentData);
      console.log('PayHere configuration test passed');
      return { success: true, data: result };

    } catch (error) {
      console.error('PayHere configuration test failed:', error.message);
      return { success: false, error: error.message };
    }
  },

  // ==================== UTILITY FUNCTIONS ====================

  // Calculate days between dates
  calculateDaysBetween: (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  // Format currency for display
  formatCurrency: (amount, currency = 'LKR') => {
    const formatter = new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    });
    return formatter.format(amount);
  },

  // Get plan display name
  getPlanDisplayName: (planId) => {
    switch (planId) {
      case '1':
        return 'Free Plan';
      case '2':
        return 'Premium Plan';
      default:
        return 'Unknown Plan';
    }
  },

  // Check if subscription has expired
  isSubscriptionExpired: (subscription) => {
    if (!subscription || !subscription.endDate) return false;
    return new Date(subscription.endDate) < new Date();
  },

  // Get subscription status color for UI
  getSubscriptionStatusColor: (subscription) => {
    if (!subscription) return 'gray';
    
    switch (subscription.status) {
      case 'active':
        return 'green';
      case 'expired':
        return 'red';
      case 'cancelled':
        return 'orange';
      case 'suspended':
        return 'yellow';
      default:
        return 'gray';
    }
  },

  // Generate unique order ID
  generateOrderId: () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ORDER_${timestamp}_${random}`;
  },

  // Clean phone number for processing
  cleanPhoneNumber: (phoneNumber) => {
    if (!phoneNumber) return '';
    return phoneNumber.toString().replace(/\D/g, '');
  },

  // Validate email format
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Get time until subscription expires
  getTimeUntilExpiry: (subscription) => {
    if (!subscription || !subscription.endDate) return null;
    
    const now = new Date();
    const endDate = new Date(subscription.endDate);
    const diffTime = endDate - now;
    
    if (diffTime <= 0) return 'Expired';
    
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return 'Less than 1 hour';
    }
  },

  // Format date for display
  formatDate: (date, options = {}) => {
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    };
    
    return new Date(date).toLocaleDateString('en-US', defaultOptions);
  },

  // Check if user has permission for action
  hasPermission: (subscription, action) => {
    if (!subscription) return false;
    
    const permissions = {
      'create_business': subscription.planId === '1' || subscription.planId === '2',
      'create_offer': subscription.planId === '1' || subscription.planId === '2',
      'unlimited_businesses': subscription.planId === '2',
      'unlimited_offers': subscription.planId === '2',
      'premium_features': subscription.planId === '2'
    };
    
    return permissions[action] || false;
  },

  // Log subscription activity
  logActivity: async (userId, activity, details = {}) => {
    try {
      await axios.post('http://localhost:5555/api/subscription/log-activity', {
        userId,
        activity,
        details,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't throw error for logging failures
    }
  }
};