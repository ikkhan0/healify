const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  specialty: { type: String, required: true },
  country: { type: String, default: '' },
  bio: { type: String, default: '' },
  experience: { type: Number, default: 0 }, // years
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  consultationFee: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  clinicShare: { type: Number, default: 0 },
  availability: [{
    day: { type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] },
    startTime: String,
    endTime: String,
    slots: [String] // e.g. ["09:00","09:30","10:00"]
  }],
  isAvailableForVideo: { type: Boolean, default: true },
  patients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);
