const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  rationCardNumber: { type: String, default: '' },
  role: { type: String, enum: ['admin', 'distributor', 'customer'], default: 'customer' },
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  profileImage: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre('save', async function() {
  try {
    if (!this.isModified('password')) {
      return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    // Don't return anything, just let it complete
  } catch (error) {
    // Throw the error to be caught by Mongoose
    throw new Error(`Password hashing failed: ${error.message}`);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
