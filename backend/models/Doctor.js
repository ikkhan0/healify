const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true }
}, { timestamps: true });

const doctorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  specialty: { type: String, required: true },
  country: { type: String, default: '' },
  bio: { type: String, default: '' },
  experience: { type: String, default: '' },
  education: { type: String, default: '' },
  languages: { type: String, default: '' },
  city: { type: String, default: '' },
  designation: { type: String, default: '' },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Male' },
  experienceYears: { type: Number, default: 0 },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  reviews: [reviewSchema],
  consultationFee: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  clinicShare: { type: Number, default: 0 },
  availability: [{
    day: { type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] },
    startTime: String,
    endTime: String,
    slots: [String]
  }],
  isAvailableForVideo: { type: Boolean, default: true },
  patients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  unavailableSlots: [{
    date: { type: Date, required: true },
    slots: [String]  // e.g. ["10:00 AM", "11:00 AM"]
  }],
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);
