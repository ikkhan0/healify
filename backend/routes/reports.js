const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const { protect } = require('../middleware/auth');

// @desc    Get all reports (filtered by patientId for doctors)
// @route   GET /api/reports
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'client') {
      query.patientId = req.user._id;
    } else if (req.user.role === 'service_provider') {
      const { patientId, all } = req.query;
      if (all === 'true') {
        query.doctorId = req.user._id;
      } else {
        if (!patientId) return res.status(400).json({ success: false, message: 'patientId required' });
        query.patientId = patientId;
      }
    }
    
    const reports = await Report.find(query)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name specialty')
      .sort({ createdAt: -1 });
      
    res.json({ success: true, reports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

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
    if (req.user.role === 'client' && report.patientId._id.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to view this report' });
    }
    
    if (req.user.role === 'service_provider' && report.doctorId?._id.toString() !== req.user._id.toString()) {
       // Doctors can see reports they created
    }

    res.json({ success: true, report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
