import express from 'express';
import Subscription from '../models/subscription.js';
import SubscriptionLog from '../models/subscription_log.js';
import Offer from '../models/offer.js';
import Business from '../models/business.js';
import SubscriptionHistory from '../models/subscription_history.js';
import mongoose from 'mongoose';
import { cancelPayHereRecurringPayment,
  handleDowngradeSelections,
  processPayHereRenewal,
  handleSubscriptionPaymentFailure,
  suspendUserBusinessesAndOffers,
  migrateSubscriptions,
  getUserName,
  applyFreePlanLimitations,
  sendDowngradeScheduledEmail,
  sendDowngradeCancelledEmail,
  sendDowngradeReminderEmail,
  sendDowngradeCompletedEmail,
  getDowngradeImpactAnalysis,
  fixSubscriptionEndDates} from '../controllers/user_controller.js'




const router = express.Router();

router.post('/trigger-renewals-test', async (req, res) => {
  try {
    console.log('🧪 Manual renewal processing triggered for testing');

    // Call the main renewal processing function
    const response = await axios.post('http://localhost:5555/api/subscription/process-automatic-renewals');

    res.json({
      success: true,
      message: 'Test renewal processing completed',
      data: response.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Test renewal processing failed',
      error: error.message
    });
  }
});


router.post('/migrate', async (req, res) => {
  try {
    const result = await migrateSubscriptions();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Migration failed: ' + error.message
    });
  }
});


router.post('/cancel-auto-renewal', async (req, res) => {
  let session = null;

  try {
    const { userId, userEmail, reason } = req.body;

    console.log('🔄 Cancelling auto-renewal for userId:', userId, 'email:', userEmail);

    if (!userId && !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'User ID or email is required'
      });
    }

    // Start database transaction
    session = await mongoose.startSession();
    session.startTransaction();

    // Find active subscription with better query
    const subscription = await Subscription.findOne({
      $and: [
        {
          $or: [
            { userId: parseInt(userId) },
            { userEmail: userEmail?.toLowerCase().trim() }
          ]
        },
        { status: 'active' },
        { planId: '2' }
      ]
    }).session(session);

    if (!subscription) {
      await session.abortTransaction();
      console.log('❌ No active Premium subscription found');
      return res.json({
        success: false,
        message: 'No active Premium subscription found'
      });
    }

    console.log('✅ Found subscription:', {
      id: subscription._id,
      currentAutoRenew: subscription.autoRenew,
      userId: subscription.userId,
      userEmail: subscription.userEmail
    });

    // Check if auto-renewal is already disabled
    if (!subscription.autoRenew) {
      await session.abortTransaction();
      console.log('ℹ️ Auto-renewal is already disabled');
      return res.json({
        success: true,
        message: 'Auto-renewal is already disabled',
        autoRenew: false
      });
    }

    // CRITICAL: Cancel PayHere recurring payment first if token exists
    let payhereResult = { success: true };
    if (subscription.payhereRecurringToken) {
      console.log('🔄 Attempting to cancel PayHere recurring payment...');
      payhereResult = await cancelPayHereRecurringPayment(subscription.payhereRecurringToken);
      console.log('PayHere cancellation result:', payhereResult);
    }

    // Update subscription in database - ALWAYS update even if PayHere fails
    const updateData = {
      $set: {
        autoRenew: false,
        updatedAt: new Date(),
        autoRenewalCancelledDate: new Date(),
        autoRenewalCancelledReason: reason || 'User requested cancellation'
      }
    };

    // Only unset token if PayHere cancellation was successful
    if (payhereResult.success && subscription.payhereRecurringToken) {
      updateData.$unset = { payhereRecurringToken: '' };
    }

    const updateResult = await Subscription.updateOne(
      { _id: subscription._id },
      updateData
    ).session(session);

    console.log('📊 Database update result:', updateResult);

    if (updateResult.modifiedCount > 0) {
      // Create detailed log entry
      await SubscriptionLog.create([{
        subscriptionId: subscription._id,
        userId: subscription.userId,
        userEmail: subscription.userEmail,
        action: 'auto_renewal_cancelled', // ADD this to your enum if not exists
        details: {
          reason: reason || 'User requested cancellation',
          cancelledDate: new Date(),
          payhereToken: subscription.payhereRecurringToken || null,
          payhereCancellationSuccess: payhereResult.success,
          payhereCancellationError: payhereResult.error || null,
          requiresManualCancellation: payhereResult.requiresManualCancellation || false
        }
      }], { session });

      await session.commitTransaction();

      console.log('✅ Auto-renewal cancelled successfully in database');

      // Prepare response message
      let message = 'Auto-renewal cancelled successfully. Your subscription will remain active until the end of the current billing period.';

      if (!payhereResult.success) {
        message += ' Note: PayHere recurring payment requires manual cancellation by our team.';
      }

      res.json({
        success: true,
        message: message,
        autoRenew: false,
        payhereStatus: payhereResult.success ? 'cancelled' : 'requires_manual_cancellation'
      });
    } else {
      await session.abortTransaction();
      console.error('❌ Failed to update subscription in database - no documents modified');

      res.json({
        success: false,
        message: 'Failed to cancel auto-renewal. Please try again or contact support.',
        debug: 'No documents were modified in the database update'
      });
    }

  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    console.error('❌ Error cancelling auto-renewal:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while cancelling auto-renewal: ' + error.message
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
});

router.post('/reactivate-auto-renewal', async (req, res) => {
  let session = null;

  try {
    const { userId, userEmail } = req.body;

    console.log('🔄 Reactivating auto-renewal for userId:', userId, 'email:', userEmail);

    if (!userId && !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'User ID or email is required'
      });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    // Find active subscription
    const subscription = await Subscription.findOne({
      $and: [
        {
          $or: [
            { userId: parseInt(userId) },
            { userEmail: userEmail?.toLowerCase().trim() }
          ]
        },
        { status: 'active' },
        { planId: '2' }
      ]
    }).session(session);

    if (!subscription) {
      await session.abortTransaction();
      return res.json({
        success: false,
        message: 'No active Premium subscription found'
      });
    }

    console.log('✅ Found subscription for reactivation:', subscription._id);

    // Check if auto-renewal is already enabled
    if (subscription.autoRenew) {
      await session.abortTransaction();
      return res.json({
        success: true,
        message: 'Auto-renewal is already enabled',
        autoRenew: true
      });
    }

    // Update subscription
    const updateResult = await Subscription.updateOne(
      { _id: subscription._id },
      {
        $set: {
          autoRenew: true,
          updatedAt: new Date(),
          autoRenewalReactivatedDate: new Date()
        },
        $unset: {
          autoRenewalCancelledDate: '',
          autoRenewalCancelledReason: ''
        }
      }
    ).session(session);

    if (updateResult.modifiedCount > 0) {
      // Create log entry
      await SubscriptionLog.create([{
        subscriptionId: subscription._id,
        userId: subscription.userId,
        userEmail: subscription.userEmail,
        action: 'auto_renewal_reactivated', // ADD this to your enum
        details: {
          reactivatedDate: new Date(),
          note: 'Auto-renewal reactivated by user'
        }
      }], { session });

      await session.commitTransaction();

      console.log('✅ Auto-renewal reactivated successfully');

      res.json({
        success: true,
        message: 'Auto-renewal reactivated successfully. Your subscription will automatically renew on the next billing date.',
        autoRenew: true
      });
    } else {
      await session.abortTransaction();
      res.json({
        success: false,
        message: 'Failed to reactivate auto-renewal. Please try again.'
      });
    }

  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    console.error('❌ Error reactivating auto-renewal:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while reactivating auto-renewal'
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
});


// Get subscription renewal history
router.get('/renewal-history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const subscription = await Subscription.findOne({
      userId: parseInt(userId),
      status: { $in: ['active', 'cancelled', 'expired'] }
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    res.json({
      success: true,
      subscription: {
        planName: subscription.planName,
        status: subscription.status,
        autoRenew: subscription.autoRenew,
        nextBillingDate: subscription.nextBillingDate,
        renewalAttempts: subscription.renewalAttempts,
        maxRenewalAttempts: subscription.maxRenewalAttempts
      },
      renewalHistory: subscription.renewalHistory || []
    });

  } catch (error) {
    console.error('Error fetching renewal history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch renewal history'
    });
  }
});


router.post('/process-scheduled-downgrades', async (req, res) => {
  try {
    console.log('🔄 Processing scheduled downgrades...');
    const now = new Date();

    // Find subscriptions that should be downgraded
    const subscriptionsToDowngrade = await Subscription.find({
      downgradeScheduled: true,
      downgradeEffectiveDate: { $lte: now },
      status: 'active',
      planId: '2' // Premium subscriptions only
    });

    console.log(`📋 Found ${subscriptionsToDowngrade.length} subscriptions to downgrade`);

    const results = [];

    for (const subscription of subscriptionsToDowngrade) {
      try {
        console.log(`🔄 Processing downgrade for user ${subscription.userId}`);

        // Step 1: Apply plan limitations first
        if (subscription.downgradeSelections) {
          await handleDowngradeSelections(subscription.userId, subscription.downgradeSelections);
        } else {
          await applyFreePlanLimitations(subscription.userId);
        }

        // Step 2: Update subscription to free plan
        const updateResult = await Subscription.updateOne(
          { _id: subscription._id },
          {
            $set: {
              planId: '1',
              planName: 'Free',
              amount: 0,
              autoRenew: false,
              nextBillingDate: null,
              downgradeProcessedDate: now,
              updatedAt: now
            },
            $unset: {
              downgradeScheduled: '',
              downgradeScheduledDate: '',
              downgradeReason: '',
              downgradeEffectiveDate: '',
              downgradeTargetPlan: '',
              downgradeSelections: ''
            }
          }
        );

        if (updateResult.modifiedCount > 0) {
          // Create history record
          await SubscriptionHistory.create({
            userId: subscription.userId,
            userEmail: subscription.userEmail,
            action: 'downgrade_processed',
            fromPlan: 'Premium',
            toPlan: 'Free',
            reason: subscription.downgradeReason || 'Automatic downgrade',
            effectiveDate: now,
            notes: 'Downgrade processed automatically'
          });

          results.push({
            userId: subscription.userId,
            success: true,
            message: 'Downgraded successfully'
          });

          console.log(`✅ Successfully downgraded user ${subscription.userId}`);
        } else {
          results.push({
            userId: subscription.userId,
            success: false,
            message: 'Failed to update subscription'
          });
        }

      } catch (error) {
        console.error(`❌ Error processing downgrade for user ${subscription.userId}:`, error);
        results.push({
          userId: subscription.userId,
          success: false,
          message: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${subscriptionsToDowngrade.length} scheduled downgrades`,
      results: results
    });

  } catch (error) {
    console.error('❌ Error processing scheduled downgrades:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while processing downgrades'
    });
  }
});
router.post('/process-automatic-renewals', async (req, res) => {
  try {
    console.log('🔄 Processing automatic renewals...');

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find subscriptions that need renewal within next 24 hours
    const subscriptionsToRenew = await Subscription.find({
      status: 'active',
      planId: '2', // Premium subscriptions only
      autoRenew: true,
      nextBillingDate: { $lte: tomorrow },
      paymentFailure: { $ne: true }
    });

    console.log(`📋 Found ${subscriptionsToRenew.length} subscriptions to renew`);

    const results = [];

    for (const subscription of subscriptionsToRenew) {
      try {
        // Process renewal payment through PayHere
        const renewalResult = await processPayHereRenewal(subscription);

        if (renewalResult.success) {
          // Update subscription with new billing dates
          const nextBillingDate = new Date(subscription.nextBillingDate);
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

          await Subscription.updateOne(
            { _id: subscription._id },
            {
              $set: {
                nextBillingDate: nextBillingDate,
                paymentFailure: false,
                renewalWarning: false,
                lastRenewalDate: now,
                updatedAt: now
              }
            }
          );

          // Log successful renewal
          await SubscriptionHistory.create({
            userId: subscription.userId,
            userEmail: subscription.userEmail,
            action: 'auto_renewal_success',
            fromPlan: subscription.planName,
            toPlan: subscription.planName,
            effectiveDate: now,
            notes: `Automatic renewal successful. Next billing: ${nextBillingDate.toLocaleDateString()}`
          });

          results.push({
            userId: subscription.userId,
            success: true,
            message: 'Renewal successful'
          });

          console.log(`✅ Successfully renewed subscription for user ${subscription.userId}`);

        } else {
          // Payment failed - mark subscription for failure handling
          await handleSubscriptionPaymentFailure(subscription, renewalResult.error);

          results.push({
            userId: subscription.userId,
            success: false,
            error: renewalResult.error
          });
        }

      } catch (error) {
        console.error(`❌ Failed to process renewal for user ${subscription.userId}:`, error);
        await handleSubscriptionPaymentFailure(subscription, error.message);

        results.push({
          userId: subscription.userId,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.length} renewal attempts`,
      results: results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });

  } catch (error) {
    console.error('❌ Error processing automatic renewals:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while processing renewals'
    });
  }
});

router.post('/fix-auto-renewal-for-existing', async (req, res) => {
  try {
    console.log('🔧 Fixing auto-renewal for existing premium subscriptions...');

    // Find all active premium subscriptions without auto-renewal enabled
    const premiumSubscriptions = await Subscription.find({
      planId: '2',
      status: 'active',
      $or: [
        { autoRenew: { $exists: false } },
        { autoRenew: false }
      ]
    });

    console.log(`Found ${premiumSubscriptions.length} premium subscriptions to fix`);

    let fixedCount = 0;

    for (const subscription of premiumSubscriptions) {
      try {
        await Subscription.updateOne(
          { _id: subscription._id },
          {
            $set: {
              autoRenew: true,
              nextBillingDate: subscription.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              updatedAt: new Date()
            }
          }
        );

        fixedCount++;
        console.log(`✅ Fixed auto-renewal for subscription ${subscription._id}`);

      } catch (error) {
        console.error(`❌ Failed to fix subscription ${subscription._id}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Fixed auto-renewal for ${fixedCount} premium subscriptions`,
      totalFound: premiumSubscriptions.length,
      fixed: fixedCount
    });

  } catch (error) {
    console.error('❌ Error fixing auto-renewal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fix auto-renewal settings'
    });
  }
});


router.post('/schedule-cancellation', async (req, res) => {
  try {
    const { userId, userEmail, reason } = req.body;

    // Find current subscription
    const subscription = await Subscription.findOne({
      $or: [
        { userId: userId },
        { userEmail: userEmail }
      ],
      status: 'active',
      planId: '2' // Only premium subscriptions can be cancelled
    });

    if (!subscription) {
      return res.json({
        success: false,
        message: 'No active premium subscription found'
      });
    }

    // Check if cancellation is already scheduled
    if (subscription.cancellationScheduled) {
      return res.json({
        success: false,
        message: 'Cancellation is already scheduled for this subscription'
      });
    }

    // Schedule cancellation for next billing date
    const updateResult = await Subscription.updateOne(
      { _id: subscription._id },
      {
        $set: {
          cancellationScheduled: true,
          cancellationScheduledDate: new Date(),
          cancellationReason: reason || 'User requested cancellation',
          cancellationEffectiveDate: subscription.nextBillingDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          autoRenew: false, // Disable auto-renewal
          updatedAt: new Date()
        }
      }
    );

    if (updateResult.modifiedCount > 0) {
      // Log the cancellation scheduling
      await SubscriptionLog.create({
        subscriptionId: subscription._id,
        userId: userId,
        userEmail: userEmail,
        action: 'cancellation_scheduled',
        details: {
          reason: reason,
          scheduledDate: new Date(),
          effectiveDate: subscription.nextBillingDate,
          remainingDays: Math.ceil((new Date(subscription.nextBillingDate) - new Date()) / (1000 * 60 * 60 * 24))
        },
        timestamp: new Date()
      });

      const effectiveDate = new Date(subscription.nextBillingDate).toLocaleDateString();

      res.json({
        success: true,
        message: `Subscription cancellation scheduled successfully. You'll continue to enjoy premium features until ${effectiveDate}, then your account will automatically switch to the Free plan.`,
        effectiveDate: subscription.nextBillingDate
      });
    } else {
      res.json({
        success: false,
        message: 'Failed to schedule cancellation. Please try again.'
      });
    }

  } catch (error) {
    console.error('Error scheduling cancellation:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while scheduling cancellation'
    });
  }
});


router.post('/cancel-scheduled-cancellation', async (req, res) => {
  try {
    const { userId } = req.body;

    console.log('🔄 Processing legacy cancellation cancel for userId:', userId);

    // First, try to find and cancel a downgrade (new system)
    const subscription = await Subscription.findOne({
      userId: userId,
      status: 'active',
      $or: [
        { downgradeScheduled: true },
        { cancellationScheduled: true }
      ]
    });

    if (!subscription) {
      console.log('❌ No scheduled cancellation or downgrade found');
      return res.json({
        success: false,
        message: 'No scheduled cancellation or downgrade found to cancel'
      });
    }

    let updateFields = {
      $set: {
        autoRenew: true,
        updatedAt: new Date()
      }
    };

    let unsetFields = {};

    // Handle downgrade cancellation
    if (subscription.downgradeScheduled) {
      unsetFields = {
        ...unsetFields,
        downgradeScheduled: '',
        downgradeScheduledDate: '',
        downgradeReason: '',
        downgradeEffectiveDate: '',
        downgradeTargetPlan: '',
        downgradeSelections: ''
      };
    }

    // Handle old-style cancellation
    if (subscription.cancellationScheduled) {
      unsetFields = {
        ...unsetFields,
        cancellationScheduled: '',
        cancellationScheduledDate: '',
        cancellationReason: '',
        cancellationEffectiveDate: ''
      };
    }

    updateFields.$unset = unsetFields;

    const updateResult = await Subscription.updateOne(
      { _id: subscription._id },
      updateFields
    );

    if (updateResult.modifiedCount > 0) {
      // Create history record with proper userEmail
      await SubscriptionHistory.create({
        userId: subscription.userId,
        userEmail: subscription.userEmail, // Use the email from the subscription
        action: subscription.downgradeScheduled ? 'downgrade_cancelled' : 'cancellation_cancelled',
        fromPlan: 'Premium Plan',
        toPlan: 'Premium Plan',
        reason: 'User cancelled scheduled downgrade/cancellation',
        effectiveDate: new Date(),
        notes: 'Premium subscription will continue with auto-renewal enabled'
      });

      console.log('✅ Cancelled scheduled action via legacy endpoint');
      return res.json({
        success: true,
        message: 'Scheduled downgrade/cancellation cancelled successfully! Your premium subscription will continue.'
      });
    }

    console.log('❌ No updates made');
    res.json({
      success: false,
      message: 'Failed to cancel scheduled action'
    });

  } catch (error) {
    console.error('❌ Error in legacy cancellation cancel:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while reactivating subscription'
    });
  }
});

router.get('/cancellation-details/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const subscription = await Subscription.findOne({
      userId: userId,
      cancellationScheduled: true
    });

    if (!subscription) {
      return res.json({
        success: true,
        cancellationInfo: null
      });
    }

    res.json({
      success: true,
      cancellationInfo: {
        scheduledDate: subscription.cancellationScheduledDate,
        effectiveDate: subscription.cancellationEffectiveDate,
        reason: subscription.cancellationReason,
        daysRemaining: Math.ceil((new Date(subscription.cancellationEffectiveDate) - new Date()) / (1000 * 60 * 60 * 24))
      }
    });

  } catch (error) {
    console.error('Error fetching cancellation details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while fetching cancellation details'
    });
  }
});


router.post('/check-with-cancellation', async (req, res) => {
  try {
    const { email, userId } = req.body;

    // Find subscription
    const subscription = await Subscription.findOne({
      $or: [
        { userId: userId },
        { userEmail: email }
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
        cancellationInfo: null,
        isInGracePeriod: false
      });
    }

    // Check if subscription is expired
    const now = new Date();
    const isExpired = subscription.endDate && new Date(subscription.endDate) < now;

    // Check if in grace period (cancelled but still active until next billing)
    const isInGracePeriod = subscription.cancellationScheduled &&
      subscription.status === 'active' &&
      subscription.cancellationEffectiveDate &&
      new Date(subscription.cancellationEffectiveDate) > now;

    // Determine user status
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

    // Cancellation info
    let cancellationInfo = null;
    if (subscription.cancellationScheduled) {
      cancellationInfo = {
        scheduledDate: subscription.cancellationScheduledDate,
        effectiveDate: subscription.cancellationEffectiveDate,
        reason: subscription.cancellationReason,
        daysRemaining: Math.ceil((new Date(subscription.cancellationEffectiveDate) - now) / (1000 * 60 * 60 * 24))
      };
    }

    // Add cancellation fields to subscription object
    const subscriptionWithCancellation = {
      ...subscription.toObject(),
      cancellationScheduled: subscription.cancellationScheduled || false,
      cancellationEffectiveDate: subscription.cancellationEffectiveDate,
      isInGracePeriod: isInGracePeriod
    };

    res.json({
      success: true,
      hasSubscription: true,
      hasActiveSubscription,
      isPremiumUser,
      isFreeUser,
      isNonActivated: !hasActiveSubscription,
      userExists: true,
      subscription: subscriptionWithCancellation,
      cancellationInfo,
      isInGracePeriod,
      autoRenewal: subscription.autoRenew || false
    });

  } catch (error) {
    console.error('Error checking subscription with cancellation:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while checking subscription status'
    });
  }
});


router.post('/process-scheduled-cancellations', async (req, res) => {
  try {
    const now = new Date();

    // Find all subscriptions with scheduled cancellations that should be processed today
    const subscriptionsToCancel = await Subscription.find({
      cancellationScheduled: true,
      cancellationEffectiveDate: { $lte: now },
      status: 'active'
    });

    const results = [];

    for (const subscription of subscriptionsToCancel) {
      try {
        // Create a free subscription for the user
        const freeSubscription = new Subscription({
          userId: subscription.userId,
          userEmail: subscription.userEmail,
          planId: '1',
          planName: 'Free Plan',
          status: 'active',
          billingCycle: 'monthly',
          amount: 0,
          currency: 'LKR',
          paymentMethod: 'auto_downgrade',
          startDate: now,
          endDate: null, // Free plan doesn't expire
          autoRenew: false,
          createdAt: now,
          updatedAt: now
        });

        await freeSubscription.save();

        // Update the old premium subscription to cancelled
        await Subscription.updateOne(
          { _id: subscription._id },
          {
            $set: {
              status: 'cancelled',
              endDate: now,
              cancellationProcessedDate: now,
              updatedAt: now
            }
          }
        );

        // Log the automatic downgrade
        await SubscriptionLog.create({
          subscriptionId: subscription._id,
          userId: subscription.userId,
          userEmail: subscription.userEmail,
          action: 'auto_downgrade_to_free',
          details: {
            fromPlan: 'Premium Plan',
            toPlan: 'Free Plan',
            processedDate: now,
            reason: 'Scheduled cancellation processed'
          },
          timestamp: now
        });

        results.push({
          userId: subscription.userId,
          userEmail: subscription.userEmail,
          status: 'success',
          message: 'Successfully downgraded to free plan'
        });

      } catch (error) {
        console.error(`Error processing cancellation for user ${subscription.userId}:`, error);
        results.push({
          userId: subscription.userId,
          userEmail: subscription.userEmail,
          status: 'error',
          message: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.length} scheduled cancellations`,
      results: results,
      processedCount: results.filter(r => r.status === 'success').length,
      errorCount: results.filter(r => r.status === 'error').length
    });

  } catch (error) {
    console.error('Error processing scheduled cancellations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while processing scheduled cancellations'
    });
  }
});

router.post('/process-expired-grace-periods', async (req, res) => {
  try {
    console.log('⏰ Processing expired grace periods...');

    const now = new Date();

    // Find subscriptions where grace period has expired
    const expiredGracePeriods = await Subscription.find({
      paymentFailure: true,
      gracePeriodEnd: { $lte: now },
      status: 'active'
    });

    console.log(`📋 Found ${expiredGracePeriods.length} expired grace periods`);

    const results = [];

    for (const subscription of expiredGracePeriods) {
      try {
        // Cancel the subscription
        await Subscription.updateOne(
          { _id: subscription._id },
          {
            $set: {
              status: 'cancelled',
              cancelledDate: now,
              cancelReason: 'Payment failure - grace period expired',
              updatedAt: now
            }
          }
        );

        // Suspend all businesses and offers for this user
        await suspendUserBusinessesAndOffers(subscription.userId, 'Subscription cancelled due to payment failure');

        // Send cancellation email
        const user = await User.findOne({ userId: subscription.userId });
        const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'User';

        await sendSubscriptionCancelledEmail({
          email: subscription.userEmail,
          userName: userName,
          cancelDate: now,
          reason: 'Payment failure'
        });

        // Log cancellation
        await SubscriptionHistory.create({
          userId: subscription.userId,
          userEmail: subscription.userEmail,
          action: 'auto_cancelled_payment_failure',
          fromPlan: subscription.planName,
          toPlan: 'Cancelled',
          effectiveDate: now,
          notes: 'Subscription automatically cancelled due to payment failure after grace period'
        });

        results.push({
          userId: subscription.userId,
          success: true,
          message: 'Subscription cancelled due to payment failure'
        });

        console.log(`❌ Cancelled subscription for user ${subscription.userId} due to payment failure`);

      } catch (error) {
        console.error(`❌ Failed to cancel subscription for user ${subscription.userId}:`, error);
        results.push({
          userId: subscription.userId,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.length} expired grace periods`,
      results: results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });

  } catch (error) {
    console.error('❌ Error processing expired grace periods:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while processing expired grace periods'
    });
  }
});


router.post('/schedule-downgrade', async (req, res) => {
  try {
    const { userId, userEmail, reason, selections = null, disableAutoRenewal = true } = req.body;

    console.log('🔄 Scheduling downgrade for userId:', userId, 'disableAutoRenewal:', disableAutoRenewal);

    // Find active premium subscription
    const subscription = await Subscription.findOne({
      $or: [
        { userId: parseInt(userId) },
        { userEmail: userEmail?.toLowerCase().trim() }
      ],
      status: 'active',
      planId: '2' // Premium plan only
    });

    if (!subscription) {
      return res.json({
        success: false,
        message: 'No active premium subscription found'
      });
    }

    // Check if downgrade is already scheduled
    if (subscription.downgradeScheduled) {
      return res.json({
        success: false,
        alreadyScheduled: true,
        message: 'Downgrade is already scheduled for this subscription'
      });
    }

    // Calculate effective date - ALWAYS use the subscription's actual end date
    let effectiveDate = subscription.endDate ? new Date(subscription.endDate) : null;

    if (!effectiveDate) {
      if (subscription.nextBillingDate) {
        effectiveDate = new Date(subscription.nextBillingDate);
      } else {
        const startDate = new Date(subscription.startDate);
        if (subscription.billingCycle === 'yearly') {
          effectiveDate = new Date(startDate);
          effectiveDate.setFullYear(effectiveDate.getFullYear() + 1);
        } else {
          effectiveDate = new Date(startDate);
          effectiveDate.setMonth(effectiveDate.getMonth() + 1);
        }
      }
    }

    console.log('📅 Calculated downgrade effective date:', effectiveDate.toISOString());
    console.log('🚫 Disabling auto-renewal:', disableAutoRenewal);

    // Update subscription with downgrade info AND disable auto-renewal
    const updateFields = {
      downgradeScheduled: true,
      downgradeScheduledDate: new Date(),
      downgradeReason: reason || 'User requested downgrade',
      downgradeEffectiveDate: effectiveDate,
      downgradeTargetPlan: '1', // Free plan
      downgradeSelections: selections,
      updatedAt: new Date()
    };

    // CRITICAL: Always disable auto-renewal when scheduling downgrade
    if (disableAutoRenewal) {
      updateFields.autoRenew = false;
      console.log('✅ Auto-renewal will be disabled');
    }

    const updateResult = await Subscription.updateOne(
      { _id: subscription._id },
      { $set: updateFields }
    );

    if (updateResult.modifiedCount > 0) {
      // Log the downgrade scheduling with auto-renewal status
      await SubscriptionHistory.create({
        userId: parseInt(userId),
        userEmail: userEmail,
        action: 'downgrade_scheduled',
        fromPlan: 'Premium',
        toPlan: 'Free',
        reason: reason,
        effectiveDate: effectiveDate,
        notes: `Auto-renewal disabled: ${disableAutoRenewal}`,
        details: {
          scheduledDate: new Date(),
          selections: selections,
          autoRenewalDisabled: disableAutoRenewal
        }
      });

      const daysRemaining = Math.ceil((effectiveDate - new Date()) / (1000 * 60 * 60 * 24));

      console.log('✅ Downgrade scheduled successfully with auto-renewal disabled');

      res.json({
        success: true,
        message: `Downgrade scheduled successfully. Auto-renewal has been disabled. You'll continue to enjoy Premium features until ${effectiveDate.toLocaleDateString()}, then your account will automatically switch to the Free plan.`,
        effectiveDate: effectiveDate,
        daysRemaining: daysRemaining,
        autoRenewalDisabled: true
      });
    } else {
      res.json({
        success: false,
        message: 'Failed to schedule downgrade. Please try again.'
      });
    }

  } catch (error) {
    console.error('❌ Error scheduling downgrade:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while scheduling downgrade'
    });
  }
});

router.post('/cancel-downgrade', async (req, res) => {
  try {
    const { userId, userEmail } = req.body;

    console.log('🔄 Cancelling downgrade for userId:', userId, 'email:', userEmail);

    if (!userId && !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'User ID or email is required'
      });
    }

    // Find subscription with scheduled downgrade
    const subscription = await Subscription.findOne({
      $or: [
        { userId: userId },
        { userEmail: userEmail }
      ],
      status: 'active',
      downgradeScheduled: true
    });

    if (!subscription) {
      console.log('❌ No scheduled downgrade found');
      return res.json({
        success: false,
        message: 'No scheduled downgrade found to cancel'
      });
    }

    console.log('✅ Found subscription with scheduled downgrade:', subscription._id);

    // Cancel the downgrade
    const updateResult = await Subscription.updateOne(
      { _id: subscription._id },
      {
        $unset: {
          downgradeScheduled: '',
          downgradeScheduledDate: '',
          downgradeReason: '',
          downgradeEffectiveDate: '',
          downgradeTargetPlan: '',
          downgradeSelections: ''
        },
        $set: {
          autoRenew: true,
          updatedAt: new Date()
        }
      }
    );

    console.log('Update result:', updateResult);

    if (updateResult.modifiedCount > 0) {
      // Create history record
      await SubscriptionHistory.create({
        userId: subscription.userId,
        userEmail: subscription.userEmail,
        action: 'downgrade_cancelled',
        fromPlan: 'Premium',
        toPlan: 'Premium',
        reason: 'User cancelled scheduled downgrade',
        effectiveDate: new Date(),
        notes: 'Downgrade cancellation - subscription continues with premium features'
      });

      console.log('✅ Successfully cancelled downgrade');

      res.json({
        success: true,
        message: 'Scheduled downgrade cancelled successfully! Your premium subscription will continue.'
      });
    } else {
      console.log('❌ Failed to update subscription');
      res.json({
        success: false,
        message: 'Failed to cancel downgrade. Please try again.'
      });
    }

  } catch (error) {
    console.error('❌ Error cancelling downgrade:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while cancelling downgrade'
    });
  }
});

router.post('/process-downgrades-with-selections', async (req, res) => {
  try {
    console.log('🔄 Processing scheduled downgrades with selections...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find subscriptions that should be downgraded today
    const subscriptionsToDowngrade = await Subscription.find({
      downgradeScheduled: true,
      downgradeEffectiveDate: { $lte: today },
      status: 'active'
    });

    console.log(`📋 Found ${subscriptionsToDowngrade.length} subscriptions to downgrade`);

    const results = [];

    for (const subscription of subscriptionsToDowngrade) {
      try {
        // Create new free subscription
        const newSubscriptionId = await Counter.getNextSequence('subscription');

        const freeSubscription = new Subscription({
          subscriptionId: newSubscriptionId,
          userId: subscription.userId,
          userEmail: subscription.userEmail,
          planId: '1',
          planName: 'Free Plan',
          status: 'active',
          billingCycle: 'monthly',
          amount: 0,
          currency: 'LKR',
          startDate: today,
          endDate: null,
          nextBillingDate: null,
          paymentMethod: 'free',
          autoRenew: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        await freeSubscription.save();

        // Update old subscription to expired
        await Subscription.updateOne(
          { _id: subscription._id },
          {
            $set: {
              status: 'expired',
              downgradeProcessedDate: today,
              updatedAt: new Date()
            }
          }
        );

        // Handle content based on user selections
        if (subscription.downgradeSelections) {
          const { selectedBusinesses, selectedOffers } = subscription.downgradeSelections;

          // Suspend businesses not selected by user
          const allBusinesses = await Business.find({ userId: subscription.userId, status: 'active' });
          const businessesToSuspend = allBusinesses.filter(b =>
            !selectedBusinesses.includes(b._id.toString())
          );

          if (businessesToSuspend.length > 0) {
            await Business.updateMany(
              { _id: { $in: businessesToSuspend.map(b => b._id) } },
              {
                $set: {
                  status: 'suspended',
                  suspendedDate: today,
                  suspensionReason: 'Downgraded to Free plan - not selected by user'
                }
              }
            );
          }

          // Suspend offers not selected by user
          const allOffers = await Offer.find({ userId: subscription.userId, status: 'active' });
          const offersToSuspend = allOffers.filter(o =>
            !selectedOffers.includes(o._id.toString())
          );

          if (offersToSuspend.length > 0) {
            await Offer.updateMany(
              { _id: { $in: offersToSuspend.map(o => o._id) } },
              {
                $set: {
                  status: 'suspended',
                  suspendedDate: today,
                  suspensionReason: 'Downgraded to Free plan - not selected by user'
                }
              }
            );
          }

          results.push({
            userId: subscription.userId,
            success: true,
            businessesSuspended: businessesToSuspend.length,
            offersSuspended: offersToSuspend.length,
            businessesKept: selectedBusinesses.length,
            offersKept: selectedOffers.length
          });

        } else {
          // No selections - use default logic (keep oldest)
          const businesses = await Business.find({ userId: subscription.userId, status: 'active' })
            .sort({ createdAt: 1 });
          const offers = await Offer.find({ userId: subscription.userId, status: 'active' })
            .sort({ createdAt: 1 });

          // Suspend excess content
          if (businesses.length > 1) {
            const businessesToSuspend = businesses.slice(1);
            await Business.updateMany(
              { _id: { $in: businessesToSuspend.map(b => b._id) } },
              {
                $set: {
                  status: 'suspended',
                  suspendedDate: today,
                  suspensionReason: 'Downgraded to Free plan - exceeds business limit'
                }
              }
            );
          }

          if (offers.length > 3) {
            const offersToSuspend = offers.slice(3);
            await Offer.updateMany(
              { _id: { $in: offersToSuspend.map(o => o._id) } },
              {
                $set: {
                  status: 'suspended',
                  suspendedDate: today,
                  suspensionReason: 'Downgraded to Free plan - exceeds offer limit'
                }
              }
            );
          }

          results.push({
            userId: subscription.userId,
            success: true,
            businessesSuspended: Math.max(0, businesses.length - 1),
            offersSuspended: Math.max(0, offers.length - 3),
            businessesKept: Math.min(1, businesses.length),
            offersKept: Math.min(3, offers.length)
          });
        }

        // Log the successful downgrade
        await SubscriptionHistory.create({
          userId: subscription.userId,
          userEmail: subscription.userEmail,
          action: 'downgrade_processed_with_selection',
          fromPlan: subscription.planName,
          toPlan: 'Free Plan',
          reason: subscription.downgradeReason || 'Scheduled downgrade',
          effectiveDate: today,
          notes: 'Downgrade processed with user content selections'
        });

        console.log(`✅ Successfully downgraded user ${subscription.userId} with selections`);

      } catch (error) {
        console.error(`❌ Failed to downgrade user ${subscription.userId}:`, error);
        results.push({
          userId: subscription.userId,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.length} scheduled downgrades with selections`,
      results: results
    });

  } catch (error) {
    console.error('❌ Error processing downgrades with selections:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while processing downgrades'
    });
  }
});


router.post('/fix-end-dates', async (req, res) => {
  try {
    await fixSubscriptionEndDates();
    res.json({
      success: true,
      message: 'Subscription end dates have been fixed'
    });
  } catch (error) {
    console.error('Error in fix-end-dates route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fix subscription end dates'
    });
  }
});

router.post('/schedule-downgrade', async (req, res) => {
  try {
    const { userId, userEmail, reason, selections = null, handlePlanLimits = true } = req.body;

    console.log('🔄 Scheduling downgrade for userId:', userId);

    // Find active premium subscription
    const subscription = await Subscription.findOne({
      $or: [
        { userId: parseInt(userId) },
        { userEmail: userEmail?.toLowerCase().trim() }
      ],
      status: 'active',
      planId: '2' // Premium plan only
    });

    if (!subscription) {
      return res.json({
        success: false,
        message: 'No active premium subscription found'
      });
    }

    // Check if downgrade is already scheduled
    if (subscription.downgradeScheduled) {
      return res.json({
        success: false,
        alreadyScheduled: true,
        message: 'Downgrade is already scheduled for this subscription'
      });
    }

    // Calculate effective date - use subscription's actual end date
    let effectiveDate = subscription.endDate ? new Date(subscription.endDate) : null;

    // If no endDate exists, calculate it based on current period
    if (!effectiveDate) {
      if (subscription.nextBillingDate) {
        effectiveDate = new Date(subscription.nextBillingDate);
      } else {
        // Calculate end date based on start date and billing cycle
        const startDate = new Date(subscription.startDate);
        if (subscription.billingCycle === 'yearly') {
          effectiveDate = new Date(startDate);
          effectiveDate.setFullYear(effectiveDate.getFullYear() + 1);
        } else {
          // Monthly billing
          effectiveDate = new Date(startDate);
          effectiveDate.setMonth(effectiveDate.getMonth() + 1);
        }
      }
    }

    console.log('Calculated downgrade effective date:', effectiveDate.toISOString());

    // CRITICAL: Disable auto-renewal immediately and try to cancel PayHere recurring token
    let payhereRecurringCancelled = false;
    if (subscription.payhereRecurringToken) {
      try {
        // Attempt to cancel PayHere recurring payment
        console.log('🔄 Attempting to cancel PayHere recurring token:', subscription.payhereRecurringToken);

        // Call PayHere API to cancel recurring payment
        const payhereResponse = await axios.post('https://sandbox.payhere.lk/pay/recurring/cancel', {
          merchant_id: process.env.PAYHERE_MERCHANT_ID,
          recurring_token: subscription.payhereRecurringToken,
          hash: generatePayHereHash({
            merchant_id: process.env.PAYHERE_MERCHANT_ID,
            recurring_token: subscription.payhereRecurringToken
          })
        });

        if (payhereResponse.data && payhereResponse.data.status === 'success') {
          payhereRecurringCancelled = true;
          console.log('✅ PayHere recurring payment cancelled successfully');
        } else {
          console.log('⚠️ PayHere recurring cancellation response:', payhereResponse.data);
        }
      } catch (payhereError) {
        console.error('❌ Failed to cancel PayHere recurring payment:', payhereError.message);
        // Continue with downgrade scheduling even if PayHere cancellation fails
      }
    }

    // Update subscription with downgrade info and disable auto-renewal
    const updateResult = await Subscription.updateOne(
      { _id: subscription._id },
      {
        $set: {
          downgradeScheduled: true,
          downgradeScheduledDate: new Date(),
          downgradeReason: reason || 'User requested downgrade',
          downgradeEffectiveDate: effectiveDate,
          downgradeTargetPlan: '1', // Free plan
          downgradeSelections: selections,
          autoRenew: false, // CRITICAL: Disable auto-renewal immediately
          updatedAt: new Date()
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.json({
        success: false,
        message: 'Failed to schedule downgrade. Please try again.'
      });
    }

    // Log the downgrade scheduling
    await SubscriptionHistory.create({
      userId: parseInt(userId),
      userEmail: subscription.userEmail,
      action: 'downgrade_scheduled',
      fromPlan: 'Premium Plan',
      toPlan: 'Free Plan',
      reason: reason || 'User requested downgrade',
      effectiveDate: effectiveDate,
      scheduledDate: new Date(),
      notes: `Downgrade scheduled for ${effectiveDate.toLocaleDateString()}. Auto-renewal disabled immediately. ${payhereRecurringCancelled ? 'PayHere recurring payment cancelled.' : 'PayHere recurring cancellation attempted.'}`
    });

    // Also log the auto-renewal cancellation as a separate action
    await SubscriptionHistory.create({
      userId: parseInt(userId),
      userEmail: subscription.userEmail,
      action: 'auto_renewal_cancelled',
      fromPlan: 'Premium Plan',
      toPlan: 'Premium Plan',
      reason: 'User scheduled downgrade',
      effectiveDate: new Date(),
      notes: 'Auto-renewal disabled immediately upon downgrade request'
    });

    const daysRemaining = Math.ceil((effectiveDate - new Date()) / (1000 * 60 * 60 * 24));

    console.log('✅ Downgrade scheduled successfully with auto-renewal disabled');

    res.json({
      success: true,
      message: `Downgrade scheduled successfully! Auto-renewal has been disabled immediately - you will not be charged again. You'll continue to enjoy premium features until ${effectiveDate.toLocaleDateString()}, then your account will automatically switch to the Free plan.`,
      effectiveDate: effectiveDate,
      daysRemaining: daysRemaining,
      autoRenewalDisabled: true,
      payhereRecurringCancelled: payhereRecurringCancelled
    });

  } catch (error) {
    console.error('❌ Error scheduling downgrade:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while scheduling downgrade'
    });
  }
});


router.post('/cancel-scheduled-downgrade', async (req, res) => {
  try {
    const { userId } = req.body;

    console.log('🔄 Cancelling scheduled downgrade for userId:', userId);

    // First find the subscription to get the user email
    const subscription = await Subscription.findOne({
      userId: parseInt(userId),
      status: 'active',
      downgradeScheduled: true
    });

    if (!subscription) {
      console.log('❌ No scheduled downgrade found');
      return res.json({
        success: false,
        message: 'No scheduled downgrade found to cancel'
      });
    }

    console.log('✅ Found subscription with scheduled downgrade:', subscription._id);

    // Cancel the downgrade
    const updateResult = await Subscription.updateOne(
      { _id: subscription._id },
      {
        $unset: {
          downgradeScheduled: '',
          downgradeScheduledDate: '',
          downgradeReason: '',
          downgradeEffectiveDate: '',
          downgradeTargetPlan: '',
          downgradeSelections: ''
        },
        $set: {
          autoRenew: true, // Re-enable auto-renewal
          updatedAt: new Date()
        }
      }
    );

    console.log('Update result:', updateResult);

    if (updateResult.modifiedCount > 0) {
      // Create history record with proper userEmail
      await SubscriptionHistory.create({
        userId: subscription.userId,
        userEmail: subscription.userEmail, // Use the email from the subscription
        action: 'downgrade_cancelled',
        fromPlan: 'Premium Plan',
        toPlan: 'Premium Plan',
        reason: 'User cancelled scheduled downgrade',
        effectiveDate: new Date(),
        notes: 'Premium subscription will continue with auto-renewal enabled'
      });

      console.log('✅ Successfully cancelled downgrade');

      res.json({
        success: true,
        message: 'Scheduled downgrade cancelled successfully! Your premium subscription will continue.'
      });
    } else {
      console.log('❌ Failed to update subscription');
      res.json({
        success: false,
        message: 'Failed to cancel downgrade. Please try again.'
      });
    }

  } catch (error) {
    console.error('❌ Error cancelling scheduled downgrade:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while cancelling downgrade'
    });
  }
});


router.get('/downgrade-details/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const subscription = await Subscription.findOne({
      userId: parseInt(userId),
      downgradeScheduled: true
    });

    if (!subscription) {
      return res.json({
        success: true,
        downgradeInfo: null
      });
    }

    const daysRemaining = Math.ceil(
      (new Date(subscription.downgradeEffectiveDate) - new Date()) / (1000 * 60 * 60 * 24)
    );

    res.json({
      success: true,
      downgradeInfo: {
        scheduledDate: subscription.downgradeScheduledDate,
        effectiveDate: subscription.downgradeEffectiveDate,
        reason: subscription.downgradeReason,
        daysRemaining: Math.max(0, daysRemaining),
        targetPlan: subscription.downgradeTargetPlan || 'Free'
      }
    });

  } catch (error) {
    console.error('❌ Error fetching downgrade details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while fetching downgrade details'
    });
  }
});



router.get('/downgrade-impact/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('🔍 Checking downgrade impact for userId:', userId);

    // Count current businesses and offers
    const businessCount = await Business.countDocuments({
      userId: parseInt(userId),
      status: { $ne: 'deleted' }
    });

    const offerCount = await Offer.countDocuments({
      userId: parseInt(userId),
      status: { $ne: 'deleted' }
    });

    const freeLimits = { maxBusinesses: 1, maxOffers: 3 };

    const impact = {
      currentBusinesses: businessCount,
      currentOffers: offerCount,
      maxBusinesses: freeLimits.maxBusinesses,
      maxOffers: freeLimits.maxOffers,
      businessesToRemove: Math.max(0, businessCount - freeLimits.maxBusinesses),
      offersToRemove: Math.max(0, offerCount - freeLimits.maxOffers),
      exceedsLimits: businessCount > freeLimits.maxBusinesses || offerCount > freeLimits.maxOffers
    };

    res.json(impact);

  } catch (error) {
    console.error('❌ Error checking downgrade impact:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while checking downgrade impact'
    });
  }
});
router.post('/process-downgrades', async (req, res) => {
  try {
    console.log('🔄 Processing scheduled downgrades...');

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    // Find subscriptions that should be downgraded today
    const subscriptionsToDowngrade = await Subscription.find({
      downgradeScheduled: true,
      downgradeEffectiveDate: { $lte: today },
      status: 'active'
    });

    console.log(`📋 Found ${subscriptionsToDowngrade.length} subscriptions to downgrade`);

    const results = [];

    for (const subscription of subscriptionsToDowngrade) {
      try {
        // Create new free subscription
        const newSubscriptionId = await Counter.getNextSequence('subscription');

        const freeSubscription = new Subscription({
          subscriptionId: newSubscriptionId,
          userId: subscription.userId,
          userEmail: subscription.userEmail,
          planId: '1',
          planName: 'Free Plan',
          status: 'active',
          billingCycle: 'monthly',
          amount: 0,
          currency: 'LKR',
          startDate: today,
          endDate: null,
          nextBillingDate: null,
          paymentMethod: 'free',
          autoRenew: false,
          downgradeScheduled: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        await freeSubscription.save();

        // Update old subscription to expired
        await Subscription.updateOne(
          { _id: subscription._id },
          {
            $set: {
              status: 'expired',
              downgradeProcessedDate: today,
              updatedAt: new Date()
            }
          }
        );

        // Suspend excess businesses and offers
        const businesses = await Business.find({ userId: subscription.userId, status: 'active' })
          .sort({ createdAt: 1 }); // Keep oldest first
        const offers = await Offer.find({ userId: subscription.userId, status: 'active' })
          .sort({ createdAt: 1 }); // Keep oldest first

        // Suspend excess businesses (keep only 1 for free plan)
        if (businesses.length > 1) {
          const businessesToSuspend = businesses.slice(1); // All except first
          await Business.updateMany(
            { _id: { $in: businessesToSuspend.map(b => b._id) } },
            {
              $set: {
                status: 'suspended',
                suspendedDate: today,
                suspensionReason: 'Downgraded to Free plan - exceeds business limit'
              }
            }
          );
        }

        // Suspend excess offers (keep only 3 for free plan)
        if (offers.length > 3) {
          const offersToSuspend = offers.slice(3); // All except first 3
          await Offer.updateMany(
            { _id: { $in: offersToSuspend.map(o => o._id) } },
            {
              $set: {
                status: 'suspended',
                suspendedDate: today,
                suspensionReason: 'Downgraded to Free plan - exceeds offer limit'
              }
            }
          );
        }

        // Log the downgrade
        await SubscriptionHistory.create({
          userId: subscription.userId,
          userEmail: subscription.userEmail,
          action: 'downgrade_processed',
          fromPlan: subscription.planName,
          toPlan: 'Free Plan',
          reason: subscription.downgradeReason || 'Scheduled downgrade',
          effectiveDate: today,
          notes: `Auto-downgraded from Premium to Free. Businesses suspended: ${Math.max(0, businesses.length - 1)}, Offers suspended: ${Math.max(0, offers.length - 3)}`
        });

        await SubscriptionLog.create({
          subscriptionId: subscription._id,
          userId: subscription.userId,
          userEmail: subscription.userEmail,
          action: 'auto_downgrade_to_free',
          details: {
            processedDate: today,
            originalPlan: subscription.planName,
            newPlan: 'Free Plan',
            businessesSuspended: Math.max(0, businesses.length - 1),
            offersSuspended: Math.max(0, offers.length - 3),
            newSubscriptionId: newSubscriptionId
          },
          timestamp: new Date()
        });

        results.push({
          userId: subscription.userId,
          userEmail: subscription.userEmail,
          success: true,
          businessesSuspended: Math.max(0, businesses.length - 1),
          offersSuspended: Math.max(0, offers.length - 3)
        });

        console.log(`✅ Successfully downgraded user ${subscription.userId} to Free plan`);

      } catch (error) {
        console.error(`❌ Failed to downgrade user ${subscription.userId}:`, error);
        results.push({
          userId: subscription.userId,
          userEmail: subscription.userEmail,
          success: false,
          error: error.message
        });
      }
    }

    console.log('📊 Downgrade processing completed');

    res.json({
      success: true,
      message: `Processed ${results.length} scheduled downgrades`,
      results: results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });

  } catch (error) {
    console.error('❌ Error processing scheduled downgrades:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while processing downgrades'
    });
  }
});

router.post('/reactivate-content', async (req, res) => {
  try {
    const { userId, userEmail } = req.body;

    console.log('🔄 Reactivating suspended content for user:', userId);

    // Check if user has premium subscription
    const subscription = await Subscription.findOne({
      $or: [
        { userId: parseInt(userId) },
        { userEmail: userEmail?.toLowerCase().trim() }
      ],
      planId: '2',
      status: 'active'
    });

    if (!subscription) {
      return res.status(400).json({
        success: false,
        message: 'User must have active premium subscription to reactivate content'
      });
    }

    // Reactivate suspended businesses
    const reactivatedBusinesses = await Business.updateMany(
      {
        userId: parseInt(userId),
        status: 'suspended',
        suspensionReason: { $regex: /free plan limit|downgrade/i }
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
        suspensionReason: { $regex: /free plan limit|downgrade/i }
      },
      {
        status: 'active',
        suspendedDate: null,
        suspensionReason: null,
        updatedAt: new Date()
      }
    );

    // Record in history
    await new SubscriptionHistory({
      userId: parseInt(userId),
      userEmail: userEmail,
      action: 'reactivation',
      fromPlan: 'Free Plan',
      toPlan: 'Premium Plan',
      effectiveDate: new Date(),
      notes: `Reactivated ${reactivatedBusinesses.modifiedCount} businesses and ${reactivatedOffers.modifiedCount} offers after premium upgrade`
    }).save();

    res.json({
      success: true,
      message: 'Content reactivated successfully',
      reactivatedBusinesses: reactivatedBusinesses.modifiedCount,
      reactivatedOffers: reactivatedOffers.modifiedCount
    });

  } catch (error) {
    console.error('❌ Error reactivating content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate content',
      error: error.message
    });
  }
});

router.post('/create-subscription-record', async (req, res) => {
  try {
    console.log('📝 Creating subscription record with data:', req.body);

    const {
      userId,
      userEmail,
      planId,
      planName,
      amount,
      currency,
      paymentMethod,
      payhereOrderId,
      payherePaymentId,
      payhereRecurringToken // Add this for recurring payments
    } = req.body;

    // Validate required fields
    if (!userEmail || !planId || !planName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userEmail, planId, or planName'
      });
    }

    // Calculate end date and set auto-renewal based on plan
    let endDate = null;
    let autoRenew = false;
    let nextBillingDate = null;

    if (planId !== '1' && planId !== 1) { // Premium plans
      const now = new Date();
      endDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // Add 30 days
      autoRenew = true; // CRITICAL FIX: Enable auto-renewal for premium plans
      nextBillingDate = endDate; // Set next billing date
    }

    // Create subscription record
    const subscription = new Subscription({
      userId: userId || null,
      userEmail,
      planId: planId.toString(),
      planName,
      status: 'active',
      billingCycle: 'monthly',
      amount: amount || 0,
      currency: currency || 'LKR',
      paymentMethod,
      payhereOrderId,
      payherePaymentId,
      payhereRecurringToken, // Store recurring token if available
      startDate: new Date(),
      endDate,
      nextBillingDate,
      autoRenew // CRITICAL FIX: Set auto-renewal based on plan type
    });

    const savedSubscription = await subscription.save();

    console.log('✅ Subscription record created with auto-renewal:', {
      id: savedSubscription._id,
      planId: savedSubscription.planId,
      autoRenew: savedSubscription.autoRenew
    });

    res.json({
      success: true,
      message: 'Subscription record created successfully',
      subscriptionId: savedSubscription._id,
      subscription: {
        id: savedSubscription._id,
        planId: savedSubscription.planId,
        planName: savedSubscription.planName,
        status: savedSubscription.status,
        endDate: savedSubscription.endDate,
        autoRenew: savedSubscription.autoRenew, // Include in response
        nextBillingDate: savedSubscription.nextBillingDate
      }
    });

  } catch (error) {
    console.error('❌ Error creating subscription record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription record',
      error: error.message
    });
  }
});
router.post('/create-free-subscription', async (req, res) => {
  try {
    const { customerData } = req.body;

    console.log('🆓 Creating free subscription request:', {
      hasCustomerData: !!customerData,
      email: customerData?.email,
      userId: customerData?.userId,
      name: customerData?.name
    });

    // Enhanced validation
    if (!customerData) {
      return res.status(400).json({
        success: false,
        error: 'Customer data is required'
      });
    }

    if (!customerData.email || !customerData.email.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Customer email is required'
      });
    }

    if (!customerData.name || !customerData.name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Customer name is required'
      });
    }

    const cleanEmail = customerData.email.trim().toLowerCase();
    const cleanName = customerData.name.trim();

    console.log('📧 Processing free subscription for:', cleanEmail);

    // CRITICAL FIX: Check existing subscriptions properly
    const existingSubscription = await Subscription.findOne({
      $or: [
        { userEmail: cleanEmail },
        ...(customerData.userId ? [{ userId: customerData.userId }] : [])
      ]
    }).sort({ createdAt: -1 }); // Get most recent if multiple

    if (existingSubscription) {
      console.log('❌ Existing subscription found:', {
        id: existingSubscription._id,
        planId: existingSubscription.planId,
        planName: existingSubscription.planName,
        status: existingSubscription.status,
        userEmail: existingSubscription.userEmail
      });

      // Check if it's an active subscription
      if (existingSubscription.status === 'active') {
        const planType = existingSubscription.planId === '1' ? 'Free' : 'Premium';
        return res.status(400).json({
          success: false,
          error: `You already have an active ${planType} subscription`,
          existing: {
            planId: existingSubscription.planId,
            planName: existingSubscription.planName,
            status: existingSubscription.status
          }
        });
      }

      // If subscription exists but is expired/cancelled, we can create a new free one
      console.log('ℹ️ Existing subscription is inactive, proceeding with free subscription creation');
    }

    // Create new free subscription
    const freeSubscription = new Subscription({
      userId: customerData.userId || null,
      userEmail: cleanEmail,
      planId: '1',
      planName: 'Free Plan',
      status: 'active',
      billingCycle: 'monthly',
      amount: 0,
      currency: 'LKR',
      paymentMethod: 'free',
      startDate: new Date(),
      endDate: null, // Free plan never expires
      autoRenew: false
    });

    const savedSubscription = await freeSubscription.save();

    console.log('✅ Free subscription created successfully:', {
      id: savedSubscription._id,
      userEmail: savedSubscription.userEmail,
      userId: savedSubscription.userId,
      planId: savedSubscription.planId,
      status: savedSubscription.status
    });

    // Create subscription log
    await SubscriptionLog.create({
      subscriptionId: savedSubscription._id,
      userId: savedSubscription.userId || 0,
      userEmail: savedSubscription.userEmail,
      action: 'created',
      details: {
        planId: '1',
        planName: 'Free Plan',
        paymentMethod: 'free',
        createdAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Free subscription activated successfully! You can now create 1 business and up to 3 offers.',
      subscription: {
        id: savedSubscription._id,
        planId: savedSubscription.planId,
        planName: savedSubscription.planName,
        status: savedSubscription.status,
        billingCycle: savedSubscription.billingCycle,
        endDate: savedSubscription.endDate,
        paymentMethod: savedSubscription.paymentMethod,
        amount: savedSubscription.amount,
        currency: savedSubscription.currency,
        startDate: savedSubscription.startDate
      }
    });

  } catch (error) {
    console.error('❌ Error creating free subscription:', error);

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'A subscription with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create free subscription',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;