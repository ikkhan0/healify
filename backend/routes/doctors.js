const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Report = require('../models/Report');
const upload = require('../middleware/upload');

// @GET /api/doctors/profile
router.get('/profile', protect, authorize('service_provider'), async (req, res) => {
  try {
    const profile = await Doctor.findOne({ userId: req.user._id });
    res.json({ success: true, user: req.user, profile });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// @PUT /api/doctors/profile
router.put('/profile', protect, authorize('service_provider'), upload.single('profileImage'), async (req, res) => {
  try {
    const { 
      name, phone, specialty, country, bio, experience, consultationFee, 
      isAvailableForVideo, education, languages, city, designation, gender, experienceYears,
      profileImage // can be Base64
    } = req.body;

    const updateUser = { name, phone };
    if (req.file) {
      updateUser.profileImage = `/uploads/${req.file.filename}`;
    } else if (profileImage && profileImage.startsWith('data:image')) {
      updateUser.profileImage = profileImage; // Directly store Base64
    }
    await User.findByIdAndUpdate(req.user._id, updateUser);

    const updateDoc = { 
      specialty, country, bio, experience, consultationFee, isAvailableForVideo,
      education, languages, city, designation, gender, experienceYears: Number(experienceYears || 0)
    };
    await Doctor.findOneAndUpdate({ userId: req.user._id }, updateDoc, { new: true, upsert: true });

    res.json({ success: true, message: 'Profile updated' });
  } catch (err) { 
    console.error('Profile Update Error:', err);
    res.status(500).json({ success: false, message: err.message }); 
  }
});

// @GET /api/doctors/appointments
router.get('/appointments', protect, authorize('service_provider'), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { doctorId: req.user._id };
    if (status) filter.status = status;
    const appointments = await Appointment.find(filter)
      .populate('patientId', 'name profileImage email phone')
      .sort({ date: -1 });
    res.json({ success: true, appointments });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// @PUT /api/doctors/appointments/:id
router.put('/appointments/:id', protect, authorize('service_provider'), async (req, res) => {
  try {
    const { status, remarks, medicines, suggestedTests, notes, prescription } = req.body;
    const appt = await Appointment.findOne({ _id: req.params.id, doctorId: req.user._id });
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });
    
    if (status) appt.status = status;
    if (notes) appt.notes = notes;
    if (prescription) appt.prescription = prescription;

    // On completion, update earnings and generate/update report
    if (status === 'completed') {
      const docProfile = await Doctor.findOne({ userId: req.user._id });
      if (docProfile) {
        docProfile.totalEarnings = (docProfile.totalEarnings || 0) + (appt.fee || 0);
        docProfile.clinicShare = (docProfile.clinicShare || 0) + (appt.fee * 0.2 || 0);
        await docProfile.save();
      }

      // Create or Update Report
      const reportData = {
        patientId: appt.patientId,
        doctorId: req.user._id,
        appointmentId: appt._id,
        title: `Consultation Report - ${new Date().toLocaleDateString()}`,
        description: remarks || appt.notes || 'Consultation completed.',
        remarks: remarks || '',
        medicines: medicines || '',
        suggestedTests: suggestedTests || '',
        type: 'prescription'
      };

      await Report.findOneAndUpdate(
        { appointmentId: appt._id },
        reportData,
        { upsert: true, new: true }
      );
    }
    await appt.save();
    res.json({ success: true, appointment: appt });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// @GET /api/doctors/patients
router.get('/patients', protect, authorize('doctor'), async (req, res) => {
  try {
    const appointments = await Appointment.find({ doctorId: req.user._id }).distinct('patientId');
    const patients = await User.find({ _id: { $in: appointments } }).select('-password');
    res.json({ success: true, patients });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// @GET /api/doctors/earnings
router.get('/earnings', protect, authorize('doctor'), async (req, res) => {
  try {
    const profile = await Doctor.findOne({ userId: req.user._id });
    const totalAppts = await Appointment.countDocuments({ doctorId: req.user._id });
    const completed = await Appointment.countDocuments({ doctorId: req.user._id, status: 'completed' });
    res.json({ success: true, earnings: { totalEarnings: profile?.totalEarnings || 0, clinicShare: profile?.clinicShare || 0, totalAppointments: totalAppts, completed } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// @POST /api/doctors/reports - create or manual patient report
router.post('/reports', protect, authorize('doctor'), async (req, res) => {
  try {
    const { patientId, appointmentId, title, description, remarks, medicines, suggestedTests, type } = req.body;
    
    // Validate patientId
    if (!patientId) return res.status(400).json({ success: false, message: 'patientId is required' });

    const report = await Report.create({
      patientId,
      doctorId: req.user._id,
      appointmentId,
      title: title || 'Medical Report',
      description: description || '',
      remarks: remarks || '',
      medicines: medicines || '',
      suggestedTests: suggestedTests || '',
      type: type || 'prescription'
    });

    res.status(201).json({ success: true, report });
  } catch (err) {
    console.error('Report Creation Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
