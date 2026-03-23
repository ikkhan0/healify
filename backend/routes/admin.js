const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Report = require('../models/Report');

// @GET /api/admin/stats
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const totalPatients = await User.countDocuments({ role: 'patient' });
    const totalDoctors = await User.countDocuments({ role: 'doctor' });
    const totalAppointments = await Appointment.countDocuments();
    const completedAppts = await Appointment.countDocuments({ status: 'completed' });

    // Total earnings = sum of fees from completed appointments
    const earningsAgg = await Appointment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$fee' } } }
    ]);
    const totalEarnings = earningsAgg[0]?.total || 0;
    const clinicShare = totalEarnings * 0.2;
    const doctorShare = totalEarnings * 0.8;

    res.json({
      success: true, stats: {
        totalPatients, totalDoctors, totalAppointments, completedAppts,
        totalEarnings, clinicShare, doctorShare
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// @GET /api/admin/patients
router.get('/patients', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({ role: 'patient' }).select('-password').lean();
    const results = await Promise.all(users.map(async (u) => {
      const p = await Patient.findOne({ userId: u._id }).lean();
      return { ...u, patientProfile: p };
    }));
    res.json({ success: true, patients: results });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// @GET /api/admin/doctors
router.get('/doctors', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({ role: 'doctor' }).select('-password').lean();
    const results = await Promise.all(users.map(async (u) => {
      const d = await Doctor.findOne({ userId: u._id }).lean();
      return { ...u, doctorProfile: d };
    }));
    res.json({ success: true, doctors: results });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// @GET /api/admin/appointments
router.get('/appointments', protect, authorize('admin'), async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('patientId', 'name email profileImage')
      .populate('doctorId', 'name email profileImage')
      .sort({ createdAt: -1 });
    res.json({ success: true, appointments });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// @GET /api/admin/reports  (financial/revenue report)
router.get('/reports', protect, authorize('admin'), async (req, res) => {
  try {
    // Top doctors by earnings
    const topDoctors = await Doctor.find()
      .sort({ totalEarnings: -1 }).limit(10)
      .populate('userId', 'name profileImage');

    const monthlyAgg = await Appointment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, revenue: { $sum: '$fee' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({ success: true, topDoctors, monthlyRevenue: monthlyAgg });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// @DELETE /api/admin/user/:id
router.delete('/user/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await User.findByIdAndDelete(req.params.id);
    await Doctor.findOneAndDelete({ userId: req.params.id });
    await Patient.findOneAndDelete({ userId: req.params.id });
    res.json({ success: true, message: 'User deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// @PUT /api/admin/user/:id/toggle
router.put('/user/:id/toggle', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, isActive: user.isActive });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
