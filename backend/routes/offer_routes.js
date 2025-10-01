import express from 'express';
import Offer from '../models/offer.js';
import Business from '../models/business.js';
import User from '../models/user.js';
import Subscription from '../models/subscription.js';
import SubscriptionHistory from '../models/subscription_history.js';
import SubscriptionLog from '../models/subscription_log.js';
import { sendOfferApprovalNotification, sendOfferEditNotification } from '../controllers/user_controller.js'

const router = express.Router();


router.post('', async (req, res) => {
  try {
    console.log('📥 Offer creation request received:', req.body);

    const { userId, businessId, title, discount, category, startDate, endDate, isActive } = req.body;

    // Basic validation
    if (!userId || !businessId || !title || !discount) {
      console.log('❌ Missing required fields:', { userId: !!userId, businessId: !!businessId, title: !!title, discount: !!discount });
      return res.status(400).json({
        success: false,
        message: 'User ID, business ID, title, and discount are required'
      });
    }

    console.log('🔍 Looking for business:', { businessId, userId });

    // Verify the business belongs to the user - FIXED: Convert userId to number if needed
    const business = await Business.findOne({
      _id: businessId,
      userId: parseInt(userId) // ✅ Ensure consistent data type
    });

    if (!business) {
      console.log('❌ Business not found or doesn\'t belong to user');
      return res.status(400).json({
        success: false,
        message: 'Business not found or does not belong to this user'
      });
    }

    console.log('✅ Business found:', business.name);

    // Check user's subscription status - FIXED: Better user lookup
    const user = await User.findOne({
      $or: [
        { userId: parseInt(userId) },
        { userId: userId.toString() }
      ]
    });

    if (!user) {
      console.log('❌ User not found with userId:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ User found:', user.email);

    // Check for active subscription
    const activeSubscription = await Subscription.findOne({
      $or: [
        { userId: parseInt(userId) },
        { userId: userId.toString() },
        { userEmail: user.email.toLowerCase().trim() }
      ],
      status: 'active'
    }).sort({ createdAt: -1 });

    console.log('🔍 Active subscription:', activeSubscription ? 'Found' : 'Not found');

    // For development/testing - allow offer creation without subscription
    if (!activeSubscription) {
      console.log('⚠️ No active subscription found - proceeding with Free plan limits');
      // You can uncomment this return statement if you want to enforce subscription:
      /*
      return res.status(403).json({
        success: false,
        message: 'Please activate a subscription plan to create offers.',
        requiresSubscription: true
      });
      */
    }

    // Count existing offers for this user - FIXED: More robust counting
    console.log('🔍 Counting existing offers...');
    const existingOffersCount = await Offer.countDocuments({
      userId: parseInt(userId),
      adminStatus: { $ne: 'declined' } // Count pending and approved offers
    });

    console.log(`📊 Existing offers count: ${existingOffersCount}`);

    // Determine plan limits
    const now = new Date();
    const isPremium = activeSubscription &&
      activeSubscription.planId === '2' &&
      activeSubscription.status === 'active' &&
      (!activeSubscription.endDate || new Date(activeSubscription.endDate) > now);

    const maxOffers = isPremium ? 9 : 3;
    const planType = isPremium ? 'Premium' : 'Free';

    console.log(`📋 Plan analysis: ${planType} plan allows ${maxOffers} offers`);

    // Check offer limit
    if (existingOffersCount >= maxOffers) {
      console.log(`❌ Offer limit reached: ${existingOffersCount}/${maxOffers}`);
      return res.status(400).json({
        success: false,
        message: `${planType} plan allows maximum ${maxOffers} offer${maxOffers > 1 ? 's' : ''}. You have ${existingOffersCount}/${maxOffers} offers.`,
        planUpgradeRequired: !isPremium,
        currentCount: existingOffersCount,
        maxAllowed: maxOffers,
        planType: planType
      });
    }

    // Validate dates if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }

      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }
    }

    console.log('🔧 Creating offer...');

    // Create the offer - FIXED: Ensure proper data types
    const offerData = {
      userId: parseInt(userId), // ✅ Ensure number type
      businessId: businessId,   // Keep as ObjectId
      title: title.trim(),
      discount: discount.trim(),
      category: category || '',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      adminStatus: 'pending',   // ✅ This should now work with fixed schema
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const offer = new Offer(offerData);

    // Save with better error handling
    const savedOffer = await offer.save();
    console.log('✅ Offer saved to database with ID:', savedOffer._id);

    // Populate business info
    const populatedOffer = await Offer.findById(savedOffer._id)
      .populate('businessId', 'name');

    console.log('✅ Business info populated');

    console.log(`🎉 Offer created successfully: ${populatedOffer.title}`);

    res.json({
      success: true,
      message: 'Offer submitted successfully and is pending admin approval.',
      offer: populatedOffer,
      planInfo: {
        planType: planType,
        offersUsed: existingOffersCount + 1,
        maxOffers: maxOffers
      },
      pendingApproval: true
    });

  } catch (error) {
    console.error('❌ Error creating offer:', error);
    console.error('❌ Error stack:', error.stack);

    // Check for specific MongoDB errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + validationErrors.join(', '),
        validationErrors: validationErrors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate entry detected'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create offer',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});


router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const offers = await Offer.find({ userId: parseInt(userId) })
      .populate('businessId', 'name')
      .sort({ createdAt: -1 });

    // Add computed status including admin approval status
    const offersWithStatus = offers.map(offer => {
      const now = new Date();
      const startDate = offer.startDate ? new Date(offer.startDate) : null;
      const endDate = offer.endDate ? new Date(offer.endDate) : null;

      let computedStatus = offer.adminStatus; // Start with admin status

      // Only compute time-based status if approved
      if (offer.adminStatus === 'approved') {
        if (startDate && startDate > now) {
          computedStatus = 'approved-scheduled';
        } else if (endDate && endDate < now) {
          computedStatus = 'approved-expired';
        } else if (!offer.isActive) {
          computedStatus = 'approved-inactive';
        } else {
          computedStatus = 'approved-active';
        }
      }

      return {
        ...offer.toObject(),
        computedStatus,
        canEdit: offer.adminStatus === 'pending' || offer.adminStatus === 'declined'
      };
    });

    res.json({
      success: true,
      offers: offersWithStatus
    });
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch offers'
    });
  }
});






// Update offer
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { businessId, title, discount, category, startDate, endDate, isActive, requiresReapproval } = req.body;

    // Find the existing offer first
    const existingOffer = await Offer.findById(id);
    if (!existingOffer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    // Validate dates if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }
    }

    // Prepare update data
    const updateData = {
      title,
      discount,
      category,
      isActive,
      updatedAt: new Date()
    };

    if (businessId) {
      updateData.businessId = businessId;
    }

    if (startDate !== undefined) {
      updateData.startDate = startDate ? new Date(startDate) : null;
    }

    if (endDate !== undefined) {
      updateData.endDate = endDate ? new Date(endDate) : null;
    }

    // Check if offer content has actually changed
    const contentChanged = (
      existingOffer.title !== title ||
      existingOffer.discount !== discount ||
      existingOffer.category !== category ||
      (existingOffer.startDate?.toISOString().split('T')[0] !== startDate) ||
      (existingOffer.endDate?.toISOString().split('T')[0] !== endDate) ||
      existingOffer.businessId.toString() !== businessId
    );

    console.log(`Offer ${id} edit attempt:`, {
      contentChanged,
      currentStatus: existingOffer.adminStatus,
      title: { old: existingOffer.title, new: title },
      discount: { old: existingOffer.discount, new: discount }
    });

    // If content changed and offer was previously approved/declined, reset to pending
    let statusReset = false;
    if (contentChanged && (existingOffer.adminStatus === 'approved' || existingOffer.adminStatus === 'declined')) {
      updateData.adminStatus = 'pending';
      updateData.adminComments = '';     // Clear previous admin comments
      updateData.reviewedBy = null;       // Clear previous reviewer
      updateData.reviewedAt = null;       // Clear previous review date
      statusReset = true;

      console.log(`🔄 Offer ${id} content changed - resetting status from ${existingOffer.adminStatus} to pending`);
    }

    // Update the offer
    const updatedOffer = await Offer.findByIdAndUpdate(id, updateData, { new: true })
      .populate('businessId', 'name');

    if (!updatedOffer) {
      return res.status(404).json({
        success: false,
        message: 'Failed to update offer'
      });
    }

    // Send notification email if status was reset to pending
    if (statusReset) {
      try {
        // Get user details for notification
        const user = await User.findOne({ userId: updatedOffer.userId });
        if (user) {
          await sendOfferEditNotification(user, updatedOffer, existingOffer.adminStatus);
          console.log(`📧 Edit notification sent to ${user.email}`);
        } else {
          console.log(`⚠️ User not found for userId: ${updatedOffer.userId}`);
        }
      } catch (emailError) {
        console.error('❌ Failed to send edit notification email:', emailError);
        // Don't fail the whole request if email fails
      }
    }

    // Prepare response message
    let message = 'Offer updated successfully';
    if (statusReset) {
      message = 'Offer updated successfully and resubmitted for admin approval';
    } else if (existingOffer.adminStatus === 'declined') {
      message = 'Offer updated successfully';
    }

    res.json({
      success: true,
      message: message,
      offer: updatedOffer,
      statusReset: statusReset,
      previousStatus: existingOffer.adminStatus,
      contentChanged: contentChanged
    });

  } catch (error) {
    console.error('❌ Error updating offer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update offer',
      error: error.message
    });
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offer.findByIdAndDelete(id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    res.json({
      success: true,
      message: 'Offer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting offer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete offer'
    });
  }
});

router.get('/:id/status-history', async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offer.findById(id)
      .populate('businessId', 'name')
      .select('title adminStatus reviewedBy reviewedAt updatedAt createdAt adminComments');

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    // Calculate if offer was resubmitted
    const wasResubmitted = offer.updatedAt && offer.reviewedAt &&
      new Date(offer.updatedAt) > new Date(offer.reviewedAt);

    res.json({
      success: true,
      offer: {
        id: offer._id,
        title: offer.title,
        business: offer.businessId.name,
        currentStatus: offer.adminStatus,
        wasResubmitted: wasResubmitted,
        lastUpdated: offer.updatedAt,
        lastReviewed: offer.reviewedAt,
        reviewedBy: offer.reviewedBy,
        adminComments: offer.adminComments,
        created: offer.createdAt
      }
    });

  } catch (error) {
    console.error('Error fetching offer status history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch offer status history'
    });
  }
});

// Toggle offer status (activate/deactivate)
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const offer = await Offer.findByIdAndUpdate(
      id,
      {
        isActive: isActive,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('businessId', 'name');

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    res.json({
      success: true,
      message: `Offer ${isActive ? 'activated' : 'deactivated'} successfully`,
      offer: offer
    });
  } catch (error) {
    console.error('Error toggling offer status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update offer status'
    });
  }
});

router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();

    const totalOffers = await Offer.countDocuments({ userId: parseInt(userId) });
    const activeOffers = await Offer.countDocuments({
      userId: parseInt(userId),
      isActive: true,
      $or: [
        { startDate: null },
        { startDate: { $lte: now } }
      ],
      $or: [
        { endDate: null },
        { endDate: { $gte: now } }
      ]
    });
    const scheduledOffers = await Offer.countDocuments({
      userId: parseInt(userId),
      startDate: { $gt: now },
      isActive: true
    });
    const expiredOffers = await Offer.countDocuments({
      userId: parseInt(userId),
      endDate: { $lt: now }
    });

    res.json({
      success: true,
      stats: {
        totalOffers,
        activeOffers,
        scheduledOffers,
        expiredOffers
      }
    });
  } catch (error) {
    console.error('Error fetching offer stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch offer statistics'
    });
  }
});













export default router;