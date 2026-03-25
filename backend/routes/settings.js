const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Settings = require('../models/Settings');

// @GET /api/settings
// Publicly fetch the global settings
router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      // Create default settings if none exist
      settings = await Settings.create({
        logoUrl: '',
        phone: '123-456-7890',
        email: 'info@healify.com',
        address: '123 Health St, Wellness City',
        socialLinks: {
          facebook: '',
          twitter: '',
          instagram: '',
          linkedin: ''
        }
      });
    }
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @PUT /api/settings
// Update global settings (Admin only)
router.put('/', protect, authorize('admin'), async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings(req.body);
    } else {
      // Update existing settings
      Object.assign(settings, req.body);
    }
    await settings.save();
    res.json({ success: true, message: 'Settings updated successfully', settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
