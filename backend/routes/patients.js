const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Report = require('../models/Report');
const upload = require('../middleware/upload');

// @GET /api/patients/profile
router.get('/profile', protect, authorize('client'), async (req, res) => {
  try {
    const profile = await Patient.findOne({ userId: req.user._id });
    res.json({ success: true, user: req.user, profile });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// @PUT /api/patients/profile
router.put('/profile', protect, authorize('client'), upload.single('profileImage'), async (req, res) => {
  try {
    const { name, phone, age, gender, bloodGroup, weight, height, allergies, medicalHistory, emergencyContact } = req.body;
    const updateUser = { name, phone };
    if (req.file) updateUser.profileImage = `/uploads/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user._id, updateUser);

    const updatePatient = { age, gender, bloodGroup, weight, height };
    if (allergies) updatePatient.allergies = JSON.parse(allergies);
    if (medicalHistory) updatePatient.medicalHistory = JSON.parse(medicalHistory);
    if (emergencyContact) updatePatient.emergencyContact = JSON.parse(emergencyContact);
    await Patient.findOneAndUpdate({ userId: req.user._id }, updatePatient, { new: true, upsert: true });

    res.json({ success: true, message: 'Profile updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// @GET /api/patients/doctors  - list all doctors
router.get('/doctors', async (req, res) => {
  try {
    const { specialty, search } = req.query;
    let match = { role: 'service_provider', isActive: true };
    if (search) match.name = { $regex: search, $options: 'i' };

    const users = await User.find(match).select('-password');
    const results = await Promise.all(users.map(async (u) => {
      const doc = await Doctor.findOne({ userId: u._id });
      if (specialty && doc && doc.specialty.toLowerCase() !== specialty.toLowerCase()) return null;
      return { ...u.toObject(), doctorProfile: doc };
    }));
    res.json({ success: true, doctors: results.filter(Boolean) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// @GET /api/patients/doctors/:id
router.get('/doctors/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    const doc = await Doctor.findOne({ userId: req.params.id });
    if (!user || user.role !== 'service_provider') return res.status(404).json({ success: false, message: 'Doctor not found' });
    res.json({ success: true, doctor: { ...user.toObject(), doctorProfile: doc } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// @POST /api/patients/appointments  - book appointment
router.post('/appointments', protect, authorize('client'), async (req, res) => {
  try {
    const { doctorId, date, timeSlot, type, symptoms, intakeData, waiverData } = req.body;
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'service_provider') return res.status(404).json({ success: false, message: 'Doctor not found' });

    const docProfile = await Doctor.findOne({ userId: doctorId });
    const roomId = `telemind_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
    const appointment = await Appointment.create({
      patientId: req.user._id, 
      doctorId, 
      date, 
      timeSlot, 
      type: type || 'video',
      symptoms, 
      fee: docProfile ? docProfile.consultationFee : 0, 
      roomId,
      intakeData,
      waiverData
    });
    res.status(201).json({ success: true, appointment });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// @GET /api/patients/appointments
router.get('/appointments', protect, authorize('client'), async (req, res) => {
  try {
    const appointments = await Appointment.find({ patientId: req.user._id })
      .populate('doctorId', 'name profileImage email')
      .sort({ date: -1 });
    res.json({ success: true, appointments });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// @GET /api/patients/reports
router.get('/reports', protect, authorize('client'), async (req, res) => {
  try {
    const reports = await Report.find({ patientId: req.user._id })
      .populate('doctorId', 'name profileImage')
      .sort({ createdAt: -1 });
    res.json({ success: true, reports });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// @POST /api/patients/doctors/:id/reviews
router.post('/doctors/:id/reviews', protect, authorize('client'), async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || !comment) return res.status(400).json({ success: false, message: 'Rating and comment required' });
    
    // Check if appointment exists and is completed (optional strictness, for now we just allow patients)
    const doctor = await Doctor.findOne({ userId: req.params.id });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
    
    const review = {
      patientName: req.user.name,
      rating: Number(rating),
      comment
    };
    
    doctor.reviews.push(review);
    doctor.reviewCount = doctor.reviews.length;
    doctor.rating = (doctor.reviews.reduce((acc, r) => acc + r.rating, 0) / doctor.reviewCount).toFixed(1);
    
    await doctor.save();
    res.status(201).json({ success: true, message: 'Review added', doctor });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// @POST /api/patients/reports - patient upload
router.post('/reports', protect, authorize('client'), upload.single('file'), async (req, res) => {
  try {
    const { title, description, type } = req.body;
    const report = new Report({
      patientId: req.user._id,
      title: title || 'Medical Record',
      description,
      type: type || 'general',
      fileUrl: req.file ? `/uploads/${req.file.filename}` : null
    });
    await report.save();
    res.json({ success: true, report });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
