import express from 'express';
import User from '../models/user.js';
import Subscription from '../models/subscription.js';
import SubscriptionHistory from '../models/subscription_history.js';
import SubscriptionLog from '../models/subscription_log.js';
import {checkUserPlanLimits, getUserName } from '../controllers/user_controller.js'
import Offer from '../models/offer.js';

const router = express.Router();


const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token is required'
    });
  }

  try {
    // For now, we'll treat any token as valid since you're not using JWT
    // In a real implementation, you would verify JWT tokens here
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};








//see this after
router.get('/api/verify-token', verifyToken, async (req, res) => {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Since you're storing user data in localStorage/sessionStorage instead of using JWT,
    // we need to get the user email or ID from the request body or find another way
    // For now, let's check if the token exists and return success

    // You can enhance this by:
    // 1. Storing active sessions in your database
    // 2. Using JWT tokens that contain user information
    // 3. Including user identifier in the request

    console.log('Token verification request received');
    console.log('Token:', token.substring(0, 10) + '...');

    // For now, return success if token exists
    // In a real implementation, you would:
    // - Decode JWT token to get user ID
    // - Query database to get fresh user data
    // - Verify token hasn't expired

    res.json({
      success: true,
      message: 'Token is valid',
      user: null // We can't return user data without more context
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
});








router.post('/check-subscription', async (req, res) => {
  try {
    const { email, userId } = req.body;

    if (!email && !userId) {
      return res.status(400).json({
        success: false,
        message: 'Email or userId is required'
      });
    }

    console.log('🔍 Checking subscription for email:', email, 'userId:', userId);

    // First, find the user to ensure they exist
    let user = null;
    if (userId) {
      user = await User.findOne({ userId: userId });
    } else if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    }

    // If user doesn't exist in User collection, return user not found
    if (!user) {
      console.log('❌ User not found in database');
      return res.json({
        success: true,
        hasSubscription: false,
        hasActiveSubscription: false,
        isPremiumUser: false,
        isFreeUser: false,
        isNonActivated: true,
        userExists: false,
        subscription: null
      });
    }

    console.log('✅ Found user:', user.email, 'userId:', user.userId);

    // Now search for subscriptions using BOTH userId and email
    // This ensures we catch subscriptions created with either identifier
    const subscription = await Subscription.findOne({
      $or: [
        { userId: user.userId },
        { userEmail: user.email.toLowerCase().trim() }
      ]
    }).sort({ createdAt: -1 }); // Get most recent if multiple exist

    // DEBUG: Log what we found
    if (subscription) {
      console.log('📋 Found subscription:', {
        id: subscription._id,
        planId: subscription.planId,
        planName: subscription.planName,
        status: subscription.status,
        userEmail: subscription.userEmail,
        userId: subscription.userId,
        createdAt: subscription.createdAt
      });
    } else {
      console.log('❌ No subscription found for this user');
    }

    // If NO subscription found, user is non-activated
    if (!subscription) {
      console.log('➡️  User is NON-ACTIVATED (no subscription record found)');
      return res.json({
        success: true,
        hasSubscription: false,
        hasActiveSubscription: false,
        isPremiumUser: false,
        isFreeUser: false,
        isNonActivated: true, // ✅ This is correct for new users
        userExists: true,
        subscription: null
      });
    }

    // If subscription exists, determine the type
    const now = new Date();

    // Check if it's an active premium subscription
    const isActivePremium = subscription.planId === '2' &&
      subscription.status === 'active' &&
      (!subscription.endDate || new Date(subscription.endDate) > now);

    // Check if it's an active free subscription
    const isActiveFree = subscription.planId === '1' &&
      subscription.status === 'active';

    console.log('📊 Subscription analysis:', {
      planId: subscription.planId,
      status: subscription.status,
      endDate: subscription.endDate,
      isActivePremium,
      isActiveFree
    });

    // Return subscription status
    if (isActivePremium) {
      console.log('➡️  User is PREMIUM USER');
      return res.json({
        success: true,
        hasSubscription: true,
        hasActiveSubscription: true,
        isPremiumUser: true,
        isFreeUser: false,
        isNonActivated: false,
        userExists: true,
        subscription: {
          planId: subscription.planId,
          planName: subscription.planName,
          status: subscription.status,
          billingCycle: subscription.billingCycle,
          endDate: subscription.endDate,
          paymentMethod: subscription.paymentMethod,
          amount: subscription.amount,
          currency: subscription.currency
        }
      });
    } else if (isActiveFree) {
      console.log('➡️  User is FREE USER');
      return res.json({
        success: true,
        hasSubscription: true,
        hasActiveSubscription: false, // Free is not "active premium"
        isPremiumUser: false,
        isFreeUser: true,
        isNonActivated: false,
        userExists: true,
        subscription: {
          planId: subscription.planId,
          planName: subscription.planName,
          status: subscription.status,
          billingCycle: subscription.billingCycle,
          endDate: subscription.endDate,
          paymentMethod: subscription.paymentMethod,
          amount: subscription.amount,
          currency: subscription.currency
        }
      });
    } else {
      // Subscription exists but is expired/inactive
      console.log('➡️  User has EXPIRED/INACTIVE subscription');
      return res.json({
        success: true,
        hasSubscription: true,
        hasActiveSubscription: false,
        isPremiumUser: false,
        isFreeUser: false,
        isNonActivated: true, // Treat expired as non-activated
        userExists: true,
        subscription: {
          planId: subscription.planId,
          planName: subscription.planName,
          status: subscription.status,
          billingCycle: subscription.billingCycle,
          endDate: subscription.endDate,
          paymentMethod: subscription.paymentMethod,
          amount: subscription.amount,
          currency: subscription.currency
        }
      });
    }

  } catch (error) {
    console.error('❌ Error checking subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking subscription'
    });
  }
});

router.post('/:userId/reactivate-suspended-items', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId: parseInt(userId) });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify user has premium subscription
    const activeSubscription = await Subscription.findOne({
      userId: parseInt(userId),
      status: 'active',
      planId: '2' // Premium plan
    });

    if (!activeSubscription) {
      return res.status(400).json({
        success: false,
        message: 'Premium subscription required to reactivate suspended items'
      });
    }

    // Reactivate suspended businesses
    const reactivatedBusinesses = await Business.updateMany(
      {
        userId: parseInt(userId),
        status: 'suspended',
        suspensionReason: { $regex: /plan limit/i }
      },
      {
        status: 'active',
        suspendedDate: null,
        suspensionReason: null,
        updatedAt: new Date()
      }
    );

    // Reactivate suspended offers
    const reactivatedOffers = await Offer.updateMany(
      {
        userId: parseInt(userId),
        status: 'suspended',
        suspensionReason: { $regex: /plan limit/i }
      },
      {
        status: 'active',
        suspendedDate: null,
        suspensionReason: null,
        updatedAt: new Date()
      }
    );

    console.log(`Reactivated ${reactivatedBusinesses.modifiedCount} businesses and ${reactivatedOffers.modifiedCount} offers`);

    res.json({
      success: true,
      message: `Reactivated ${reactivatedBusinesses.modifiedCount} businesses and ${reactivatedOffers.modifiedCount} offers`,
      reactivatedBusinesses: reactivatedBusinesses.modifiedCount,
      reactivatedOffers: reactivatedOffers.modifiedCount
    });

  } catch (error) {
    console.error('Error reactivating suspended items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate suspended items'
    });
  }
});


router.post('/check-subscription-with-renewal', async (req, res) => {
  try {
    const { email, userId } = req.body;

    console.log('🔍 Checking subscription for:', { email, userId });

    // Find user first
    let user = null;
    if (userId) {
      user = await User.findOne({ userId: parseInt(userId) });
    } else if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    }

    if (!user) {
      return res.json({
        success: true,
        hasSubscription: false,
        hasActiveSubscription: false,
        isPremiumUser: false,
        isFreeUser: false,
        isNonActivated: true,
        userExists: false,
        subscription: null
      });
    }

    // Find subscription
    const subscription = await Subscription.findOne({
      $or: [
        { userId: user.userId },
        { userEmail: user.email.toLowerCase().trim() }
      ]
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return res.json({
        success: true,
        hasSubscription: false,
        hasActiveSubscription: false,
        isPremiumUser: false,
        isFreeUser: false,
        isNonActivated: true,
        userExists: true,
        subscription: null
      });
    }

    // Check subscription status
    const now = new Date();
    const isExpired = subscription.endDate && new Date(subscription.endDate) < now;

    let isPremiumUser = false;
    let isFreeUser = false;
    let hasActiveSubscription = false;

    if (subscription.planId === '2' && subscription.status === 'active' && !isExpired) {
      isPremiumUser = true;
      hasActiveSubscription = true;
    } else if (subscription.planId === '1' && subscription.status === 'active') {
      isFreeUser = true;
      hasActiveSubscription = true;
    }

    // CRITICAL FIX: Return exact auto-renewal status from database
    const responseData = {
      success: true,
      hasSubscription: true,
      hasActiveSubscription,
      isPremiumUser,
      isFreeUser,
      isNonActivated: !hasActiveSubscription,
      userExists: true,
      subscription: {
        ...subscription.toObject(),
        // Ensure auto-renewal status is correctly returned
        autoRenew: subscription.autoRenew || false,
        downgradeScheduled: subscription.downgradeScheduled || false,
        nextBillingDate: subscription.nextBillingDate
      },
      // Also include at root level for backward compatibility
      autoRenewal: subscription.autoRenew || false,
      renewalWarning: subscription.renewalAttempts > 0,
      paymentFailure: subscription.status === 'pending_renewal'
    };

    console.log('✅ Returning subscription data with auto-renewal:', {
      userId,
      isPremiumUser,
      autoRenew: subscription.autoRenew,
      hasRecurringToken: !!subscription.payhereRecurringToken
    });

    res.json(responseData);

  } catch (error) {
    console.error('❌ Error checking subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while checking subscription status'
    });
  }
});


router.get('/:userId/plan-limits', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId: parseInt(userId) });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const planLimitCheck = await checkUserPlanLimits(parseInt(userId));

    res.json({
      success: true,
      planLimits: planLimitCheck
    });
  } catch (error) {
    console.error('Error checking plan limits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check plan limits'
    });
  }
});


router.post('/:userId/enforce-plan-limits', async (req, res) => {
  try {
    const { userId } = req.params;
    const { selectedBusinesses = [], selectedOffers = [] } = req.body;

    console.log('Enforcing plan limits for userId:', userId, {
      businessesToDelete: selectedBusinesses.length,
      offersToDelete: selectedOffers.length
    });

    const user = await User.findOne({ userId: parseInt(userId) });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify user has free plan
    const activeSubscription = await Subscription.findOne({
      userId: parseInt(userId),
      status: 'active'
    }).sort({ createdAt: -1 });

    if (!activeSubscription || activeSubscription.planId !== '1') {
      return res.status(400).json({
        success: false,
        message: 'Plan limit enforcement only applies to free plan users'
      });
    }

    let deletedBusinesses = 0;
    let deletedOffers = 0;
    let errors = [];

    // Delete selected businesses and their associated offers
    for (const businessId of selectedBusinesses) {
      try {
        // First delete all offers associated with this business
        const associatedOffers = await Offer.deleteMany({ businessId: businessId });
        console.log(`Deleted ${associatedOffers.deletedCount} offers for business ${businessId}`);

        // Then delete the business
        const deletedBusiness = await Business.findByIdAndDelete(businessId);
        if (deletedBusiness) {
          deletedBusinesses++;
          console.log(`Deleted business: ${deletedBusiness.name}`);
        }
      } catch (error) {
        console.error(`Error deleting business ${businessId}:`, error);
        errors.push(`Failed to delete business ${businessId}`);
      }
    }

    // Delete selected offers
    for (const offerId of selectedOffers) {
      try {
        const deletedOffer = await Offer.findByIdAndDelete(offerId);
        if (deletedOffer) {
          deletedOffers++;
          console.log(`Deleted offer: ${deletedOffer.title}`);
        }
      } catch (error) {
        console.error(`Error deleting offer ${offerId}:`, error);
        errors.push(`Failed to delete offer ${offerId}`);
      }
    }

    // Log the enforcement action
    await SubscriptionHistory.create({
      userId: parseInt(userId),
      userEmail: user.email,
      action: 'plan_limit_enforced',
      fromPlan: 'Free',
      toPlan: 'Free',
      reason: 'Plan limits exceeded - items deleted',
      notes: `Deleted ${deletedBusinesses} businesses and ${deletedOffers} offers`,
      effectiveDate: new Date()
    });

    // Check if limits are now within bounds
    const finalCheck = await checkUserPlanLimits(parseInt(userId));

    res.json({
      success: true,
      message: `Successfully deleted ${deletedBusinesses} businesses and ${deletedOffers} offers`,
      deletedBusinesses,
      deletedOffers,
      errors,
      currentLimits: finalCheck,
      withinLimits: !finalCheck.exceedsLimits
    });

  } catch (error) {
    console.error('Error enforcing plan limits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enforce plan limits'
    });
  }
});

router.get('/:userId/subscription-details', async (req, res) => {
  try {
    const { userId } = req.params;

    const subscription = await Subscription.findOne({
      userId: parseInt(userId)
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return res.json({
        success: true,
        subscription: null,
        message: 'No subscription found for this user'
      });
    }

    const now = new Date();
    const endDate = subscription.endDate ? new Date(subscription.endDate) : null;
    const isExpired = endDate && endDate < now;
    const daysRemaining = endDate && !isExpired ?
      Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : null;

    res.json({
      success: true,
      subscription: {
        ...subscription.toObject(),
        isExpired: isExpired,
        daysRemaining: daysRemaining
      }
    });

  } catch (error) {
    console.error('Error fetching user subscription details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription details'
    });
  }
});


router.post('/delete-selected-items', async (req, res) => {
  try {
    const { userId, businessIds, offerIds } = req.body;

    let deletedCount = 0;

    // Delete selected offers
    if (offerIds && offerIds.length > 0) {
      const offerResult = await Offer.deleteMany({
        _id: { $in: offerIds },
        userId: userId
      });
      deletedCount += offerResult.deletedCount;
    }

    // Delete selected businesses and their offers
    if (businessIds && businessIds.length > 0) {
      // First delete all offers for these businesses
      await Offer.deleteMany({ businessId: { $in: businessIds } });

      // Then delete the businesses
      const businessResult = await Business.deleteMany({
        _id: { $in: businessIds },
        userId: userId
      });
      deletedCount += businessResult.deletedCount;
    }

    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} items`
    });
  } catch (error) {
    console.error('Error deleting selected items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete selected items'
    });
  }
});
router.get('/profile/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId: parseInt(userId) }).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
});

// Route to get user profile by email (alternative method)
router.post('/profile-by-email', verifyToken, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email }).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('Get user profile by email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
});

router.get('/:userId/usage-limits', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId: parseInt(userId) });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const activeSubscription = await Subscription.findOne({
      $or: [
        { userId: parseInt(userId) },
        { userEmail: user.email.toLowerCase().trim() }
      ],
      status: 'active'
    }).sort({ createdAt: -1 });

    if (!activeSubscription) {
      return res.json({
        success: true,
        hasActiveSubscription: false,
        isNonActivated: true,
        message: 'Please activate a subscription plan to access features'
      });
    }

    const now = new Date();
    const isPremium = activeSubscription.planId === '2' &&
      activeSubscription.status === 'active' &&
      (!activeSubscription.endDate || new Date(activeSubscription.endDate) > now);

    const planType = isPremium ? 'Premium' : 'Free';
    const maxBusinesses = isPremium ? 3 : 1;
    const maxOffers = isPremium ? 3 : 1;

    const currentBusinesses = await Business.countDocuments({ userId: parseInt(userId) });

    // Count APPROVED offers only
    const currentApprovedOffers = await Offer.countDocuments({
      userId: parseInt(userId),
      adminStatus: 'approved',
      isActive: true
    });

    // Also get pending offers count
    const pendingOffers = await Offer.countDocuments({
      userId: parseInt(userId),
      adminStatus: 'pending'
    });

    const businessesRemaining = Math.max(0, maxBusinesses - currentBusinesses);
    const offersRemaining = Math.max(0, maxOffers - currentApprovedOffers);

    res.json({
      success: true,
      hasActiveSubscription: true,
      isNonActivated: false,
      planType: planType,
      subscription: {
        planId: activeSubscription.planId,
        planName: activeSubscription.planName,
        status: activeSubscription.status,
        endDate: activeSubscription.endDate
      },
      limits: {
        businesses: {
          max: maxBusinesses,
          current: currentBusinesses,
          remaining: businessesRemaining,
          canCreateMore: businessesRemaining > 0
        },
        offers: {
          max: maxOffers,
          current: currentApprovedOffers,
          remaining: offersRemaining,
          canCreateMore: offersRemaining > 0,
          pending: pendingOffers // NEW: Show pending offers
        }
      },
      features: {
        highlightAds: maxOffers,
        listingPosition: isPremium ? 'Priority' : 'Standard',
        promotions: isPremium ? 'Multiple' : 'Single'
      }
    });

  } catch (error) {
    console.error('Error checking usage limits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check usage limits'
    });
  }
});


router.post('/activate-free-plan', async (req, res) => {
  try {
    const { userId, userEmail, userName } = req.body;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: 'User email is required'
      });
    }

    console.log('🆓 Attempting to activate free plan for:', userEmail);

    // ✅ FIXED: Check if user already has ANY subscription using BOTH userId AND email
    const existingSubscription = await Subscription.findOne({
      $or: [
        { userEmail: userEmail.toLowerCase().trim() },
        { userId: userId }
      ]
    });

    if (existingSubscription) {
      console.log('❌ User already has subscription:', {
        id: existingSubscription._id,
        planId: existingSubscription.planId,
        planName: existingSubscription.planName,
        status: existingSubscription.status
      });

      return res.status(400).json({
        success: false,
        message: `You already have an active ${existingSubscription.planName}. Cannot activate free plan.`,
        existingPlan: {
          planId: existingSubscription.planId,
          planName: existingSubscription.planName,
          status: existingSubscription.status
        }
      });
    }

    // ✅ FIXED: Create free subscription with BOTH userId and email for better tracking
    const freeSubscription = new Subscription({
      userId: userId || null,
      userEmail: userEmail.toLowerCase().trim(),
      planId: '1',
      planName: 'Free Plan',
      status: 'active',
      billingCycle: 'monthly',
      amount: 0,
      currency: 'LKR',
      paymentMethod: 'free',
      startDate: new Date(),
      endDate: null // Free plan never expires
    });

    await freeSubscription.save();

    console.log('✅ Free plan activated successfully:', {
      subscriptionId: freeSubscription._id,
      userEmail: userEmail,
      userId: userId
    });

    res.json({
      success: true,
      message: 'Free plan activated successfully! You can now create businesses and offers.',
      subscription: {
        id: freeSubscription._id,
        planId: freeSubscription.planId,
        planName: freeSubscription.planName,
        status: freeSubscription.status,
        billingCycle: freeSubscription.billingCycle,
        endDate: freeSubscription.endDate,
        paymentMethod: freeSubscription.paymentMethod,
        amount: freeSubscription.amount,
        currency: freeSubscription.currency
      }
    });

  } catch (error) {
    console.error('❌ Error activating free plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate free plan',
      error: error.message
    });
  }
});


router.post('/check-subscription-with-downgrade', async (req, res) => {
  try {
    const { email, userId } = req.body;

    console.log('🔍 Checking subscription with downgrade info for:', { email, userId });

    // Find user
    let user = null;
    if (userId) {
      user = await User.findOne({ userId: parseInt(userId) });
    } else if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    }

    if (!user) {
      return res.json({
        success: true,
        hasSubscription: false,
        hasActiveSubscription: false,
        isPremiumUser: false,
        isFreeUser: false,
        isNonActivated: true,
        userExists: false,
        subscription: null,
        downgradeInfo: null
      });
    }

    // Find subscription
    const subscription = await Subscription.findOne({
      $or: [
        { userId: user.userId },
        { userEmail: user.email.toLowerCase().trim() }
      ]
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return res.json({
        success: true,
        hasSubscription: false,
        hasActiveSubscription: false,
        isPremiumUser: false,
        isFreeUser: false,
        isNonActivated: true,
        userExists: true,
        subscription: null,
        downgradeInfo: null
      });
    }

    // Check if subscription is active and not expired
    const now = new Date();
    const isExpired = subscription.endDate && subscription.endDate < now;
    const isActive = subscription.status === 'active' && !isExpired;

    // Determine user type
    const isPremium = isActive && subscription.planId === '2';
    const isFree = isActive && subscription.planId === '1';

    // Check for grace period (downgrade scheduled but still in premium period)
    const isInGracePeriod = subscription.downgradeScheduled &&
      subscription.downgradeEffectiveDate &&
      subscription.downgradeEffectiveDate > now &&
      subscription.planId === '2';

    // Prepare downgrade info
    let downgradeInfo = null;
    if (subscription.downgradeScheduled) {
      const daysRemaining = Math.ceil((new Date(subscription.downgradeEffectiveDate) - now) / (1000 * 60 * 60 * 24));

      downgradeInfo = {
        scheduled: true,
        scheduledDate: subscription.downgradeScheduledDate,
        effectiveDate: subscription.downgradeEffectiveDate,
        reason: subscription.downgradeReason,
        targetPlan: subscription.downgradeTargetPlan,
        daysRemaining: Math.max(0, daysRemaining),
        isInGracePeriod: isInGracePeriod
      };
    }

    res.json({
      success: true,
      hasSubscription: true,
      hasActiveSubscription: isActive || isInGracePeriod,
      isPremiumUser: isPremium || isInGracePeriod,
      isFreeUser: isFree && !isInGracePeriod,
      isNonActivated: !isActive && !isInGracePeriod,
      userExists: true,
      subscription: {
        ...subscription.toObject(),
        isInGracePeriod: isInGracePeriod
      },
      downgradeInfo: downgradeInfo,
      autoRenewal: subscription.autoRenew || false
    });

  } catch (error) {
    console.error('❌ Error checking subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check subscription status',
      error: error.message
    });
  }
});



export default router;