const notificationService = require('../notification.service');
const { Notification } = require('../../models/Notification');
const Message = require('../../models/Message');

/**
 * Action Executor Service
 * Implements the ACT layer of the Agentic AI system
 * Executes planned actions using existing services
 */

class ActionExecutor {
  constructor(io) {
    this.io = io; // Socket.IO instance for real-time notifications
    this.executionLog = [];
  }

  /**
   * Execute a single action from the plan
   */
  async executeAction(action, agentState, requestData) {
    const executionRecord = {
      actionId: `${action.stepNumber}-${Date.now()}`,
      type: action.action,
      targetId: null,
      executedAt: new Date(),
      success: false,
      errorMessage: null,
      metadata: action.metadata || {}
    };

    try {
      switch (action.action) {
        case 'notify_donors':
          await this._notifyDonors(action.targetDonors, requestData, agentState);
          executionRecord.success = true;
          executionRecord.metadata.donorCount = action.targetDonors.length;
          break;

        case 'broadcast':
          await this._broadcastToArea(action.targetDonors, requestData, agentState, action.metadata);
          executionRecord.success = true;
          executionRecord.metadata.donorCount = action.targetDonors.length;
          break;

        case 'open_chat':
          await this._openChatSessions(action.targetDonors, requestData);
          executionRecord.success = true;
          executionRecord.metadata.chatSessions = action.targetDonors.length;
          break;

        case 'lock_slot':
          await this._lockDonorSlot(action.targetDonors[0], requestData);
          executionRecord.success = true;
          executionRecord.targetId = action.targetDonors[0];
          break;

        case 'escalate':
          await this._triggerEscalation(requestData, agentState);
          executionRecord.success = true;
          break;

        case 'admin_alert':
          await this._alertAdmin(requestData, agentState);
          executionRecord.success = true;
          break;

        default:
          executionRecord.errorMessage = `Unknown action type: ${action.action}`;
      }

      // Update action status
      action.status = executionRecord.success ? 'completed' : 'failed';

    } catch (error) {
      console.error(`❌ Action execution error:`, error);
      executionRecord.success = false;
      executionRecord.errorMessage = error.message;
      action.status = 'failed';
    }

    // Log execution
    this.executionLog.push(executionRecord);
    return executionRecord;
  }

  /**
   * Notify specific donors (targeted notifications)
   */
  async _notifyDonors(donorIds, requestData, agentState) {
    const Donor = require('../../models/Donor');
    
    const donors = await Donor.find({ _id: { $in: donorIds } }).populate('userId');

    for (const donor of donors) {
      if (!donor.userId) continue;

      // Find the donor's score and reason from agent state
      const donorScore = agentState.decision.rankedDonors.find(
        d => d.donorId.toString() === donor._id.toString()
      );

      const notification = {
        type: 'blood_request',
        title: `🆘 ${requestData.urgency.toUpperCase()} Blood Request`,
        message: `${requestData.bloodGroup} blood needed at ${requestData.hospitalName}. ${requestData.unitsRequired} unit(s) required.`,
        data: {
          requestId: requestData._id,
          bloodGroup: requestData.bloodGroup,
          urgency: requestData.urgency,
          hospital: requestData.hospitalName,
          distance: donorScore ? `${donorScore.distance.toFixed(1)} km` : 'nearby',
          selectedReason: donorScore ? donorScore.reason : 'Compatible donor',
          aiScore: donorScore ? donorScore.score.toFixed(1) : null
        },
        timestamp: new Date(),
        read: false
      };

      // Save to database
      await Notification.create({
        userId: donor.userId._id,
        ...notification
      });

      // Send via Socket.IO
      if (this.io) {
        notificationService.sendSocketNotification(this.io, donor.userId._id, notification);
      }

      // Send email if configured
      if (donor.userId.email && process.env.EMAIL_USER) {
        const emailHtml = this._createEmailTemplate(notification, requestData, donorScore);
        await notificationService.sendEmailNotification(
          donor.userId.email,
          notification.title,
          emailHtml
        );
      }

      console.log(`📢 Notified donor ${donor.userId.name} (Score: ${donorScore?.score || 'N/A'})`);
    }

    return donors.length;
  }

  /**
   * Broadcast to all donors in area
   */
  async _broadcastToArea(donorIds, requestData, agentState, metadata) {
    const radiusKm = metadata?.radiusKm || 10;
    
    console.log(`📡 Broadcasting to ${donorIds.length} donors within ${radiusKm}km radius`);

    // Same as notify donors but with broadcast flag
    await this._notifyDonors(donorIds, requestData, agentState);

    // Also broadcast to city-based room
    if (this.io && requestData.city) {
      const broadcastNotification = {
        type: 'broadcast_request',
        title: `⚡ ${requestData.urgency.toUpperCase()} Blood Alert`,
        message: `${requestData.bloodGroup} blood urgently needed in ${requestData.city}`,
        data: {
          requestId: requestData._id,
          bloodGroup: requestData.bloodGroup,
          city: requestData.city,
          urgency: requestData.urgency
        }
      };

      notificationService.broadcastToLocation(this.io, requestData.city, broadcastNotification);
    }

    return donorIds.length;
  }

  /**
   * Open chat sessions between receiver and donors
   */
  async _openChatSessions(donorIds, requestData) {
    const Donor = require('../../models/Donor');
    
    const donors = await Donor.find({ _id: { $in: donorIds } }).populate('userId');

    for (const donor of donors) {
      if (!donor.userId) continue;

      // Create initial chat message
      const chatMessage = await Message.create({
        senderId: requestData.receiverId,
        receiverId: donor.userId._id,
        requestId: requestData._id,
        message: `Hello! I urgently need ${requestData.bloodGroup} blood at ${requestData.hospitalName}. Can you help?`,
        timestamp: new Date()
      });

      // Notify donor about chat
      if (this.io) {
        this.io.to(donor.userId._id.toString()).emit('chat_opened', {
          requestId: requestData._id,
          from: 'Blood Receiver',
          message: chatMessage.message
        });
      }

      console.log(`💬 Chat opened with donor ${donor.userId.name}`);
    }

    return donors.length;
  }

  /**
   * Lock donor slot (prevent double booking)
   */
  async _lockDonorSlot(donorId, requestData) {
    const Donor = require('../../models/Donor');
    
    const donor = await Donor.findById(donorId);
    if (!donor) {
      throw new Error('Donor not found');
    }

    // Mark as temporarily unavailable
    donor.isAvailable = false;
    donor.lockedUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    donor.lockedForRequest = requestData._id;
    await donor.save();

    console.log(`🔒 Locked donor ${donorId} for 2 hours`);

    return true;
  }

  /**
   * Trigger escalation (part of plan execution)
   */
  async _triggerEscalation(requestData, agentState) {
    console.log(`⚠️ Triggering escalation for request ${requestData._id}`);

    // Update agent state
    agentState.execution.status = 'escalated';
    await agentState.save();

    // Notify receiver about escalation
    if (this.io) {
      this.io.to(requestData.receiverId.toString()).emit('request_escalated', {
        requestId: requestData._id,
        message: 'We are expanding the search to find more donors for you.'
      });
    }

    return true;
  }

  /**
   * Alert admin for manual intervention
   */
  async _alertAdmin(requestData, agentState) {
    console.log(`🚨 Admin alert triggered for request ${requestData._id}`);

    // Create admin notification
    const User = require('../../models/User');
    const admins = await User.find({ role: 'admin' });

    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        type: 'admin_alert',
        title: '🚨 Manual Intervention Required',
        message: `Blood request ${requestData._id} needs admin attention. No donors responding.`,
        data: {
          requestId: requestData._id,
          urgency: requestData.urgency,
          bloodGroup: requestData.bloodGroup,
          reason: 'No donor responses after escalation'
        }
      });

      if (this.io) {
        this.io.to(admin._id.toString()).emit('admin_alert', {
          requestId: requestData._id,
          urgency: requestData.urgency
        });
      }
    }

    return true;
  }

  /**
   * Create email template for notifications
   */
  _createEmailTemplate(notification, requestData, donorScore) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">${notification.title}</h2>
        <p>${notification.message}</p>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Request Details:</h3>
          <ul>
            <li><strong>Blood Group:</strong> ${requestData.bloodGroup}</li>
            <li><strong>Hospital:</strong> ${requestData.hospitalName}</li>
            <li><strong>Units Needed:</strong> ${requestData.unitsRequired}</li>
            <li><strong>Urgency:</strong> ${requestData.urgency.toUpperCase()}</li>
            ${donorScore ? `<li><strong>Distance:</strong> ${donorScore.distance.toFixed(1)} km from you</li>` : ''}
          </ul>
        </div>

        ${donorScore ? `
          <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>🤖 AI Selected You Because:</strong> ${donorScore.reason}</p>
            <p style="font-size: 12px; color: #666;">Match Score: ${donorScore.score.toFixed(1)}/100</p>
          </div>
        ` : ''}

        <p style="margin-top: 20px;">
          <a href="http://localhost:3000/donor-dashboard.html" 
             style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Respond to Request
          </a>
        </p>

        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated message from LifeLink AI Matching System.
        </p>
      </div>
    `;
  }

  /**
   * Get execution summary
   */
  getExecutionSummary() {
    const successful = this.executionLog.filter(a => a.success).length;
    const failed = this.executionLog.filter(a => !a.success).length;

    return {
      totalActions: this.executionLog.length,
      successful,
      failed,
      actions: this.executionLog
    };
  }
}

module.exports = ActionExecutor;
