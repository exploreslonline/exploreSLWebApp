import mongoose from "mongoose";

const subscriptionLogSchema = new mongoose.Schema({
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  userId: { type: Number, required: true },
  userEmail: { type: String, required: true },
  action: {
    type: String,
    enum: [
      'created',
      'renewed',
      'cancelled',
      'cancellation_scheduled',
      'cancellation_cancelled',
      'auto_downgrade_to_free',
      'payment_failed',
      'auto_renewal_cancelled',       // FIXED: Added this
      'auto_renewal_reactivated',     // FIXED: Added this
      'downgrade_scheduled',          // FIXED: Added this  
      'downgrade_processed',          // FIXED: Added this
      'downgrade_cancelled',          // FIXED: Added this
      'plan_limit_enforced',
      'auto_plan_enforcement',
      'items_suspended',
      'items_reactivated'
    ],
    required: true
  },
  details: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
});



const SubscriptionLog = mongoose.model('SubscriptionLog', subscriptionLogSchema);

export {subscriptionLogSchema};
export default SubscriptionLog;