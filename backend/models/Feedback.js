const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  satisfaction: { type: Number, min: 1, max: 10 },  // How satisfied with services (1-10)
  comment: { type: String, default: '' },
  isPublic: { type: Boolean, default: false },        // For success stories
  consentToShare: { type: Boolean, default: false },   // Patient explicitly consents
  adminApproved: { type: Boolean, default: false },    // Admin approves for public display
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
