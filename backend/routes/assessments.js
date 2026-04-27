const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Assessment = require('../models/Assessment');
const { createNotification } = require('../utils/notificationHelper');

// Generic assessment questions (PHQ-9 style for mental health screening)
const GENERIC_QUESTIONS = [
  { text: 'Over the past 2 weeks, how often have you felt little interest or pleasure in doing things?', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'], answerType: 'scale' },
  { text: 'Over the past 2 weeks, how often have you felt down, depressed, or hopeless?', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'], answerType: 'scale' },
  { text: 'Over the past 2 weeks, how often have you had trouble falling or staying asleep, or sleeping too much?', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'], answerType: 'scale' },
  { text: 'Over the past 2 weeks, how often have you felt tired or had little energy?', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'], answerType: 'scale' },
  { text: 'Over the past 2 weeks, how often have you had poor appetite or been overeating?', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'], answerType: 'scale' },
  { text: 'Over the past 2 weeks, how often have you felt bad about yourself — or that you are a failure?', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'], answerType: 'scale' },
  { text: 'Over the past 2 weeks, how often have you had trouble concentrating on things, such as reading or watching TV?', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'], answerType: 'scale' },
  { text: 'Over the past 2 weeks, how often have you moved or spoken so slowly that others noticed? Or the opposite?', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'], answerType: 'scale' },
  { text: 'Over the past 2 weeks, how often have you had thoughts that you would be better off dead, or of hurting yourself?', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'], answerType: 'scale' },
  { text: 'How difficult have these problems made it for you to do your work, take care of things at home, or get along with others?', options: ['Not difficult at all', 'Somewhat difficult', 'Very difficult', 'Extremely difficult'], answerType: 'scale' }
];

// @GET /api/assessments/generic — get generic pre-appointment assessment template
router.get('/generic', protect, async (req, res) => {
  try {
    res.json({
      success: true,
      assessment: {
        type: 'generic',
        title: 'Mental Health Self-Assessment (PHQ-9)',
        description: 'This brief screening helps us understand your current mental health state before your appointment.',
        questions: GENERIC_QUESTIONS,
        maxScore: GENERIC_QUESTIONS.length * 3
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/assessments/patient — patient's assessments
router.get('/patient', protect, authorize('client'), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { patientId: req.user._id };
    if (status) filter.status = status;

    const assessments = await Assessment.find(filter)
      .populate('doctorId', 'name profileImage')
      .sort({ createdAt: -1 });

    // Filter out results where doctor hasn't made visible
    const filtered = assessments.map(a => {
      const obj = a.toObject();
      if (!obj.isVisibleToPatient) {
        delete obj.totalScore;
        delete obj.result;
      }
      return obj;
    });

    res.json({ success: true, assessments: filtered });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/assessments/doctor — doctor's patient assessments
router.get('/doctor', protect, authorize('service_provider'), async (req, res) => {
  try {
    const { patientId } = req.query;
    const filter = { doctorId: req.user._id };
    if (patientId) filter.patientId = patientId;

    const assessments = await Assessment.find(filter)
      .populate('patientId', 'name email profileImage')
      .sort({ createdAt: -1 });

    res.json({ success: true, assessments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/assessments — doctor recommends a specific assessment
router.post('/', protect, authorize('service_provider'), async (req, res) => {
  try {
    const { patientId, appointmentId, title, description, questions } = req.body;
    if (!patientId) return res.status(400).json({ success: false, message: 'patientId is required' });

    const assessment = await Assessment.create({
      patientId,
      doctorId: req.user._id,
      appointmentId,
      type: 'specific',
      title: title || 'Recommended Assessment',
      description: description || 'Your counsellor has recommended this assessment for you.',
      questions: questions || GENERIC_QUESTIONS,
      maxScore: (questions || GENERIC_QUESTIONS).length * 3,
      recommendedBy: req.user._id,
      status: 'pending'
    });

    // Notify patient
    await createNotification({
      userId: patientId,
      type: 'assessment',
      title: 'New Assessment Recommended',
      message: `Your counsellor has recommended an assessment: "${assessment.title}". Please complete it at your earliest convenience.`,
      metadata: { assessmentId: assessment._id, fromUserId: req.user._id }
    });

    res.status(201).json({ success: true, assessment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/assessments/generic/submit — patient submits generic assessment
router.post('/generic/submit', protect, authorize('client'), async (req, res) => {
  try {
    const { appointmentId, answers } = req.body;

    // Calculate score
    let totalScore = 0;
    const processedAnswers = answers.map((ans, i) => {
      const score = ans.score || 0;
      totalScore += score;
      return { questionIndex: i, answer: ans.answer, score };
    });

    // Determine result
    let result = 'Minimal';
    if (totalScore >= 5) result = 'Mild';
    if (totalScore >= 10) result = 'Moderate';
    if (totalScore >= 15) result = 'Moderately Severe';
    if (totalScore >= 20) result = 'Severe';

    const assessment = await Assessment.create({
      patientId: req.user._id,
      appointmentId,
      type: 'generic',
      title: 'Mental Health Self-Assessment (PHQ-9)',
      questions: GENERIC_QUESTIONS,
      answers: processedAnswers,
      totalScore,
      maxScore: GENERIC_QUESTIONS.length * 3,
      result,
      isVisibleToPatient: false, // Doctor will decide
      status: 'completed'
    });

    res.status(201).json({ success: true, assessment, result, totalScore });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @PUT /api/assessments/:id/submit — patient submits answers for a specific assessment
router.put('/:id/submit', protect, authorize('client'), async (req, res) => {
  try {
    const assessment = await Assessment.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found' });
    if (assessment.status === 'completed') return res.status(400).json({ success: false, message: 'Assessment already completed' });

    const { answers } = req.body;
    let totalScore = 0;
    const processedAnswers = answers.map((ans, i) => {
      const score = ans.score || 0;
      totalScore += score;
      return { questionIndex: i, answer: ans.answer, score };
    });

    let result = 'Minimal';
    if (totalScore >= 5) result = 'Mild';
    if (totalScore >= 10) result = 'Moderate';
    if (totalScore >= 15) result = 'Moderately Severe';
    if (totalScore >= 20) result = 'Severe';

    assessment.answers = processedAnswers;
    assessment.totalScore = totalScore;
    assessment.result = result;
    assessment.status = 'completed';
    await assessment.save();

    // Notify doctor
    if (assessment.doctorId) {
      await createNotification({
        userId: assessment.doctorId,
        type: 'assessment',
        title: 'Assessment Completed',
        message: `Patient has completed the assessment: "${assessment.title}". Score: ${totalScore}/${assessment.maxScore} (${result}).`,
        metadata: { assessmentId: assessment._id, fromUserId: req.user._id }
      });
    }

    res.json({ success: true, assessment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @PUT /api/assessments/:id/visibility — doctor toggles report visibility
router.put('/:id/visibility', protect, authorize('service_provider'), async (req, res) => {
  try {
    const assessment = await Assessment.findOne({ _id: req.params.id, doctorId: req.user._id });
    if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found' });

    assessment.isVisibleToPatient = req.body.isVisibleToPatient;
    await assessment.save();

    // Notify patient if making visible
    if (req.body.isVisibleToPatient) {
      await createNotification({
        userId: assessment.patientId,
        type: 'assessment',
        title: 'Assessment Results Available',
        message: `Your counsellor has made the results of "${assessment.title}" available for you to view.`,
        metadata: { assessmentId: assessment._id }
      });
    }

    res.json({ success: true, message: `Assessment ${req.body.isVisibleToPatient ? 'visible' : 'hidden'} to patient` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
