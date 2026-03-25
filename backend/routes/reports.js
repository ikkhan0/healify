const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const { protect } = require('../middleware/auth');

// @desc    Get single report by ID
// @route   GET /api/reports/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name specialty');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Check ownership/access
    if (req.user.role === 'patient' && report.patientId._id.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to view this report' });
    }
    
    if (req.user.role === 'doctor' && report.doctorId?._id.toString() !== req.user._id.toString()) {
       // Doctors can see reports they created
    }

    res.json({ success: true, report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
