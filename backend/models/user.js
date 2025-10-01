import mongoose from "mongoose";
import AutoIncrementFactory from 'mongoose-sequence';

const AutoIncrement = AutoIncrementFactory(mongoose);

const userSchema = new mongoose.Schema({
  userId: Number,
  firstName: String,
  lastName: String,
  address: String,
  email: { type: String, required: true, unique: true },
  phone: String,
  businessName: String,
  businessRegNo: String,
  businessAddress: String,
  userType: String,
  password: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'declined'], default: 'approved' },
}, {
  timestamps: true 
});


userSchema.plugin(AutoIncrement, { inc_field: 'userId' });
const User = mongoose.model('User', userSchema);
export default User;