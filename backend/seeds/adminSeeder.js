/* seeds/adminSeeder.js – Creates initial admin account */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  console.log('MONGO_URI:', process.env.MONGO_URI ? '✅ loaded' : '❌ missing');
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');

    const existing = await User.findOne({ role: 'admin' });
    if (existing) {
      console.log('ℹ️  Admin already exists:', existing.email);
      process.exit(0);
    }

    const admin = new User({
      name: 'Admin',
      email: 'admin@healify.com',
      password: 'admin123',  // Will be hashed by pre-save hook
      role: 'admin',
      isVerified: true,
      isActive: true
    });
    await admin.save();

    console.log('✅ Admin created!');
    console.log('   Email:    admin@healify.com');
    console.log('   Password: admin123');
  } catch (err) {
    console.error('❌ Seeder error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
