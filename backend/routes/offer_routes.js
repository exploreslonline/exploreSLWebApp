// routes/offers.js
import express from 'express';
import Offer from '../models/offer.js';
import Business from '../models/business.js';
import User from '../models/user.js';
import Subscription from '../models/subscription.js';
import SubscriptionHistory from '../models/subscription_history.js';
import SubscriptionLog from '../models/subscription_log.js';
import { sendOfferApprovalNotification, sendOfferEditNotification, getUserName } from '../controllers/user_controller.js';
import { uploadConfig, processOfferImage, bufferToDataURL } from '../Utills/imageUtils.js';

const router = express.Router();

/**
 * CREATE OFFER WITH OPTIONAL IMAGE
 * POST /
 * multipart/form-data (optional 'image' file)
 */
router.post('', uploadConfig.single('image'), async (req, res) => {
  try {
    console.log('📥 Offer creation request received');
    console.log('Body:', req.body);
    console.log('File:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');

    const { userId, businessId, title, discount, category, startDate, endDate, isActive } = req.body;

    // Basic validation
    if (!userId || !businessId || !title || !discount) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'User ID, business ID, title, and discount are required'
      });
    }

    // Verify business belongs to user
    const business = await Business.findOne({
      _id: businessId,
      userId: parseInt(userId)
    });

    if (!business) {
      console.log('❌ Business not found or doesn\'t belong to user');
      return res.status(400).json({
        success: false,
        message: 'Business not found or does not belong to this user'
      });
    }

    console.log('✅ Business found:', business.name);

    // Check subscription and limits
    const user = await User.findOne({
      $or: [
        { userId: parseInt(userId) },
        { userId: userId.toString() }
      ]
    });

    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Count existing offers (exclude 'declined')
    const existingOffersCount = await Offer.countDocuments({
      userId: parseInt(userId),
      adminStatus: { $ne: 'declined' }
    });

    console.log(`📊 Existing offers count: ${existingOffersCount}`);

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

    // Prepare offer data
    const offerData = {
      userId: parseInt(userId),
      businessId: businessId,
      title: title.trim(),
      discount: discount.trim(),
      category: category || '',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      adminStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Process image if uploaded
    if (req.file) {
      try {
        console.log('🖼️ Processing uploaded image...');
        const processedImage = await processOfferImage(req.file);
        offerData.image = processedImage;
        console.log('✅ Image processed successfully:', {
          sizeKB: (processedImage.size / 1024).toFixed(2),
          originalName: processedImage.originalName || req.file.originalname
        });
      } catch (imageError) {
        console.error('❌ Image processing error:', imageError);
        return res.status(400).json({
          success: false,
          message: 'Image processing failed: ' + (imageError.message || imageError)
        });
      }
    }

    // Create the offer
    const offer = new Offer(offerData);
    const savedOffer = await offer.save();
    console.log('✅ Offer saved to database with ID:', savedOffer._id);

    // Populate business info and prepare response
    const populatedOffer = await Offer.findById(savedOffer._1 || savedOffer._id)
      .populate('businessId', 'name');

    // Convert image to base64 for response if it exists
    let responseOffer = populatedOffer.toObject();
    if (responseOffer.image && responseOffer.image.data) {
      responseOffer.imageUrl = bufferToDataURL(
        responseOffer.image.data,
        responseOffer.image.contentType
      );
      delete responseOffer.image; // Remove buffer from response
    }

    console.log(`🎉 Offer created successfully: ${populatedOffer.title}`);

    res.json({
      success: true,
      message: 'Offer submitted successfully and is pending admin approval.',
      offer: responseOffer,
      pendingApproval: true
    });

  } catch (error) {
    console.error('❌ Error creating offer:', error);
    console.error('❌ Error stack:', error.stack);

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

/**
 * GET USER OFFERS WITH IMAGES
 * GET /user/:userId
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const offers = await Offer.find({ userId: parseInt(userId) })
      .populate('businessId', 'name')
      .sort({ createdAt: -1 });

    // Convert images to base64 for each offer and compute status
    const offersWithImages = offers.map(offer => {
      const offerObj = offer.toObject();

      if (offerObj.image && offerObj.image.data) {
        try {
          offerObj.imageUrl = bufferToDataURL(
            offerObj.image.data,
            offerObj.image.contentType
          );
        } catch (err) {
          console.warn('⚠️ Failed to convert image to base64 for offer', offerObj._id, err);
        }
        delete offerObj.image; // Remove buffer from response
      }

      // Add computed status
      const now = new Date();
      const startDate = offerObj.startDate ? new Date(offerObj.startDate) : null;
      const endDate = offerObj.endDate ? new Date(offerObj.endDate) : null;

      let computedStatus = offerObj.adminStatus;

      if (offerObj.adminStatus === 'approved') {
        if (startDate && startDate > now) {
          computedStatus = 'approved-scheduled';
        } else if (endDate && endDate < now) {
          computedStatus = 'approved-expired';
        } else if (!offerObj.isActive) {
          computedStatus = 'approved-inactive';
        } else {
          computedStatus = 'approved-active';
        }
      }

      return {
        ...offerObj,
        computedStatus,
        canEdit: offerObj.adminStatus === 'pending' || offerObj.adminStatus === 'declined'
      };
    });

    res.json({
      success: true,
      offers: offersWithImages
    });
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch offers'
    });
  }
});

/**
 * UPDATE OFFER WITH OPTIONAL IMAGE
 * PUT /:id
 * multipart/form-data (optional 'image' file)
 */
router.put('/:id', uploadConfig.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { businessId, title, discount, category, startDate, endDate, isActive } = req.body;

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
      updatedAt: new Date()
    };

    if (title !== undefined) updateData.title = title;
    if (discount !== undefined) updateData.discount = discount;
    if (category !== undefined) updateData.category = category;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (businessId) {
      updateData.businessId = businessId;
    }

    if (startDate !== undefined) {
      updateData.startDate = startDate ? new Date(startDate) : null;
    }

    if (endDate !== undefined) {
      updateData.endDate = endDate ? new Date(endDate) : null;
    }

    // Process new image if uploaded
    if (req.file) {
      try {
        console.log('🖼️ Processing new image for update...');
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

    // Check if offer content has changed
    const contentChanged = (
      (title !== undefined && existingOffer.title !== title) ||
      (discount !== undefined && existingOffer.discount !== discount) ||
      (category !== undefined && existingOffer.category !== category) ||
      (startDate !== undefined && ((existingOffer.startDate && existingOffer.startDate.toISOString().split('T')[0]) !== startDate)) ||
      (endDate !== undefined && ((existingOffer.endDate && existingOffer.endDate.toISOString().split('T')[0]) !== endDate)) ||
      (businessId && existingOffer.businessId.toString() !== businessId) ||
      !!req.file // Image changed
    );

    let statusReset = false;
    if (contentChanged && (existingOffer.adminStatus === 'approved' || existingOffer.adminStatus === 'declined')) {
      updateData.adminStatus = 'pending';
      updateData.adminComments = '';
      updateData.reviewedBy = null;
      updateData.reviewedAt = null;
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

    // Convert image buffer to base64 for response if present
    let responseOffer = updatedOffer.toObject();
    if (responseOffer.image && responseOffer.image.data) {
      try {
        responseOffer.imageUrl = bufferToDataURL(responseOffer.image.data, responseOffer.image.contentType);
      } catch (e) {
        console.warn('⚠️ Failed to convert updated offer image to base64', e);
      }
      delete responseOffer.image;
    }

    // Send notification email if status was reset to pending
    if (statusReset) {
      try {
        const user = await User.findOne({ userId: updatedOffer.userId });
        if (user) {
          await sendOfferEditNotification(user, updatedOffer, existingOffer.adminStatus);
          console.log(`📧 Edit notification sent to ${user.email}`);
        } else {
          console.log(`⚠️ User not found for userId: ${updatedOffer.userId}`);
        }
      } catch (emailError) {
        console.error('❌ Failed to send edit notification email:', emailError);
        // Do not fail the update if email fails
      }
    }

    let message = 'Offer updated successfully';
    if (statusReset) {
      message = 'Offer updated successfully and resubmitted for admin approval';
    }

    res.json({
      success: true,
      message,
      offer: responseOffer,
      statusReset,
      previousStatus: existingOffer.adminStatus,
      contentChanged
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

/**
 * DELETE OFFER
 * DELETE /:id
 */
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

/**
 * OFFER STATUS HISTORY
 * GET /:id/status-history
 */
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
        business: offer.businessId?.name || null,
        currentStatus: offer.adminStatus,
        wasResubmitted,
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

/**
 * TOGGLE OFFER STATUS (activate/deactivate)
 * PATCH /:id/toggle-status
 */
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
      offer
    });
  } catch (error) {
    console.error('Error toggling offer status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update offer status'
    });
  }
});

/**
 * STATS FOR USER
 * GET /stats/:userId
 */
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
