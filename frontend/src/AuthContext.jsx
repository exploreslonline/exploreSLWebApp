import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

// Create Authentication Context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellationInfo, setCancellationInfo] = useState(null);
  const [isInGracePeriod, setIsInGracePeriod] = useState(false);

  // Load user from localStorage on app startup and check expiry
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        const storedUser = localStorage.getItem("user");
        const storedSubscription = localStorage.getItem("subscription");
        const storedCancellationInfo = localStorage.getItem("cancellationInfo");
        const loginTime = localStorage.getItem("loginTime");

        if (storedUser && loginTime) {
          const currentTime = Date.now();
          const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

          // Check if session has expired
          if (currentTime - parseInt(loginTime) < sessionDuration) {
            setUser(JSON.parse(storedUser)); // Restore session

            // Restore subscription if exists
            if (storedSubscription) {
              try {
                const parsedSubscription = JSON.parse(storedSubscription);
                setSubscription(parsedSubscription);
                
                // Check if in grace period
                const gracePeriod = parsedSubscription.cancellationScheduled && 
                                   parsedSubscription.status === 'active' &&
                                   parsedSubscription.cancellationEffectiveDate &&
                                   new Date(parsedSubscription.cancellationEffectiveDate) > new Date();
                setIsInGracePeriod(gracePeriod);
              } catch (error) {
                console.error("Error parsing stored subscription:", error);
                localStorage.removeItem("subscription");
              }
            }

            // Restore cancellation info if exists
            if (storedCancellationInfo) {
              try {
                setCancellationInfo(JSON.parse(storedCancellationInfo));
              } catch (error) {
                console.error("Error parsing stored cancellation info:", error);
                localStorage.removeItem("cancellationInfo");
              }
            }
          } else {
            // Session expired, clear storage
            localStorage.removeItem("user");
            localStorage.removeItem("subscription");
            localStorage.removeItem("cancellationInfo");
            localStorage.removeItem("loginTime");
            localStorage.removeItem("userEmail");
          }
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        // Clear potentially corrupted data
        localStorage.removeItem("user");
        localStorage.removeItem("subscription");
        localStorage.removeItem("cancellationInfo");
        localStorage.removeItem("loginTime");
        localStorage.removeItem("userEmail");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Enhanced subscription check that includes cancellation status
  const checkSubscriptionStatus = async (userData) => {
    try {
      console.log('Checking subscription status with cancellation for:', userData.email);

      const response = await axios.post('http://localhost:5555/api/subscription/check-with-cancellation', {
        email: userData.email,
        userId: userData.userId || userData._id
      });

      if (response.data.success) {
        console.log('Enhanced subscription check result:', response.data);

        return {
          hasSubscription: response.data.hasSubscription,
          hasActiveSubscription: response.data.hasActiveSubscription,
          isPremiumUser: response.data.isPremiumUser,
          isFreeUser: response.data.isFreeUser,
          isNonActivated: response.data.isNonActivated,
          userExists: response.data.userExists,
          subscription: response.data.subscription,
          autoRenewal: response.data.autoRenewal,
          cancellationInfo: response.data.cancellationInfo,
          isInGracePeriod: response.data.isInGracePeriod || false
        };
      } else {
        console.log('Error checking subscription:', response.data.message);
        return {
          hasSubscription: false,
          hasActiveSubscription: false,
          isPremiumUser: false,
          isFreeUser: false,
          isNonActivated: true,
          userExists: true,
          subscription: null,
          autoRenewal: null,
          cancellationInfo: null,
          isInGracePeriod: false
        };
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return {
        hasSubscription: false,
        hasActiveSubscription: false,
        isPremiumUser: false,
        isFreeUser: false,
        isNonActivated: true,
        userExists: true,
        subscription: null,
        autoRenewal: null,
        cancellationInfo: null,
        isInGracePeriod: false
      };
    }
  };

  // Enhanced login function with grace period support
  const login = async (userData, loginResponse = null) => {
    try {
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("loginTime", Date.now().toString());

      // Clean up old userEmail key if it exists
      localStorage.removeItem("userEmail");

      console.log('🔍 Processing enhanced login for user:', userData.email);

      // Use server response directly when available
      if (loginResponse && loginResponse.redirectTo) {
        console.log('🎯 Using server redirect instruction:', loginResponse.redirectTo);
        console.log('Server subscription status:', loginResponse.subscriptionStatus);
        
        // Store subscription data if provided
        if (loginResponse.subscription) {
          const enhancedSubscription = {
            ...loginResponse.subscription,
            autoRenewal: loginResponse.autoRenewal || null
          };
          
          setSubscription(enhancedSubscription);
          localStorage.setItem("subscription", JSON.stringify(enhancedSubscription));
          
          // Check for grace period
          const gracePeriod = enhancedSubscription.cancellationScheduled && 
                             enhancedSubscription.status === 'active' &&
                             enhancedSubscription.cancellationEffectiveDate &&
                             new Date(enhancedSubscription.cancellationEffectiveDate) > new Date();
          setIsInGracePeriod(gracePeriod);
          
          console.log('✅ Enhanced subscription data stored with grace period:', {
            subscription: enhancedSubscription,
            isInGracePeriod: gracePeriod
          });
        } else {
          // Explicitly set null for non-activated users
          setSubscription(null);
          setIsInGracePeriod(false);
          localStorage.removeItem("subscription");
          console.log('⚠️ No subscription found - user is NON-ACTIVATED');
        }

        // Store cancellation info if provided
        if (loginResponse.cancellationInfo) {
          setCancellationInfo(loginResponse.cancellationInfo);
          localStorage.setItem("cancellationInfo", JSON.stringify(loginResponse.cancellationInfo));
        } else {
          setCancellationInfo(null);
          localStorage.removeItem("cancellationInfo");
        }

        // Return enhanced status
        return {
          hasSubscription: !!loginResponse.subscription,
          hasActiveSubscription: loginResponse.subscriptionStatus === 'premium' || loginResponse.subscriptionStatus === 'free',
          isPremiumUser: loginResponse.subscriptionStatus === 'premium',
          isFreeUser: loginResponse.subscriptionStatus === 'free',
          isNonActivated: loginResponse.subscriptionStatus === 'non-activated' || 
                          loginResponse.subscriptionStatus === 'expired',
          subscription: loginResponse.subscription,
          autoRenewal: loginResponse.autoRenewal || null,
          cancellationInfo: loginResponse.cancellationInfo || null,
          isInGracePeriod: loginResponse.isInGracePeriod || false,
          redirectTo: loginResponse.redirectTo
        };
      }

      // Fallback: Check subscription status manually
      console.log('⚠️ No server response, checking subscription status manually...');
      const subscriptionResult = await checkSubscriptionStatus(userData);

      // Store subscription data based on check result
      if (subscriptionResult.subscription) {
        setSubscription(subscriptionResult.subscription);
        localStorage.setItem("subscription", JSON.stringify(subscriptionResult.subscription));
        setIsInGracePeriod(subscriptionResult.isInGracePeriod);
        console.log('✅ Subscription data stored from manual check:', subscriptionResult.subscription);
      } else {
        setSubscription(null);
        setIsInGracePeriod(false);
        localStorage.removeItem("subscription");
        console.log('⚠️ No subscription found - user is NON-ACTIVATED');
      }

      // Store cancellation info
      if (subscriptionResult.cancellationInfo) {
        setCancellationInfo(subscriptionResult.cancellationInfo);
        localStorage.setItem("cancellationInfo", JSON.stringify(subscriptionResult.cancellationInfo));
      } else {
        setCancellationInfo(null);
        localStorage.removeItem("cancellationInfo");
      }

      // Determine redirect based on subscription status
      let redirectTo = 'subscription'; // Default for non-activated users

      if (subscriptionResult.isPremiumUser || subscriptionResult.isInGracePeriod) {
        redirectTo = 'business-profile';
        console.log('🔷 Premium user (or grace period) detected, redirecting to Business Profile');
      } else if (subscriptionResult.isFreeUser) {
        redirectTo = 'business-profile';
        console.log('🔶 Free user detected, redirecting to Business Profile');
      } else {
        redirectTo = 'subscription';
        console.log('⭕ Non-activated user detected, redirecting to Subscription Page');
      }

      return {
        ...subscriptionResult,
        redirectTo
      };

    } catch (error) {
      console.error('❌ Error during enhanced login:', error);
      // Always default to non-activated on error
      setSubscription(null);
      setIsInGracePeriod(false);
      setCancellationInfo(null);
      localStorage.removeItem("subscription");
      localStorage.removeItem("cancellationInfo");
      
      return {
        hasSubscription: false,
        hasActiveSubscription: false,
        isPremiumUser: false,
        isFreeUser: false,
        isNonActivated: true,
        subscription: null,
        autoRenewal: null,
        cancellationInfo: null,
        isInGracePeriod: false,
        redirectTo: 'subscription'
      };
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setSubscription(null);
    setCancellationInfo(null);
    setIsInGracePeriod(false);
    localStorage.removeItem("user");
    localStorage.removeItem("subscription");
    localStorage.removeItem("cancellationInfo");
    localStorage.removeItem("loginTime");
    localStorage.removeItem("userEmail");
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !isLoading && user !== null;
  };

  // Enhanced premium check with grace period support
  const isPremiumUser = () => {
    if (!subscription) return false;
    
    const isPremium = subscription.planId === '2' &&
                      subscription.planName === 'Premium Plan' &&
                      subscription.status === 'active';
    
    const notExpired = !subscription.endDate || new Date(subscription.endDate) > new Date();
    
    // Include grace period users as premium
    return isPremium && (notExpired || isInGracePeriod);
  };

  // Check if user is on free plan
  const isFreeUser = () => {
    return subscription &&
      subscription.planId === '1' &&
      subscription.planName === 'Free Plan' &&
      subscription.status === 'active';
  };

  // Check if user is non-activated (no subscription)
  const isNonActivated = () => {
    return !subscription || subscription === null;
  };

  // Enhanced check for subscription page access
  const shouldShowSubscriptionPage = () => {
    // Non-activated users always see subscription page
    if (isNonActivated()) return true;
    
    // Users in grace period can access subscription page to reactivate
    if (isInGracePeriod) return true;
    
    // Free users can access to upgrade
    if (isFreeUser()) return true;
    
    // Active premium users don't need subscription page
    return false;
  };

  // Enhanced access check for business features
  const canAccessBusinessFeatures = () => {
    // Premium users (including grace period) and free users can access
    return isPremiumUser() || isFreeUser() || isInGracePeriod;
  };

  // Get subscription limits with grace period consideration
  const getSubscriptionLimits = () => {
    if (isPremiumUser() || isInGracePeriod) {
      return { maxBusinesses: 3, maxOffers: 9 };
    } else if (isFreeUser()) {
      return { maxBusinesses: 1, maxOffers: 3 };
    }
    return { maxBusinesses: 0, maxOffers: 0 };
  };

  // Check if we're still loading
  const isAuthLoading = () => {
    return isLoading;
  };

  // Function to manually refresh subscription status with cancellation info
  const refreshSubscription = async () => {
    if (!user) return null;

    const result = await checkSubscriptionStatus(user);

    if (result.subscription) {
      setSubscription(result.subscription);
      localStorage.setItem("subscription", JSON.stringify(result.subscription));
    } else {
      setSubscription(null);
      localStorage.removeItem("subscription");
    }

    // Update cancellation info
    if (result.cancellationInfo) {
      setCancellationInfo(result.cancellationInfo);
      localStorage.setItem("cancellationInfo", JSON.stringify(result.cancellationInfo));
    } else {
      setCancellationInfo(null);
      localStorage.removeItem("cancellationInfo");
    }

    // Update grace period status
    setIsInGracePeriod(result.isInGracePeriod || false);

    return result;
  };

  // Function to get current user's subscription with cancellation details
  const getCurrentUserSubscription = async () => {
    if (!user) return {
      hasSubscription: false,
      hasActiveSubscription: false,
      isPremiumUser: false,
      isFreeUser: false,
      isNonActivated: true,
      subscription: null,
      cancellationInfo: null,
      isInGracePeriod: false
    };
    return await checkSubscriptionStatus(user);
  };

  // Enhanced user type string with grace period
  const getUserTypeString = () => {
    if (isInGracePeriod) return 'Premium User (Ending Soon)';
    if (isPremiumUser()) return 'Premium User';
    if (isFreeUser()) return 'Free User';
    if (isNonActivated()) return 'Non-Activated User';
    return 'Unknown';
  };

  // Function to get auto-renewal status
  const getAutoRenewalStatus = () => {
    return subscription?.autoRenewal || subscription?.autoRenew || null;
  };

  // Function to check if auto-renewal is enabled
  const hasAutoRenewal = () => {
    return subscription?.autoRenewal === true || subscription?.autoRenew === true;
  };

  // New functions for grace period management
  const getCancellationInfo = () => {
    return cancellationInfo;
  };

  const getIsInGracePeriod = () => {
    return isInGracePeriod;
  };

  const getDaysRemainingInGracePeriod = () => {
    if (!isInGracePeriod || !cancellationInfo || !cancellationInfo.effectiveDate) return 0;
    
    const effectiveDate = new Date(cancellationInfo.effectiveDate);
    const today = new Date();
    const diffTime = effectiveDate - today;
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  // Enhanced subscription status with grace period
  const getSubscriptionStatusWithGracePeriod = () => {
    if (isInGracePeriod) {
      const daysRemaining = getDaysRemainingInGracePeriod();
      return {
        status: 'grace_period',
        message: `Premium features ending in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
        daysRemaining,
        canReactivate: true
      };
    }
    
    if (isPremiumUser()) {
      return {
        status: 'premium',
        message: 'Active Premium Subscription',
        daysRemaining: null,
        canReactivate: false
      };
    }
    
    if (isFreeUser()) {
      return {
        status: 'free',
        message: 'Active Free Plan',
        daysRemaining: null,
        canReactivate: false
      };
    }
    
    return {
      status: 'non_activated',
      message: 'No Active Subscription',
      daysRemaining: null,
      canReactivate: false
    };
  };

  return (
    <AuthContext.Provider value={{
      user,
      subscription,
      login,
      logout,
      isAuthenticated,
      isAuthLoading,
      isLoading,
      isPremiumUser,
      isFreeUser,
      isNonActivated,
      shouldShowSubscriptionPage,
      canAccessBusinessFeatures,
      getSubscriptionLimits,
      checkSubscriptionStatus,
      getCurrentUserSubscription,
      refreshSubscription,
      getUserTypeString,
      getAutoRenewalStatus,
      hasAutoRenewal,
      // New grace period functions
      getCancellationInfo,
      getIsInGracePeriod,
      getDaysRemainingInGracePeriod,
      getSubscriptionStatusWithGracePeriod,
      isInGracePeriod,
      cancellationInfo
    }}>
      {children}
    </AuthContext.Provider>
  );
};