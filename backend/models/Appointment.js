const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  timeSlot: { type: String, required: true }, // e.g. "10:00 AM"
  type: { type: String, enum: ['video', 'in-person'], default: 'video' },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
  symptoms: { type: String, default: '' },
  notes: { type: String, default: '' },       // Doctor notes
  prescription: { type: String, default: '' },
  fee: { type: Number, default: 0 },
  isPaid: { type: Boolean, default: false },
  roomId: { type: String, default: '' },       // Video call room ID
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
