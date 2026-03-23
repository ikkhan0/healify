/**
 * fullSeeder.js – Seeds Healify DB with realistic dummy data + profile photos
 * Run: npm run seed
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Report = require('../models/Report');

// ─── Seed Data ───────────────────────────────────────────────────────────────
const DOCTORS = [
  {
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@healify.com',
    phone: '+1-555-0101',
    photo: '/assets/profiles/doctor_sarah_johnson.png',
    specialty: 'Psychiatrist',
    bio: 'Board-certified psychiatrist with over 12 years of experience treating anxiety, depression, PTSD, and mood disorders. I believe in a holistic approach combining therapy and medication management to help patients achieve lasting mental wellness.',
    experience: 12,
    consultationFee: 1500,
    country: 'United States',
    rating: 4.9,
    reviewCount: 238,
    availability: [
      { day: 'Monday',    startTime: '09:00', endTime: '17:00' },
      { day: 'Wednesday', startTime: '09:00', endTime: '17:00' },
      { day: 'Friday',    startTime: '10:00', endTime: '14:00' }
    ]
  },
  {
    name: 'Dr. James Malik',
    email: 'james.malik@healify.com',
    phone: '+1-555-0102',
    photo: '/assets/profiles/doctor_james_malik.png',
    specialty: 'Psychologist',
    bio: 'Clinical psychologist specialising in cognitive-behavioural therapy (CBT) for adults and adolescents. 9 years treating anxiety disorders, OCD, phobias and trauma-related conditions. Fluent in English and Urdu.',
    experience: 9,
    consultationFee: 1200,
    country: 'United Kingdom',
    rating: 4.8,
    reviewCount: 174,
    availability: [
      { day: 'Tuesday',  startTime: '10:00', endTime: '18:00' },
      { day: 'Thursday', startTime: '10:00', endTime: '18:00' },
      { day: 'Saturday', startTime: '09:00', endTime: '13:00' }
    ]
  },
  {
    name: 'Dr. Amina Fatima',
    email: 'amina.fatima@healify.com',
    phone: '+92-300-1234567',
    photo: '/assets/profiles/doctor_amina_fatima.png',
    specialty: 'Therapist',
    bio: 'Licensed mental health therapist with a focus on mindfulness-based stress reduction and couples therapy. 7 years of clinical experience. I create a safe, non-judgmental space for every patient.',
    experience: 7,
    consultationFee: 800,
    country: 'Pakistan',
    rating: 4.7,
    reviewCount: 312,
    availability: [
      { day: 'Monday',    startTime: '14:00', endTime: '20:00' },
      { day: 'Wednesday', startTime: '14:00', endTime: '20:00' },
      { day: 'Friday',    startTime: '14:00', endTime: '18:00' }
    ]
  },
  {
    name: 'Dr. Robert Chen',
    email: 'robert.chen@healify.com',
    phone: '+1-555-0104',
    photo: '/assets/profiles/doctor_robert_chen.png',
    specialty: 'Neurologist',
    bio: 'Fellowship-trained neurologist specialising in headaches, sleep disorders, and neuropsychiatric conditions. Over 15 years helping patients understand the mind-brain connection.',
    experience: 15,
    consultationFee: 2000,
    country: 'Canada',
    rating: 4.9,
    reviewCount: 187,
    availability: [
      { day: 'Monday',  startTime: '08:00', endTime: '14:00' },
      { day: 'Tuesday', startTime: '08:00', endTime: '14:00' },
      { day: 'Thursday',startTime: '08:00', endTime: '14:00' }
    ]
  },
  {
    name: 'Dr. Maria Gonzalez',
    email: 'maria.gonzalez@healify.com',
    phone: '+1-555-0105',
    photo: '/assets/profiles/doctor_maria_gonzalez.png',
    specialty: 'Psychiatrist',
    bio: 'Child and adolescent psychiatrist with extensive experience in ADHD, autism-spectrum disorders and early-onset mood conditions. 10 years in practice. Bilingual English/Spanish.',
    experience: 10,
    consultationFee: 1800,
    country: 'United States',
    rating: 4.8,
    reviewCount: 265,
    availability: [
      { day: 'Tuesday',  startTime: '09:00', endTime: '17:00' },
      { day: 'Thursday', startTime: '09:00', endTime: '17:00' }
    ]
  },
  {
    name: 'Dr. Usman Tariq',
    email: 'usman.tariq@healify.com',
    phone: '+92-321-9876543',
    photo: '/assets/profiles/doctor_usman_tariq.png',
    specialty: 'Psychologist',
    bio: 'Counselling psychologist with 6 years of experience in relationship issues, grief, and work-related stress. Combines traditional therapy with modern digital mental-health tools.',
    experience: 6,
    consultationFee: 700,
    country: 'Pakistan',
    rating: 4.6,
    reviewCount: 89,
    availability: [
      { day: 'Monday',    startTime: '10:00', endTime: '16:00' },
      { day: 'Wednesday', startTime: '10:00', endTime: '16:00' },
      { day: 'Saturday',  startTime: '10:00', endTime: '14:00' }
    ]
  }
];

const PATIENTS = [
  { name: 'Ali Hassan',    email: 'ali.hassan@email.com',    phone: '+92-300-1111111', age: 28, bloodGroup: 'O+',  gender: 'male',   photo: '/assets/profiles/patient_ali_hassan.png'    },
  { name: 'Sara Ahmed',   email: 'sara.ahmed@email.com',    phone: '+92-300-2222222', age: 24, bloodGroup: 'A+',  gender: 'female', photo: '/assets/profiles/patient_sara_ahmed.png'   },
  { name: 'John Smith',   email: 'john.smith@email.com',    phone: '+1-555-3333',     age: 35, bloodGroup: 'B+',  gender: 'male',   photo: '/assets/profiles/patient_john_smith.png'   },
  { name: 'Fatima Malik', email: 'fatima.malik@email.com',  phone: '+92-321-4444444', age: 31, bloodGroup: 'AB-', gender: 'female', photo: '/assets/profiles/patient_fatima_malik.png' },
  { name: 'David Kim',    email: 'david.kim@email.com',     phone: '+1-555-5555',     age: 42, bloodGroup: 'O-',  gender: 'male',   photo: '/assets/profiles/patient_david_kim.png'    },
  { name: 'Zara Khan',    email: 'zara.khan@email.com',     phone: '+92-333-6666666', age: 26, bloodGroup: 'A-',  gender: 'female', photo: '/assets/profiles/patient_zara_khan.png'    }
];

const SLOTS  = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'];
const TYPES  = ['video', 'video', 'in-person'];
function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }

// ─── Main ────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Clear previous non-admin data
    await User.deleteMany({ role: { $in: ['patient', 'doctor'] } });
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
    await Appointment.deleteMany({});
    await Report.deleteMany({});
    console.log('🧹 Cleared previous seeded data');

    // ── Create Doctors ──────────────────────────────────────────────────────
    const createdDoctors = [];
    for (const d of DOCTORS) {
      const user = new User({
        name: d.name, email: d.email, phone: d.phone,
        password: 'doctor123', role: 'doctor',
        profileImage: d.photo,
        isVerified: true, isActive: true
      });
      await user.save();

      const profile = await Doctor.create({
        userId: user._id,
        specialty: d.specialty,
        bio: d.bio,
        experience: d.experience,
        consultationFee: d.consultationFee,
        country: d.country,
        rating: d.rating,
        reviewCount: d.reviewCount,
        totalEarnings: Math.floor(Math.random() * 80000) + 20000,
        patients: [],
        availability: d.availability
      });

      createdDoctors.push({ user, profile });
      console.log(`  👨‍⚕️ Doctor: ${d.name}`);
    }

    // ── Create Patients ─────────────────────────────────────────────────────
    const createdPatients = [];
    for (const p of PATIENTS) {
      const user = new User({
        name: p.name, email: p.email, phone: p.phone,
        password: 'patient123', role: 'patient',
        profileImage: p.photo,
        isVerified: true, isActive: true
      });
      await user.save();

      const profile = await Patient.create({
        userId: user._id,
        age: p.age,
        gender: p.gender,
        bloodGroup: p.bloodGroup,
        emergencyContact: { name: 'Emergency Contact', phone: '+92-300-0000000', relation: 'Family' }
      });

      createdPatients.push({ user, profile });
      console.log(`  🧑 Patient: ${p.name}`);
    }

    // ── Create Appointments ─────────────────────────────────────────────────
    const apptDefs = [
      [0, 0, -7,  'completed'],
      [0, 1, -3,  'completed'],
      [1, 2, -5,  'completed'],
      [1, 3, -1,  'confirmed'],
      [2, 4, -10, 'completed'],
      [2, 5, -2,  'confirmed'],
      [3, 0,  1,  'pending'],
      [3, 1,  3,  'pending'],
      [4, 2, -15, 'completed'],
      [4, 3,  2,  'confirmed'],
      [5, 4, -4,  'cancelled'],
      [5, 5,  4,  'pending'],
      [0, 2,  5,  'pending'],
      [1, 4, -6,  'completed'],
      [2, 0, -8,  'completed'],
    ];

    const createdAppts = [];
    for (const [di, pi, dayOff, status] of apptDefs) {
      const doc = createdDoctors[di];
      const pat = createdPatients[pi];
      const a = await Appointment.create({
        patientId: pat.user._id,
        doctorId:  doc.user._id,
        date:      daysAgo(-dayOff),
        timeSlot:  rnd(SLOTS),
        type:      rnd(TYPES),
        status,
        fee:       doc.profile.consultationFee,
        symptoms:  rnd(['Feeling anxious and unable to sleep', 'Persistent low mood and fatigue', 'Stress from work', 'Panic attacks', 'Concentration difficulties', '']),
        roomId:    `room_${Math.random().toString(36).slice(2, 10)}`
      });
      createdAppts.push(a);
    }
    console.log(`  📅 Created ${createdAppts.length} appointments`);

    // ── Create Reports ──────────────────────────────────────────────────────
    const completedAppts = createdAppts.filter(a => a.status === 'completed');
    const reportDefs = [
      { title: 'Initial Mental Health Assessment',  type: 'assessment',  desc: 'PHQ-9 score: 8 (mild depression). GAD-7 score: 6 (mild anxiety). Recommended CBT sessions and lifestyle changes.' },
      { title: 'Follow-up Therapy Session',         type: 'prescription', desc: 'Patient showing improvement. Continuing CBT. Prescribed Escitalopram 10mg once daily for 4 weeks.' },
      { title: 'Anxiety Disorder Evaluation',       type: 'assessment',  desc: 'Comprehensive assessment for generalised anxiety disorder. Identified key triggers. Started mindfulness-based therapy.' },
      { title: 'Sleep Disorder Report',             type: 'lab',         desc: 'Sleep study results indicate mild insomnia. Recommended sleep hygiene protocol and melatonin 3mg.' },
      { title: 'Mood Disorder Assessment',          type: 'assessment',  desc: 'Bipolar II screening completed. Results negative. Diagnosed with cyclothymia. Starting mood journaling.' },
      { title: 'Stress Management Plan',            type: 'prescription', desc: 'Developed personalised stress management protocol including breathing exercises, journaling and therapy schedule.' }
    ];

    for (let i = 0; i < Math.min(completedAppts.length, reportDefs.length); i++) {
      const a = completedAppts[i];
      const r = reportDefs[i];
      await Report.create({
        patientId: a.patientId,
        doctorId:  a.doctorId,
        appointmentId: a._id,
        title: r.title, type: r.type, description: r.desc,
        notes: 'Patient is cooperative and responsive to treatment.',
        createdAt: a.date
      });
    }
    console.log(`  📋 Created ${Math.min(completedAppts.length, reportDefs.length)} reports`);

    console.log('\n🎉 Seed complete!\n');
    console.log('─────────────────────────────────────────────────');
    console.log('  Admin:    admin@healify.com      / admin123');
    console.log('  Doctors:  sarah.johnson@...      / doctor123');
    console.log('  Patients: ali.hassan@email.com   / patient123');
    console.log('─────────────────────────────────────────────────\n');

  } catch (err) {
    console.error('❌ Seeder error:', err.message, err.stack);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
