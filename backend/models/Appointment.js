const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donor',
    required: true
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodRequest',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true,
    index: true
  },
  scheduledTime: {
    type: String,
    required: true
  },
  location: {
    hospitalName: String,
    address: String,
    city: String,
    coordinates: {
      type: [Number],
      index: '2dsphere'
    }
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled'],
    default: 'scheduled'
  },
  qrCode: {
    type: String
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  completedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String
  }
}, {
  timestamps: true
});

appointmentSchema.index({ donorId: 1, scheduledDate: 1 });
appointmentSchema.index({ status: 1, scheduledDate: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
