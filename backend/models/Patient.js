const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  age: { type: Number },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  bloodGroup: { type: String },
  weight: { type: Number },
  height: { type: Number },
  allergies: [String],
  medicalHistory: [String],
  currentMedications: [String],
  emergencyContact: {
    name: String,
    phone: String,
    relation: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);
