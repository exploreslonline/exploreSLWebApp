import express from 'express';
import Offer from '../models/offer.js';
import Business from '../models/business.js';
import {sendOfferStartNotification} from '../controllers/user_controller.js'

const router = express.Router();


router.post('/send-offer-notification', async (req, res) => {
  try {
    const { userEmail, userName, businessName, offerTitle, discount, startDate, endDate, category } = req.body;

    if (!userEmail || !userName || !businessName || !offerTitle || !discount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for notification'
      });
    }

    const offerData = {
      title: offerTitle,
      discount: discount,
      startDate: startDate,
      endDate: endDate,
      category: category
    };

    const emailSent = await sendOfferStartNotification(userEmail, userName, businessName, offerData);

    if (emailSent) {
      res.json({
        success: true,
        message: 'Offer notification sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send notification email'
      });
    }

  } catch (error) {
    console.error('Error sending offer notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending notification'
    });
  }
});

// Get all businesses for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const businesses = await Business.find({ userId: parseInt(userId) })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      businesses: businesses
    });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch businesses'
    });
  }
});


router.post('', async (req, res) => {
  try {
    const {
      userId,
      name,
      address,
      phone,
      email,
      website,
      category,
      socialMediaLinks,
      operatingHours,
      businessType,
      registrationNumber,
      taxId
    } = req.body;

    if (!userId || !name) {
      return res.status(400).json({
        success: false,
        message: 'User ID and business name are required'
      });
    }

    // Check if user exists
    const user = await User.findOne({ userId: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`🏢 Business creation attempt for userId: ${userId}, user: ${user.email}`);

    // CRITICAL FIX: Check for ANY active subscription (free or premium)
    const activeSubscription = await Subscription.findOne({
      $or: [
        { userId: userId },
        { userEmail: user.email.toLowerCase().trim() }
      ],
      status: 'active'
    }).sort({ createdAt: -1 }); // Get most recent active subscription

    console.log('🔍 Active subscription check:', activeSubscription ? {
      id: activeSubscription._id,
      planId: activeSubscription.planId,
      planName: activeSubscription.planName,
      status: activeSubscription.status,
      endDate: activeSubscription.endDate
    } : 'No active subscription found');

    // Block non-activated users from creating businesses
    if (!activeSubscription) {
      console.log('❌ User blocked - no active subscription');
      return res.status(403).json({
        success: false,
        message: 'Please activate a subscription plan (Free or Premium) to create businesses.',
        requiresSubscription: true,
        redirectTo: 'subscription'
      });
    }

    // Count existing businesses for this user
    const existingBusinessCount = await Business.countDocuments({ userId: userId });
    console.log(`📊 Existing business count: ${existingBusinessCount}`);

    // Determine if user has premium access
    const now = new Date();
    const isPremium = activeSubscription.planId === '2' &&
      activeSubscription.status === 'active' &&
      (!activeSubscription.endDate || new Date(activeSubscription.endDate) > now);

    // Set limits based on subscription type
    const maxBusinesses = isPremium ? 3 : 1; // Premium: 3, Free: 1
    const planType = isPremium ? 'Premium' : 'Free';

    console.log(`📋 Plan analysis: ${planType} plan allows ${maxBusinesses} businesses`);

    // Check if user has reached their limit
    if (existingBusinessCount >= maxBusinesses) {
      console.log(`❌ Business limit reached: ${existingBusinessCount}/${maxBusinesses}`);
      return res.status(400).json({
        success: false,
        message: `${planType} plan allows maximum ${maxBusinesses} business${maxBusinesses > 1 ? 'es' : ''}. You have ${existingBusinessCount}/${maxBusinesses} businesses.`,
        planUpgradeRequired: !isPremium,
        currentCount: existingBusinessCount,
        maxAllowed: maxBusinesses,
        planType: planType,
        subscriptionId: activeSubscription._id
      });
    }

    // All checks passed - create the business
    const business = new Business({
      userId,
      name,
      address,
      phone,
      email,
      website,
      category,
      socialMediaLinks,
      operatingHours,
      businessType,
      registrationNumber,
      taxId,
      updatedAt: new Date()
    });

    await business.save();

    console.log(`✅ Business created successfully: ${business.name} (ID: ${business.businessId})`);
    console.log(`📈 User now has ${existingBusinessCount + 1}/${maxBusinesses} businesses`);

    res.json({
      success: true,
      message: `Business created successfully! (${existingBusinessCount + 1}/${maxBusinesses} ${planType} plan businesses used)`,
      business: business,
      planInfo: {
        planType: planType,
        businessesUsed: existingBusinessCount + 1,
        maxBusinesses: maxBusinesses,
        canCreateMore: (existingBusinessCount + 1) < maxBusinesses
      }
    });

  } catch (error) {
    console.error('❌ Error creating business:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create business',
      error: error.message
    });
  }
});
// Update business
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      phone,
      email,
      website,
      category,
      socialMediaLinks,
      operatingHours,
      businessType,
      registrationNumber,
      taxId
    } = req.body;

    const business = await Business.findByIdAndUpdate(
      id,
      {
        name,
        address,
        phone,
        email,
        website,
        category,
        socialMediaLinks,
        operatingHours,
        businessType,
        registrationNumber,
        taxId,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    res.json({
      success: true,
      message: 'Business updated successfully',
      business: business
    });
  } catch (error) {
    console.error('Error updating business:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update business'
    });
  }
});

// Delete business
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First, delete all offers associated with this business
    await Offer.deleteMany({ businessId: id });

    // Then delete the business
    const business = await Business.findByIdAndDelete(id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    res.json({
      success: true,
      message: 'Business and associated offers deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting business:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete business'
    });
  }
});

router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const totalBusinesses = await Business.countDocuments({ userId: parseInt(userId) });
    const activeBusinesses = await Business.countDocuments({
      userId: parseInt(userId),
      status: 'active'
    });

    const totalOffers = await Offer.countDocuments({ userId: parseInt(userId) });
    const activeOffers = await Offer.countDocuments({
      userId: parseInt(userId),
      isActive: true
    });

    res.json({
      success: true,
      stats: {
        totalBusinesses,
        activeBusinesses,
        totalOffers,
        activeOffers
      }
    });
  } catch (error) {
    console.error('Error fetching business stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});





export default router;