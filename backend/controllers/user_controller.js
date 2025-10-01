import User from '../models/user.js';
import Subscription from '../models/subscription.js';
import Business from '../models/business.js';
import Offer from '../models/offer.js';
import mongoose from 'mongoose';


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
