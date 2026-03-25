const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  logoUrl: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  socialLinks: {
    facebook: { type: String, default: '' },
    twitter: { type: String, default: '' },
    instagram: { type: String, default: '' },
    linkedin: { type: String, default: '' }
  },
  otherSettings: {
    type: Map,
    of: String,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
