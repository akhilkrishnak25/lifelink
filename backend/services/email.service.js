const nodemailer = require('nodemailer');

/**
 * Email Service - Free SMTP using Gmail
 * Configure Gmail App Password in .env file
 */

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD // Gmail App Password
    }
  });
};

/**
 * Send Email OTP for verification
 */
exports.sendEmailOtp = async (email, name, otp) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `LifeLink <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Email Verification - LifeLink',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #dc2626; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #dc2626; letter-spacing: 8px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🩸 LifeLink</h1>
              <p>Email Verification Required</p>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>Thank you for registering with LifeLink. Please verify your email address to complete your registration.</p>
              
              <div class="otp-box">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your One-Time Password (OTP)</p>
                <div class="otp-code">${otp}</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul style="margin: 5px 0; padding-left: 20px;">
                  <li>This OTP is valid for <strong>5 minutes</strong></li>
                  <li>Do not share this code with anyone</li>
                  <li>If you didn't request this, please ignore this email</li>
                </ul>
              </div>
              
              <p>Enter this OTP on the verification page to activate your account.</p>
              
              <div class="footer">
                <p>This is an automated email from LifeLink. Please do not reply.</p>
                <p>&copy; ${new Date().getFullYear()} LifeLink - Connecting Lives, Saving Lives</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('OTP Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send verification email. Please try again.');
  }
};

/**
 * Send Password Reset OTP
 */
exports.sendPasswordResetOtp = async (email, name, otp) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `LifeLink <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request - LifeLink',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #dc2626; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #dc2626; letter-spacing: 8px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }
            .security { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 10px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🩸 LifeLink</h1>
              <p>Password Reset Request</p>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>We received a request to reset your password. Use the OTP below to proceed with resetting your password.</p>
              
              <div class="otp-box">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your One-Time Password (OTP)</p>
                <div class="otp-code">${otp}</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul style="margin: 5px 0; padding-left: 20px;">
                  <li>This OTP is valid for <strong>5 minutes</strong></li>
                  <li>Do not share this code with anyone</li>
                  <li>If you didn't request this, please ignore this email</li>
                </ul>
              </div>
              
              <div class="security">
                <strong>🔒 Security Note:</strong>
                <p style="margin: 5px 0;">If you didn't request a password reset, your account may be at risk. Please contact support immediately.</p>
              </div>
              
              <div class="footer">
                <p>This is an automated email from LifeLink. Please do not reply.</p>
                <p>&copy; ${new Date().getFullYear()} LifeLink - Connecting Lives, Saving Lives</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password Reset OTP Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email. Please try again.');
  }
};

/**
 * Send Admin Approval Notification
 */
exports.sendAdminApprovalNotification = async (email, name, status, reason = null) => {
  try {
    const transporter = createTransporter();
    
    const isApproved = status === 'approved';
    const statusColor = isApproved ? '#10b981' : '#dc2626';
    const statusText = isApproved ? 'APPROVED' : 'REJECTED';
    
    const mailOptions = {
      from: `LifeLink <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Admin Registration ${statusText} - LifeLink`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .status-box { background: white; border: 3px solid ${statusColor}; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .status-text { font-size: 24px; font-weight: bold; color: ${statusColor}; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .info-box { background: ${isApproved ? '#d1fae5' : '#fee2e2'}; border-left: 4px solid ${statusColor}; padding: 15px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🩸 LifeLink</h1>
              <p>Admin Registration Update</p>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              
              <div class="status-box">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Application Status</p>
                <div class="status-text">${statusText}</div>
              </div>
              
              ${isApproved ? `
                <div class="info-box">
                  <p><strong>✅ Congratulations!</strong></p>
                  <p>Your admin registration has been approved by the Super Admin. You can now log in and access admin features.</p>
                  <p style="margin-top: 15px;"><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Login Now</a></p>
                </div>
              ` : `
                <div class="info-box">
                  <p><strong>❌ Registration Rejected</strong></p>
                  <p>Unfortunately, your admin registration request has been rejected.</p>
                  ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                  <p>If you believe this is an error, please contact support.</p>
                </div>
              `}
              
              <div class="footer">
                <p>This is an automated email from LifeLink. Please do not reply.</p>
                <p>&copy; ${new Date().getFullYear()} LifeLink - Connecting Lives, Saving Lives</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Admin approval notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending admin approval email:', error);
    throw new Error('Failed to send notification email.');
  }
};

/**
 * Send Welcome Email (after successful verification)
 */
exports.sendWelcomeEmail = async (email, name, role) => {
  try {
    const transporter = createTransporter();
    
    const roleText = role === 'admin' ? 'Admin' : 'Member';
    
    const mailOptions = {
      from: `LifeLink <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Welcome to LifeLink - ${roleText}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .welcome-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
            .feature { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #dc2626; border-radius: 4px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .cta-button { background: #dc2626; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🩸 LifeLink</h1>
              <h2>Welcome Aboard!</h2>
            </div>
            <div class="content">
              <div class="welcome-box">
                <h2>Hello ${name}! 👋</h2>
                <p style="font-size: 18px; color: #666;">Thank you for joining LifeLink - where every drop counts!</p>
              </div>
              
              <p>Your email has been successfully verified and your account is now active.</p>
              
              <h3>🎯 What You Can Do:</h3>
              
              <div class="feature">
                <strong>🔍 Find Blood Donors</strong>
                <p>Search for available donors by blood group and location</p>
              </div>
              
              <div class="feature">
                <strong>🩸 Donate Blood</strong>
                <p>Register as a donor and help save lives</p>
              </div>
              
              <div class="feature">
                <strong>📱 Get Notifications</strong>
                <p>Receive alerts for urgent blood requests near you</p>
              </div>
              
              <div class="feature">
                <strong>🏆 Earn Rewards</strong>
                <p>Track your donations and earn badges</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="cta-button">Get Started</a>
              </div>
              
              <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                <strong>Need Help?</strong><br>
                Visit our help center or contact support anytime.
              </p>
              
              <div class="footer">
                <p>This is an automated email from LifeLink. Please do not reply.</p>
                <p>&copy; ${new Date().getFullYear()} LifeLink - Connecting Lives, Saving Lives</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error - welcome email is not critical
    return { success: false, error: error.message };
  }
};

module.exports = exports;
