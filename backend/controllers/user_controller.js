import User from '../models/user.js';
import Subscription from '../models/subscription.js';
import Business from '../models/business.js';
import SubscriptionLog from '../models/subscription_log.js';
import SubscriptionHistory from '../models/subscription_history.js';
import Offer from '../models/offer.js';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import axios from 'axios';

export const createTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});
export const sendOfferStartNotification = async (userEmail, userName, businessName, offerData) => {
  const transporter = createTransporter();

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: userEmail,
    subject: '🎉 Your Offer is Now Live!',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: linear-gradient(135deg, #007bff, #28a745); padding: 30px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Offer Started!</h1>
          <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Your promotion is now running</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e9ecef; border-top: none;">
          <p style="font-size: 18px; margin-bottom: 20px;">Dear <strong>${userName}</strong>,</p>
          
          <p>Great news! Your offer for <strong>${businessName}</strong> has started and is now live for customers to see.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h3 style="margin: 0 0 15px; color: #28a745;">📢 Offer Details</h3>
            <p style="margin: 5px 0;"><strong>Title:</strong> ${offerData.title}</p>
            <p style="margin: 5px 0;"><strong>Discount:</strong> <span style="color: #28a745; font-weight: bold; font-size: 18px;">${offerData.discount} OFF</span></p>
            <p style="margin: 5px 0;"><strong>Business:</strong> ${businessName}</p>
            ${offerData.category ? `<p style="margin: 5px 0;"><strong>Category:</strong> ${offerData.category}</p>` : ''}
            ${offerData.startDate ? `<p style="margin: 5px 0;"><strong>Started:</strong> ${formatDate(offerData.startDate)}</p>` : ''}
            ${offerData.endDate ? `<p style="margin: 5px 0;"><strong>Ends:</strong> ${formatDate(offerData.endDate)}</p>` : ''}
          </div>
          
          <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px; color: #007bff;">💡 Tips to maximize your offer:</h4>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Share your offer on social media</li>
              <li>Display it prominently in your store</li>
              <li>Tell your regular customers about it</li>
              <li>Monitor its performance in your dashboard</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="margin-bottom: 20px;">Ready to manage your offers?</p>
            <a href="http://localhost:5173/dashboard" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              View Dashboard
            </a>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; border-radius: 0 0 8px 8px;">
          <p style="margin: 0;">This email was sent automatically when your offer started.</p>
          <p style="margin: 5px 0 0;">Need help? Contact our support team.</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Offer start notification sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending offer notification:', error);
    return false;
  }
};
export async function checkUserPlanLimits(userId) {
  try {
    console.log('Checking plan limits for userId:', userId);

    // Get user's current subscription
    const activeSubscription = await Subscription.findOne({
      userId: userId,
      status: 'active'
    }).sort({ createdAt: -1 });

    if (!activeSubscription) {
      return {
        exceedsLimits: false,
        message: 'No active subscription found'
      };
    }

    // Only check limits for free plan users (planId '1')
    if (activeSubscription.planId !== '1') {
      console.log('User has premium plan, no limit check needed');
      return {
        exceedsLimits: false,
        message: 'Premium user - no limits'
      };
    }

    // Count current businesses and offers
    const businessCount = await Business.countDocuments({
      userId: userId,
      status: { $ne: 'deleted' }
    });

    const offerCount = await Offer.countDocuments({
      userId: userId,
      status: { $ne: 'deleted' }
    });

    const freeLimits = { maxBusinesses: 1, maxOffers: 3 };
    const exceedsLimits = businessCount > freeLimits.maxBusinesses || offerCount > freeLimits.maxOffers;

    console.log('Plan limits check result:', {
      businessCount,
      offerCount,
      limits: freeLimits,
      exceedsLimits
    });

    return {
      exceedsLimits,
      currentBusinesses: businessCount,
      currentOffers: offerCount,
      maxBusinesses: freeLimits.maxBusinesses,
      maxOffers: freeLimits.maxOffers,
      exceedsBusinesses: businessCount > freeLimits.maxBusinesses,
      exceedsOffers: offerCount > freeLimits.maxOffers,
      businessesToDelete: Math.max(0, businessCount - freeLimits.maxBusinesses),
      offersToDelete: Math.max(0, offerCount - freeLimits.maxOffers)
    };
  } catch (error) {
    console.error('Error checking plan limits:', error);
    return {
      exceedsLimits: false,
      error: 'Failed to check limits'
    };
  }
}

export async function cancelPayHereRecurringPayment(recurringToken) {
  try {
    console.log('Cancelling PayHere recurring payment:', recurringToken);

    if (!recurringToken) {
      throw new Error('No recurring token provided');
    }

    // For now, skip PayHere API call since the endpoint doesn't exist
    // Just update your database and inform PayHere manually
    console.log('PayHere API integration not available - updating database only');

    return {
      success: true,
      message: 'Database updated - PayHere recurring payment marked for manual cancellation',
      requiresManualCancellation: true
    };

  } catch (error) {
    console.error('PayHere cancellation error:', error.message);

    // Log this for manual follow-up
    try {
      await SubscriptionLog.create({
        userId: 0,
        userEmail: 'system@internal.com',
        action: 'payhere_cancellation_failed',
        details: {
          recurringToken,
          error: error.message,
          timestamp: new Date(),
          note: 'Requires manual PayHere cancellation'
        }
      });
    } catch (logError) {
      console.error('Failed to log PayHere cancellation error:', logError);
    }

    // Don't throw error - allow database update to proceed
    return {
      success: false,
      error: error.message,
      requiresManualCancellation: true
    };
  }
}

export async function handleDowngradeSelections(userId, selections) {
  try {
    console.log('🔧 Handling downgrade selections for userId:', userId);

    if (selections.selectedBusinesses && selections.selectedBusinesses.length > 0) {
      // Suspend businesses not in selection
      await Business.updateMany(
        {
          userId: parseInt(userId),
          _id: { $nin: selections.selectedBusinesses.map(id => new mongoose.Types.ObjectId(id)) },
          status: 'active'
        },
        {
          $set: {
            status: 'suspended',
            suspendedDate: new Date(),
            suspensionReason: 'Not selected during downgrade to free plan'
          }
        }
      );
    }

    if (selections.selectedOffers && selections.selectedOffers.length > 0) {
      // Suspend offers not in selection
      await Offer.updateMany(
        {
          userId: parseInt(userId),
          _id: { $nin: selections.selectedOffers.map(id => new mongoose.Types.ObjectId(id)) },
          status: 'active'
        },
        {
          $set: {
            status: 'suspended',
            suspendedDate: new Date(),
            suspensionReason: 'Not selected during downgrade to free plan'
          }
        }
      );
    }

    console.log(`✅ Applied user selections for downgrade of user ${userId}`);

  } catch (error) {
    console.error('❌ Error handling downgrade selections:', error);
    throw error;
  }
}

export async function updateOfferStatusWithNotification(offerId, status, adminComments, reviewedBy) {
  try {
    console.log(`🔄 Updating offer ${offerId} status to ${status} with notification`);

    const offer = await Offer.findByIdAndUpdate(
      offerId,
      {
        adminStatus: status,
        adminComments: adminComments || '',
        reviewedBy: reviewedBy || 'Admin',
        reviewedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    ).populate('businessId', 'name');

    if (offer) {
      // You could add real-time notification here using Socket.IO
      // For now, we'll rely on the periodic polling from the frontend
      console.log(`✅ Offer ${offerId} status updated to ${status}`);
    }

    return offer;
  } catch (error) {
    console.error(`❌ Error updating offer ${offerId} status:`, error);
    throw error;
  }
};

export async function migrateSubscriptions() {
  try {
    console.log('🔄 Starting subscription migration...');

    // Step 1: Add missing boolean fields with default values
    const result1 = await db.subscriptions.updateMany(
      {},
      {
        $set: {
          downgradeScheduled: false,
          autoRenew: false,
          renewalAttempts: 0,
          maxRenewalAttempts: 3,
          paymentFailure: false,
          cancellationScheduled: false
        }
      }
    );

    console.log(`✅ Updated ${result1.modifiedCount} subscriptions with default boolean fields`);

    // Step 2: Fix missing endDate fields
    const subscriptionsWithoutEndDate = await db.subscriptions.find({
      $or: [
        { endDate: null },
        { endDate: { $exists: false } }
      ]
    });

    console.log(`📋 Found ${subscriptionsWithoutEndDate.length} subscriptions without endDate`);

    for (const subscription of subscriptionsWithoutEndDate) {
      const startDate = new Date(subscription.startDate);
      const endDate = new Date(startDate);

      // Calculate endDate based on plan and billing cycle
      if (subscription.planId === '1') { // Free plan
        endDate.setFullYear(endDate.getFullYear() + 10);
      } else if (subscription.billingCycle === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else { // Monthly
        endDate.setMonth(endDate.getMonth() + 1);
      }

      await db.subscriptions.updateOne(
        { _id: subscription._id },
        {
          $set: {
            endDate: endDate,
            updatedAt: new Date()
          }
        }
      );
    }

    console.log(`✅ Fixed endDate for ${subscriptionsWithoutEndDate.length} subscriptions`);

    // Step 3: Ensure all subscriptions have proper updatedAt
    const result3 = await db.subscriptions.updateMany(
      { updatedAt: { $exists: false } },
      { $set: { updatedAt: new Date() } }
    );

    console.log(`✅ Added updatedAt to ${result3.modifiedCount} subscriptions`);

    // Step 4: Initialize empty renewalHistory for subscriptions that don't have it
    const result4 = await db.subscriptions.updateMany(
      { renewalHistory: { $exists: false } },
      { $set: { renewalHistory: [] } }
    );

    console.log(`✅ Initialized renewalHistory for ${result4.modifiedCount} subscriptions`);

    console.log('🎉 Subscription migration completed successfully!');

    return {
      success: true,
      message: 'Migration completed',
      stats: {
        booleanFieldsUpdated: result1.modifiedCount,
        endDatesFixed: subscriptionsWithoutEndDate.length,
        updatedAtAdded: result3.modifiedCount,
        renewalHistoryInitialized: result4.modifiedCount
      }
    };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}





export const enhancedSubscriptionHistorySchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  userEmail: { type: String, required: true },
  action: {
    type: String,
    enum: [
      'upgrade',
      'downgrade',
      'renewal',
      'cancellation',
      'expiry',
      'reactivation',
      'downgrade_scheduled',
      'downgrade_processed',
      'downgrade_cancelled',
      'plan_limit_enforced',        // NEW
      'auto_plan_enforcement',      // NEW
      'items_suspended',            // NEW
      'items_reactivated'           // NEW
    ],
    required: true
  },
  fromPlan: { type: String },
  toPlan: { type: String },
  reason: { type: String },
  effectiveDate: { type: Date },
  scheduledDate: { type: Date },
  amount: { type: Number, default: 0 },
  notes: { type: String },
  itemsAffected: {                // NEW: Track affected items
    businesses: { type: Number, default: 0 },
    offers: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now }
});

export async function processPayHereRenewal(subscription) {
  try {
    // This would integrate with PayHere's recurring payment API
    // For now, we'll simulate the process

    console.log(`💳 Processing PayHere renewal for subscription ${subscription._id}`);

    // In a real implementation, you would:
    // 1. Call PayHere's recurring payment API
    // 2. Check if the payment was successful
    // 3. Return success/failure status

    // Simulate payment processing
    const paymentSuccess = Math.random() > 0.1; // 90% success rate for simulation

    if (paymentSuccess) {
      return {
        success: true,
        transactionId: `TXN_${Date.now()}`,
        amount: subscription.amount,
        currency: subscription.currency
      };
    } else {
      return {
        success: false,
        error: 'Insufficient funds in payment method'
      };
    }

  } catch (error) {
    console.error('Error processing PayHere renewal:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export const sendStatusEmail = async (user, status) => {
  const transporter = createTransporter();
  const statusMessages = {
    approved: {
      subject: 'Registration Approved',
      html: `<p>Dear ${user.firstName || 'User'},<br/>Your registration has been <strong>approved</strong>. You may now access the system.</p>`,
    },
    declined: {
      subject: 'Registration Declined',
      html: `<p>Dear ${user.firstName || 'User'},<br/>Unfortunately, your registration has been <strong>declined</strong>. Please contact support for more details.</p>`,
    },
  };

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: user.email,
    subject: statusMessages[status].subject,
    html: statusMessages[status].html,
  };

  await transporter.sendMail(mailOptions);
};

export const sendWelcomeEmail = async (user) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: user.email,
    subject: 'Welcome to Explore Sri Lanka - Registration Complete!',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: linear-gradient(135deg, #007bff, #28a745); padding: 30px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Welcome to Explore Sri Lanka!</h1>
          <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Your registration is complete</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e9ecef; border-top: none;">
          <p style="font-size: 18px; margin-bottom: 20px;">Dear <strong>${user.firstName || 'User'}</strong>,</p>
          
          <p>Congratulations! Your account has been successfully created and approved.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h3 style="margin: 0 0 15px; color: #28a745;">📋 Your Account Details</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${user.email}</p>
            <p style="margin: 5px 0;"><strong>Business:</strong> ${user.businessName}</p>
            <p style="margin: 5px 0;"><strong>User Type:</strong> ${user.userType}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">Approved</span></p>
          </div>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h3 style="margin: 0 0 15px; color: #856404;">🚀 Next Steps - Choose Your Subscription Plan</h3>
            <p style="margin: 10px 0; font-weight: bold; color: #856404;">⚠️ Important: You must choose and activate a subscription plan before you can use the platform.</p>
            <p style="margin: 10px 0;">Choose from:</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li><strong>Free Plan</strong> - Get started with basic features (1 highlight ad, standard positioning)</li>
              <li><strong>Premium Plan</strong> - Full access with advanced features (3 highlight ads, priority positioning, multiple promotions)</li>
            </ul>
            <p style="margin: 10px 0; color: #856404; font-weight: bold;">📌 Your account is currently non-activated. Please sign in and select a plan to start creating businesses and offers.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="margin-bottom: 20px; font-size: 18px; font-weight: bold;">Ready to get started?</p>
            <a href="http://localhost:5173/signin" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">
              Sign In Now
            </a>
          </div>
          
          <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px; color: #007bff;">💡 After signing in, you can:</h4>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Choose your subscription plan (Free or Premium)</li>
              <li>Add your business details</li>
              <li>Create attractive offers and promotions</li>
              <li>Start reaching customers across Sri Lanka</li>
            </ul>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; border-radius: 0 0 8px 8px;">
          <p style="margin: 0;">Thank you for choosing Explore Sri Lanka!</p>
          <p style="margin: 5px 0 0;">Need help? Contact our support team at info@sixt5technology.xyz</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return false;
  }
};










export async function handleSubscriptionPaymentFailure(subscription, errorMessage) {
  try {
    const now = new Date();
    const gracePeriodEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours grace period

    // Mark subscription with payment failure
    await Subscription.updateOne(
      { _id: subscription._id },
      {
        $set: {
          paymentFailure: true,
          paymentFailureDate: now,
          paymentFailureReason: errorMessage,
          gracePeriodEnd: gracePeriodEnd,
          updatedAt: now
        }
      }
    );

    // Get user details for email
    const user = await User.findOne({ userId: subscription.userId });
    const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'User';

    // Send payment failure email
    await sendPaymentFailureEmail({
      email: subscription.userEmail,
      userName: userName,
      subscriptionPlan: subscription.planName,
      failureDate: now,
      gracePeriodEnd: gracePeriodEnd,
      nextAttempt: gracePeriodEnd
    });

    // Log payment failure
    await SubscriptionHistory.create({
      userId: subscription.userId,
      userEmail: subscription.userEmail,
      action: 'payment_failure',
      fromPlan: subscription.planName,
      toPlan: subscription.planName,
      effectiveDate: now,
      notes: `Payment failure: ${errorMessage}. Grace period until ${gracePeriodEnd.toLocaleDateString()}`
    });

    console.log(`💳 Payment failure handled for user ${subscription.userId}`);

  } catch (error) {
    console.error('Error handling payment failure:', error);
    throw error;
  }
}




export async function suspendUserBusinessesAndOffers(userId, reason) {
  try {
    const now = new Date();

    // Suspend all active businesses
    const businessResult = await Business.updateMany(
      { userId: userId, status: 'active' },
      {
        $set: {
          status: 'suspended',
          suspendedDate: now,
          suspensionReason: reason
        }
      }
    );

    // Suspend all active offers
    const offerResult = await Offer.updateMany(
      { userId: userId, status: 'active' },
      {
        $set: {
          status: 'suspended',
          suspendedDate: now,
          suspensionReason: reason
        }
      }
    );

    console.log(`🚫 Suspended ${businessResult.modifiedCount} businesses and ${offerResult.modifiedCount} offers for user ${userId}`);

    return {
      businessesSuspended: businessResult.modifiedCount,
      offersSuspended: offerResult.modifiedCount
    };

  } catch (error) {
    console.error('Error suspending user content:', error);
    throw error;
  }
}

export const sendOfferApprovalNotification = async (offer, action) => {
  const transporter = createTransporter();
  const user = offer.userId; // This is now the full user object
  const business = offer.businessId;

  const isApproved = action === 'approved';
  const statusColor = isApproved ? '#28a745' : '#dc3545';
  const statusIcon = isApproved ? '✅' : '❌';
  const statusText = isApproved ? 'APPROVED' : 'DECLINED';

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: user.email,
    subject: `${statusIcon} Offer ${statusText} - ${offer.title}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: linear-gradient(135deg, ${statusColor}, #007bff); padding: 30px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">${statusIcon} Offer ${statusText}</h1>
          <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Admin review completed</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e9ecef; border-top: none;">
          <p style="font-size: 18px; margin-bottom: 20px;">Dear <strong>${user.firstName || 'User'}</strong>,</p>
          
          <p>Your offer has been <strong style="color: ${statusColor}">${statusText.toLowerCase()}</strong> by our admin team.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid ${statusColor}; margin: 20px 0;">
            <h3 style="margin: 0 0 15px; color: ${statusColor};">📢 Offer Details</h3>
            <p style="margin: 5px 0;"><strong>Title:</strong> ${offer.title}</p>
            <p style="margin: 5px 0;"><strong>Discount:</strong> <span style="color: ${statusColor}; font-weight: bold; font-size: 18px;">${offer.discount} OFF</span></p>
            <p style="margin: 5px 0;"><strong>Business:</strong> ${business?.name || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
            <p style="margin: 5px 0;"><strong>Reviewed by:</strong> ${offer.reviewedBy}</p>
            <p style="margin: 5px 0;"><strong>Review Date:</strong> ${offer.reviewedAt ? new Date(offer.reviewedAt).toLocaleDateString() : 'N/A'}</p>
          </div>
          
          ${offer.adminComments ? `
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <h4 style="margin: 0 0 10px; color: #856404;">💬 Admin Comments:</h4>
              <p style="margin: 0; font-style: italic;">${offer.adminComments}</p>
            </div>
          ` : ''}
          
          ${isApproved ? `
            <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px; color: #155724;">🎉 Your offer is now live!</h4>
              <p style="margin: 0;">Customers can now see and use your offer. Monitor its performance in your dashboard.</p>
            </div>
          ` : `
            <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px; color: #721c24;">📝 Next Steps</h4>
              <p style="margin: 0;">Please review the admin comments and feel free to create a new offer that addresses the feedback.</p>
            </div>
          `}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:5173/dashboard" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              View Dashboard
            </a>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; border-radius: 0 0 8px 8px;">
          <p style="margin: 0;">This email was sent automatically when your offer was reviewed.</p>
          <p style="margin: 5px 0 0;">Need help? Contact our support team.</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ ${statusText} notification sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending ${statusText} notification:`, error);
    return false;
  }
};


export const sendOfferEditNotification = async (user, updatedOffer, previousStatus) => {
  const transporter = createTransporter();
  const business = updatedOffer.businessId;

  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: user.email,
    subject: `🔄 Offer Updated - Pending Re-approval: ${updatedOffer.title}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: linear-gradient(135deg, #ffc107, #007bff); padding: 30px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🔄 Offer Updated</h1>
          <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Re-approval required</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e9ecef; border-top: none;">
          <p style="font-size: 18px; margin-bottom: 20px;">Dear <strong>${user.firstName || 'User'}</strong>,</p>
          
          <p>Your offer has been updated and is now pending admin re-approval since the content was modified.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h3 style="margin: 0 0 15px; color: #856404;">📢 Updated Offer Details</h3>
            <p style="margin: 5px 0;"><strong>Title:</strong> ${updatedOffer.title}</p>
            <p style="margin: 5px 0;"><strong>Discount:</strong> <span style="color: #28a745; font-weight: bold; font-size: 18px;">${updatedOffer.discount} OFF</span></p>
            <p style="margin: 5px 0;"><strong>Business:</strong> ${business.name}</p>
            ${updatedOffer.category ? `<p style="margin: 5px 0;"><strong>Category:</strong> ${updatedOffer.category}</p>` : ''}
            ${updatedOffer.startDate ? `<p style="margin: 5px 0;"><strong>Start Date:</strong> ${formatDate(updatedOffer.startDate)}</p>` : ''}
            ${updatedOffer.endDate ? `<p style="margin: 5px 0;"><strong>End Date:</strong> ${formatDate(updatedOffer.endDate)}</p>` : ''}
            <p style="margin: 15px 0 5px 0;"><strong>Previous Status:</strong> <span style="text-transform: capitalize;">${previousStatus}</span></p>
            <p style="margin: 5px 0;"><strong>Current Status:</strong> <span style="color: #ffc107; font-weight: bold;">Pending Review</span></p>
          </div>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h4 style="margin: 0 0 10px; color: #856404;">ℹ️ What happens next?</h4>
            <ul style="margin: 10px 0; padding-left: 20px; color: #856404;">
              <li>Your updated offer is now pending admin review</li>
              <li>You'll receive an email once it's approved or if changes are requested</li>
              <li>The offer will go live automatically once approved</li>
              <li>You can continue editing while it's pending if needed</li>
            </ul>
          </div>

          <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
            <h4 style="margin: 0 0 10px; color: #0c5460;">💡 Tips for faster approval:</h4>
            <ul style="margin: 10px 0; padding-left: 20px; color: #0c5460;">
              <li>Ensure your discount amount is clear and realistic</li>
              <li>Use appropriate start and end dates</li>
              <li>Choose the correct category for your offer</li>
              <li>Make sure your offer title is descriptive</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="margin-bottom: 20px; color: #6c757d;">Manage your offers in your dashboard:</p>
            <a href="http://localhost:5173/dashboard" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; transition: background-color 0.2s;">
              View Dashboard
            </a>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; border-radius: 0 0 8px 8px;">
          <p style="margin: 0;">This email was sent automatically when you updated your offer.</p>
          <p style="margin: 5px 0 0;">Need help? Contact our support team.</p>
          <hr style="border: none; border-top: 1px solid #dee2e6; margin: 15px 0;">
          <p style="margin: 0; font-size: 12px; color: #adb5bd;">
            ${updatedOffer.title} • ${business.name} • Updated on ${formatDate(new Date())}
          </p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Offer edit notification sent to ${user.email} for offer: ${updatedOffer.title}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending offer edit notification:', error);
    return false;
  }
};


export async function sendDowngradeScheduledEmail(emailData) {
  try {
    console.log('📧 Sending downgrade scheduled email to:', emailData.email);

    // Implement your email sending logic here
    // For example, using nodemailer, SendGrid, etc.

    const emailContent = `
      Dear ${emailData.userName},
      
      Your premium subscription downgrade has been scheduled.
      
      Current Plan: ${emailData.currentPlan}
      Downgrade Date: ${emailData.effectiveDate.toLocaleDateString()}
      Days Remaining: ${emailData.daysRemaining}
      Reason: ${emailData.reason}
      
      Impact Analysis:
      - Businesses to be suspended: ${emailData.impactAnalysis.businessesToRemove}
      - Offers to be suspended: ${emailData.impactAnalysis.offersToRemove}
      
      You can cancel this downgrade anytime before the effective date.
      
      Best regards,
      Your App Team
    `;

    // Replace with your actual email sending implementation
    console.log('Email content prepared:', emailContent);

    return { success: true };
  } catch (error) {
    console.error('Error sending downgrade email:', error);
    throw error;
  }
}

export async function sendDowngradeCancelledEmail({ email, userName, planName }) {
  try {
    console.log('📧 Sending downgrade cancelled email to:', email);

    const emailContent = {
      to: email,
      subject: '✅ Subscription Reactivated - Premium Features Restored',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="background: linear-gradient(135deg, #28a745, #007bff); padding: 30px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Welcome Back!</h1>
            <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Your premium subscription continues</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e9ecef; border-top: none;">
            <p style="font-size: 18px; margin-bottom: 20px;">Dear <strong>${userName}</strong>,</p>
            
            <p>Great news! Your scheduled downgrade has been successfully cancelled.</p>
            
            <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
              <h3 style="margin: 0 0 15px; color: #155724;">✅ What This Means</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Your <strong>${planName}</strong> will continue as normal</li>
                <li>Auto-renewal has been re-enabled</li>
                <li>All premium features remain active</li>
                <li>No content will be suspended</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Access Dashboard
              </a>
            </div>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; border-radius: 0 0 8px 8px;">
            <p style="margin: 0;">Thank you for staying with us!</p>
          </div>
        </div>
      `
    };

    // Send email using your email service
    // await emailService.send(emailContent);

  } catch (error) {
    console.error('Error sending downgrade cancelled email:', error);
  }
}
export async function getUserName(userId) {
  try {
    const user = await User.findOne({ userId: userId });
    if (user) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User';
    }
    return 'User';
  } catch (error) {
    console.error('Error getting user name:', error);
    return 'User';
  }
}







export const handleInitialPaymentWithRecurring = async (notificationData) => {
  try {
    const {
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      email,
      custom_1,
      custom_2,
      recurring_token,
      next_occurrence_date
    } = notificationData;

    const planId = custom_1?.replace('plan_', '') || '2';
    const isRecurring = custom_2 === 'monthly_recurring';

    // Check if subscription already exists
    const existingSubscription = await Subscription.findOne({ payhereOrderId: order_id });

    if (existingSubscription) {
      console.log('ℹ️ Updating existing subscription with recurring data...');

      if (isRecurring && recurring_token) {
        existingSubscription.payhereRecurringToken = recurring_token;
        existingSubscription.autoRenew = true;
        existingSubscription.nextBillingDate = next_occurrence_date ?
          new Date(next_occurrence_date) :
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await existingSubscription.save();

        console.log('✅ Existing subscription updated with auto-renewal');
      }
      return;
    }

    // Create new subscription with auto-renewal
    const nextBillingDate = isRecurring && recurring_token ?
      (next_occurrence_date ? new Date(next_occurrence_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) :
      null;

    const subscription = new Subscription({
      userId: null, // Will be linked later
      userEmail: email || 'customer@example.com',
      planId: planId.toString(),
      planName: planId === '1' ? 'Free Plan' : 'Premium Plan',
      status: 'active',
      billingCycle: 'monthly',
      amount: parseFloat(payhere_amount),
      currency: payhere_currency,
      paymentMethod: 'payhere',
      payhereOrderId: order_id,
      payherePaymentId: payment_id,
      payhereRecurringToken: recurring_token,
      autoRenew: isRecurring && !!recurring_token,
      nextBillingDate: nextBillingDate,
      renewalAttempts: 0,
      maxRenewalAttempts: 3,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      renewalHistory: [{
        renewalDate: new Date(),
        amount: parseFloat(payhere_amount),
        status: 'success',
        paymentId: payment_id,
        attempt: 1
      }]
    });

    await subscription.save();

    console.log('✅ New subscription created with auto-renewal support:', {
      id: subscription._id,
      autoRenew: subscription.autoRenew,
      nextBilling: subscription.nextBillingDate
    });

  } catch (error) {
    console.error('❌ Failed to handle initial payment with recurring:', error);
  }
};

export const handleRecurringPaymentNotification = async (notificationData) => {
  try {
    const {
      subscription_id,
      payment_id,
      payhere_amount,
      status_code,
      email,
      next_occurrence_date
    } = notificationData;

    // Find subscription by recurring token or email
    const subscription = await Subscription.findOne({
      $or: [
        { payhereRecurringToken: subscription_id },
        { userEmail: email?.toLowerCase().trim() }
      ],
      autoRenew: true
    });

    if (!subscription) {
      console.error('❌ Subscription not found for recurring payment');
      return;
    }

    if (status_code === '2') {
      // Successful renewal
      console.log('✅ Recurring payment successful for subscription:', subscription._id);

      subscription.status = 'active';
      subscription.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      subscription.nextBillingDate = next_occurrence_date ?
        new Date(next_occurrence_date) :
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      subscription.renewalAttempts = 0;
      subscription.updatedAt = new Date();

      // Add to renewal history
      subscription.renewalHistory.push({
        renewalDate: new Date(),
        amount: parseFloat(payhere_amount),
        status: 'success',
        paymentId: payment_id,
        attempt: subscription.renewalAttempts + 1
      });

      await subscription.save();

      // Send success email
      const user = await User.findOne({ userId: subscription.userId });
      if (user) {
        await sendRenewalSuccessEmail(user, subscription, parseFloat(payhere_amount));
      }

      console.log('✅ Subscription renewed successfully');
    } else {
      // Failed renewal
      console.log('❌ Recurring payment failed');

      subscription.renewalAttempts += 1;
      subscription.status = subscription.renewalAttempts >= subscription.maxRenewalAttempts ?
        'cancelled' : 'pending_renewal';

      subscription.renewalHistory.push({
        renewalDate: new Date(),
        amount: parseFloat(payhere_amount),
        status: 'failed',
        failureReason: `Payment failed with status code: ${status_code}`,
        attempt: subscription.renewalAttempts
      });

      if (subscription.renewalAttempts >= subscription.maxRenewalAttempts) {
        subscription.autoRenew = false;
        subscription.endDate = new Date(); // Expire immediately
      }

      await subscription.save();

      // Send failure email
      const user = await User.findOne({ userId: subscription.userId });
      if (user) {
        await sendRenewalFailedEmail(user, subscription, subscription.renewalAttempts);
      }
    }

  } catch (error) {
    console.error('❌ Failed to handle recurring payment notification:', error);
  }
};

export const handleSubscriptionCancellationNotification = async (notificationData) => {
  try {
    const { subscription_id, email } = notificationData;

    const subscription = await Subscription.findOne({
      $or: [
        { payhereRecurringToken: subscription_id },
        { userEmail: email?.toLowerCase().trim() }
      ],
      autoRenew: true
    });

    if (!subscription) {
      console.error('❌ Subscription not found for cancellation');
      return;
    }

    subscription.autoRenew = false;
    subscription.status = 'cancelled';
    subscription.nextBillingDate = null;
    subscription.updatedAt = new Date();

    await subscription.save();

    // Send cancellation email
    const user = await User.findOne({ userId: subscription.userId });
    if (user) {
      await sendSubscriptionCancelledEmail(user, subscription);
    }

    console.log('✅ Subscription cancelled via PayHere notification');

  } catch (error) {
    console.error('❌ Failed to handle subscription cancellation:', error);
  }
};
export const handleInitialSubscription = async (notificationData) => {
  try {
    const {
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      email,
      custom_1,
      recurring_token,
      subscription_id
    } = notificationData;

    console.log('🔄 Processing initial subscription creation...');

    const planId = custom_1?.replace('plan_', '') || '2';
    const isRecurring = !!recurring_token;

    // Check if subscription record already exists
    const existingSubscription = await Subscription.findOne({ payhereOrderId: order_id });

    if (existingSubscription) {
      console.log('ℹ️ Subscription record already exists for this order');

      // Update with recurring information if available
      if (isRecurring) {
        existingSubscription.payhereRecurringToken = recurring_token;
        existingSubscription.autoRenew = true;
        existingSubscription.nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await existingSubscription.save();
        console.log('✅ Updated existing subscription with recurring token');
      }

      return;
    }


    async function autoEnforcePlanLimits(userId) {
      try {
        console.log('🔧 Auto-enforcing plan limits for userId:', userId);

        const user = await User.findOne({ userId: parseInt(userId) });
        if (!user) {
          console.log('❌ User not found for auto-enforcement');
          return;
        }

        const businessCount = await Business.countDocuments({
          userId: parseInt(userId),
          status: { $ne: 'deleted' }
        });

        const offerCount = await Offer.countDocuments({
          userId: parseInt(userId),
          status: { $ne: 'deleted' }
        });

        const freeLimits = { maxBusinesses: 1, maxOffers: 3 };

        // Suspend excess businesses (keep the most recent one active)
        if (businessCount > freeLimits.maxBusinesses) {
          const excessBusinesses = await Business.find({
            userId: parseInt(userId),
            status: 'active'
          })
            .sort({ createdAt: -1 })
            .skip(freeLimits.maxBusinesses);

          for (const business of excessBusinesses) {
            await Business.findByIdAndUpdate(business._id, {
              status: 'suspended',
              suspendedDate: new Date(),
              suspensionReason: 'Exceeded free plan business limit',
              updatedAt: new Date()
            });

            // Also suspend all offers for this business
            await Offer.updateMany(
              { businessId: business._id },
              {
                status: 'suspended',
                suspendedDate: new Date(),
                suspensionReason: 'Business suspended due to plan limit',
                updatedAt: new Date()
              }
            );

            console.log(`🚫 Suspended business: ${business.name}`);
          }
        }

        // Suspend excess offers (keep the most recent ones active)
        if (offerCount > freeLimits.maxOffers) {
          const excessOffers = await Offer.find({
            userId: parseInt(userId),
            status: 'active'
          })
            .sort({ createdAt: -1 })
            .skip(freeLimits.maxOffers);

          for (const offer of excessOffers) {
            await Offer.findByIdAndUpdate(offer._id, {
              status: 'suspended',
              suspendedDate: new Date(),
              suspensionReason: 'Exceeded free plan offer limit',
              updatedAt: new Date()
            });

            console.log(`🚫 Suspended offer: ${offer.title}`);
          }
        }

        // Log the auto-enforcement
        await SubscriptionHistory.create({
          userId: parseInt(userId),
          userEmail: user.email,
          action: 'auto_plan_enforcement',
          fromPlan: 'Premium',
          toPlan: 'Free',
          reason: 'Auto-suspended excess items due to plan downgrade',
          effectiveDate: new Date()
        });

        console.log('✅ Auto-enforcement completed');

      } catch (error) {
        console.error('❌ Error in auto-enforcement:', error);
      }
    }
    // Calculate next billing date (30 days from now)
    const nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);


    const attemptManualRenewal = async (subscription) => {
      try {
        console.log(`🔄 Attempting manual renewal for subscription: ${subscription._id}`);

        // This would require implementing PayHere's recurring payment API
        // For now, we'll mark it as failed and notify the user

        subscription.renewalAttempts += 1;
        subscription.status = 'pending_renewal';

        // Add to renewal history
        subscription.renewalHistory.push({
          renewalDate: new Date(),
          amount: subscription.amount,
          status: 'failed',
          failureReason: 'Automatic renewal failed - manual intervention required',
          attempt: subscription.renewalAttempts
        });

        // If max attempts reached, cancel subscription
        if (subscription.renewalAttempts >= subscription.maxRenewalAttempts) {
          subscription.status = 'expired';
          subscription.autoRenew = false;

          // Set end date to now
          subscription.endDate = new Date();

          console.log(`❌ Subscription ${subscription._id} expired after ${subscription.maxRenewalAttempts} attempts`);
        }

        await subscription.save();

        // Send notification email
        const user = await User.findOne({ userId: subscription.userId });
        if (user) {
          if (subscription.status === 'expired') {
            await sendSubscriptionExpiredEmail(user, subscription);
          } else {
            await sendRenewalFailedEmail(user, subscription, subscription.renewalAttempts);
          }
        }

      } catch (error) {
        console.error(`❌ Manual renewal attempt failed for ${subscription._id}:`, error);
      }
    };
    // Create subscription record
    const subscription = new Subscription({
      userId: null, // Will be updated when we match with user
      userEmail: email || 'customer@example.com',
      planId: planId.toString(),
      planName: planId === '1' ? 'Free Plan' : 'Premium Plan',
      status: 'active',
      billingCycle: 'monthly',
      amount: parseFloat(payhere_amount),
      currency: payhere_currency,
      paymentMethod: 'payhere',
      payhereOrderId: order_id,
      payherePaymentId: payment_id,
      payhereRecurringToken: recurring_token,
      autoRenew: isRecurring,
      nextBillingDate: isRecurring ? nextBillingDate : null,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      renewalHistory: [{
        renewalDate: new Date(),
        amount: parseFloat(payhere_amount),
        status: 'success',
        paymentId: payment_id,
        attempt: 1
      }]
    });

    await subscription.save();
    console.log('✅ Initial subscription with auto-renewal created:', subscription._id);

  } catch (error) {
    console.error('❌ Failed to create initial subscription:', error);
  }
};


export const sendRenewalSuccessEmail = async (user, subscription, amount) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: user.email,
    subject: '✅ Subscription Renewed Successfully',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: #28a745; color: white; padding: 20px; text-align: center;">
          <h1>✅ Subscription Renewed</h1>
        </div>
        <div style="padding: 20px;">
          <p>Dear ${user.firstName},</p>
          <p>Your ${subscription.planName} subscription has been automatically renewed.</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Renewal Details:</h3>
            <p><strong>Plan:</strong> ${subscription.planName}</p>
            <p><strong>Amount:</strong> ${subscription.currency} ${amount.toFixed(2)}</p>
            <p><strong>Next Billing:</strong> ${subscription.nextBillingDate.toLocaleDateString()}</p>
            <p><strong>Valid Until:</strong> ${subscription.endDate.toLocaleDateString()}</p>
          </div>
          
          <p>Your premium features remain active. Thank you for your continued subscription!</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="http://localhost:5173/dashboard" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View Dashboard
            </a>
          </div>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

export const sendRenewalFailedEmail = async (user, subscription, attemptNumber) => {
  const transporter = createTransporter();

  const isLastAttempt = attemptNumber >= subscription.maxRenewalAttempts;

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: user.email,
    subject: isLastAttempt ? '❌ Subscription Cancelled - Payment Failed' : '⚠️ Subscription Renewal Failed',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: ${isLastAttempt ? '#dc3545' : '#ffc107'}; color: white; padding: 20px; text-align: center;">
          <h1>${isLastAttempt ? '❌ Subscription Cancelled' : '⚠️ Renewal Failed'}</h1>
        </div>
        <div style="padding: 20px;">
          <p>Dear ${user.firstName},</p>
          
          ${isLastAttempt ? `
            <p>We were unable to renew your ${subscription.planName} subscription after ${attemptNumber} attempts. Your subscription has been cancelled.</p>
            <p><strong>Your premium features will be disabled.</strong></p>
          ` : `
            <p>We couldn't process your ${subscription.planName} subscription renewal (attempt ${attemptNumber} of ${subscription.maxRenewalAttempts}).</p>
            <p>We'll try again soon, but you can also update your payment method to ensure uninterrupted service.</p>
          `}
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Subscription Details:</h3>
            <p><strong>Plan:</strong> ${subscription.planName}</p>
            <p><strong>Amount:</strong> ${subscription.currency} ${subscription.amount.toFixed(2)}</p>
            <p><strong>Status:</strong> ${isLastAttempt ? 'Cancelled' : 'Pending Renewal'}</p>
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="http://localhost:5173/subscription" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              ${isLastAttempt ? 'Resubscribe Now' : 'Update Payment Method'}
            </a>
          </div>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

export const sendSubscriptionCancelledEmail = async (user, subscription) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: user.email,
    subject: '❌ Subscription Cancelled',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
          <h1>❌ Subscription Cancelled</h1>
        </div>
        <div style="padding: 20px;">
          <p>Dear ${user.firstName},</p>
          <p>Your ${subscription.planName} subscription has been cancelled as requested.</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Service continues until:</strong> ${subscription.endDate.toLocaleDateString()}</p>
            <p>After this date, your account will revert to the Free plan.</p>
          </div>
          
          <p>You can resubscribe anytime to regain premium features.</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="http://localhost:5173/subscription" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Resubscribe
            </a>
          </div>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

export const sendSubscriptionExpiredEmail = async (user, subscription) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: user.email,
    subject: '⏰ Subscription Expired',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: #6c757d; color: white; padding: 20px; text-align: center;">
          <h1>⏰ Subscription Expired</h1>
        </div>
        <div style="padding: 20px;">
          <p>Dear ${user.firstName},</p>
          <p>Your ${subscription.planName} subscription has expired due to payment failures.</p>
          
          <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; color: #721c24;">
            <p><strong>Your account has been downgraded to the Free plan.</strong></p>
            <p>Premium features are no longer available.</p>
          </div>
          
          <p>Resubscribe now to restore your premium features and continue growing your business!</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="http://localhost:5173/subscription" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px;">
              Resubscribe to Premium
            </a>
          </div>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};


export async function applyFreePlanLimitations(userId) {
  try {
    console.log(`🔧 Applying free plan limitations for user ${userId}`);

    // Suspend excess businesses (keep most recent 1)
    const excessBusinesses = await Business.find({
      userId: parseInt(userId),
      status: 'active'
    })
      .sort({ createdAt: -1 })
      .skip(1); // Skip the first (most recent) business

    for (const business of excessBusinesses) {
      await Business.updateOne(
        { _id: business._id },
        {
          $set: {
            status: 'suspended',
            suspendedDate: new Date(),
            suspensionReason: 'Exceeded free plan business limit (1 business allowed)',
            updatedAt: new Date()
          }
        }
      );

      // Also suspend all offers for this business
      await Offer.updateMany(
        { businessId: business._id },
        {
          $set: {
            status: 'suspended',
            suspendedDate: new Date(),
            suspensionReason: 'Business suspended due to plan limit',
            updatedAt: new Date()
          }
        }
      );
    }

    // Suspend excess offers (keep most recent 3)
    const excessOffers = await Offer.find({
      userId: parseInt(userId),
      status: 'active'
    })
      .sort({ createdAt: -1 })
      .skip(3); // Skip the first 3 (most recent) offers

    for (const offer of excessOffers) {
      await Offer.updateOne(
        { _id: offer._id },
        {
          $set: {
            status: 'suspended',
            suspendedDate: new Date(),
            suspensionReason: 'Exceeded free plan offer limit (3 offers allowed)',
            updatedAt: new Date()
          }
        }
      );
    }

    console.log(`✅ Applied free plan limitations for user ${userId}`);

  } catch (error) {
    console.error('❌ Error applying free plan limitations:', error);
    throw error;
  }
}

export const handleSubscriptionCancellation = async (notificationData) => {
  try {
    const { subscription_id, email } = notificationData;

    console.log('🔄 Processing subscription cancellation...');

    const subscription = await Subscription.findOne({
      $or: [
        { payhereRecurringToken: subscription_id },
        { userEmail: email.toLowerCase().trim() }
      ],
      autoRenew: true
    });

    if (!subscription) {
      console.error('❌ Subscription not found for cancellation');
      return;
    }

    subscription.autoRenew = false;
    subscription.status = 'cancelled';
    subscription.nextBillingDate = null;
    subscription.updatedAt = new Date();

    await subscription.save();

    // Send cancellation confirmation email
    const user = await User.findOne({ userId: subscription.userId });
    if (user) {
      await sendSubscriptionCancelledEmail(user, subscription);
    }

    console.log('✅ Subscription cancelled successfully:', subscription._id);

  } catch (error) {
    console.error('❌ Failed to process subscription cancellation:', error);
  }
};

export const attemptManualRenewal = async (subscription) => {
  try {
    console.log(`🔄 Attempting manual renewal for subscription: ${subscription._id}`);

    // Double-check if subscription has scheduled cancellation (safety check)
    if (subscription.cancellationScheduled) {
      console.log(`⏭️ Skipping renewal for subscription ${subscription._id} - cancellation scheduled`);
      return;
    }

    // This would require implementing PayHere's recurring payment API
    // For now, we'll mark it as failed and notify the user

    subscription.renewalAttempts += 1;
    subscription.status = 'pending_renewal';

    // Add to renewal history
    subscription.renewalHistory.push({
      renewalDate: new Date(),
      amount: subscription.amount,
      status: 'failed',
      failureReason: 'Automatic renewal failed - manual intervention required',
      attempt: subscription.renewalAttempts
    });

    // If max attempts reached, cancel subscription
    if (subscription.renewalAttempts >= subscription.maxRenewalAttempts) {
      subscription.status = 'expired';
      subscription.autoRenew = false;

      // Set end date to now
      subscription.endDate = new Date();

      console.log(`❌ Subscription ${subscription._id} expired after ${subscription.maxRenewalAttempts} attempts`);
    }

    await subscription.save();

    // Send notification email
    const user = await User.findOne({ userId: subscription.userId });
    if (user) {
      if (subscription.status === 'expired') {
        await sendSubscriptionExpiredEmail(user, subscription);
      } else {
        await sendRenewalFailedEmail(user, subscription, subscription.renewalAttempts);
      }
    }

  } catch (error) {
    console.error(`❌ Manual renewal attempt failed for ${subscription._id}:`, error);
  }
};

export const sendDowngradeNotificationEmail = async (user, subscription) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: user.email,
    subject: '📋 Your Premium Subscription Has Ended',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: #6c757d; color: white; padding: 20px; text-align: center;">
          <h1>📋 Subscription Update</h1>
        </div>
        <div style="padding: 20px;">
          <p>Dear ${user.firstName || 'Valued Customer'},</p>
          <p>Your Premium subscription has ended as scheduled, and your account has been automatically switched to our Free plan.</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>What happens next:</h3>
            <ul>
              <li>✅ Your account remains active</li>
              <li>📋 You now have access to Free plan features</li>
              <li>🔄 You can upgrade to Premium anytime</li>
            </ul>
          </div>
          
          <p>Thank you for being part of our community. We hope you'll consider upgrading again to enjoy our premium features!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:5173/subscription" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">
              Upgrade to Premium
            </a>
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="http://localhost:5173/dashboard" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Dashboard
            </a>
          </div>
        </div>
        <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">
          <p>This is an automated message. If you have any questions, please contact our support team.</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ Downgrade notification email sent to ${user.email}`);
};

export async function sendDowngradeReminderEmail({ email, userName, effectiveDate, daysRemaining, impactAnalysis }) {
  try {
    const emailContent = {
      to: email,
      subject: `⏰ Reminder: Premium Plan Ends in ${daysRemaining} Days`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="background: linear-gradient(135deg, #ff9800, #ff5722); padding: 30px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">⏰ ${daysRemaining} Days Left</h1>
            <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Your premium plan ends soon</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e9ecef; border-top: none;">
            <p style="font-size: 18px; margin-bottom: 20px;">Dear <strong>${userName}</strong>,</p>
            
            <p>This is a friendly reminder that your premium plan will automatically downgrade to the Free Plan on <strong>${effectiveDate.toLocaleDateString()}</strong>.</p>
            
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <h3 style="margin: 0 0 15px; color: #856404;">📅 Timeline</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li><strong>${daysRemaining} days</strong> until automatic downgrade</li>
                <li>Premium features active until ${effectiveDate.toLocaleDateString()}</li>
                <li>Can cancel downgrade anytime before then</li>
              </ul>
            </div>

            ${impactAnalysis.hasImpact ? `
              <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; border-left: 4px solid #dc3545; margin: 20px 0;">
                <h3 style="margin: 0 0 15px; color: #721c24;">⚠️ Impact on Your Content</h3>
                <ul style="margin: 0; padding-left: 20px; color: #721c24;">
                  ${impactAnalysis.businessesToSuspend > 0 ? `<li><strong>${impactAnalysis.businessesToSuspend} business(es)</strong> will be suspended</li>` : ''}
                  ${impactAnalysis.offersToSuspend > 0 ? `<li><strong>${impactAnalysis.offersToSuspend} offer(s)</strong> will be suspended</li>` : ''}
                </ul>
              </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">
                Cancel Downgrade
              </a>
              <a href="${process.env.FRONTEND_URL}/subscription" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Renew Premium
              </a>
            </div>
          </div>
        </div>
      `
    };

    // Send email using your email service
    // await emailService.send(emailContent);

  } catch (error) {
    console.error('Error sending downgrade reminder email:', error);
  }
}








export async function sendDowngradeCompletedEmail({ email, userName, suspendedBusinesses, suspendedOffers }) {
  try {
    console.log('📧 Sending downgrade completed email to:', email);

    const emailContent = {
      to: email,
      subject: 'Your Account Has Been Downgraded to Free Plan',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="background: linear-gradient(135deg, #6c757d, #007bff); padding: 30px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Account Updated</h1>
            <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Now on Free Plan</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e9ecef; border-top: none;">
            <p style="font-size: 18px; margin-bottom: 20px;">Dear <strong>${userName}</strong>,</p>
            
            <p>Your subscription has been successfully downgraded to the Free Plan as scheduled.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px; color: #495057;">📊 Account Summary</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li><strong>Plan:</strong> Free Plan (1 business, 1 offer)</li>
                <li><strong>Businesses affected:</strong> ${suspendedBusinesses} temporarily suspended</li>
                <li><strong>Offers affected:</strong> ${suspendedOffers} temporarily suspended</li>
              </ul>
            </div>
            
            ${suspendedBusinesses > 0 || suspendedOffers > 0 ? `
              <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
                <h4 style="margin: 0 0 10px; color: #856404;">📦 Content Temporarily Suspended</h4>
                <p style="margin: 0 0 10px;">The following content has been temporarily suspended due to Free plan limits:</p>
                ${suspendedBusinesses > 0 ? `<p>• <strong>${suspendedBusinesses} business(es)</strong> suspended</p>` : ''}
                ${suspendedOffers > 0 ? `<p>• <strong>${suspendedOffers} offer(s)</strong> suspended</p>` : ''}
                <p style="margin: 10px 0 0; font-weight: bold; color: #28a745;">💡 Your content isn't deleted! Upgrade anytime to reactivate everything.</p>
              </div>
            ` : ''}
            
            <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px; color: #0c5460;">🆓 What You Can Still Do</h4>
              <ul style="margin: 0; padding-left: 20px; color: #0c5460;">
                <li>Manage 1 active business</li>
                <li>Create 1 active offer (highlight ad)</li>
                <li>Access basic platform features</li>
                <li>Upgrade to Premium anytime to restore all content</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">
                View Dashboard
              </a>
              <a href="${process.env.FRONTEND_URL}/subscription" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Upgrade to Premium
              </a>
            </div>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; border-radius: 0 0 8px 8px;">
            <p style="margin: 0;">Thank you for using our platform! Upgrade anytime to get your premium features back.</p>
          </div>
        </div>
      `
    };

    // Send email using your email service
    // await emailService.send(emailContent);

  } catch (error) {
    console.error('Error sending downgrade completed email:', error);
  }
}


export async function getDowngradeImpactAnalysis(userId) {
  try {
    const businesses = await Business.countDocuments({
      userId: userId,
      status: 'active'
    });

    const offers = await Offer.countDocuments({
      userId: userId,
      status: 'active',
      adminStatus: 'approved'
    });

    // Free plan limits: 1 business, 3 offers
    return {
      currentBusinesses: businesses,
      currentOffers: offers,
      businessesToRemove: Math.max(0, businesses - 1),
      offersToRemove: Math.max(0, offers - 3),
      willKeepBusinesses: Math.min(businesses, 1),
      willKeepOffers: Math.min(offers, 3)
    };
  } catch (error) {
    console.error('Error analyzing downgrade impact:', error);
    return {
      currentBusinesses: 0,
      currentOffers: 0,
      businessesToRemove: 0,
      offersToRemove: 0,
      willKeepBusinesses: 0,
      willKeepOffers: 0
    };
  }
}

export async function handleInitialPayment(notificationData) {
  try {
    const {
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      custom_1,
      custom_2,
      email,
      recurring_token // Capture recurring token if available
    } = notificationData;

    console.log('Processing initial payment:', {
      orderId: order_id,
      paymentId: payment_id,
      amount: payhere_amount,
      hasRecurringToken: !!recurring_token,
      custom2: custom_2
    });

    // Extract plan ID from custom_1
    const planId = custom_1 ? custom_1.replace('plan_', '') : '1';
    const isPremiumWithAutoRenewal = custom_2 === 'premium_auto_renewal';

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Create subscription with proper auto-renewal settings
    const subscriptionData = {
      userId: user ? user.userId : null,
      userEmail: email.toLowerCase().trim(),
      planId: planId,
      planName: planId === '2' ? 'Premium Plan' : 'Free Plan',
      status: 'active',
      billingCycle: 'monthly',
      amount: parseFloat(payhere_amount),
      currency: payhere_currency,
      paymentMethod: 'payhere',
      payhereOrderId: order_id,
      payherePaymentId: payment_id,
      payhereRecurringToken: recurring_token || null, // Store recurring token
      startDate: new Date(),
      autoRenew: isPremiumWithAutoRenewal, // CRITICAL FIX: Set based on plan type
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Set end date and next billing for premium plans
    if (planId === '2') {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      subscriptionData.endDate = endDate;
      subscriptionData.nextBillingDate = endDate;
    } else {
      subscriptionData.endDate = null; // Free plan doesn't expire
      subscriptionData.nextBillingDate = null;
    }

    const subscription = new Subscription(subscriptionData);
    await subscription.save();

    console.log('✅ Subscription created with auto-renewal:', {
      id: subscription._id,
      planId: subscription.planId,
      autoRenew: subscription.autoRenew,
      hasRecurringToken: !!subscription.payhereRecurringToken
    });

    // Log the creation
    await SubscriptionLog.create({
      subscriptionId: subscription._id,
      userId: subscription.userId || 0,
      userEmail: subscription.userEmail,
      action: 'created',
      details: {
        paymentId: payment_id,
        amount: parseFloat(payhere_amount),
        currency: payhere_currency,
        autoRenewal: subscription.autoRenew,
        recurringToken: !!recurring_token
      }
    });

    return { success: true, subscription };

  } catch (error) {
    console.error('Error handling initial payment:', error);
    throw error;
  }
}

// FIXED: Handle recurring payments
export async function handleRecurringPayment(notificationData) {
  try {
    const {
      subscription_id,
      payment_id,
      payhere_amount,
      status_code,
      email,
      next_occurrence_date
    } = notificationData;

    console.log('Processing recurring payment:', { subscription_id, status_code });

    // Find subscription by recurring token or email
    const subscription = await Subscription.findOne({
      $or: [
        { payhereRecurringToken: subscription_id },
        { userEmail: email?.toLowerCase().trim() }
      ],
      autoRenew: true
    }).sort({ createdAt: -1 });

    if (!subscription) {
      console.error('Subscription not found for recurring payment');
      return;
    }

    if (status_code === '2') {
      // Successful renewal - extend end date
      console.log('Recurring payment successful');

      const currentEndDate = new Date(subscription.endDate);
      const newEndDate = new Date(currentEndDate);

      // Extend by one billing period from current end date
      if (subscription.billingCycle === 'yearly') {
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      } else {
        newEndDate.setMonth(newEndDate.getMonth() + 1);
      }

      subscription.status = 'active';
      subscription.endDate = newEndDate; // This is key - extend the actual end date
      subscription.nextBillingDate = next_occurrence_date ?
        new Date(next_occurrence_date) : newEndDate;
      subscription.renewalAttempts = 0;
      subscription.updatedAt = new Date();

      // Add to renewal history
      subscription.renewalHistory.push({
        renewalDate: new Date(),
        amount: parseFloat(payhere_amount),
        status: 'success',
        paymentId: payment_id,
        attempt: subscription.renewalAttempts + 1
      });

      await subscription.save();

      console.log('Subscription renewed with new end date:', {
        oldEndDate: currentEndDate.toISOString(),
        newEndDate: newEndDate.toISOString(),
        nextBilling: subscription.nextBillingDate.toISOString()
      });

    } else {
      // Failed renewal
      console.log('Recurring payment failed');

      subscription.renewalAttempts += 1;
      subscription.status = subscription.renewalAttempts >= subscription.maxRenewalAttempts ?
        'cancelled' : 'pending_renewal';

      subscription.renewalHistory.push({
        renewalDate: new Date(),
        amount: parseFloat(payhere_amount),
        status: 'failed',
        failureReason: `Payment failed with status code: ${status_code}`,
        attempt: subscription.renewalAttempts
      });

      if (subscription.renewalAttempts >= subscription.maxRenewalAttempts) {
        subscription.autoRenew = false;
        // Don't change end date - let it expire naturally
      }

      await subscription.save();
    }

  } catch (error) {
    console.error('Failed to handle recurring payment:', error);
  }
}

export async function fixSubscriptionEndDates() {
  try {
    console.log('Fixing subscriptions without proper end dates...');

    const subscriptionsWithoutEndDate = await Subscription.find({
      $or: [
        { endDate: null },
        { endDate: { $exists: false } }
      ],
      status: 'active'
    });

    console.log(`Found ${subscriptionsWithoutEndDate.length} subscriptions to fix`);

    for (const subscription of subscriptionsWithoutEndDate) {
      const startDate = new Date(subscription.startDate);
      const endDate = new Date(startDate);

      // Calculate end date based on plan and billing cycle
      if (subscription.planId === '2') { // Premium
        if (subscription.billingCycle === 'yearly') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }
      } else { // Free plan
        endDate.setFullYear(endDate.getFullYear() + 10); // Long validity
      }

      await Subscription.updateOne(
        { _id: subscription._id },
        {
          $set: {
            endDate: endDate,
            updatedAt: new Date()
          }
        }
      );

      console.log(`Fixed subscription ${subscription._id}: endDate set to ${endDate.toISOString()}`);
    }

    console.log('Subscription end date fix completed');

  } catch (error) {
    console.error('Error fixing subscription end dates:', error);
  }
}