const Statement = require('../statement'); // Import Statement

class LogicAdapter {
    constructor(options = {}) {
        this.tag = options.tag || 'logic';
        // Confidence threshold can be set per adapter
        this.defaultConfidence = options.defaultConfidence || 0;
    }

    /**
     * Checks if the adapter can process the given statement.
     * @param {Statement} statement - The input statement.
     * @returns {boolean} - True if the adapter can process, false otherwise.
     */
    canProcess(statement) {
        // Basic check: ensure statement text is not empty
        return !!statement && typeof statement.text === 'string' && statement.text.length > 0;
    }

    /**
     * Processes the input statement and returns the best matching response statement.
     * @param {Statement} statement - The input statement (preprocessed).
     * @param {StorageAdapter} storageAdapter - The storage adapter instance.
     * @returns {Promise<{response: Statement | null, confidence: number}>} - A promise resolving to an object
     * containing the response Statement (or null) and a confidence score.
     */
    async process(statement, storageAdapter) {
        throw new Error("The 'process' method is not implemented by this logic adapter.");
    }
}

module.exports = LogicAdapter;
