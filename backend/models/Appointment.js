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

  // --- New Rebranding Fields ---
  intakeData: {
    name: String,
    age: Number,
    guardianName: String,
    guardianContact: String,
    gender: String,
    education: String,
    phone: String,
    email: String,
    address: String,
    counsellorPreference: String,
    migrationStatus: String
  },
  waiverData: {
    requestWaiver: { type: Boolean, default: false },
    income: Number,
    ses: Number,
    familyMembers: Number,
    occupation: String,
    residenceType: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
  },
  receiptUrl: { type: String, default: '' } // For bank payment screenshot
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
