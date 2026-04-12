const express = require('express');
const router = express.Router();
const authCheck = require('../middleware/auth');
const { sendMessage } = require('../controllers/chatController');

router.post('/message', authCheck, sendMessage);

module.exports = router;
