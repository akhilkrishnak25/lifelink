const nodemailer = require('nodemailer');

/**
 * Send real-time notification via Socket.IO
 */
exports.sendSocketNotification = (io, userId, notification) => {
  try {
    io.to(userId.toString()).emit('notification', notification);
    console.log(`📢 Socket notification sent to user ${userId}`);
  } catch (error) {
    console.error('Socket notification error:', error);
  }
};

/**
 * Broadcast to location-based room
 */
exports.broadcastToLocation = (io, city, notification) => {
  try {
    io.to(`location-${city}`).emit('notification', notification);
    console.log(`📢 Broadcast sent to location: ${city}`);
  } catch (error) {
    console.error('Location broadcast error:', error);
  }
};

/**
 * Send email notification
 */
exports.sendEmailNotification = async (to, subject, html) => {
  try {
    // Create transporter using Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const mailOptions = {
      from: `"LifeLink" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('Email notification error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send push notification (Web Push API)
 */
exports.sendPushNotification = async (subscription, payload) => {
  try {
    // Will be implemented with Web Push API
    console.log('📱 Push notification queued');
    return { success: true };
  } catch (error) {
    console.error('Push notification error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create notification object
 */
exports.createNotification = (type, title, message, data = {}) => {
  return {
    type, // 'request', 'response', 'reminder', 'alert'
    title,
    message,
    data,
    timestamp: new Date(),
    read: false
  };
};

/**
 * Send multi-channel notification
 */
exports.sendMultiChannelNotification = async (io, userId, email, notification, channels = ['socket', 'email']) => {
  const results = {};

  if (channels.includes('socket')) {
    this.sendSocketNotification(io, userId, notification);
    results.socket = true;
  }

  if (channels.includes('email') && email) {
    const emailResult = await this.sendEmailNotification(
      email,
      notification.title,
      notification.message
    );
    results.email = emailResult.success;
  }

  return results;
};
