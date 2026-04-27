const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Feedback = require('../models/Feedback');
const { createNotification } = require('../utils/notificationHelper');

// @POST /api/feedback — patient submits post-session feedback
router.post('/', protect, authorize('client'), async (req, res) => {
  try {
    const { doctorId, appointmentId, rating, satisfaction, comment, consentToShare } = req.body;
    if (!rating || !doctorId) return res.status(400).json({ success: false, message: 'Rating and doctorId are required' });

    const feedback = await Feedback.create({
      patientId: req.user._id,
      doctorId,
      appointmentId,
      rating,
      satisfaction,
      comment: comment || '',
      consentToShare: consentToShare || false,
      isPublic: false,      // Needs admin approval
      adminApproved: false
    });

    // Notify doctor about feedback
    await createNotification({
      userId: doctorId,
      type: 'feedback',
      title: 'New Session Feedback',
      message: `A client has submitted feedback for your session. Rating: ${rating}/5.`,
      metadata: { appointmentId, fromUserId: req.user._id }
    });

    res.status(201).json({ success: true, feedback });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/feedback/public — public success stories
router.get('/public', async (req, res) => {
  try {
    const stories = await Feedback.find({ isPublic: true, consentToShare: true, adminApproved: true })
      .populate('doctorId', 'name profileImage')
      .sort({ createdAt: -1 })
      .limit(20);

    // Don't reveal patient identity in public stories
    const sanitized = stories.map(s => ({
      id: s._id,
      rating: s.rating,
      satisfaction: s.satisfaction,
      comment: s.comment,
      doctorName: s.doctorId?.name || 'Counsellor',
      doctorImage: s.doctorId?.profileImage || '',
      createdAt: s.createdAt
    }));

    res.json({ success: true, stories: sanitized });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/feedback/doctor — doctor sees own feedback
router.get('/doctor', protect, authorize('service_provider'), async (req, res) => {
  try {
    const feedback = await Feedback.find({ doctorId: req.user._id })
      .populate('patientId', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, feedback });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/feedback/admin — admin sees all feedback
router.get('/admin', protect, authorize('admin'), async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .populate('patientId', 'name email')
      .populate('doctorId', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, feedback });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @PUT /api/feedback/:id/approve — admin approves for public display
router.put('/:id/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const fb = await Feedback.findById(req.params.id);
    if (!fb) return res.status(404).json({ success: false, message: 'Feedback not found' });
    if (!fb.consentToShare) return res.status(400).json({ success: false, message: 'Patient has not consented to share' });

    fb.isPublic = true;
    fb.adminApproved = true;
    await fb.save();

    res.json({ success: true, message: 'Feedback approved for public display' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
