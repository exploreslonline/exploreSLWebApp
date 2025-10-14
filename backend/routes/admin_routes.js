import express from 'express';
import mongoose from 'mongoose';
import Admin from '../models/admin.js';
import bcrypt from 'bcryptjs';
import Offer from '../models/offer.js';
import User from '../models/user.js';
import Subscription from '../models/subscription.js';
import Business from '../models/business.js';
import SubscriptionHistory from '../models/subscription_history.js';
import SubscriptionLog from '../models/subscription_log.js';
import { sendOfferApprovalNotification,getUserName } from '../controllers/user_controller.js';
import { uploadConfig, processOfferImage } from '../Utills/imageUtils.js';

const router = express.Router();


function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const weeks = Math.floor(diffInSeconds / 604800);
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  } else {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: new Date(date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  }
}

function isRecent(date, hoursThreshold = 24) {
  const now = new Date();
  const diffInHours = (now - new Date(date)) / (1000 * 60 * 60);
  return diffInHours <= hoursThreshold;
}

function bufferToDataURL(buffer, contentType) {
  if (!buffer || !contentType) return null;
  const base64 = buffer.toString('base64');
  return `data:${contentType};base64,${base64}`;
}
router.get('/free-subscription-users', async (req, res) => {
  try {
    console.log('📋 Fetching free subscription users...');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const freeSubscriptionsQuery = {
      planId: '1',
      status: { $in: ['active', 'inactive'] }
    };

    const freeSubscriptions = await Subscription.find(freeSubscriptionsQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalFreeSubscriptions = await Subscription.countDocuments(freeSubscriptionsQuery);

    const enrichedSubscriptions = await Promise.all(
      freeSubscriptions.map(async (subscription) => {
        let userDetails = null;
        let businessCount = 0;
        let offerCount = 0;
        let businessesData = [];
        let offersData = [];

        if (subscription.userId) {
          userDetails = await User.findOne({
            userId: parseInt(subscription.userId)
          }, {
            firstName: 1,
            lastName: 1,
            email: 1,
            businessName: 1,
            userType: 1,
            createdAt: 1,
            lastLoginDate: 1
          }).lean();

          businessCount = await Business.countDocuments({
            userId: parseInt(subscription.userId),
            status: { $ne: 'deleted' }
          });

          offerCount = await Offer.countDocuments({
            userId: parseInt(subscription.userId),
            status: { $ne: 'deleted' }
          });

          businessesData = await Business.find({
            userId: parseInt(subscription.userId),
            status: { $ne: 'deleted' }
          }, {
            name: 1,
            status: 1,
            createdAt: 1,
            category: 1
          }).sort({ createdAt: -1 }).lean();

          offersData = await Offer.find({
            userId: parseInt(subscription.userId),
            status: { $ne: 'deleted' }
          }, {
            title: 1,
            status: 1,
            createdAt: 1,
            businessId: 1,
            discountPercentage: 1
          }).sort({ createdAt: -1 }).lean();
        }

        return {
          ...subscription,
          userDetails,
          businessCount,
          offerCount,
          businessesData,
          offersData,
          exceedsLimits: businessCount > 1 || offerCount > 3,
          exceedsBusinessLimit: businessCount > 1,
          exceedsOfferLimit: offerCount > 3,
          freeLimits: {
            maxBusinesses: 1,
            maxOffers: 3
          },
          usagePercentage: {
            businesses: Math.min((businessCount / 1) * 100, 100),
            offers: Math.min((offerCount / 3) * 100, 100)
          }
        };
      })
    );

    const stats = {
      totalFreeUsers: totalFreeSubscriptions,
      activeFreeUsers: enrichedSubscriptions.filter(sub => sub.status === 'active').length,
      inactiveFreeUsers: enrichedSubscriptions.filter(sub => sub.status === 'inactive').length,
      usersExceedingLimits: enrichedSubscriptions.filter(sub => sub.exceedsLimits).length,
      usersWithBusinesses: enrichedSubscriptions.filter(sub => sub.businessCount > 0).length,
      usersWithOffers: enrichedSubscriptions.filter(sub => sub.offerCount > 0).length,
      averageBusinessesPerUser: enrichedSubscriptions.length > 0
        ? (enrichedSubscriptions.reduce((sum, sub) => sum + sub.businessCount, 0) / enrichedSubscriptions.length).toFixed(1)
        : 0,
      averageOffersPerUser: enrichedSubscriptions.length > 0
        ? (enrichedSubscriptions.reduce((sum, sub) => sum + sub.offerCount, 0) / enrichedSubscriptions.length).toFixed(1)
        : 0
    };

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(totalFreeSubscriptions / limit),
      totalItems: totalFreeSubscriptions,
      limit: limit,
      hasNextPage: page < Math.ceil(totalFreeSubscriptions / limit),
      hasPrevPage: page > 1
    };

    console.log(`✅ Retrieved ${enrichedSubscriptions.length} free subscription users`);

    res.json({
      success: true,
      freeUsers: enrichedSubscriptions,
      stats,
      pagination
    });

  } catch (error) {
    console.error('❌ Error fetching free subscription users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch free subscription users',
      error: error.message
    });
  }
});


// Additional endpoint for user activity summary
router.get('/free-users-summary', async (req, res) => {
  try {
    console.log('📊 Fetching free users summary...');

    const totalFreeUsers = await Subscription.countDocuments({ planId: '1' });
    const activeFreeUsers = await Subscription.countDocuments({
      planId: '1',
      status: 'active'
    });

    const freeSubscriptions = await Subscription.find({ planId: '1' }).lean();

    let usersExceedingLimits = 0;
    let totalBusinesses = 0;
    let totalOffers = 0;

    for (const subscription of freeSubscriptions) {
      if (subscription.userId) {
        const businessCount = await Business.countDocuments({
          userId: parseInt(subscription.userId),
          status: { $ne: 'deleted' }
        });

        const offerCount = await Offer.countDocuments({
          userId: parseInt(subscription.userId),
          status: { $ne: 'deleted' }
        });

        totalBusinesses += businessCount;
        totalOffers += offerCount;

        if (businessCount > 1 || offerCount > 3) {
          usersExceedingLimits++;
        }
      }
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentSignups = await Subscription.countDocuments({
      planId: '1',
      createdAt: { $gte: sevenDaysAgo }
    });

    const activeUsers = await Subscription.countDocuments({
      planId: '1',
      userId: { $exists: true, $ne: null }
    });

    const summary = {
      totalFreeUsers,
      activeFreeUsers,
      inactiveFreeUsers: totalFreeUsers - activeFreeUsers,
      usersExceedingLimits,
      recentSignups,
      activeUsers,
      totalBusinessesCreated: totalBusinesses,
      totalOffersCreated: totalOffers,
      averageBusinessesPerUser: activeUsers > 0 ? (totalBusinesses / activeUsers).toFixed(1) : 0,
      averageOffersPerUser: activeUsers > 0 ? (totalOffers / activeUsers).toFixed(1) : 0,
      conversionOpportunity: usersExceedingLimits
    };

    res.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('❌ Error fetching free users summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch free users summary',
      error: error.message
    });
  }
});

router.use('offers', (req, res, next) => {
  // Log when admin accesses offers endpoint
  console.log(`📋 Admin accessing offers endpoint: ${req.method} ${req.originalUrl}`);
  next();
});



router.get('/offers', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    let filter = {};
    if (status && ['pending', 'approved', 'declined'].includes(status)) {
      filter.adminStatus = status;
    }

    console.log(`📋 Fetching admin offers with filter:`, filter);

    const offers = await Offer.find(filter)
      .populate('businessId', 'name category address phone email website')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalOffers = await Offer.countDocuments(filter);

    const offersWithUserDetails = await Promise.all(offers.map(async (offer) => {
      try {
        const user = await User.findOne({ userId: offer.userId }).select('firstName lastName email businessName userType');

        const now = new Date();
        const startDate = offer.startDate ? new Date(offer.startDate) : null;
        const endDate = offer.endDate ? new Date(offer.endDate) : null;

        let computedStatus = offer.adminStatus;

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

        // CRITICAL: Convert image buffer to base64 for frontend display
        let imageUrl = null;
        if (offer.image && offer.image.data) {
          try {
            imageUrl = bufferToDataURL(offer.image.data, offer.image.contentType);
            console.log(`✅ Image converted for offer ${offer._id}: ${(offer.image.size / 1024).toFixed(2)} KB`);
          } catch (imageError) {
            console.error(`❌ Failed to convert image for offer ${offer._id}:`, imageError);
          }
        }

        return {
          ...offer.toObject(),
          userDetails: user ? {
            userId: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            businessName: user.businessName,
            userType: user.userType
          } : {
            userId: offer.userId,
            firstName: 'Unknown',
            lastName: 'User',
            email: 'N/A',
            businessName: 'N/A',
            userType: 'N/A'
          },
          computedStatus,
          imageUrl, // IMPORTANT: Include the base64 image URL
          // Remove raw buffer from response to reduce payload size
          image: offer.image ? {
            contentType: offer.image.contentType,
            size: offer.image.size,
            originalName: offer.image.originalName,
            uploadedAt: offer.image.uploadedAt
          } : null
        };
      } catch (error) {
        console.error(`Error fetching user details for userId ${offer.userId}:`, error);
        return {
          ...offer.toObject(),
          userDetails: {
            userId: offer.userId,
            firstName: 'Error',
            lastName: 'Loading',
            email: 'N/A',
            businessName: 'N/A',
            userType: 'N/A'
          },
          computedStatus: offer.adminStatus,
          imageUrl: null
        };
      }
    }));

    console.log(`✅ Fetched ${offersWithUserDetails.length} offers for admin`);

    res.json({
      success: true,
      offers: offersWithUserDetails,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOffers / limit),
        totalOffers,
        limit: parseInt(limit)
      },
      counts: {
        pending: await Offer.countDocuments({ adminStatus: 'pending' }),
        approved: await Offer.countDocuments({ adminStatus: 'approved' }),
        declined: await Offer.countDocuments({ adminStatus: 'declined' })
      }
    });
  } catch (error) {
    console.error('❌ Error fetching admin offers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch offers for admin review',
      error: error.message
    });
  }
});





// NEW: Admin approve offer
router.patch('/offers/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminComments, reviewedBy } = req.body;

    console.log(`🔄 Approving offer ${id} by ${reviewedBy || 'Admin'}`);

    const offer = await Offer.findByIdAndUpdate(
      id,
      {
        adminStatus: 'approved',
        adminComments: adminComments || '',
        reviewedBy: reviewedBy || 'Admin',
        reviewedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    ).populate('businessId', 'name');

    if (!offer) {
      console.log(`❌ Offer not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    console.log(`✅ Offer approved: ${offer.title} by ${reviewedBy || 'Admin'}`);

    const user = await User.findOne({ userId: offer.userId });

    if (user && user.email) {
      try {
        await sendOfferApprovalNotification({
          ...offer.toObject(),
          userId: user,
          businessId: offer.businessId
        }, 'approved');
        console.log(`📧 Approval notification sent to ${user.email}`);
      } catch (emailError) {
        console.error('Failed to send approval notification:', emailError);
      }
    } else {
      console.log(`⚠️ User not found for userId: ${offer.userId}`);
    }

    res.json({
      success: true,
      message: 'Offer approved successfully',
      offer: offer
    });
  } catch (error) {
    console.error('❌ Error approving offer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve offer',
      error: error.message
    });
  }
});

// NEW: Admin decline offer
router.patch('/offers/:id/decline', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminComments, reviewedBy } = req.body;

    if (!adminComments || adminComments.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Admin comments are required when declining an offer'
      });
    }

    console.log(`🔄 Declining offer ${id} by ${reviewedBy || 'Admin'}`);

    const offer = await Offer.findByIdAndUpdate(
      id,
      {
        adminStatus: 'declined',
        adminComments: adminComments,
        reviewedBy: reviewedBy || 'Admin',
        reviewedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    ).populate('businessId', 'name');

    if (!offer) {
      console.log(`❌ Offer not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    console.log(`❌ Offer declined: ${offer.title} by ${reviewedBy || 'Admin'}`);

    const user = await User.findOne({ userId: offer.userId });

    if (user && user.email) {
      try {
        await sendOfferApprovalNotification({
          ...offer.toObject(),
          userId: user,
          businessId: offer.businessId
        }, 'declined');
        console.log(`📧 Decline notification sent to ${user.email}`);
      } catch (emailError) {
        console.error('Failed to send decline notification:', emailError);
      }
    } else {
      console.log(`⚠️ User not found for userId: ${offer.userId}`);
    }

    res.json({
      success: true,
      message: 'Offer declined successfully',
      offer: offer
    });
  } catch (error) {
    console.error('❌ Error declining offer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decline offer',
      error: error.message
    });
  }
});
router.delete('/offers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Deleting offer ${id}`);

    const offer = await Offer.findById(id).populate('businessId', 'name');

    if (!offer) {
      console.log(`❌ Offer not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    await Offer.findByIdAndDelete(id);

    console.log(`✅ Offer deleted: ${offer.title} (ID: ${offer.offerId})`);

    res.json({
      success: true,
      message: 'Offer deleted successfully',
      deletedOffer: {
        id: offer._id,
        title: offer.title,
        businessName: offer.businessId?.name || 'Unknown'
      }
    });
  } catch (error) {
    console.error('❌ Error deleting offer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete offer',
      error: error.message
    });
  }
});

router.put('/offers/:id', uploadConfig.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, discount, category, startDate, endDate, isActive } = req.body;

    if (!title || !discount) {
      return res.status(400).json({
        success: false,
        message: 'Title and discount are required'
      });
    }

    console.log(`✏️ Admin editing offer ${id}`);

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

    const updateData = {
      title,
      discount,
      category,
      isActive: isActive !== undefined ? isActive : true,
      updatedAt: new Date()
    };

    if (startDate !== undefined) {
      updateData.startDate = startDate ? new Date(startDate) : null;
    }

    if (endDate !== undefined) {
      updateData.endDate = endDate ? new Date(endDate) : null;
    }

    // Process new image if uploaded
    if (req.file) {
      try {
        console.log('🖼️ Processing new image for admin edit...');
        const processedImage = await processOfferImage(req.file);
        updateData.image = processedImage;
        console.log('✅ New image processed successfully');
      } catch (imageError) {
        console.error('❌ Image processing error:', imageError);
        return res.status(400).json({
          success: false,
          message: 'Image processing failed: ' + (imageError.message || imageError)
        });
      }
    }

    const updatedOffer = await Offer.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('businessId', 'name');

    if (!updatedOffer) {
      return res.status(404).json({
        success: false,
        message: 'Failed to update offer'
      });
    }

    console.log(`✅ Offer updated by admin: ${updatedOffer.title}`);

    // Convert image to base64 for response
    let imageUrl = null;
    if (updatedOffer.image && updatedOffer.image.data) {
      imageUrl = bufferToDataURL(updatedOffer.image.data, updatedOffer.image.contentType);
    }

    const responseOffer = {
      ...updatedOffer.toObject(),
      imageUrl,
      image: updatedOffer.image ? {
        contentType: updatedOffer.image.contentType,
        size: updatedOffer.image.size,
        originalName: updatedOffer.image.originalName,
        uploadedAt: updatedOffer.image.uploadedAt
      } : null
    };

    res.json({
      success: true,
      message: 'Offer updated successfully by admin',
      offer: responseOffer
    });

  } catch (error) {
    console.error('❌ Error updating offer (admin):', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update offer',
      error: error.message
    });
  }
});


router.get('/subscription-analytics', async (req, res) => {
  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const analytics = {
      totalSubscriptions: await Subscription.countDocuments({ status: 'active' }),
      premiumUsers: await Subscription.countDocuments({ planId: '2', status: 'active' }),
      freeUsers: await Subscription.countDocuments({ planId: '1', status: 'active' }),
      scheduledDowngrades: await Subscription.countDocuments({
        downgradeScheduled: true,
        status: 'active'
      }),
      usersInGracePeriod: await Subscription.countDocuments({
        isInGracePeriod: true,
        status: 'active'
      }),
      recentDowngrades: await SubscriptionHistory.countDocuments({
        action: 'downgrade_processed',
        effectiveDate: { $gte: lastMonth }
      }),
      suspendedBusinesses: await Business.countDocuments({
        status: 'suspended',
        suspensionReason: { $regex: /free plan limit|downgrade/i }
      }),
      suspendedOffers: await Offer.countDocuments({
        status: 'suspended',
        suspensionReason: { $regex: /free plan limit|downgrade/i }
      }),
      upcomingDowngrades: await Subscription.countDocuments({
        downgradeScheduled: true,
        downgradeEffectiveDate: {
          $gte: now,
          $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        }
      })
    };

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('❌ Error fetching subscription analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
});

// Get users with scheduled downgrades
router.get('/scheduled-downgrades', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const scheduledDowngrades = await Subscription.find({
      downgradeScheduled: true,
      status: 'active'
    })
      .sort({ downgradeEffectiveDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Enhance with user details and impact analysis
    const enhancedDowngrades = await Promise.all(scheduledDowngrades.map(async (subscription) => {
      const user = await User.findOne({ userId: subscription.userId });
      const impactAnalysis = await getDowngradeImpactAnalysis(subscription.userId);
      const daysRemaining = Math.ceil((new Date(subscription.downgradeEffectiveDate) - new Date()) / (1000 * 60 * 60 * 24));

      return {
        subscriptionId: subscription._id,
        userId: subscription.userId,
        userEmail: subscription.userEmail,
        userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        scheduledDate: subscription.downgradeScheduledDate,
        effectiveDate: subscription.downgradeEffectiveDate,
        reason: subscription.downgradeReason,
        daysRemaining: Math.max(0, daysRemaining),
        impactAnalysis
      };
    }));

    const totalCount = await Subscription.countDocuments({
      downgradeScheduled: true,
      status: 'active'
    });

    res.json({
      success: true,
      downgrades: enhancedDowngrades,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching scheduled downgrades:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduled downgrades',
      error: error.message
    });
  }
});

// Manual admin downgrade processing
router.post('/process-user-downgrade', async (req, res) => {
  try {
    const { userId, reason = 'Manual admin downgrade' } = req.body;

    console.log('👨‍💼 Processing manual admin downgrade for user:', userId);

    const subscription = await Subscription.findOne({
      userId: parseInt(userId),
      status: 'active',
      planId: '2'
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active premium subscription found'
      });
    }

    // Process downgrade immediately (similar to cron job logic)
    await Subscription.findByIdAndUpdate(subscription._id, {
      planId: '1',
      planName: 'Free Plan',
      downgradeScheduled: false,
      downgradeProcessedDate: new Date(),
      autoRenew: false,
      endDate: null,
      nextBillingDate: null,
      isInGracePeriod: false,
      updatedAt: new Date()
    });

    // Enforce limits and count affected content
    const businesses = await Business.find({ userId: parseInt(userId), status: 'active' })
      .sort({ displayOrder: 1, createdAt: 1 });

    const offers = await Offer.find({
      userId: parseInt(userId),
      status: 'active',
      adminStatus: 'approved'
    }).sort({ displayOrder: 1, createdAt: 1 });

    let businessesSuspended = 0;
    let offersSuspended = 0;

    // Suspend excess businesses (keep only 1)
    if (businesses.length > 1) {
      const businessesToSuspend = businesses.slice(1);
      for (const business of businessesToSuspend) {
        await Business.findByIdAndUpdate(business._id, {
          status: 'suspended',
          suspendedDate: new Date(),
          suspensionReason: 'Manual admin downgrade to free plan'
        });
        businessesSuspended++;
      }
    }

    // Suspend excess offers (keep only 1)
    if (offers.length > 1) {
      const offersToSuspend = offers.slice(1);
      for (const offer of offersToSuspend) {
        await Offer.findByIdAndUpdate(offer._id, {
          status: 'suspended',
          suspendedDate: new Date(),
          suspensionReason: 'Manual admin downgrade to free plan'
        });
        offersSuspended++;
      }
    }

    // Record in history
    await new SubscriptionHistory({
      userId: parseInt(userId),
      userEmail: subscription.userEmail,
      action: 'downgrade_processed',
      fromPlan: 'Premium Plan',
      toPlan: 'Free Plan',
      reason: reason,
      effectiveDate: new Date(),
      notes: `Manual admin downgrade - suspended ${businessesSuspended} businesses and ${offersSuspended} offers`
    }).save();

    res.json({
      success: true,
      message: 'User successfully downgraded to free plan',
      businessesSuspended,
      offersSuspended
    });

  } catch (error) {
    console.error('❌ Error processing manual downgrade:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process manual downgrade',
      error: error.message
    });
  }
});

router.get('/notifications/recent', async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    console.log(`📱 Fetching recent ${limit} pending offers for notifications`);

    // Get recent pending offers with business and user details
    const recentOffers = await Offer.find({ adminStatus: 'pending' })
      .populate('businessId', 'name category')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('title discount createdAt userId businessId');

    // Fetch user details for each offer
    const offersWithUserDetails = await Promise.all(recentOffers.map(async (offer) => {
      try {
        const user = await User.findOne({ userId: offer.userId }).select('firstName lastName businessName');
        return {
          _id: offer._id,
          title: offer.title,
          discount: offer.discount,
          createdAt: offer.createdAt,
          businessName: offer.businessId?.name || user?.businessName || 'Unknown Business',
          category: offer.businessId?.category || 'Uncategorized',
          userFullName: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
          timeAgo: getTimeAgo(offer.createdAt),
          isNew: isRecent(offer.createdAt, 24) // Mark as new if within 24 hours
        };
      } catch (error) {
        console.error(`Error fetching user details for offer ${offer._id}:`, error);
        return {
          _id: offer._id,
          title: offer.title,
          discount: offer.discount,
          createdAt: offer.createdAt,
          businessName: offer.businessId?.name || 'Unknown Business',
          category: offer.businessId?.category || 'Uncategorized',
          userFullName: 'Unknown User',
          timeAgo: getTimeAgo(offer.createdAt),
          isNew: isRecent(offer.createdAt, 24)
        };
      }
    }));

    console.log(`✅ Retrieved ${offersWithUserDetails.length} recent offers for notifications`);

    res.json({
      success: true,
      recentOffers: offersWithUserDetails,
      count: offersWithUserDetails.length,
      timestamp: new Date().toISOString(),
      hasNewOffers: offersWithUserDetails.some(offer => offer.isNew)
    });

  } catch (error) {
    console.error('❌ Error fetching recent offers for notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent offers',
      error: error.message,
      recentOffers: []
    });
  }
});

// NEW: Mark notifications as seen/read
router.post('/notifications/mark-seen', async (req, res) => {
  try {
    const { offerIds, adminId, timestamp } = req.body;

    console.log(`👁️ Marking notifications as seen by admin ${adminId} at ${timestamp}`);
    console.log(`Offer IDs provided: ${offerIds?.length || 0}`);

    // Option 1: Create a separate NotificationView collection to track what admin has seen
    // For now, we'll implement a simpler approach using a temporary tracking mechanism

    // You could create a NotificationView model like this:
    /*
    const NotificationView = mongoose.model('NotificationView', {
      adminId: String,
      offerId: mongoose.Schema.Types.ObjectId,
      viewedAt: { type: Date, default: Date.now },
      adminUsername: String
    });
    */

    // For immediate implementation, we'll just log and return success
    // This allows the frontend to immediately reset the count for better UX

    const response = {
      success: true,
      message: `Marked ${offerIds?.length || 0} notifications as seen`,
      timestamp: new Date().toISOString(),
      adminId: adminId,
      processed: true
    };

    console.log('✅ Notifications marked as seen:', response);

    res.json(response);

  } catch (error) {
    console.error('❌ Error marking notifications as seen:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as seen',
      error: error.message
    });
  }
});


router.get('/notifications/counts', async (req, res) => {
  try {
    console.log('📱 Fetching notification counts for admin navbar');

    // Get counts of offers by status
    const [pendingCount, approvedCount, declinedCount, totalCount] = await Promise.all([
      Offer.countDocuments({ adminStatus: 'pending' }),
      Offer.countDocuments({ adminStatus: 'approved' }),
      Offer.countDocuments({ adminStatus: 'declined' }),
      Offer.countDocuments({})
    ]);

    // Calculate additional useful counts
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const [newToday, urgentCount, activeOffersCount] = await Promise.all([
      Offer.countDocuments({
        adminStatus: 'pending',
        createdAt: { $gte: startOfDay, $lt: endOfDay }
      }),
      Offer.countDocuments({
        adminStatus: 'pending',
        createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Older than 7 days
      }),
      Offer.countDocuments({
        adminStatus: 'approved',
        isActive: true,
        $or: [
          { endDate: null }, // No end date
          { endDate: { $gt: new Date() } } // End date in future
        ]
      })
    ]);

    const counts = {
      pending: pendingCount,
      approved: approvedCount,
      declined: declinedCount,
      total: totalCount,
      newToday: newToday,
      urgent: urgentCount,
      activeOffers: activeOffersCount
    };

    console.log('📊 Notification counts calculated:', counts);

    // Add cache headers to prevent excessive requests
    res.set({
      'Cache-Control': 'public, max-age=30', // Cache for 30 seconds
      'ETag': `"counts-${Date.now()}"`,
      'Last-Modified': new Date().toUTCString()
    });

    res.json({
      success: true,
      counts,
      timestamp: new Date().toISOString(),
      message: 'Notification counts retrieved successfully',
      cacheInfo: {
        cached: false,
        expiresIn: 30
      }
    });

  } catch (error) {
    console.error('❌ Error fetching notification counts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification counts',
      error: error.message,
      counts: {
        pending: 0,
        approved: 0,
        declined: 0,
        total: 0,
        newToday: 0,
        urgent: 0,
        activeOffers: 0
      }
    });
  }
});

router.get('/notifications/summary', async (req, res) => {
  try {
    console.log('📊 Fetching notification summary for admin dashboard');

    const now = new Date();

    // Calculate time periods
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get comprehensive statistics
    const [
      totalPending,
      pendingToday,
      pendingYesterday,
      pendingThisWeek,
      pendingThisMonth,
      oldestPending,
      recentApprovals,
      recentDeclines
    ] = await Promise.all([
      Offer.countDocuments({ adminStatus: 'pending' }),
      Offer.countDocuments({
        adminStatus: 'pending',
        createdAt: { $gte: today }
      }),
      Offer.countDocuments({
        adminStatus: 'pending',
        createdAt: { $gte: yesterday, $lt: today }
      }),
      Offer.countDocuments({
        adminStatus: 'pending',
        createdAt: { $gte: weekAgo }
      }),
      Offer.countDocuments({
        adminStatus: 'pending',
        createdAt: { $gte: monthAgo }
      }),
      Offer.findOne({ adminStatus: 'pending' })
        .sort({ createdAt: 1 })
        .select('createdAt title'),
      Offer.countDocuments({
        adminStatus: 'approved',
        reviewedAt: { $gte: today }
      }),
      Offer.countDocuments({
        adminStatus: 'declined',
        reviewedAt: { $gte: today }
      })
    ]);

    const summary = {
      pending: {
        total: totalPending,
        today: pendingToday,
        yesterday: pendingYesterday,
        thisWeek: pendingThisWeek,
        thisMonth: pendingThisMonth,
        oldest: oldestPending ? {
          title: oldestPending.title,
          daysOld: Math.floor((now - oldestPending.createdAt) / (1000 * 60 * 60 * 24)),
          createdAt: oldestPending.createdAt
        } : null
      },
      activity: {
        approvalsToday: recentApprovals,
        declinesToday: recentDeclines,
        totalProcessedToday: recentApprovals + recentDeclines
      },
      trends: {
        dailyChange: pendingToday - pendingYesterday,
        weeklyAverage: Math.round(pendingThisWeek / 7),
        monthlyAverage: Math.round(pendingThisMonth / 30)
      }
    };

    console.log('📈 Notification summary:', summary);

    res.json({
      success: true,
      summary,
      timestamp: new Date().toISOString(),
      message: 'Notification summary retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error fetching notification summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification summary',
      error: error.message,
      summary: null
    });
  }
});


router.get('/auto-renewal-subscriptions', async (req, res) => {
  try {
    console.log('📊 Starting admin subscriptions fetch...');

    // Test database connection first
    if (mongoose.connection.readyState !== 1) {
      console.error('❌ Database not connected');
      return res.status(500).json({
        success: false,
        message: 'Database connection error'
      });
    }

    const { status, page = 1, limit = 500 } = req.query;

    console.log('Query parameters:', { status, page, limit });

    // Build filter
    let filter = { planId: '2' }; // Only Premium subscriptions
    if (status && status !== 'all') {
      filter.status = status;
    }

    console.log('🔍 Using filter:', filter);

    // Test collection access
    const totalCount = await Subscription.countDocuments(filter);
    console.log(`📊 Total matching subscriptions: ${totalCount}`);

    if (totalCount === 0) {
      return res.json({
        success: true,
        subscriptions: [],
        pagination: {
          currentPage: parseInt(page),
          totalPages: 0,
          totalItems: 0,
          limit: parseInt(limit)
        },
        stats: {
          totalSubscriptions: 0,
          totalAutoRenewal: 0,
          activeAutoRenewal: 0,
          pendingRenewal: 0,
          failedRenewal: 0
        },
        message: 'No premium subscriptions found in database'
      });
    }

    // Get subscriptions with pagination
    const subscriptions = await Subscription.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    console.log(`📋 Raw subscriptions found: ${subscriptions.length}`);

    // Enrich with user details
    const subscriptionsWithDetails = [];

    for (const subscription of subscriptions) {
      try {
        // Find user details
        const user = await User.findOne({
          $or: [
            { userId: subscription.userId },
            { email: subscription.userEmail }
          ]
        }).select('firstName lastName email businessName userType').lean();

        console.log(`User lookup for subscription ${subscription._id}:`, user ? 'found' : 'not found');

        // Calculate days until renewal
        let daysUntilRenewal = null;
        if (subscription.nextBillingDate) {
          const today = new Date();
          const billingDate = new Date(subscription.nextBillingDate);
          daysUntilRenewal = Math.ceil((billingDate - today) / (1000 * 60 * 60 * 24));
        } else if (subscription.endDate) {
          const today = new Date();
          const endDate = new Date(subscription.endDate);
          daysUntilRenewal = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        }

        const enrichedSubscription = {
          ...subscription,
          userDetails: user ? {
            firstName: user.firstName || 'Unknown',
            lastName: user.lastName || 'User',
            email: user.email || subscription.userEmail || 'N/A',
            businessName: user.businessName || 'N/A',
            userType: user.userType || 'individual'
          } : {
            firstName: 'Unknown',
            lastName: 'User',
            email: subscription.userEmail || 'N/A',
            businessName: 'N/A',
            userType: 'unknown'
          },
          daysUntilRenewal: daysUntilRenewal,
          renewalAttempts: subscription.renewalAttempts || 0,
          maxRenewalAttempts: subscription.maxRenewalAttempts || 3,
          autoRenew: subscription.autoRenew || false,
          paymentFailure: subscription.paymentFailure || false,
          payhereRecurringToken: subscription.payhereRecurringToken || null,
          lastRenewalDate: subscription.lastRenewalDate || null,
          billingCycle: subscription.billingCycle || 'monthly'
        };

        subscriptionsWithDetails.push(enrichedSubscription);

      } catch (enrichError) {
        console.error(`Error enriching subscription ${subscription._id}:`, enrichError);

        // Add subscription with error details
        subscriptionsWithDetails.push({
          ...subscription,
          userDetails: {
            firstName: 'Error',
            lastName: 'Loading',
            email: subscription.userEmail || 'N/A',
            businessName: 'N/A',
            userType: 'error'
          },
          daysUntilRenewal: null,
          renewalAttempts: subscription.renewalAttempts || 0,
          maxRenewalAttempts: subscription.maxRenewalAttempts || 3,
          autoRenew: subscription.autoRenew || false,
          paymentFailure: subscription.paymentFailure || false
        });
      }
    }

    // Calculate statistics
    const stats = {
      totalSubscriptions: await Subscription.countDocuments({ planId: '2' }),
      totalAutoRenewal: await Subscription.countDocuments({
        planId: '2',
        autoRenew: true
      }),
      activeAutoRenewal: await Subscription.countDocuments({
        planId: '2',
        autoRenew: true,
        status: 'active'
      }),
      pendingRenewal: await Subscription.countDocuments({
        planId: '2',
        status: 'pending_renewal'
      }),
      failedRenewal: await Subscription.countDocuments({
        planId: '2',
        $or: [
          { status: 'payment_failed' },
          { renewalAttempts: { $gt: 0 } },
          { paymentFailure: true }
        ]
      })
    };

    console.log('📊 Final statistics:', stats);
    console.log(`📦 Returning ${subscriptionsWithDetails.length} subscriptions`);

    res.json({
      success: true,
      subscriptions: subscriptionsWithDetails,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        limit: parseInt(limit)
      },
      stats: stats
    });

  } catch (error) {
    console.error('❌ Error in auto-renewal subscriptions endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions: ' + error.message,
      error: error.toString()
    });
  }
});


router.get('/renewal-monitoring', async (req, res) => {
  try {
    console.log('📊 Fetching renewal monitoring data...');

    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        success: false,
        message: 'Database not connected'
      });
    }

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Use Promise.all for better performance
    const [dueTomorrow, dueThisWeek, failedRenewals, cancelledDueToFailure, totalAutoRenewalSubscriptions] = await Promise.all([
      // Count renewals due tomorrow
      Subscription.countDocuments({
        planId: '2',
        status: 'active',
        $or: [
          {
            nextBillingDate: {
              $gte: now,
              $lte: tomorrow
            }
          },
          {
            endDate: {
              $gte: now,
              $lte: tomorrow
            },
            autoRenew: true
          }
        ]
      }),

      // Count renewals due this week
      Subscription.countDocuments({
        planId: '2',
        status: 'active',
        $or: [
          {
            nextBillingDate: {
              $gte: now,
              $lte: nextWeek
            }
          },
          {
            endDate: {
              $gte: now,
              $lte: nextWeek
            },
            autoRenew: true
          }
        ]
      }),

      // Count failed renewals
      Subscription.countDocuments({
        planId: '2',
        $or: [
          { status: 'pending_renewal' },
          { status: 'payment_failed' },
          {
            status: 'active',
            renewalAttempts: { $gt: 0, $lt: 3 }
          }
        ]
      }),

      // Count cancelled due to failure
      Subscription.countDocuments({
        planId: '2',
        status: 'cancelled',
        updatedAt: { $gte: thirtyDaysAgo },
        $or: [
          { paymentFailure: true },
          { renewalAttempts: { $gte: 3 } }
        ]
      }),

      // Total auto-renewal subscriptions
      Subscription.countDocuments({
        planId: '2',
        autoRenew: true,
        status: { $in: ['active', 'pending_renewal'] }
      })
    ]);

    const monitoring = {
      dueTomorrow,
      dueThisWeek,
      failedRenewals,
      cancelledDueToFailure,
      totalAutoRenewalSubscriptions
    };

    console.log('📊 Monitoring data calculated:', monitoring);

    res.json({
      success: true,
      monitoring: monitoring
    });

  } catch (error) {
    console.error('❌ Error fetching monitoring data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monitoring data: ' + error.message
    });
  }
});


router.get('/debug-subscriptions', async (req, res) => {
  try {
    console.log('🐛 Running comprehensive debug check...');

    const debug = {
      timestamp: new Date().toISOString(),
      database: {
        connected: mongoose.connection.readyState === 1,
        name: mongoose.connection.name || 'unknown',
        host: mongoose.connection.host || 'unknown'
      },
      models: {
        Subscription: !!Subscription,
        User: !!User
      },
      collections: {}
    };

    if (debug.database.connected) {
      try {
        // Test collections
        const [totalSubs, premiumSubs, activeSubs, totalUsers] = await Promise.all([
          Subscription.countDocuments(),
          Subscription.countDocuments({ planId: '2' }),
          Subscription.countDocuments({ status: 'active' }),
          User.countDocuments()
        ]);

        debug.collections = {
          totalSubscriptions: totalSubs,
          premiumSubscriptions: premiumSubs,
          activeSubscriptions: activeSubs,
          totalUsers: totalUsers
        };

        // Get sample subscription
        const sampleSub = await Subscription.findOne({ planId: '2' }).lean();
        if (sampleSub) {
          debug.sample = {
            id: sampleSub._id,
            userId: sampleSub.userId,
            userEmail: sampleSub.userEmail,
            planId: sampleSub.planId,
            status: sampleSub.status,
            hasAutoRenew: sampleSub.autoRenew
          };

          // Test user lookup for sample
          if (sampleSub.userId) {
            const sampleUser = await User.findOne({ userId: sampleSub.userId }).lean();
            debug.userLookupTest = sampleUser ? {
              found: true,
              name: `${sampleUser.firstName} ${sampleUser.lastName}`,
              email: sampleUser.email
            } : { found: false, userId: sampleSub.userId };
          }
        } else {
          debug.sample = null;
          debug.message = 'No premium subscriptions found in database';
        }

      } catch (queryError) {
        debug.collections.error = queryError.message;
      }
    }

    res.json({
      success: debug.database.connected && debug.models.Subscription && debug.models.User,
      debug: debug
    });

  } catch (error) {
    console.error('🐛 Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      debug: {
        timestamp: new Date().toISOString(),
        fatal: true
      }
    });
  }
});


router.put('/api/admin/admins/:id', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check for duplicate username or email (excluding current admin)
    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email }],
      _id: { $ne: req.params.id }
    });

    if (existingAdmin) {
      const field = existingAdmin.username === username ? 'username' : 'email';
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    const updateData = { username, email };

    // Only hash and update password if provided
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, select: '-password' }
    );

    if (!updatedAdmin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    res.json({
      success: true,
      message: 'Admin updated successfully',
      admin: updatedAdmin
    });
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  
  try {
    
    const { username, password } = req.body;

    // Find admin by username or email
    const admin = await Admin.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Return admin details (excluding password)
    const { password: _, ...adminData } = admin.toObject();
    res.json({
      success: true,
      message: 'Admin login successful!',
      admin: adminData
    });
  } catch (error) {
    console.error('Error in admin login:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if admin already exists by username or email
    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email }]
    });

    if (existingAdmin) {
      const field = existingAdmin.username === username ? 'username' : 'email';
      return res.status(400).json({
        success: false,
        message: `Admin with this ${field} already exists`
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({
      username,
      email,
      password: hashedPassword
    });

    await newAdmin.save();
    res.json({ success: true, message: 'Admin registered successfully!' });
  } catch (error) {
    console.error('Error registering admin:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/admins', async (req, res) => {
  try {
    const admins = await Admin.find({}, '-password'); // Exclude password field
    res.json({ success: true, admins });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single admin by ID
router.put('/admins/:id', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const updateData = { username, email };

    // Only hash and update password if provided
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, select: '-password' }
    );

    if (!updatedAdmin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    res.json({
      success: true,
      message: 'Admin updated successfully',
      admin: updatedAdmin
    });
  } catch (error) {
    console.error('Error updating admin:', error);
    if (error.code === 11000) { // Duplicate key error
      const field = error.keyPattern.username ? 'username' : 'email';
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update admin
router.put('/api/admin/admins/:id', async (req, res) => {
  try {
    const { username, password } = req.body;
    const updateData = { username };

    // Only hash and update password if provided
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, select: '-password' }
    );

    if (!updatedAdmin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    res.json({ success: true, message: 'Admin updated successfully', admin: updatedAdmin });
  } catch (error) {
    console.error('Error updating admin:', error);
    if (error.code === 11000) { // Duplicate key error
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete admin
router.delete('/admins/:id', async (req, res) => {
  try {
    const deletedAdmin = await Admin.findByIdAndDelete(req.params.id);
    if (!deletedAdmin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    res.json({ success: true, message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


export default router;