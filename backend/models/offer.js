import mongoose from "mongoose";
import AutoIncrementFactory from 'mongoose-sequence';

const AutoIncrement = AutoIncrementFactory(mongoose);

const offerSchema = new mongoose.Schema({
  offerId: Number,
  userId: { type: Number, ref: 'User', required: true },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  title: { type: String, required: true },
  discount: { type: String, required: true },
  category: String,
  startDate: { type: Date },
  endDate: { type: Date },
  isActive: { type: Boolean, default: true },

  // Admin approval fields - FIXED ENUM VALUES
  adminStatus: {
    type: String,
    enum: ['pending', 'approved', 'declined'], // ✅ Fixed to match your API logic
    default: 'pending'
  },
  adminComments: { type: String },
  reviewedBy: { type: String },
  reviewedAt: { type: Date },

  // Enhanced status management for plan limitations  
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  suspendedDate: { type: Date },
  suspensionReason: { type: String },
  displayOrder: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

offerSchema.index({ userId: 1, status: 1 });
offerSchema.index({ adminStatus: 1 }); // ✅ Added useful index
offerSchema.index({ userId: 1, adminStatus: 1 }); // ✅ Added compound index
offerSchema.plugin(AutoIncrement, { inc_field: 'offerId' });
const Offer = mongoose.model('Offer', offerSchema);


export  {offerSchema};
export default Offer;