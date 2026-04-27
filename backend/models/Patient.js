const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  age: { type: Number },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  bloodGroup: { type: String },
  weight: { type: Number },
  height: { type: Number },
  education: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  province: { type: String, default: '' },
  guardianName: { type: String, default: '' },
  guardianContact: { type: String, default: '' },
  migrationStatus: { type: String, default: '' },
  counsellorPreference: { type: String, default: '' },
  allergies: [String],
  medicalHistory: [String],
  currentMedications: [String],
  emergencyContact: {
    name: String,
    phone: String,
    relation: String
  },
  preferredLanguage: { type: String, enum: ['en', 'ur'], default: 'en' }
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);
