const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['assessment', 'prescription', 'lab', 'general'], default: 'general' },
  remarks: { type: String, default: '' },
  medicines: { type: String, default: '' }, // Could be array of objects for better structure, but string is easier for now
  suggestedTests: { type: String, default: '' },
  fileUrl: { type: String, default: '' },
  tags: [String],
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
