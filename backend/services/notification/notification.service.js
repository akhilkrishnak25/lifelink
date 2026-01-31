/**
 * LifeLink - Multi-Channel Emergency Notification Service
 * Handles SMS, Email, and Push Notifications for urgent blood requests
 */

const nodemailer = require('nodemailer');
const Notification = require('../../models/Notification');
const UserPreference = require('../../models/UserPreference');

/**
 * Notification urgency configuration
 */
const URGENCY_CHANNELS = {
  critical: ['sms', 'push', 'email'],
  urgent: ['push', 'email'],
  normal: ['push']
};

/**
 * SMS Service using Twilio
 */
class SMSService {
  constructor() {
    this.enabled = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
    if (this.enabled) {
      this.client = require('twilio')(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    }
  }

  async send(phoneNumber, message) {
    if (!this.enabled) {
      console.log(`📱 SMS (Mock): To ${phoneNumber} - ${message}`);
      return { success: true, mock: true, sid: 'mock-' + Date.now() };
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: phoneNumber
      });
      return { success: true, sid: result.sid };
    } catch (error) {
      console.error('SMS Error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Email Service using NodeMailer
 */
class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    this.fromEmail = process.env.SMTP_FROM || 'noreply@lifelink.com';
  }

  async send(to, subject, html, text) {
    try {
      const result = await this.transporter.sendMail({
        from: `"LifeLink" <${this.fromEmail}>`,
        to,
        subject,
        html,
        text
      });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  generateBloodRequestEmail(request, recipient) {
    const urgencyColors = {
      critical: '#dc3545',
      urgent: '#fd7e14',
      normal: '#28a745'
    };

    return {
      subject: `🩸 ${request.urgency.toUpperCase()} Blood Request - ${request.bloodGroup} Needed`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${urgencyColors[request.urgency]}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .info-row { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
            .label { font-weight: bold; color: #666; }
            .cta-button { display: inline-block; background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🩸 Emergency Blood Request</h1>
              <h2>${request.urgency.toUpperCase()} - ${request.bloodGroup}</h2>
            </div>
            <div class="content">
              <p>Dear ${recipient.name},</p>
              <p>A patient urgently needs blood that matches your donation profile.</p>
              
              <div class="info-row">
                <span class="label">Blood Group:</span> ${request.bloodGroup}
              </div>
              <div class="info-row">
                <span class="label">Units Required:</span> ${request.unitsRequired}
              </div>
              <div class="info-row">
                <span class="label">Hospital:</span> ${request.hospitalName}
              </div>
              <div class="info-row">
                <span class="label">Location:</span> ${request.city}, ${request.state}
              </div>
              <div class="info-row">
                <span class="label">Patient:</span> ${request.patientName}
              </div>
              
              <center>
                <a href="${process.env.FRONTEND_URL}/donor-dashboard.html?request=${request._id}" class="cta-button">
                  Respond to Request
                </a>
              </center>
              
              <p>Every second counts. Your donation can save a life!</p>
            </div>
            <div class="footer">
              <p>LifeLink Blood Donation Platform</p>
              <p>You received this email because you are a registered donor.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
EMERGENCY BLOOD REQUEST - ${request.urgency.toUpperCase()}

Dear ${recipient.name},

A patient urgently needs ${request.bloodGroup} blood.

Details:
- Blood Group: ${request.bloodGroup}
- Units Required: ${request.unitsRequired}
- Hospital: ${request.hospitalName}
- Location: ${request.city}, ${request.state}

Please log in to LifeLink to respond to this request.

Every second counts. Your donation can save a life!

- LifeLink Team
      `
    };
  }
}

/**
 * Push Notification Service using Firebase Cloud Messaging
 */
class PushService {
  constructor() {
    this.enabled = !!process.env.FIREBASE_SERVER_KEY;
    if (this.enabled) {
      const admin = require('firebase-admin');
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
          })
        });
      }
      this.messaging = admin.messaging();
    }
  }

  async send(token, title, body, data = {}) {
    if (!this.enabled) {
      console.log(`🔔 Push (Mock): To ${token.substring(0, 20)}... - ${title}: ${body}`);
      return { success: true, mock: true };
    }

    try {
      const message = {
        notification: { title, body },
        data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
        token
      };
      const result = await this.messaging.send(message);
      return { success: true, messageId: result };
    } catch (error) {
      console.error('Push Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendToTopic(topic, title, body, data = {}) {
    if (!this.enabled) {
      console.log(`🔔 Push Topic (Mock): To ${topic} - ${title}: ${body}`);
      return { success: true, mock: true };
    }

    try {
      const message = {
        notification: { title, body },
        data,
        topic
      };
      const result = await this.messaging.send(message);
      return { success: true, messageId: result };
    } catch (error) {
      console.error('Push Topic Error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Redis Queue Service for message buffering
 */
class NotificationQueue {
  constructor() {
    this.enabled = !!process.env.REDIS_URL;
    this.queue = [];
    
    if (this.enabled) {
      const Redis = require('ioredis');
      this.redis = new Redis(process.env.REDIS_URL);
    }
  }

  async enqueue(notification) {
    if (this.enabled) {
      await this.redis.lpush('notification_queue', JSON.stringify(notification));
    } else {
      this.queue.push(notification);
    }
  }

  async dequeue() {
    if (this.enabled) {
      const item = await this.redis.rpop('notification_queue');
      return item ? JSON.parse(item) : null;
    } else {
      return this.queue.shift() || null;
    }
  }

  async getQueueLength() {
    if (this.enabled) {
      return await this.redis.llen('notification_queue');
    }
    return this.queue.length;
  }
}

/**
 * Main Multi-Channel Notification Service
 */
class MultiChannelNotificationService {
  constructor(io) {
    this.io = io;
    this.sms = new SMSService();
    this.email = new EmailService();
    this.push = new PushService();
    this.queue = new NotificationQueue();
  }

  /**
   * Send emergency notification based on urgency level
   */
  async sendEmergencyNotification(request, recipients) {
    const channels = URGENCY_CHANNELS[request.urgency] || URGENCY_CHANNELS.normal;
    const results = {
      sms: [],
      email: [],
      push: [],
      socket: []
    };

    for (const recipient of recipients) {
      // Check user preferences
      const preferences = await UserPreference.findOne({ userId: recipient.userId?._id || recipient._id });
      
      for (const channel of channels) {
        // Skip if user has disabled this channel
        if (preferences && preferences.notifications && !preferences.notifications[channel]) {
          continue;
        }

        try {
          switch (channel) {
            case 'sms':
              if (recipient.phone || recipient.userId?.phone) {
                const phone = recipient.phone || recipient.userId.phone;
                const smsResult = await this.sms.send(
                  phone,
                  `🩸 URGENT: ${request.bloodGroup} blood needed at ${request.hospitalName}. ` +
                  `Patient: ${request.patientName}. Please respond ASAP via LifeLink app.`
                );
                results.sms.push({ recipient: phone, ...smsResult });
                
                // Emit socket event
                this.io?.emit('sms-dispatched', { phone, requestId: request._id });
              }
              break;

            case 'email':
              if (recipient.email || recipient.userId?.email) {
                const email = recipient.email || recipient.userId.email;
                const name = recipient.name || recipient.userId?.name || 'Donor';
                const emailContent = this.email.generateBloodRequestEmail(request, { name, email });
                const emailResult = await this.email.send(
                  email,
                  emailContent.subject,
                  emailContent.html,
                  emailContent.text
                );
                results.email.push({ recipient: email, ...emailResult });
                
                // Emit socket event
                this.io?.emit('email-sent', { email, requestId: request._id });
              }
              break;

            case 'push':
              if (recipient.fcmToken) {
                const pushResult = await this.push.send(
                  recipient.fcmToken,
                  `🩸 ${request.urgency.toUpperCase()}: ${request.bloodGroup} Needed`,
                  `${request.hospitalName} - ${request.city}. Tap to respond.`,
                  { requestId: request._id.toString(), type: 'blood_request' }
                );
                results.push.push({ recipient: recipient.fcmToken.substring(0, 20), ...pushResult });
                
                // Emit socket event
                this.io?.emit('push-notify', { userId: recipient.userId?._id || recipient._id, requestId: request._id });
              }
              break;
          }
        } catch (error) {
          console.error(`Notification error (${channel}):`, error.message);
        }
      }

      // Always send Socket.IO notification
      const userId = recipient.userId?._id || recipient._id;
      if (userId) {
        this.io?.to(userId.toString()).emit('urgent-alert', {
          type: 'blood_request',
          urgency: request.urgency,
          request: {
            id: request._id,
            bloodGroup: request.bloodGroup,
            hospital: request.hospitalName,
            city: request.city,
            unitsRequired: request.unitsRequired
          },
          timestamp: new Date()
        });
        results.socket.push({ userId: userId.toString(), sent: true });
      }
    }

    // Log notification
    await this.logNotification(request, results);

    return results;
  }

  /**
   * Send notification to a specific blood group topic
   */
  async sendBloodGroupAlert(bloodGroup, request) {
    const topic = `blood_group_${bloodGroup.replace('+', 'pos').replace('-', 'neg')}`;
    return await this.push.sendToTopic(
      topic,
      `🩸 ${request.urgency.toUpperCase()}: ${bloodGroup} Blood Needed`,
      `${request.hospitalName} needs ${request.unitsRequired} units. Tap to help.`,
      { requestId: request._id.toString(), type: 'blood_request' }
    );
  }

  /**
   * Log notification to database
   */
  async logNotification(request, results) {
    try {
      await Notification.create({
        type: 'emergency_blood_request',
        referenceId: request._id,
        referenceModel: 'BloodRequest',
        channels: Object.keys(results).filter(k => results[k].length > 0),
        results: {
          smsCount: results.sms.filter(r => r.success).length,
          emailCount: results.email.filter(r => r.success).length,
          pushCount: results.push.filter(r => r.success).length,
          socketCount: results.socket.length
        },
        metadata: {
          urgency: request.urgency,
          bloodGroup: request.bloodGroup,
          hospital: request.hospitalName
        }
      });
    } catch (error) {
      console.error('Notification log error:', error.message);
    }
  }

  /**
   * Get notification logs
   */
  async getNotificationLogs(filters = {}, page = 1, limit = 20) {
    const query = {};
    
    if (filters.type) query.type = filters.type;
    if (filters.startDate) query.createdAt = { $gte: new Date(filters.startDate) };
    if (filters.endDate) {
      query.createdAt = query.createdAt || {};
      query.createdAt.$lte = new Date(filters.endDate);
    }

    const logs = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Notification.countDocuments(query);

    return { logs, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(userId, preferences) {
    return await UserPreference.findOneAndUpdate(
      { userId },
      { $set: { notifications: preferences } },
      { upsert: true, new: true }
    );
  }
}

module.exports = {
  MultiChannelNotificationService,
  SMSService,
  EmailService,
  PushService,
  NotificationQueue,
  URGENCY_CHANNELS
};
