const express = require('express');
const router = express.Router();
const { sendMessage, clearChat } = require('../controllers/chatController');
const { verifyToken } = require('../middleware/auth');

// POST /api/chat - Send message to AI
router.post('/', verifyToken, sendMessage);

// DELETE /api/chat - Clear chat history
router.delete('/', verifyToken, clearChat);

module.exports = router;
