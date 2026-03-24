const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Message = require('../models/Message');

/**
 * @route   POST /api/chat/send
 * @desc    Send a message
 * @access  Private
 */
router.post('/send', protect, async (req, res) => {
  try {
    const { receiverId, message, requestId } = req.body;

    if (!receiverId || typeof receiverId !== 'string') {
      return res.status(400).json({ success: false, message: 'Valid receiverId is required' });
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }
    
    // Create conversation ID (sorted user IDs)
    const conversationId = [req.user.id, receiverId].sort().join('-');
    
    const newMessage = await Message.create({
      conversationId,
      senderId: req.user.id,
      receiverId,
      requestId,
      message: message.trim(),
      type: 'text'
    });
    
    // Send socket notification
    const io = req.app.get('io');
    io.to(receiverId).emit('new-message', {
      message: newMessage,
      sender: {
        id: req.user.id,
        name: req.user.name
      }
    });
    
    res.status(201).json({ success: true, data: newMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/chat/conversations
 * @desc    Get user conversations
 * @access  Private
 */
router.get('/conversations', protect, async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: currentUserId },
            { receiverId: currentUserId }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$receiverId', currentUserId] },
                  { $eq: ['$read', false] }
                ]},
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    
    res.json({ success: true, data: conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/chat/messages/:conversationId
 * @desc    Get messages for a conversation
 * @access  Private
 */
router.get('/messages/:conversationId', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const conversationId = req.params.conversationId;
    const participants = conversationId.split('-');
    const currentUserId = req.user.id.toString();

    if (!participants.includes(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this conversation'
      });
    }
    
    const messages = await Message.find({
      conversationId,
      $or: [
        { senderId: req.user.id },
        { receiverId: req.user.id }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('senderId', 'name')
      .populate('receiverId', 'name');
    
    // Mark messages as read
    await Message.updateMany(
      {
        conversationId,
        $or: [
          { senderId: req.user.id },
          { receiverId: req.user.id }
        ],
        receiverId: req.user.id,
        read: false
      },
      { read: true, readAt: new Date() }
    );
    
    res.json({ success: true, data: messages.reverse() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
