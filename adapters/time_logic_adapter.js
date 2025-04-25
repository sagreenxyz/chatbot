const LogicAdapter = require('./logic_adapter');
const Statement = require('../statement');

class TimeLogicAdapter extends LogicAdapter {
    constructor(options = {}) {
        super(options);
        // This adapter is highly confident when it can process the request
        this.confidence = options.confidence || 1.0;
    }

    /**
     * Checks if the input statement's intent is 'ask_time'.
     * @param {Statement} statement - The input statement.
     * @returns {boolean} - True if the intent is 'ask_time', false otherwise.
     */
    canProcess(statement) {
        return statement.intent === 'ask_time';
    }

    /**
     * Processes the 'ask_time' intent and returns the current time.
     * @param {Statement} statement - The input statement.
     * @param {StorageAdapter} storageAdapter - The storage adapter (not used by this adapter).
     * @returns {Promise<{response: Statement, confidence: number}>} - A promise resolving to the response.
     */
    async process(statement, storageAdapter) {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // Format as HH:MM AM/PM
        const responseText = `The current time is ${timeString}.`;

        const responseStatement = new Statement({
            text: responseText,
            in_response_to: statement.text, // Link to the original question text
            intent: 'inform_time', // Assign a specific intent to the response
            confidence: this.confidence
        });

        return { response: responseStatement, confidence: this.confidence };
    }
}

module.exports = TimeLogicAdapter;
