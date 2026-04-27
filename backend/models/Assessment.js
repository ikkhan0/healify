const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },          // null for generic assessments
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  type: { type: String, enum: ['generic', 'specific'], default: 'generic' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  questions: [{
    text: { type: String, required: true },
    options: [String],                     // e.g. ["Never", "Sometimes", "Often", "Always"]
    answerType: { type: String, enum: ['scale', 'choice', 'text'], default: 'scale' }
  }],
  answers: [{
    questionIndex: Number,
    answer: String,
    score: { type: Number, default: 0 }
  }],
  totalScore: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  result: { type: String, default: '' },        // e.g. "Mild", "Moderate", "Severe"
  isVisibleToPatient: { type: Boolean, default: false },  // Doctor decides visibility
  recommendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'completed', 'expired'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Assessment', assessmentSchema);
