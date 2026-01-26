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
    
    // Create conversation ID (sorted user IDs)
    const conversationId = [req.user.id, receiverId].sort().join('-');
    
    const newMessage = await Message.create({
      conversationId,
      senderId: req.user.id,
      receiverId,
      requestId,
      message,
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
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: req.user.id },
            { receiverId: req.user.id }
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
                  { $eq: ['$receiverId', req.user.id] },
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
    
    const messages = await Message.find({
      conversationId: req.params.conversationId
    })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('senderId', 'name')
      .populate('receiverId', 'name');
    
    // Mark messages as read
    await Message.updateMany(
      {
        conversationId: req.params.conversationId,
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
