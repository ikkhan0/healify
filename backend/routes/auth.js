const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const OTP = require('../models/OTP');
const sendOTP = require('../utils/sendOTP');

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'telemind_secret_key_123';
  const expire = process.env.JWT_EXPIRE || '7d';
  return jwt.sign({ id }, secret, { expiresIn: expire });
};

// @POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, specialty, country } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ success: false, message: 'All fields required' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({ name, email, password, role, phone });

    if (role === 'service_provider') {
      await Doctor.create({ userId: user._id, specialty: specialty || 'General Services', country: country || '' });
    } else if (role === 'client') {
      await Patient.create({ userId: user._id });
    }

    res.status(201).json({ success: true, message: 'Registered! Please verify your email.', userId: user._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const token = generateToken(user._id);
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role, profileImage: user.profileImage, isVerified: user.isVerified } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // 1. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await OTP.deleteMany({ userId: user._id });
    await OTP.create({ userId: user._id, email, otp, expiresAt });

    // 2. Check if real email should be sent
    const hasCredentials = process.env.EMAIL_USER && !process.env.EMAIL_USER.includes('your_gmail');
    
    if (hasCredentials) {
      try {
        await sendOTP(email, otp);
        return res.json({ success: true, message: 'OTP sent to your email 📧' });
      } catch (mailErr) {
        console.error('Mail sending failed:', mailErr);
        // Fallback to console + bypass code if mail fails in dev
        if (process.env.NODE_ENV === 'development') {
           console.log(`\n📧 [DEV FALLBACK] OTP for ${email}: ${otp}\n`);
           return res.json({ success: true, message: 'Mail failed, but OTP (123456) is active for bypass.' });
        }
        return res.status(500).json({ success: false, message: 'Could not send email. Please try again later.' });
      }
    }

    // 3. Development Bypass (if no credentials)
    console.log(`\n📧 [DEV BYPASS] OTP for ${email}: ${otp}\n`);
    res.json({ success: true, message: 'OTP (Development Mode: 123456) has been set.' });
  } catch (err) {
    console.error('Send OTP Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = await OTP.findOne({ email, otp, used: false });
    if (!record) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    if (new Date() > record.expiresAt) return res.status(400).json({ success: false, message: 'OTP expired' });

    record.used = true;
    await record.save();
    await User.findByIdAndUpdate(record.userId, { isVerified: true });

    const user = await User.findById(record.userId);
    const token = generateToken(user._id);
    res.json({ success: true, message: 'Email verified successfully', token, user: { id: user._id, name: user.name, email: user.email, role: user.role, isVerified: true } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/auth/admin/login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, role: 'admin' });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }
    const token = generateToken(user._id);
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: 'admin' } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
