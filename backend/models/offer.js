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

  // Image field - stores compressed image as Buffer
  image: {
    data: Buffer,
    contentType: String,
    size: Number, // Store final size in bytes
    originalName: String,
    uploadedAt: Date
  },

  // Admin approval fields
  adminStatus: {
    type: String,
    enum: ['pending', 'approved', 'declined'],
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
offerSchema.index({ adminStatus: 1 });
offerSchema.index({ userId: 1, adminStatus: 1 });
offerSchema.plugin(AutoIncrement, { inc_field: 'offerId' });

const Offer = mongoose.model('Offer', offerSchema);

export { offerSchema };
export default Offer;