import mongoose from "mongoose";


const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true }, // Add email field
  password: { type: String, required: true },
}, {
  timestamps: true // This will automatically add createdAt and updatedAt
});

const Admin = mongoose.model('Admin', adminSchema);

export  {adminSchema};
export default Admin;
