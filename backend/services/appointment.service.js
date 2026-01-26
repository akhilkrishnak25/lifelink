const QRCode = require('qrcode');
const Appointment = require('../models/Appointment');
const notificationService = require('./notification.service');

/**
 * Create appointment
 */
exports.createAppointment = async (appointmentData) => {
  const appointment = await Appointment.create(appointmentData);
  
  // Generate QR code
  const qrData = JSON.stringify({
    appointmentId: appointment._id,
    donorId: appointment.donorId,
    date: appointment.scheduledDate,
    time: appointment.scheduledTime
  });
  
  const qrCode = await QRCode.toDataURL(qrData);
  appointment.qrCode = qrCode;
  await appointment.save();
  
  return appointment;
};

/**
 * Get appointments for user
 */
exports.getAppointments = async (userId, role) => {
  // With unified 'user' role, default to receiver-side appointments.
  // Donor-side retrieval can be supported by passing a donorId filter in future.
  const query = role === 'admin'
    ? {}
    : { receiverId: userId };
  
  return await Appointment.find(query)
    .populate('donorId')
    .populate('requestId')
    .populate('receiverId')
    .sort({ scheduledDate: 1 });
};

/**
 * Update appointment status
 */
exports.updateStatus = async (appointmentId, status, notes = '') => {
  const appointment = await Appointment.findById(appointmentId);
  
  if (!appointment) {
    throw new Error('Appointment not found');
  }
  
  appointment.status = status;
  appointment.notes = notes;
  
  if (status === 'completed') {
    appointment.completedAt = new Date();
  } else if (status === 'cancelled') {
    appointment.cancelledAt = new Date();
    appointment.cancellationReason = notes;
  }
  
  await appointment.save();
  return appointment;
};

/**
 * Send appointment reminder
 */
exports.sendReminder = async (io, appointmentId) => {
  const appointment = await Appointment.findById(appointmentId)
    .populate('donorId')
    .populate('receiverId');
  
  if (!appointment || appointment.reminderSent) {
    return;
  }
  
  const notification = {
    type: 'reminder',
    title: 'Appointment Reminder',
    message: `Your blood donation appointment is scheduled for ${appointment.scheduledDate.toLocaleDateString()} at ${appointment.scheduledTime}`,
    data: { appointmentId: appointment._id }
  };
  
  notificationService.sendSocketNotification(io, appointment.donorId.userId, notification);
  
  appointment.reminderSent = true;
  await appointment.save();
};

/**
 * Get upcoming appointments
 */
exports.getUpcoming = async (userId, role) => {
  const query = role === 'admin'
    ? { status: { $in: ['scheduled', 'confirmed'] } }
    : { receiverId: userId, status: { $in: ['scheduled', 'confirmed'] } };
  
  return await Appointment.find(query)
    .where('scheduledDate').gte(new Date())
    .sort({ scheduledDate: 1 })
    .limit(10);
};
