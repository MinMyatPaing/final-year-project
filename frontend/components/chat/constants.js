export const INITIAL_MESSAGES = [
  {
    id: '0',
    role: 'assistant',
    text: "Hi! I'm PocketWise AI 🤖\n\nI can help you with:\n• Analysing your spending habits\n• Setting budget goals\n• Finding student deals & discounts\n• Giving personalised saving tips\n\nWhat would you like to know?",
    time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    isError: false,
  },
];

export const SUGGESTION_CHIPS = [
  'How am I spending?',
  'Tips to save money',
  'Student discounts UK',
  'Help me budget',
];
