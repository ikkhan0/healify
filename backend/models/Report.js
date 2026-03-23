const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['assessment', 'prescription', 'lab', 'general'], default: 'general' },
  fileUrl: { type: String, default: '' },
  tags: [String],
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
