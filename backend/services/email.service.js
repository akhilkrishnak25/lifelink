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

/**
 * Send High-Severity Request Alert to Admins
 */
exports.sendHighSeverityAlert = async (requestData, locationAnalysis, adminEmails = []) => {
  try {
    const transporter = createTransporter();
    
    // Get admin emails from env or use provided list
    const recipients = adminEmails.length > 0 
      ? adminEmails.join(',') 
      : process.env.ADMIN_EMAIL || 'admin@lifelink.com';
    
    const severityColor = locationAnalysis.severity >= 80 ? '#dc2626' : '#f59e0b';
    const severityLabel = locationAnalysis.severity >= 80 ? 'HIGH RISK' : 'MEDIUM RISK';
    
    const flagBadges = locationAnalysis.flags.map(flag => {
      const flagLabels = {
        location_jump: '📍 Location Jump',
        impossible_travel: '✈️ Impossible Travel',
        rapid_requests: '⚡ Rapid Requests',
        different_ip: '🌐 Different IP',
        vpn_detected: '🔒 VPN Detected'
      };
      return `<span style="background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin: 2px; display: inline-block;">${flagLabels[flag] || flag}</span>`;
    }).join('');
    
    const mailOptions = {
      from: `LifeLink Fraud Detection <${process.env.EMAIL_USER}>`,
      to: recipients,
      subject: `🚨 ${severityLabel} - Suspicious Blood Request Detected`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, ${severityColor} 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .alert-box { background: #fee2e2; border: 2px solid ${severityColor}; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .severity-badge { background: ${severityColor}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
            .info-item { background: white; padding: 12px; border-left: 3px solid ${severityColor}; border-radius: 4px; }
            .info-label { font-size: 12px; color: #666; display: block; }
            .info-value { font-size: 16px; font-weight: bold; color: #333; }
            .flags-container { margin: 15px 0; }
            .cta-button { background: ${severityColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 5px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
            .reasons-list { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 Fraud Detection Alert</h1>
              <p style="margin: 5px 0; font-size: 14px; opacity: 0.9;">Location-Based Pattern Analysis</p>
              <span class="severity-badge">Severity: ${locationAnalysis.severity}%</span>
            </div>
            <div class="content">
              <div class="alert-box">
                <h2 style="margin-top: 0; color: ${severityColor};">⚠️ Suspicious Blood Request Flagged</h2>
                <p>A blood request has been flagged by our location-based fraud detection system for manual review.</p>
              </div>
              
              <h3>📋 Request Details</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Blood Group</span>
                  <span class="info-value">${requestData.bloodGroup}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Urgency</span>
                  <span class="info-value">${requestData.urgency.toUpperCase()}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Hospital</span>
                  <span class="info-value">${requestData.hospitalName}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Patient</span>
                  <span class="info-value">${requestData.patientName}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Location</span>
                  <span class="info-value">${requestData.location?.city || 'N/A'}, ${requestData.location?.state || ''}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Units Required</span>
                  <span class="info-value">${requestData.unitsRequired}</span>
                </div>
              </div>
              
              <h3>🚩 Detection Flags</h3>
              <div class="flags-container">
                ${flagBadges}
              </div>
              
              <div class="reasons-list">
                <strong>📊 Analysis Details:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  ${locationAnalysis.details ? Object.entries(locationAnalysis.details).map(([key, value]) => 
                    `<li><strong>${key}:</strong> ${JSON.stringify(value)}</li>`
                  ).join('') : '<li>No additional details available</li>'}
                </ul>
                ${locationAnalysis.flags.includes('impossible_travel') ? 
                  '<p style="color: #991b1b; font-weight: bold;">⚠️ IMPOSSIBLE TRAVEL DETECTED - This request shows physical travel that is not humanly possible in the given timeframe.</p>' : ''}
                ${locationAnalysis.flags.includes('rapid_requests') ? 
                  '<p style="color: #f59e0b; font-weight: bold;">⚡ RAPID REQUESTS - Multiple requests submitted in a very short time period.</p>' : ''}
              </div>
              
              <h3>👤 User Information</h3>
              <div class="info-item" style="margin: 10px 0;">
                <span class="info-label">IP Address</span>
                <span class="info-value">${locationAnalysis.details?.ipAddress || 'N/A'}</span>
              </div>
              <div class="info-item" style="margin: 10px 0;">
                <span class="info-label">Location (IP-based)</span>
                <span class="info-value">${locationAnalysis.details?.city || 'Unknown'}, ${locationAnalysis.details?.country || 'Unknown'}</span>
              </div>
              ${locationAnalysis.details?.distanceFromLast ? `
                <div class="info-item" style="margin: 10px 0;">
                  <span class="info-label">Distance from Last Request</span>
                  <span class="info-value">${locationAnalysis.details.distanceFromLast.toFixed(1)} km</span>
                </div>
              ` : ''}
              ${locationAnalysis.details?.timeSinceLast ? `
                <div class="info-item" style="margin: 10px 0;">
                  <span class="info-label">Time Since Last Request</span>
                  <span class="info-value">${locationAnalysis.details.timeSinceLast} minutes</span>
                </div>
              ` : ''}
              
              <div style="text-align: center; margin: 30px 0;">
                <p><strong>⚡ Action Required:</strong> This request requires manual admin review before processing.</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin-dashboard.html" class="cta-button">Review Request Now</a>
              </div>
              
              <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0;">
                <strong>🔍 What happens next?</strong>
                <ol style="margin: 10px 0; padding-left: 20px;">
                  <li>Request is placed in <strong>pending review</strong> status</li>
                  <li>AI matching is paused until admin approval</li>
                  <li>Admin can approve or reject the request</li>
                  <li>User is notified of the review requirement</li>
                </ol>
              </div>
              
              <div class="footer">
                <p><strong>LifeLink Fraud Detection System</strong></p>
                <p>This alert was generated automatically by the location-based pattern analysis engine.</p>
                <p style="margin-top: 10px;">Request ID: ${requestData._id || 'N/A'}</p>
                <p>Timestamp: ${new Date().toLocaleString()}</p>
                <p>&copy; ${new Date().getFullYear()} LifeLink - Protecting the integrity of blood donation</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('High-Severity Alert Email sent to admins:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending high-severity alert email:', error);
    // Don't throw error - email failure shouldn't block request processing
    return { success: false, error: error.message };
  }
};

/**
 * Send donation certificate to donor
 */
exports.sendDonationCertificate = async (email, donorName, certificatePath) => {
  try {
    const mailOptions = {
      from: {
        name: 'LifeLink - Blood Donor Network',
        address: process.env.EMAIL_FROM || 'noreply@lifelink.com'
      },
      to: email,
      subject: '🎓 Your LifeLink Donation Certificate',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #C41E3A 0%, #8B0000 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 30px;
            }
            .certificate-icon {
              text-align: center;
              font-size: 60px;
              margin: 20px 0;
            }
            .message {
              background-color: #f8f9fa;
              border-left: 4px solid #C41E3A;
              padding: 15px;
              margin: 20px 0;
            }
            .cta-button {
              display: inline-block;
              background-color: #C41E3A;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🩸 LIFELINK</h1>
              <p style="margin: 5px 0 0 0; font-size: 14px;">Blood Donor Network</p>
            </div>
            
            <div class="content">
              <div class="certificate-icon">🎓</div>
              
              <h2 style="color: #C41E3A; text-align: center;">Congratulations, ${donorName}!</h2>
              
              <div class="message">
                <p style="margin: 0; font-size: 16px;">
                  <strong>Thank you for your life-saving donation!</strong>
                </p>
                <p style="margin-top: 10px;">
                  Your selfless act of kindness has the power to save lives and bring hope to those in need. 
                  We are honored to have you as part of the LifeLink community.
                </p>
              </div>
              
              <p>Your official <strong>Donation Certificate</strong> is attached to this email.</p>
              
              <p>You can also download it anytime from your donor dashboard:</p>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/donor-dashboard" 
                   class="cta-button">
                  View Dashboard
                </a>
              </div>
              
              <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #2e7d32; font-weight: bold;">💚 Your Impact:</p>
                <p style="margin: 5px 0 0 0; color: #555;">
                  Every unit of blood you donate can save up to 3 lives. You're a hero!
                </p>
              </div>
              
              <p>
                <strong>What's Next?</strong><br>
                • Share your certificate with friends and family<br>
                • Remember to maintain your health for future donations<br>
                • You can donate again after the appropriate waiting period<br>
                • Keep inspiring others to donate
              </p>
              
              <p style="margin-top: 25px;">
                With gratitude,<br>
                <strong>The LifeLink Team</strong>
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 0 0 5px 0; font-style: italic; color: #C41E3A;">
                "Every Drop Counts, Every Donor Matters"
              </p>
              <p>&copy; ${new Date().getFullYear()} LifeLink - Blood Donor Network</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: 'LifeLink_Donation_Certificate.pdf',
          path: certificatePath
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Certificate email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending certificate email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = exports;
