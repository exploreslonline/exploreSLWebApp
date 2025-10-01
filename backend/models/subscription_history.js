import mongoose from "mongoose";


const subscriptionHistorySchema = new mongoose.Schema({
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
      'downgrade_cancelled'
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
  createdAt: { type: Date, default: Date.now }
});
// ADD THESE ROUTES TO YOUR SERVER FILE (after your existing routes)

subscriptionHistorySchema.index({ userId: 1, createdAt: -1 });
subscriptionHistorySchema.index({ userEmail: 1, createdAt: -1 });
subscriptionHistorySchema.index({ action: 1 });

const SubscriptionHistory = mongoose.model('SubscriptionHistory', subscriptionHistorySchema);

export {subscriptionHistorySchema};
export default SubscriptionHistory;