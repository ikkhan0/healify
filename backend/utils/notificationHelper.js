const Notification = require('../models/Notification');

/**
 * Create a notification and optionally emit via socket.io
 * @param {Object} opts
 * @param {string} opts.userId - Recipient user ID
 * @param {string} opts.type - Notification type enum
 * @param {string} opts.title - Short title
 * @param {string} opts.message - Notification body
 * @param {string} [opts.link] - Optional deep-link
 * @param {Object} [opts.metadata] - Optional metadata (appointmentId, assessmentId, fromUserId)
 * @param {Object} [opts.io] - Socket.io instance for real-time push
 */
async function createNotification({ userId, type, title, message, link, metadata, io }) {
  try {
    const notification = await Notification.create({
      userId,
      type: type || 'general',
      title,
      message,
      link: link || '',
      metadata: metadata || {}
    });

    // Emit real-time notification via socket.io if available
    if (io) {
      io.to(`user_${userId}`).emit('notification', {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        createdAt: notification.createdAt
      });
    }

    return notification;
  } catch (err) {
    console.error('Failed to create notification:', err.message);
    return null;
  }
}

module.exports = { createNotification };
