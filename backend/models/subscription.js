import mongoose from "mongoose";




const subscriptionSchema = new mongoose.Schema({
  // Core identification
  userId: { type: Number, ref: 'User' },
  userEmail: { type: String, required: true, index: true },

  // Plan details
  planId: { type: String, required: true },
  planName: { type: String, required: true },
  status: {
    type: String,
    enum: ['active', 'inactive', 'cancelled', 'expired', 'pending_renewal'],
    default: 'active'
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'LKR' },

  // Payment info
  paymentMethod: { type: String, default: 'payhere' },
  payhereOrderId: { type: String, index: true },
  payherePaymentId: { type: String },

  // Auto-renewal fields (for premium subscriptions)
  payhereRecurringToken: { type: String, index: true },
  autoRenew: { type: Boolean, default: false },
  renewalAttempts: { type: Number, default: 0 },
  maxRenewalAttempts: { type: Number, default: 3 },

  // Dates
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date }, // Free plan: null, Premium: calculated
  nextBillingDate: { type: Date, index: true },

  // Downgrade fields
  downgradeScheduled: { type: Boolean, default: false },
  downgradeScheduledDate: { type: Date },
  downgradeReason: { type: String },
  downgradeEffectiveDate: { type: Date },
  downgradeTargetPlan: { type: String },
  downgradeSelections: {
    selectedBusinesses: [{ type: String }],
    selectedOffers: [{ type: String }]
  },
  downgradeProcessedDate: { type: Date },

  // Legacy cancellation fields (for backward compatibility)
  cancellationScheduled: { type: Boolean, default: false },
  cancellationScheduledDate: { type: Date },
  cancellationReason: { type: String },
  cancellationEffectiveDate: { type: Date },
  cancellationProcessedDate: { type: Date },

  // Payment failure tracking
  paymentFailure: { type: Boolean, default: false },
  paymentFailureReason: { type: String },
  lastPaymentFailureDate: { type: Date },

  // Renewal history as embedded array
  renewalHistory: [{
    renewalDate: { type: Date, default: Date.now },
    amount: { type: Number },
    status: { type: String, enum: ['success', 'failed'] },
    paymentId: { type: String },
    failureReason: { type: String },
    attempt: { type: Number }
  }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});


// Add pre-save middleware to update the updatedAt field
subscriptionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Add indexes for better query performance
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ nextBillingDate: 1, status: 1 });
subscriptionSchema.index({ downgradeScheduled: 1, downgradeEffectiveDate: 1 });
subscriptionSchema.index({ cancellationScheduled: 1, cancellationEffectiveDate: 1 });


// Pre-save middleware with proper endDate calculation
subscriptionSchema.pre('save', function (next) {
  this.updatedAt = new Date();

  // Set endDate for new subscriptions
  if (this.isNew && !this.endDate) {
    const startDate = this.startDate || new Date();
    if (this.planId === '1') {
      // Free plan never expires
      this.endDate = null;
      this.autoRenew = false; // Free plans don't have auto-renewal
    } else {
      // Premium plan - calculate end date AND enable auto-renewal by default
      const endDate = new Date(startDate);
      if (this.billingCycle === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }
      this.endDate = endDate;
      this.nextBillingDate = endDate; // Set next billing date

      // CRITICAL FIX: Enable auto-renewal by default for premium plans
      if (this.autoRenew === undefined) {
        this.autoRenew = true;
      }
    }
  }

  next();
});

// Instance method to calculate days until expiration
subscriptionSchema.methods.getDaysUntilExpiration = function () {
  if (!this.endDate) return null; // Free plans never expire
  const today = new Date();
  const diffTime = this.endDate - today;
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};

// Instance method to check if subscription is expiring soon
subscriptionSchema.methods.isExpiringSoon = function (days = 7) {
  const daysUntilExpiration = this.getDaysUntilExpiration();
  if (daysUntilExpiration === null) return false; // Free plans never expire
  return daysUntilExpiration <= days && daysUntilExpiration > 0;
};

// Instance method to get effective downgrade date
subscriptionSchema.methods.getDowngradeEffectiveDate = function () {
  if (this.downgradeEffectiveDate) {
    return this.downgradeEffectiveDate;
  }
  // Use subscription end date as fallback
  return this.endDate;
};

// Instance method to check if subscription is a premium plan
subscriptionSchema.methods.isPremium = function () {
  return this.planId === '2';
};

// Instance method to check if subscription is a free plan
subscriptionSchema.methods.isFree = function () {
  return this.planId === '1';
};

// Static method to find subscriptions ready for downgrade
subscriptionSchema.statics.findReadyForDowngrade = function () {
  const today = new Date();
  return this.find({
    downgradeScheduled: true,
    downgradeEffectiveDate: { $lte: today },
    status: 'active',
    planId: '2' // Premium subscriptions only
  });
};

// Static method to find subscriptions needing renewal
subscriptionSchema.statics.findNeedingRenewal = function () {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.find({
    status: 'active',
    planId: '2',
    autoRenew: true,
    nextBillingDate: { $lte: tomorrow },
    paymentFailure: { $ne: true }
  });
};

// Static method to find active premium subscriptions
subscriptionSchema.statics.findActivePremium = function () {
  return this.find({
    status: 'active',
    planId: '2'
  });
};

// Static method to find expired subscriptions
subscriptionSchema.statics.findExpired = function () {
  const today = new Date();
  return this.find({
    status: 'active',
    endDate: { $lte: today, $ne: null }, // Exclude free plans (endDate: null)
    planId: '2' // Only premium plans can expire
  });
};


const Subscription = mongoose.model('Subscription', subscriptionSchema);

export { subscriptionSchema };
export default Subscription;
