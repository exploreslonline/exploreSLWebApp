import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { PORT, mongodbURL } from './config.js';
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import axios from 'axios';
import AutoIncrementFactory from 'mongoose-sequence';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import cron from 'node-cron';
import CryptoJS from 'crypto-js';





import business_routes from './routes/business_routes.js'
import admin_routes from './routes/admin_routes.js'
import subscription_routes from './routes/subscription_routes.js'
import user_routes from './routes/user_routes.js'
import login_register_routes from './routes/login_register_routes.js'
import offer_routes from './routes/offer_routes.js'



import Subscription from './models/subscription.js';
import Admin from './models/admin.js';
import Business from './models/business.js';
import Offer from './models/offer.js';
import SubscriptionHistory from './models/subscription_history.js';
import SubscriptionLog from './models/subscription_log.js';
import User from './models/user.js';







import {sendOfferStartNotification,
  getUserName,
  sendDowngradeNotificationEmail,
  getDowngradeImpactAnalysis,
  sendDowngradeReminderEmail,
  sendDowngradeCompletedEmail,
  applyFreePlanLimitations,
  attemptManualRenewal,
  handleRecurringPayment,
  handleInitialPayment,
  handleSubscriptionCancellation,
  handleInitialSubscription,
  handleRecurringPaymentNotification,
  handleSubscriptionCancellationNotification,
  handleInitialPaymentWithRecurring} from'./controllers/user_controller.js'



dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(express.json());


app.get('/', (req, res) => {
  return res.status(200).send('Welcome to MERN stack');
});

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:5555',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5555'
    ];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], // Added PATCH
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
    'Access-Control-Allow-Headers',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));






const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequence_value: { type: Number, default: 0 }
});

counterSchema.statics.getNextSequence = async function (sequenceName) {
  try {
    const result = await this.findOneAndUpdate(
      { _id: sequenceName },
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true }
    );
    return result.sequence_value;
  } catch (error) {
    console.error('Error getting next sequence:', error);
    return Date.now(); // Fallback to timestamp
  }
};

const Counter = mongoose.model('Counter', counterSchema);


app.use('/api/businesses', business_routes);
app.use('/api/admin', admin_routes);
app.use('/api/subscription', subscription_routes);
app.use('/api/user', user_routes);
app.use('/api/auth', login_register_routes);
app.use('/api/offers', offer_routes);







const payhereConfig = {
  merchantId: process.env.PAYHERE_MERCHANT_ID?.trim(),
  merchantSecret: process.env.PAYHERE_MERCHANT_SECRET?.trim(),
  appId: process.env.PAYHERE_APP_ID?.trim(), // NEW
  appSecret: process.env.PAYHERE_APP_SECRET?.trim(), // NEW
  mode: process.env.PAYHERE_MODE?.trim() || 'sandbox',
  notifyUrl: process.env.PAYHERE_NOTIFY_URL?.trim() || 'https://your-ngrok-url.ngrok.io/payhere-notify',
  returnUrl: process.env.PAYHERE_RETURN_URL?.trim() || 'http://localhost:5173/payment-success',
  cancelUrl: process.env.PAYHERE_CANCEL_URL?.trim() || 'http://localhost:5173/payment-cancel',

  apiBaseUrl: process.env.PAYHERE_MODE === 'live'
    ? 'https://www.payhere.lk/pay/api'
    : 'https://sandbox.payhere.lk/pay/api'
};
// Validate PayHere config on startup
const validatePayHereConfig = () => {
  const issues = [];

  if (!process.env.PAYHERE_MERCHANT_ID) issues.push('Missing PAYHERE_MERCHANT_ID');
  if (!process.env.PAYHERE_MERCHANT_SECRET) issues.push('Missing PAYHERE_MERCHANT_SECRET');
  if (!process.env.PAYHERE_APP_ID) issues.push('Missing PAYHERE_APP_ID');
  if (!process.env.PAYHERE_APP_SECRET) issues.push('Missing PAYHERE_APP_SECRET');

  if (issues.length > 0) {
    console.error('PayHere Configuration Issues:', issues);
    return false;
  }

  console.log('PayHere configuration validated successfully');
  return true;
};


validatePayHereConfig();


const generatePayHereHash = (merchantId, orderId, amount, currency, merchantSecret) => {
  try {
    console.log('🔐 Generating PayHere Hash...');

    // Clean inputs exactly as PayHere expects
    const cleanMerchantId = merchantId.toString().trim();
    const cleanOrderId = orderId.toString().trim();
    const cleanAmount = parseFloat(amount).toFixed(2);
    const cleanCurrency = currency.toString().toUpperCase().trim();
    const cleanSecret = merchantSecret.toString().trim();

    // PayHere hash format: merchantid + orderid + amount + currency + MD5(merchant_secret)
    const secretHash = CryptoJS.MD5(cleanSecret).toString().toUpperCase();
    const hashString = cleanMerchantId + cleanOrderId + cleanAmount + cleanCurrency + secretHash;

    console.log('Hash components:');
    console.log(`  Merchant ID: "${cleanMerchantId}"`);
    console.log(`  Order ID: "${cleanOrderId}"`);
    console.log(`  Amount: "${cleanAmount}"`);
    console.log(`  Currency: "${cleanCurrency}"`);
    console.log(`  Secret Hash: ${secretHash}`);
    console.log(`  Full Hash String: ${hashString}`);

    // Generate final MD5 hash
    const finalHash = CryptoJS.MD5(hashString).toString().toUpperCase();
    console.log(`  Generated Hash: ${finalHash}`);

    return finalHash;
  } catch (error) {
    console.error('❌ Hash generation failed:', error);
    throw error;
  }
};

function verifyPayHereHash(data, merchantSecret) {
  try {
    const {
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig
    } = data;

    const crypto = require('crypto');
    const secretHash = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const hashString = merchant_id + order_id + payhere_amount + payhere_currency + status_code + secretHash;
    const expectedHash = crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();

    console.log('Hash verification:');
    console.log('Received hash:', md5sig);
    console.log('Expected hash:', expectedHash);

    return md5sig === expectedHash;
  } catch (error) {
    console.error('Hash verification error:', error);
    return false;
  }
}



app.post('/create-payhere-payment', async (req, res) => {
  try {
    console.log('Creating PayHere payment...');

    const { amount, currency = 'LKR', planId, customerData } = req.body;

    // Enhanced validation
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount < 10) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be at least LKR 10.00'
      });
    }

    if (!customerData?.name?.trim() || !customerData?.email?.trim() || !customerData?.phoneNumber?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Customer name, email, and phone number are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerData.email.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Generate unique order ID
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    const orderId = `ORDER_${timestamp}_${randomSuffix}`;

    // Format data
    const formattedAmount = numAmount.toFixed(2);
    const formattedCurrency = currency.toUpperCase();
    const nameParts = customerData.name.trim().split(/\s+/);
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    // Clean phone number
    let cleanPhone = customerData.phoneNumber?.trim() || '0771234567';
    cleanPhone = cleanPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('94')) {
      cleanPhone = '0' + cleanPhone.substring(2);
    } else if (!cleanPhone.startsWith('0')) {
      cleanPhone = '0' + cleanPhone;
    }

    // Generate hash
    const hash = generatePayHereHash(
      payhereConfig.merchantId,
      orderId,
      formattedAmount,
      formattedCurrency,
      payhereConfig.merchantSecret
    );

    // CRITICAL FIX: For premium plans, set up recurring payment structure
    const paymentData = {
      sandbox: payhereConfig.mode === 'sandbox',
      merchant_id: payhereConfig.merchantId,
      return_url: `${payhereConfig.returnUrl}?order_id=${orderId}`,
      cancel_url: payhereConfig.cancelUrl,
      notify_url: payhereConfig.notifyUrl,
      order_id: orderId,
      items: planId === '2' ? 'Premium Plan - Monthly Subscription' : 'One-time Payment',
      currency: formattedCurrency,
      amount: formattedAmount,
      first_name: firstName,
      last_name: lastName,
      email: customerData.email.trim().toLowerCase(),
      phone: cleanPhone,
      address: customerData.address || 'Colombo',
      city: 'Colombo',
      country: 'Sri Lanka',
      hash: hash,
      custom_1: `plan_${planId}`,
      custom_2: planId === '2' ? 'premium_auto_renewal' : 'one_time' // Mark premium for auto-renewal
    };

    // Add recurring payment fields for premium plans
    if (planId === '2') {
      paymentData.recurrence = '1 Month';
      paymentData.duration = 'Forever';
      paymentData.startup_fee = '0.00';
    }

    console.log('PayHere payment data prepared:', {
      orderId,
      amount: formattedAmount,
      planId,
      isRecurring: planId === '2'
    });

    res.json({
      success: true,
      orderId: orderId,
      paymentData: paymentData,
      amount: formattedAmount,
      currency: formattedCurrency,
      autoRenewal: planId === '2' // Indicate auto-renewal status
    });

  } catch (error) {
    console.error('PayHere payment creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Payment creation failed',
      message: error.message
    });
  }
});



app.get('/debug-payhere-hash/:orderId/:amount', (req, res) => {
  try {
    const { orderId, amount } = req.params;

    const hash = generatePayHereHash(
      payhereConfig.merchantId,
      orderId,
      amount,
      'LKR',
      payhereConfig.merchantSecret
    );

    res.json({
      success: true,
      hash: hash,
      components: {
        merchantId: payhereConfig.merchantId,
        orderId: orderId,
        amount: parseFloat(amount).toFixed(2),
        currency: 'LKR'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});



app.post('/payhere-notify', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    console.log('📨 PayHere Notification Received');
    console.log('Raw data:', JSON.stringify(req.body, null, 2));

    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      status_message,
      custom_1,
      custom_2,
      email,
      recurring_token,
      subscription_id,
      event_type,
      next_occurrence_date
    } = req.body;

    // Validate required fields
    if (!merchant_id || !order_id || !payhere_amount || !payhere_currency || !status_code || !md5sig) {
      console.error('❌ Missing required notification fields');
      return res.status(400).send('Missing required fields');
    }

    // Verify merchant ID
    if (merchant_id.trim() !== payhereConfig.merchantId.trim()) {
      console.error('❌ Merchant ID mismatch');
      return res.status(400).send('Merchant ID mismatch');
    }

    // Verify hash
    const isValidHash = verifyPayHereHash(req.body, payhereConfig.merchantSecret);
    if (!isValidHash) {
      console.error('❌ Hash verification failed');
      return res.status(400).send('Invalid hash');
    }

    console.log('✅ Hash verification successful');
    console.log(`Status: ${status_code} - ${status_message}`);

    // Handle successful payments
    if (status_code === '2') {
      if (event_type === 'SUBSCRIPTION_PAYMENT' && recurring_token) {
        console.log('🔄 Processing recurring payment...');
        await handleRecurringPayment(req.body);
      } else {
        console.log('💰 Processing initial payment...');
        await handleInitialPayment(req.body);
      }
    } else {
      console.log(`❌ Payment failed or cancelled: ${status_code} - ${status_message}`);
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Error processing PayHere notification:', error);
    res.status(500).send('Server error');
  }
});




const validateEnvironment = () => {
  console.log('🔍 === PayHere Environment Validation ===\n');

  const requiredVars = {
    'EMAIL_USERNAME': process.env.EMAIL_USERNAME,
    'EMAIL_PASSWORD': process.env.EMAIL_PASSWORD,
    'PAYHERE_MERCHANT_ID': process.env.PAYHERE_MERCHANT_ID,
    'PAYHERE_MERCHANT_SECRET': process.env.PAYHERE_MERCHANT_SECRET,
    'PAYHERE_MODE': process.env.PAYHERE_MODE,
    'PAYHERE_NOTIFY_URL': process.env.PAYHERE_NOTIFY_URL,
    'PAYHERE_RETURN_URL': process.env.PAYHERE_RETURN_URL,
    'PAYHERE_CANCEL_URL': process.env.PAYHERE_CANCEL_URL
  };

  let hasErrors = false;

  Object.entries(requiredVars).forEach(([key, value]) => {
    if (!value) {
      console.log(`❌ ${key}: MISSING`);
      hasErrors = true;
    } else {
      if (key.includes('SECRET') || key.includes('PASSWORD')) {
        console.log(`✅ ${key}: ${value.substring(0, 8)}... (${value.length} chars)`);
      } else {
        console.log(`✅ ${key}: ${value}`);
      }
    }
  });

  // Specific PayHere validations
  console.log('\n🔍 PayHere Specific Validation:');

  const merchantId = process.env.PAYHERE_MERCHANT_ID;
  if (merchantId) {
    if (merchantId.length !== 7) {
      console.log(`❌ PAYHERE_MERCHANT_ID should be 7 digits, got ${merchantId.length} digits`);
      hasErrors = true;
    } else if (!/^\d+$/.test(merchantId)) {
      console.log(`❌ PAYHERE_MERCHANT_ID should contain only numbers`);
      hasErrors = true;
    } else {
      console.log(`✅ PAYHERE_MERCHANT_ID format is valid`);
    }
  }

  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
  if (merchantSecret) {
    if (merchantSecret.length < 40) {
      console.log(`⚠️  PAYHERE_MERCHANT_SECRET seems short (${merchantSecret.length} chars). Expected 40+ chars.`);
    } else {
      console.log(`✅ PAYHERE_MERCHANT_SECRET length is valid`);
    }
  }

  const mode = process.env.PAYHERE_MODE;
  if (mode && !['sandbox', 'live'].includes(mode)) {
    console.log(`❌ PAYHERE_MODE should be 'sandbox' or 'live', got '${mode}'`);
    hasErrors = true;
  } else {
    console.log(`✅ PAYHERE_MODE is valid`);
  }

  // URL validation
  const urls = ['NOTIFY_URL', 'RETURN_URL', 'CANCEL_URL'];
  urls.forEach(urlType => {
    const url = process.env[`PAYHERE_${urlType}`];
    if (url && !url.startsWith('http')) {
      console.log(`❌ PAYHERE_${urlType} should start with http:// or https://`);
      hasErrors = true;
    } else if (url) {
      console.log(`✅ PAYHERE_${urlType} format is valid`);
    }
  });

  console.log('\n' + '='.repeat(50));
  if (hasErrors) {
    console.log('❌ VALIDATION FAILED - Please fix the errors above');
    console.log('\n🔧 To fix PayHere issues:');
    console.log('1. Login to https://sandbox.payhere.lk');
    console.log('2. Go to Settings → Domains & Credentials');
    console.log('3. Copy the EXACT merchant ID (7 digits)');
    console.log('4. Copy the EXACT merchant secret (long string)');
    console.log('5. Update your .env file');
    console.log('6. Restart your server');
    return false;
  } else {
    console.log('✅ ALL VALIDATIONS PASSED');
    console.log('🚀 PayHere should work correctly now!');
    return true;
  }
};



const testHashGeneration = () => {
  console.log('\n🧪 === Testing Hash Generation with CryptoJS ===');

  try {
    const testData = {
      merchantId: process.env.PAYHERE_MERCHANT_ID || '1231556',
      orderId: 'TEST12345',
      amount: '1500.00',
      currency: 'LKR',
      merchantSecret: process.env.PAYHERE_MERCHANT_SECRET || 'test_secret'
    };

    const hashString = `${testData.merchantId}${testData.orderId}${testData.amount}${testData.currency}${testData.merchantSecret}`;
    const hash = CryptoJS.MD5(hashString).toString().toUpperCase();

    console.log('Test hash components:');
    console.log(`  Merchant ID: ${testData.merchantId}`);
    console.log(`  Order ID: ${testData.orderId}`);
    console.log(`  Amount: ${testData.amount}`);
    console.log(`  Currency: ${testData.currency}`);
    console.log(`  Hash String: ${testData.merchantId}${testData.orderId}${testData.amount}${testData.currency}[SECRET]`);
    console.log(`  Generated Hash: ${hash}`);
    console.log('✅ Hash generation test with CryptoJS passed');
    return true;

  } catch (error) {
    console.log('❌ Hash generation test failed:', error.message);
    return false;
  }
};



const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  console.log('Starting environment validation...\n');
  const envValid = validateEnvironment();
  const hashValid = testHashGeneration();

  if (envValid && hashValid) {
    console.log('\n🎉 All tests passed! PayHere should work correctly.');
  } else {
    console.log('\n❌ Some tests failed. Please fix the issues above.');
    process.exit(1);
  }
}


export { generatePayHereHash, verifyPayHereHash, testHashGeneration };








// Get payment status
app.get('/payhere-status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const subscription = await Subscription.findOne({ payhereOrderId: orderId });

    if (subscription) {
      res.json({
        success: true,
        status: 'completed',
        subscription: {
          id: subscription._id,
          planName: subscription.planName,
          status: subscription.status,
          amount: subscription.amount,
          currency: subscription.currency
        }
      });
    } else {
      res.json({
        success: true,
        status: 'pending',
        message: 'Payment is being processed'
      });
    }

  } catch (error) {
    console.error('Error checking PayHere status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check payment status'
    });
  }
});







app.post('/create-payhere-recurring-payment', async (req, res) => {
  try {
    console.log('🔄 PayHere Recurring Payment Creation Started');

    const { amount, currency = 'LKR', planId, customerData, enableAutoRenew = true } = req.body;

    // Validate configuration
    if (!payhereConfig.merchantId || !payhereConfig.merchantSecret) {
      console.error('❌ PayHere configuration missing');
      return res.status(500).json({
        success: false,
        error: 'PayHere configuration invalid'
      });
    }

    // Validate amount
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount < 1) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be at least LKR 1.00'
      });
    }

    // Only allow recurring for premium plans
    if (planId === '1') {
      return res.status(400).json({
        success: false,
        error: 'Auto-renewal is only available for Premium plans'
      });
    }

    // Validate customer data
    if (!customerData?.name || !customerData?.email) {
      return res.status(400).json({
        success: false,
        error: 'Customer name and email are required'
      });
    }

    // Generate unique order ID
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    const orderId = `RECURRING_${timestamp}_${randomSuffix}`;

    // Format amount and currency
    const formattedAmount = numAmount.toFixed(2);
    const formattedCurrency = currency.toUpperCase();

    // Process customer data
    const nameParts = customerData.name.trim().split(/\\s+/);
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    // Clean phone number
    let cleanPhone = customerData.phoneNumber?.trim() || '0771234567';
    if (!cleanPhone.startsWith('0')) {
      cleanPhone = '0' + cleanPhone;
    }

    // Generate hash for recurring payment
    const hash = generatePayHereHash(
      payhereConfig.merchantId,
      orderId,
      formattedAmount,
      formattedCurrency,
      payhereConfig.merchantSecret
    );

    // FIXED: Proper PayHere recurring payment data
    const paymentData = {
      sandbox: payhereConfig.mode === 'sandbox',
      merchant_id: payhereConfig.merchantId,
      return_url: `${payhereConfig.returnUrl}?order_id=${orderId}`,
      cancel_url: payhereConfig.cancelUrl,
      notify_url: payhereConfig.notifyUrl,
      order_id: orderId,
      items: `Premium Plan - Monthly Subscription`,
      currency: formattedCurrency,
      amount: formattedAmount,
      first_name: firstName,
      last_name: lastName,
      email: customerData.email.trim().toLowerCase(),
      phone: cleanPhone,
      address: customerData.address || 'Colombo',
      city: 'Colombo',
      country: 'Sri Lanka',
      hash: hash,
      custom_1: `plan_${planId}`,
      custom_2: 'monthly_recurring',

      // FIXED: Proper recurring payment fields for PayHere
      recurrence: '1 Month',
      duration: 'Forever', // Continue until cancelled
      startup_fee: '0.00'
    };

    console.log('✅ PayHere recurring payment data prepared');
    console.log('Order ID:', orderId);
    console.log('Amount:', formattedAmount, formattedCurrency);

    res.json({
      success: true,
      orderId: orderId,
      paymentData: paymentData,
      amount: formattedAmount,
      currency: formattedCurrency,
      recurring: true,
      message: 'Recurring payment request created successfully'
    });

  } catch (error) {
    console.error('❌ PayHere recurring payment creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Recurring payment creation failed',
      message: error.message
    });
  }
});

app.post('/payhere-recurring-notify', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    console.log('📨 PayHere Recurring Notification Received');
    console.log('Raw Notification Data:', JSON.stringify(req.body, null, 2));

    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      status_message,
      custom_1,
      custom_2,
      email,
      recurring_token, // New field for recurring payments
      subscription_id, // PayHere subscription ID
      event_type // 'SUBSCRIPTION_PAYMENT' or 'SUBSCRIPTION_CANCELLED'
    } = req.body;

    // Validate required fields
    if (!merchant_id || !order_id || !payhere_amount || !payhere_currency || !status_code || !md5sig) {
      console.error('❌ Missing required notification fields');
      return res.status(400).send('Missing required fields');
    }

    // Verify merchant ID
    if (merchant_id.trim() !== payhereConfig.merchantId.trim()) {
      console.error('❌ Merchant ID mismatch');
      return res.status(400).send('Merchant ID mismatch');
    }

    // Verify hash
    const isValidHash = verifyPayHereHash(req.body, payhereConfig.merchantSecret);

    if (!isValidHash) {
      console.error('❌ Hash verification failed');
      return res.status(400).send('Invalid hash');
    }

    console.log('✅ Hash verification successful');
    console.log(`📊 Payment Status: ${status_code} - ${status_message}`);
    console.log(`🔄 Event Type: ${event_type}`);

    // Handle different event types
    if (event_type === 'SUBSCRIPTION_PAYMENT') {
      await handleRecurringPayment(req.body);
    } else if (event_type === 'SUBSCRIPTION_CANCELLED') {
      await handleSubscriptionCancellation(req.body);
    } else if (status_code === '2') {
      // Initial subscription creation
      await handleInitialSubscription(req.body);
    }

    // Always respond OK to PayHere
    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Error processing PayHere recurring notification:', error);
    res.status(500).send('Server error');
  }
});













app.get('/api/debug/subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🐛 Debug: Checking subscription for userId:', userId);

    // Find the subscription directly from database
    const subscription = await Subscription.findOne({
      $or: [
        { userId: parseInt(userId) },
      ]
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return res.json({
        success: false,
        message: 'No subscription found',
        userId: userId,
        timestamp: new Date().toISOString()
      });
    }

    console.log('🐛 Debug: Raw subscription from database:', {
      _id: subscription._id,
      userId: subscription.userId,
      userEmail: subscription.userEmail,
      planId: subscription.planId,
      planName: subscription.planName,
      autoRenew: subscription.autoRenew,
      status: subscription.status,
      downgradeScheduled: subscription.downgradeScheduled,
      updatedAt: subscription.updatedAt,
      payhereRecurringToken: subscription.payhereRecurringToken,
      autoRenewalCancelledDate: subscription.autoRenewalCancelledDate
    });

    res.json({
      success: true,
      message: 'Debug subscription data',
      rawSubscription: subscription.toObject(),
      parsedData: {
        autoRenew: subscription.autoRenew,
        autoRenewalType: typeof subscription.autoRenew,
        downgradeScheduled: subscription.downgradeScheduled,
        downgradeType: typeof subscription.downgradeScheduled,
        status: subscription.status,
        planId: subscription.planId
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('🐛 Debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});








app.get('/plans-with-renewal', (req, res) => {
  const plans = [
    {
      id: 1,
      name: 'Free Plan',
      monthlyPrice: 0,
      features: ['1 highlight ad', 'Standard position in listings', 'Add one discount or promo code', 'Set start and end date for promotions'],
      description: 'Perfect for individuals getting started',
      popular: false,
      autoRenewal: false
    },
    {
      id: 2,
      name: 'Premium Plan',
      monthlyPrice: 150,
      features: ['3 highlight ads', 'Priority position in listings and category pages', 'Multiple Promotions can be added', 'Premium Features', 'Auto-renewal available'],
      description: 'Ideal for growing businesses with automatic monthly billing',
      popular: true,
      autoRenewal: true,
      autoRenewalBenefits: [
        'Never miss premium features',
        'Automatic monthly payments',
        'Cancel anytime',
        'Email notifications for all transactions'
      ]
    }
  ];

  res.json({ plans });
});





app.post('/create-payhere-payment-with-auto-renewal', async (req, res) => {
  try {
    const { amount, currency = 'LKR', planId, customerData, enableAutoRenew = false } = req.body;

    // Only allow auto-renewal for Premium plans
    if (enableAutoRenew && planId === '1') {
      return res.status(400).json({
        success: false,
        error: 'Auto-renewal is only available for Premium plans'
      });
    }

    // Use the recurring payment creation if auto-renewal is enabled
    if (enableAutoRenew && planId === '2') {
      // Forward to recurring payment creation
      req.body.enableAutoRenew = true;
      return await createPayHereRecurringPayment(req, res);
    } else {
      // Use regular payment creation (your existing logic)
      // ... your existing create-payhere-payment logic
    }

  } catch (error) {
    console.error('Error creating payment with auto-renewal option:', error);
    res.status(500).json({
      success: false,
      error: 'Payment creation failed'
    });
  }
});

// 5. ADD monitoring endpoint for auto-renewals:



// ADD this temporary debug route to your server.js to check what's happening:

app.get('/api/debug/user-subscription/:email', async (req, res) => {
  try {
    const { email } = req.params;

    console.log('🔍 DEBUG: Checking user and subscriptions for:', email);

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    console.log('User found:', user ? {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      createdAt: user.createdAt
    } : 'NOT FOUND');

    // Find ALL subscriptions for this email/userId
    const subscriptionsAll = await Subscription.find({
      $or: [
        { userEmail: email.toLowerCase().trim() },
        { userId: user?.userId }
      ]
    }).sort({ createdAt: -1 });

    console.log('All subscriptions found:', subscriptionsAll.length);
    subscriptionsAll.forEach((sub, index) => {
      console.log(`Subscription ${index + 1}:`, {
        id: sub._id,
        userId: sub.userId,
        userEmail: sub.userEmail,
        planId: sub.planId,
        planName: sub.planName,
        status: sub.status,
        paymentMethod: sub.paymentMethod,
        createdAt: sub.createdAt
      });
    });

    res.json({
      success: true,
      debug: {
        email: email,
        userFound: !!user,
        user: user ? {
          userId: user.userId,
          email: user.email,
          firstName: user.firstName,
          createdAt: user.createdAt
        } : null,
        totalSubscriptions: subscriptionsAll.length,
        subscriptions: subscriptionsAll.map(sub => ({
          id: sub._id,
          userId: sub.userId,
          userEmail: sub.userEmail,
          planId: sub.planId,
          planName: sub.planName,
          status: sub.status,
          paymentMethod: sub.paymentMethod,
          createdAt: sub.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ADD this route to clean up unwanted subscriptions for a specific user
app.delete('/api/debug/clean-user-subscriptions/:email', async (req, res) => {
  try {
    const { email } = req.params;

    console.log('🧹 CLEANUP: Removing all subscriptions for:', email);

    // Find user first
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete ALL subscriptions for this user
    const deleteResult = await Subscription.deleteMany({
      $or: [
        { userEmail: email.toLowerCase().trim() },
        { userId: user.userId }
      ]
    });

    console.log('✅ Deleted subscriptions:', deleteResult.deletedCount);

    res.json({
      success: true,
      message: `Deleted ${deleteResult.deletedCount} subscription(s) for user ${email}`,
      deletedCount: deleteResult.deletedCount
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});























app.post('/payhere-notify-enhanced', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    console.log('📨 Enhanced PayHere Notification Received');
    console.log('Raw Notification Data:', JSON.stringify(req.body, null, 2));

    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      status_message,
      custom_1,
      custom_2,
      email,
      recurring_token,      // NEW: For recurring payments
      subscription_id,      // NEW: PayHere subscription ID
      event_type,          // NEW: Type of event
      next_occurrence_date // NEW: Next billing date from PayHere
    } = req.body;

    // Standard validation (keep your existing validation)
    if (!merchant_id || !order_id || !payhere_amount || !payhere_currency || !status_code || !md5sig) {
      console.error('❌ Missing required notification fields');
      return res.status(400).send('Missing required fields');
    }

    if (merchant_id.trim() !== payhereConfig.merchantId.trim()) {
      console.error('❌ Merchant ID mismatch');
      return res.status(400).send('Merchant ID mismatch');
    }

    const isValidHash = verifyPayHereHash(req.body, payhereConfig.merchantSecret);
    if (!isValidHash) {
      console.error('❌ Hash verification failed');
      return res.status(400).send('Invalid hash');
    }

    console.log('✅ Hash verification successful');
    console.log(`📊 Payment Status: ${status_code} - ${status_message}`);

    // Handle different event types
    if (event_type === 'SUBSCRIPTION_PAYMENT') {
      console.log('🔄 Processing recurring payment...');
      await handleRecurringPaymentNotification(req.body);
    } else if (event_type === 'SUBSCRIPTION_CANCELLED') {
      console.log('❌ Processing subscription cancellation...');
      await handleSubscriptionCancellationNotification(req.body);
    } else if (status_code === '2') {
      // Initial payment or one-time payment
      console.log('✅ Processing initial payment...');
      await handleInitialPaymentWithRecurring(req.body);
    } else {
      console.log(`ℹ️ Payment status: ${status_code} - ${status_message}`);
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Error processing enhanced PayHere notification:', error);
    res.status(500).send('Server error');
  }
});



// Update your plans array to only have 2 plans
app.get('/plans', (req, res) => {
  const plans = [
    {
      id: 1,
      name: 'Free Plan',
      monthlyPrice: 0,
      features: ['1 highlight ad', 'Standard position in listings', 'Add one discount or promo code', 'Set start and end date for promotions'],
      description: 'Perfect for individuals getting started',
      popular: false
    },
    {
      id: 2,
      name: 'Premium Plan',
      monthlyPrice: 150, // Only monthly pricing now
      features: ['3 highlight ads', 'Priority position in listings and category pages', 'Multiple Promotions can be added', 'Premium Features'],
      description: 'Ideal for growing businesses',
      popular: true
    }
  ];

  res.json({ plans });
});




// 6. Add endpoint to check payment status
app.get('/check-payment-status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log(`🔍 Checking payment status for order: ${orderId}`);

    // Find subscription by PayHere order ID
    const subscription = await Subscription.findOne({
      payhereOrderId: orderId
    });

    if (subscription) {
      console.log('✅ Found subscription for order:', subscription._id);

      res.json({
        success: true,
        status: 'completed',
        subscription: {
          id: subscription._id,
          planId: subscription.planId,
          planName: subscription.planName,
          status: subscription.status,
          amount: subscription.amount,
          currency: subscription.currency,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          autoRenew: subscription.autoRenew,
          nextBillingDate: subscription.nextBillingDate,
          payhereRecurringToken: subscription.payhereRecurringToken
        }
      });
    } else {
      console.log('⏳ No subscription found yet for order:', orderId);
      res.json({
        success: true,
        status: 'pending',
        message: 'Payment is being processed'
      });
    }

  } catch (error) {
    console.error('❌ Error checking payment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check payment status',
      message: error.message
    });
  }
});











// Enhanced offers endpoint with notification tracking








app.get('/api/check-offer-notifications', async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Find offers that start today
    const offersStartingToday = await Offer.find({
      startDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      isActive: true
    }).populate('businessId', 'name');

    let notificationsSent = 0;

    for (const offer of offersStartingToday) {
      // Get user details
      const user = await User.findOne({ userId: offer.userId });
      if (user) {
        const business = offer.businessId;
        const offerData = {
          title: offer.title,
          discount: offer.discount,
          category: offer.category,
          startDate: offer.startDate,
          endDate: offer.endDate
        };

        const sent = await sendOfferStartNotification(
          user.email,
          `${user.firstName} ${user.lastName}`,
          business.name,
          offerData
        );

        if (sent) {
          notificationsSent++;
        }
      }
    }

    res.json({
      success: true,
      message: `Checked ${offersStartingToday.length} offers, sent ${notificationsSent} notifications`,
      offersFound: offersStartingToday.length,
      notificationsSent: notificationsSent
    });

  } catch (error) {
    console.error('Error checking offer notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check offer notifications'
    });
  }
});












cron.schedule('0 2 * * *', async () => {
  console.log('🔄 Running daily subscription renewal check...');

  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find subscriptions due for renewal
    const subscriptionsDue = await Subscription.find({
      autoRenew: true,
      status: { $in: ['active', 'pending_renewal'] },
      nextBillingDate: {
        $gte: today,
        $lt: tomorrow
      },
      renewalAttempts: { $lt: 3 },
      // IMPORTANT: Exclude subscriptions with scheduled cancellations
      cancellationScheduled: { $ne: true }
    });

    console.log(`📊 Found ${subscriptionsDue.length} subscriptions due for renewal`);

    for (const subscription of subscriptionsDue) {
      try {
        // Attempt manual renewal charge
        await attemptManualRenewal(subscription);
      } catch (renewalError) {
        console.error(`❌ Failed to renew subscription ${subscription._id}:`, renewalError);
      }
    }

    console.log('✅ Daily renewal check completed');

  } catch (error) {
    console.error('❌ Error in daily renewal check:', error);
  }
});


cron.schedule('30 2 * * *', async () => {
  console.log('🔄 Running scheduled cancellation processing...');

  try {
    const today = new Date();

    // Find all subscriptions with scheduled cancellations that should be processed today
    const subscriptionsToCancel = await Subscription.find({
      cancellationScheduled: true,
      cancellationEffectiveDate: { $lte: today },
      status: 'active'
    });

    console.log(`📊 Found ${subscriptionsToCancel.length} subscriptions to cancel`);

    const results = [];

    for (const subscription of subscriptionsToCancel) {
      try {
        console.log(`Processing cancellation for user ${subscription.userId}`);

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
          startDate: today,
          endDate: null, // Free plan doesn't expire
          autoRenew: false,
          createdAt: today,
          updatedAt: today
        });

        await freeSubscription.save();

        // Update the old premium subscription to cancelled
        await Subscription.updateOne(
          { _id: subscription._id },
          {
            $set: {
              status: 'cancelled',
              endDate: today,
              cancellationProcessedDate: today,
              updatedAt: today
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
            processedDate: today,
            reason: 'Scheduled cancellation processed'
          },
          timestamp: today
        });

        results.push({
          userId: subscription.userId,
          userEmail: subscription.userEmail,
          status: 'success',
          message: 'Successfully downgraded to free plan'
        });

        console.log(`✅ User ${subscription.userId} downgraded to free plan`);

        // Send downgrade notification email
        try {
          const user = await User.findOne({ userId: subscription.userId });
          if (user) {
            await sendDowngradeNotificationEmail(user, subscription);
          }
        } catch (emailError) {
          console.error(`❌ Failed to send downgrade email to user ${subscription.userId}:`, emailError);
        }

      } catch (error) {
        console.error(`❌ Error processing cancellation for user ${subscription.userId}:`, error);
        results.push({
          userId: subscription.userId,
          userEmail: subscription.userEmail,
          status: 'error',
          message: error.message
        });
      }
    }

    console.log(`✅ Scheduled cancellation processing completed: ${results.filter(r => r.status === 'success').length} successful, ${results.filter(r => r.status === 'error').length} errors`);

  } catch (error) {
    console.error('❌ Error in scheduled cancellation processing:', error);
  }
});

// 3. DAILY OFFER NOTIFICATION CHECK - 9:00 AM
cron.schedule('0 9 * * *', async () => {
  console.log('🔔 Checking for offers starting today...');
  try {
    const response = await axios.get('http://localhost:5555/api/check-offer-notifications');
    console.log('✅ Notification check completed:', response.data.message);
  } catch (error) {
    console.error('❌ Error in scheduled notification check:', error);
  }
});

// 4. WEEKLY CLEANUP - 3:00 AM EVERY SUNDAY
cron.schedule('0 3 * * 0', async () => {
  console.log('🧹 Running weekly subscription cleanup...');

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Remove old logs older than 30 days
    const logCleanup = await SubscriptionLog.deleteMany({
      timestamp: { $lt: thirtyDaysAgo },
      action: { $in: ['auto_downgrade_to_free', 'cancellation_scheduled'] }
    });

    console.log(`🗑️ Cleaned up ${logCleanup.deletedCount} old subscription logs`);

    // Count current active subscriptions for monitoring
    const activeCount = await Subscription.countDocuments({ status: 'active' });
    const cancelledCount = await Subscription.countDocuments({ status: 'cancelled' });
    const gracePeriodCount = await Subscription.countDocuments({
      cancellationScheduled: true,
      status: 'active'
    });

    console.log(`📈 Current subscription stats: Active: ${activeCount}, Cancelled: ${cancelledCount}, Grace Period: ${gracePeriodCount}`);

  } catch (error) {
    console.error('❌ Error in weekly cleanup:', error);
  }
});

cron.schedule('0 2 * * *', async () => {
  console.log('🕐 Running scheduled downgrade processing...');
  try {
    const response = await fetch(`${process.env.BACKEND_URL}/api/subscription/process-downgrades`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.CRON_JOB_TOKEN
      }
    });

    const result = await response.json();
    console.log('✅ Scheduled downgrade processing result:', result);
  } catch (error) {
    console.error('❌ Error in scheduled downgrade processing:', error);
  }
});

// Send downgrade warning emails (3 days before)
cron.schedule('0 9 * * *', async () => {
  console.log('📧 Sending downgrade warning emails...');
  try {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(0, 0, 0, 0);

    const upcomingDowngrades = await Subscription.find({
      downgradeScheduled: true,
      downgradeEffectiveDate: {
        $gte: threeDaysFromNow,
        $lt: new Date(threeDaysFromNow.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    for (const subscription of upcomingDowngrades) {
      const impactAnalysis = await getDowngradeImpactAnalysis(subscription.userId);
      await sendDowngradeReminderEmail({
        email: subscription.userEmail,
        userName: await getUserName(subscription.userId),
        effectiveDate: subscription.downgradeEffectiveDate,
        daysRemaining: 3,
        impactAnalysis
      });
    }

    console.log(`📧 Sent ${upcomingDowngrades.length} downgrade warning emails`);
  } catch (error) {
    console.error('❌ Error sending downgrade warnings:', error);
  }
});

cron.schedule('0 2 * * *', async () => {
  console.log('🔄 Running daily downgrade processor...');

  try {
    const now = new Date();

    // Find subscriptions that should be downgraded today
    const subscriptionsToDowngrade = await Subscription.find({
      downgradeScheduled: true,
      downgradeEffectiveDate: { $lte: now },
      status: 'active',
      planId: '2' // Premium subscriptions only
    });

    console.log(`📋 Found ${subscriptionsToDowngrade.length} subscriptions to process`);

    for (const subscription of subscriptionsToDowngrade) {
      try {
        // Create new free subscription
        const freeSubscription = new Subscription({
          userId: subscription.userId,
          userEmail: subscription.userEmail,
          planId: '1',
          planName: 'Free Plan',
          status: 'active',
          billingCycle: 'monthly',
          amount: 0,
          currency: subscription.currency,
          paymentMethod: 'downgrade',
          autoRenew: false,
          startDate: now,
          endDate: null, // Free plan doesn't expire
          renewalHistory: []
        });

        await freeSubscription.save();

        // Update old subscription to expired
        await Subscription.updateOne(
          { _id: subscription._id },
          {
            $set: {
              status: 'expired',
              endDate: now,
              autoRenew: false,
              downgradeProcessedDate: now,
              updatedAt: now
            },
            $unset: {
              downgradeScheduled: '',
              downgradeScheduledDate: '',
              downgradeReason: '',
              downgradeEffectiveDate: '',
              nextBillingDate: ''
            }
          }
        );

        // Apply plan limits (suspend excess items)
        await applyFreePlanLimitations(subscription.userId);

        // Log the downgrade
        await SubscriptionHistory.create({
          userId: subscription.userId,
          userEmail: subscription.userEmail,
          action: 'downgrade_processed',
          fromPlan: 'Premium Plan',
          toPlan: 'Free Plan',
          effectiveDate: now,
          reason: subscription.downgradeReason || 'Scheduled downgrade'
        });

        console.log(`✅ Successfully processed downgrade for user ${subscription.userId}`);

        // Send email notification
        const user = await User.findOne({ userId: subscription.userId });
        if (user) {
          await sendDowngradeCompletedEmail(user, subscription);
        }

      } catch (error) {
        console.error(`❌ Error processing downgrade for user ${subscription.userId}:`, error);
      }
    }

  } catch (error) {
    console.error('❌ Error in downgrade processor:', error);
  }
});


cron.schedule('0 1 * * *', async () => {
  try {
    console.log('🕐 Running daily downgrade processing...');

    const response = await fetch('http://localhost:5555/api/subscription/process-scheduled-downgrades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const result = await response.json();
    console.log('📊 Daily downgrade processing result:', result);

  } catch (error) {
    console.error('❌ Error in daily downgrade processing:', error);
  }
});








// Database connection
mongoose
  .connect(process.env.MONGOURL, {})
  .then(() => {
    console.log('✅ App connected to database');
    app.listen(PORT, () => {
      console.log(`🚀 App is listening to port: ${PORT}`);
      console.log(`📊 Test PayPal config at: http://localhost:${PORT}/test-paypal-config`);
      console.log(`💳 Card payment endpoint: http://localhost:${PORT}/create-card-payment`);
      console.log(`🅿️  PayPal payment endpoint: http://localhost:${PORT}/create-paypal-payment`);
      console.log(`💱 Exchange rate endpoint: http://localhost:${PORT}/exchange-rate`);
    });
  })
  .catch((error) => {
    console.error('❌ Error connecting to MongoDB:', error);
    process.exit(1);
  });