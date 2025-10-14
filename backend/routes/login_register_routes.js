import express from 'express';
import User from '../models/user.js';
import bcrypt from 'bcryptjs';
import Subscription from '../models/subscription.js';
import SubscriptionHistory from '../models/subscription_history.js';
import SubscriptionLog from '../models/subscription_log.js';
import Business from '../models/business.js';
import Offer from '../models/offer.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { sendWelcomeEmail, sendStatusEmail, createTransporter, getUserName, checkUserPlanLimits } from '../controllers/user_controller.js'

export const router = express.Router();

export const resetTokens = new Map();

router.post('/register', async (req, res) => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // Create new user
    const user = new User({
      ...req.body,
      password: hashedPassword,
      status: 'approved' // Auto-approve business users
    });

    await user.save();
    console.log('✅ User registered successfully:', user.email, 'userId:', user.userId);

    // Send welcome email
    try {
      await sendWelcomeEmail(user);
    } catch (emailError) {
      console.error('❌ Welcome email failed (registration still successful):', emailError);
    }

    // ✅ CRITICAL FIX: Do NOT create any subscription during registration
    // New users should be completely non-activated until they choose a plan
    console.log('🔄 User registered with NO subscription - user is non-activated');

    res.json({
      success: true,
      message: 'Registration successful! Please sign in to choose your subscription plan.',
      userId: user.userId,
      emailSent: true,
      subscriptionCreated: false // Explicitly no subscription created
    });

  } catch (error) {
    console.error('❌ Registration error:', error);

    if (error.code === 11000) {
      const field = error.keyPattern?.email ? 'email' : 'username';
      return res.status(400).json({
        success: false,
        message: `User with this ${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
});
// REPLACE your /api/auth/login route in server.js with this:
router.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) return res.json({ success: false, message: 'Invalid credentials' });

    // ✅ Block login if not approved
    if (user.status !== 'approved') {
      return res.json({ success: false, message: 'Your account is not approved yet.' });
    }

    console.log('🔐 User logged in:', user.email, 'userId:', user.userId);

    // ✅ CRITICAL FIX: Check subscription status to determine redirect
    console.log('🔍 Checking subscription status for redirect...');

    // Find subscription for this user
    const subscription = await Subscription.findOne({
      $or: [
        { userId: user.userId },
        { userEmail: user.email.toLowerCase().trim() }
      ]
    }).sort({ createdAt: -1 }); // Get most recent if multiple exist

    let redirectTo = 'subscription'; // Default for non-activated users
    let subscriptionStatus = 'non-activated';

    if (subscription) {
      const now = new Date();

      // Check if it's an active premium subscription
      const isActivePremium = subscription.planId === '2' &&
        subscription.status === 'active' &&
        (!subscription.endDate || new Date(subscription.endDate) > now);

      // Check if it's an active free subscription
      const isActiveFree = subscription.planId === '1' &&
        subscription.status === 'active';

      if (isActivePremium) {
        redirectTo = 'business-profile';
        subscriptionStatus = 'premium';
        console.log('➡️  Premium user detected, redirecting to Business Profile');
      } else if (isActiveFree) {
        redirectTo = 'business-profile';
        subscriptionStatus = 'free';
        console.log('➡️  Free user detected, redirecting to Business Profile');
      } else {
        // Subscription exists but is expired/inactive
        redirectTo = 'subscription';
        subscriptionStatus = 'expired';
        console.log('➡️  User has expired/inactive subscription, redirecting to Subscription Page');
      }
    } else {
      // No subscription found - user is non-activated
      redirectTo = 'subscription';
      subscriptionStatus = 'non-activated';
      console.log('➡️  Non-activated user detected, redirecting to Subscription Page');
    }

    // Return user data (excluding password) along with redirect info
    const { password, ...userData } = user.toObject();

    res.json({
      success: true,
      message: 'Login successful!',
      status: user.status,
      user: userData,
      subscriptionStatus: subscriptionStatus, // NEW: Include subscription status
      redirectTo: redirectTo, // NEW: Include redirect instruction
      subscription: subscription ? { // Include subscription data if exists
        planId: subscription.planId,
        planName: subscription.planName,
        status: subscription.status,
        endDate: subscription.endDate
      } : null
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.json({ success: false, message: 'User not found' });

    const token = crypto.randomBytes(32).toString('hex');
    resetTokens.set(token, { email: req.body.email, expiry: Date.now() + 3600000 });

    const transporter = createTransporter();
    const mailOptions = {
      from: 'no-reply@srilankatours.com',
      to: req.body.email,
      subject: 'Password Reset',
      html: `<p>Click the link to reset your password: <a href="http://localhost:5173/reset-password/${token}">Reset Password</a></p>`,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Email sent' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  const stored = resetTokens.get(req.params.token);
  if (!stored || stored.expiry < Date.now()) return res.json({ success: false, message: 'Invalid or expired token' });

  const user = await User.findOne({ email: stored.email });
  if (!user) return res.json({ success: false, message: 'User not found' });

  user.password = await bcrypt.hash(req.body.password, 10);
  await user.save();

  resetTokens.delete(req.params.token);
  res.json({ success: true, message: 'Password reset successful' });
});

router.get('/users', async (req, res) => {
  try {
    // Get all users excluding password
    const users = await User.find({}, '-password').lean();

    // For each user, get their subscription information
    const usersWithSubscriptions = await Promise.all(users.map(async (user) => {
      try {
        // Find the user's most recent active subscription
        const subscription = await Subscription.findOne({
          userId: user.userId
        }).sort({ createdAt: -1 }).lean();

        // Determine subscription status
        let subscriptionInfo = {
          planName: 'No Subscription',
          status: 'inactive',
          startDate: null,
          endDate: null,
          isExpired: false,
          daysRemaining: null
        };

        if (subscription) {
          const now = new Date();
          const endDate = subscription.endDate ? new Date(subscription.endDate) : null;

          // Check if subscription is expired
          const isExpired = endDate && endDate < now;

          // Calculate days remaining for premium plans
          let daysRemaining = null;
          if (endDate && !isExpired) {
            daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
          }

          subscriptionInfo = {
            planName: subscription.planName,
            status: isExpired ? 'expired' : subscription.status,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            isExpired: isExpired,
            daysRemaining: daysRemaining,
            billingCycle: subscription.billingCycle,
            amount: subscription.amount,
            currency: subscription.currency,
            paymentMethod: subscription.paymentMethod
          };
        }

        // Return user with subscription info
        return {
          ...user,
          subscription: subscriptionInfo
        };

      } catch (subscriptionError) {
        console.error(`Error fetching subscription for user ${user.userId}:`, subscriptionError);
        // Return user with default subscription info if error occurs
        return {
          ...user,
          subscription: {
            planName: 'Error Loading',
            status: 'unknown',
            startDate: null,
            endDate: null,
            isExpired: false,
            daysRemaining: null
          }
        };
      }
    }));

    res.json({
      success: true,
      users: usersWithSubscriptions
    });

  } catch (error) {
    console.error('Error fetching users with subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});


router.delete('/users/:id', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, message: 'User deleted successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting user', error: error.message });
  }
});

router.patch('/users/:id/:action', async (req, res) => {
  try {
    const { id, action } = req.params;
    if (!['approve', 'decline'].includes(action)) return res.status(400).json({ success: false, message: 'Invalid action' });

    const status = action === 'approve' ? 'approved' : 'declined';
    const user = await User.findByIdAndUpdate(id, { status }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await sendStatusEmail(user, status);
    res.json({ success: true, message: `User ${status} and email sent`, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating status', error: error.message });
  }
});


// Add this route for editing users (add after the existing user routes)
router.put('/users/:id', async (req, res) => {
  try {
    const { firstName, lastName, address, email, phone, businessName, businessRegNo, businessAddress, userType } = req.body;

    // Check if email is being changed and if it already exists
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }
    }

    const updateData = {
      firstName,
      lastName,
      address,
      email,
      phone,
      businessName,
      businessRegNo,
      businessAddress,
      userType
    };

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/login-with-session', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    if (user.status !== 'approved') {
      return res.json({ success: false, message: 'Your account is not approved yet.' });
    }

    // Generate a simple token (in production, use JWT)
    const token = crypto.randomBytes(32).toString('hex');

    // NEW: Check plan limits when user signs in
    const planLimitCheck = await checkUserPlanLimits(user.userId);

    const { password: _, ...userData } = user.toObject();

    res.json({
      success: true,
      message: 'Login successful!',
      status: user.status,
      user: userData,
      token: token,
      expiresIn: '24h',
      planLimitWarning: planLimitCheck // NEW: Include plan limit warning
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});




export default router;