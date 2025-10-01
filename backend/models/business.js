import mongoose from "mongoose";
import AutoIncrementFactory from 'mongoose-sequence';


const AutoIncrement = AutoIncrementFactory(mongoose);

const businessSchema = new mongoose.Schema({
  businessId: Number,
  userId: { type: Number, ref: 'User', required: true },
  name: { type: String, required: true },
  address: String,
  phone: String,
  email: String,
  website: String,
  category: String,
  socialMediaLinks: String,
  operatingHours: String,
  businessType: String,
  registrationNumber: String,
  taxId: String,

  // Enhanced status management for plan limitations
  status: { type: String, enum: ['active', 'inactive', 'suspended', 'deleted'], default: 'active' },
  suspendedDate: { type: Date },
  suspensionReason: { type: String },
  displayOrder: { type: Number, default: 0 }, // For prioritizing which businesses to keep active

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
businessSchema.index({ userId: 1, status: 1 });
businessSchema.index({ status: 1 });
businessSchema.plugin(AutoIncrement, { inc_field: 'businessId' });
const Business = mongoose.model('Business', businessSchema);

export  {businessSchema};
export default Business;
