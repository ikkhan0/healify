const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const User = require('../models/User');

const migrateRoles = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGO_URI is not defined in .env');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // 1. Update doctors to service_provider
    const doctorUpdates = await User.updateMany(
      { role: 'doctor' },
      { $set: { role: 'service_provider' } }
    );
    console.log(`👨‍⚕️ Updated ${doctorUpdates.modifiedCount} doctors to 'service_provider'`);

    // 2. Update patients to client
    const patientUpdates = await User.updateMany(
      { role: 'patient' },
      { $set: { role: 'client' } }
    );
    console.log(`👤 Updated ${patientUpdates.modifiedCount} patients to 'client'`);

    console.log('✨ Role migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
};

migrateRoles();
