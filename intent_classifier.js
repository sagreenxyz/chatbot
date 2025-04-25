// Simple map of keywords/phrases (lowercase) to intents
const INTENT_MAP = {
    'greeting': ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'sup'],
    'goodbye': ['bye', 'goodbye', 'see you', 'later', 'farewell', 'take care'],
    'ask_status': ['how are you', 'how is it going', 'how goes it', 'status', 'how you doing'],
    'affirmative': ['yes', 'yeah', 'yep', 'ok', 'okay', 'sure', 'sounds good'],
    'negative': ['no', 'nope', 'nah', 'not really'],
    'ask_time': ['what time is it', 'current time', 'time now', 'tell me the time'], // New intent
    // Add more intents and keywords as needed
};

// Default intent if no keywords match
const DEFAULT_INTENT = 'unknown';

/**
 * Simple keyword-based intent classification.
 * @param {Statement} statement - The input statement (expects text to be preprocessed, e.g., lowercase).
 * @returns {string} - The detected intent name.
 */
function classifyIntent(statement) {
    const text = statement.text; // Assumes text is already lowercase via preprocessor

    for (const intent in INTENT_MAP) {
        for (const keyword of INTENT_MAP[intent]) {
            // Basic check: does the input text contain the keyword?
            // More sophisticated matching (e.g., exact match, regex) could be used.
            if (text.includes(keyword)) {
                return intent;
            }
        }
    }
    return DEFAULT_INTENT;
}

module.exports = {
    classifyIntent,
    DEFAULT_INTENT
};
