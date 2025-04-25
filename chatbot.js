const Statement = require('./statement'); // Import Statement class
const preprocessors = require('./preprocessors'); // Import preprocessors

// Default adapter imports (assuming they exist and are updated)
const JsonFileStorageAdapter = require('./adapters/json_file_storage_adapter');
const BestMatchLogicAdapter = require('./adapters/best_match_logic_adapter');

class ChatBot {
    constructor(name, options = {}) {
        this.name = name;

        // Use provided adapters or defaults
        this.storage = options.storageAdapter || new JsonFileStorageAdapter();
        this.logicAdapters = options.logicAdapters || [new BestMatchLogicAdapter()];

        // Add preprocessors (defaulting to lowercase and whitespace cleaning)
        this.preprocessors = options.preprocessors || [
            preprocessors.cleanWhitespace,
            preprocessors.lowercase // Apply lowercase *after* cleaning whitespace
        ];

        // Store the previous statement received (now as a Statement object)
        this.previous_statement = null;
    }

    /**
     * Apply all preprocessors to the statement.
     * @param {Statement} statement - The statement to preprocess.
     * @returns {Statement} - The processed statement.
     */
    preprocess(statement) {
        let currentStatement = statement;
        // Ensure text exists before processing
        if (typeof currentStatement.text !== 'string') {
            console.warn("Statement text is not a string during preprocessing:", currentStatement);
            currentStatement.text = ''; // Default to empty string
        }
        for (const processor of this.preprocessors) {
            currentStatement = processor(currentStatement);
        }
        return currentStatement;
    }

    /**
     * Takes an input string or Statement object, processes it, learns, and returns a response Statement.
     * @param {string|Statement} inputData - The input text or Statement object.
     * @returns {Promise<Statement>} - A promise that resolves with the response Statement.
     */
    async getResponse(inputData) {
        // Ensure input is a Statement object
        let inputStatement = (inputData instanceof Statement) ? inputData : new Statement(inputData);

        // Preprocess the input statement
        inputStatement = this.preprocess(inputStatement);

        // If preprocessing results in empty text, return early? Or let logic adapters handle?
        if (!inputStatement.text) {
             console.warn("Input statement text is empty after preprocessing.");
             // Return a specific response or the default 'don't understand'
             return new Statement({
                text: "Please provide some input.",
                confidence: 0,
                in_response_to: null
             });
        }

        let bestMatch = null;
        let maxConfidence = -1;

        // Find the best response using logic adapters
        for (const adapter of this.logicAdapters) {
            // Logic adapters now receive and process Statement objects
            if (adapter.canProcess(inputStatement)) {
                try {
                    const result = await adapter.process(inputStatement, this.storage);
                    // Result should contain a response Statement and confidence
                    // Ensure result and result.response are valid
                    if (result && result.response instanceof Statement && typeof result.confidence === 'number') {
                        if (result.confidence > maxConfidence) {
                            maxConfidence = result.confidence;
                            bestMatch = result; // result = { response: Statement, confidence: number }
                        }
                    } else {
                         console.warn(`Logic adapter ${adapter.constructor.name} returned invalid result for input:`, inputStatement.text, "Result:", result);
                    }
                } catch (error) {
                    console.error(`Error processing with logic adapter ${adapter.constructor.name}:`, error);
                }
            }
        }

        // Learn that the current statement is a possible response to the previous statement
        // Only learn if the input wasn't empty and there was a previous statement
        if (inputStatement.text && this.previous_statement) {
            // Pass the processed input statement and the previous statement to learnResponse
            await this.learnResponse(inputStatement, this.previous_statement);
        }

        // Update the previous statement (store the processed version)
        // Only update if the input wasn't empty
        if (inputStatement.text) {
            this.previous_statement = inputStatement;
        }

        // Select the response or return a default
        let responseStatement;
        // Use a confidence threshold (e.g., > 0 or a configurable value)
        if (bestMatch && bestMatch.confidence > 0) {
             responseStatement = bestMatch.response;
             // Ensure confidence is set on the response statement itself
             responseStatement.confidence = bestMatch.confidence;
             // Link response to the input statement's text
             responseStatement.in_response_to = inputStatement.text;

             // Learn the association between the input and the bot's *selected* response
             // This helps reinforce successful response selections
             await this.learnResponse(responseStatement, inputStatement);
        } else {
            // Return a default Statement object
            responseStatement = new Statement({
                text: "I'm sorry, I don't understand.",
                confidence: 0,
                in_response_to: inputStatement.text // Link default response to input
            });
            // Optionally, prevent learning the default response by clearing previous_statement here?
            // this.previous_statement = null; // If you don't want the next input to be learned as a response to "I don't understand"
        }

        return responseStatement;
    }

    /**
     * Learns that statement is a response to previousStatement.
     * @param {Statement} statement - The statement that was received (already preprocessed).
     * @param {Statement} previousStatement - The previous statement received (already preprocessed).
     */
    async learnResponse(statement, previousStatement) {
        // Ensure we have valid text to learn
        if (!statement || !statement.text || !previousStatement || !previousStatement.text) {
            console.warn("Attempted to learn response with invalid statement data.");
            return;
        }

        // Create a Statement object representing the relationship to store
        // Ensure we are linking the actual text values
        const statementToLearn = new Statement({
            text: statement.text, // Store the processed text
            in_response_to: previousStatement.text // Link to the processed text of the previous input
            // Add conversation, etc. if needed
        });

        // Storage adapter handles Statement objects or their serialized form
        try {
            await this.storage.update(statementToLearn);
        } catch (error) {
             console.error("Error during storage update in learnResponse:", error);
        }
    }

    /**
     * Learns a user-provided correction.
     * Associates the correctResponseText with the originalInputText.
     * @param {string} originalInputText - The user's input that received a wrong answer.
     * @param {string} correctResponseText - The correct answer provided by the user.
     */
    async learnCorrection(originalInputText, correctResponseText) {
        // Create Statement objects for processing
        let originalInputStatement = new Statement(originalInputText);
        let correctResponseStatement = new Statement(correctResponseText);

        // Preprocess both
        originalInputStatement = this.preprocess(originalInputStatement);
        correctResponseStatement = this.preprocess(correctResponseStatement);

        // Create the statement representing the correct association
        const correctedStatementToLearn = new Statement({
            text: correctResponseStatement.text, // The correct response text
            in_response_to: originalInputStatement.text // Linked to the original input text
        });

        // Use the storage adapter's update method.
        // The update method should handle overwriting/updating the 'in_response_to'
        // field if a statement with the same 'text' already exists.
        console.log(`Learning correction: "${correctedStatementToLearn.text}" in response to "${correctedStatementToLearn.in_response_to}"`);
        await this.storage.update(correctedStatementToLearn);

        // Optional: Consider logic to find and potentially remove or down-weight
        // the statement representing the *incorrect* response association,
        // but simply overwriting the correct one via update() is often sufficient.
    }
}

// --- Adapter Placeholders (Ensure these files are updated accordingly) ---
// Placeholder classes removed assuming actual files exist and are updated

module.exports = ChatBot;
