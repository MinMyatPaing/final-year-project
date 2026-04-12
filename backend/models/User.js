const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    // ── Core auth fields ──────────────────────────────────────────────────
    name:     { type: String, required: true },
    email:    { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minLength: 6 },

    // ── Extended profile fields ───────────────────────────────────────────
    university:           { type: String,  default: '' },
    yearOfStudy:          { type: String,  default: '' },
    monthlyIncome:        { type: Number,  default: 0 },
    monthlySpendingGoal:  { type: Number,  default: 0 },

    // Consent for storing profile data in the AI vector store
    aiPersonalisationConsent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Hash password before save
UserSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
