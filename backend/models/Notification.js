const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['appointment', 'assessment', 'waiver', 'general', 'session', 'feedback', 'report'],
    default: 'general'
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  link: { type: String, default: '' },     // Optional deep-link to relevant screen
  metadata: {                              // Extra context
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment' },
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }
}, { timestamps: true });

// Index for fast querying
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
