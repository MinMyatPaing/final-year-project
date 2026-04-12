const axios = require('axios');

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:8000';

/**
 * POST /api/chat/message
 * Forwards the user's message to the Python LangGraph agent.
 * Uses the authenticated user's ID as the session_id so each user
 * has their own conversation memory in the agent.
 */
exports.sendMessage = async (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Use the authenticated user's ID as the LangGraph thread ID
  const sessionId = `user_${req.user.id}`;

  try {
    const response = await axios.post(
      `${AGENT_API_URL}/chat`,
      { message: message.trim(), session_id: sessionId },
      { timeout: 60000 } // 60s — LLM calls can be slow
    );

    res.json({
      success: true,
      response: response.data.response,
    });
  } catch (error) {
    const agentError =
      error.response?.data?.detail ||
      error.response?.data?.error ||
      error.message ||
      'Failed to reach AI assistant';

    console.error('Chat controller error:', agentError);

    res.status(error.response?.status || 500).json({
      success: false,
      error: agentError,
    });
  }
};
