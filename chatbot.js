const Statement = require('./statement'); // Import Statement class
const preprocessors = require('./preprocessors'); // Import preprocessors
const { classifyIntent, DEFAULT_INTENT } = require('./intent_classifier'); // Import classifier

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

        // Add intent classifier (could be made configurable like adapters)
        this.intentClassifier = options.intentClassifier || classifyIntent;
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

        // Classify Intent
        inputStatement.intent = this.intentClassifier(inputStatement);
        console.log(`Detected intent: ${inputStatement.intent}`); // Logging

        // Learn that the *current input* might follow the *previous input*.
        if (this.previous_statement) {
            await this.learnInputSequence(inputStatement, this.previous_statement);
        }

        let bestMatch = null;
        let maxConfidence = -1;

        // Find the best response using logic adapters
        for (const adapter of this.logicAdapters) {
            // Logic adapters now receive and process Statement objects
            if (adapter.canProcess(inputStatement)) {
                try {
                    const result = await adapter.process(inputStatement, this.storage);
                    if (result && result.response instanceof Statement && typeof result.confidence === 'number') {
                        if (result.confidence > maxConfidence) {
                            maxConfidence = result.confidence;
                            bestMatch = result;
                        }
                    } else {
                        console.warn(`Logic adapter ${adapter.constructor.name} returned invalid result for input:`, inputStatement.text, "Result:", result);
                    }
                } catch (error) {
                    console.error(`Error processing with logic adapter ${adapter.constructor.name}:`, error);
                }
            }
        }

        // Select the response or return a default
        let responseStatement;
        if (bestMatch && bestMatch.response && maxConfidence > 0) {
            responseStatement = bestMatch.response;
            responseStatement.confidence = maxConfidence;
            responseStatement.in_response_to = inputStatement.text;

            // Learn that this responseStatement is a good response for the inputStatement's INTENT.
            await this.learnResponseToIntent(responseStatement, inputStatement.intent);
        } else {
            responseStatement = new Statement({
                text: `I'm not sure how to respond to that (${inputStatement.intent}).`,
                confidence: 0,
                in_response_to: inputStatement.text,
                intent: 'default_response'
            });
        }

        // Update the previous statement
        this.previous_statement = inputStatement;

        return responseStatement;
    }

    /**
     * Learns the sequence of user inputs.
     * Stores statement linked to previousStatement's text.
     */
    async learnInputSequence(statement, previousStatement) {
        if (!statement || !statement.text || !previousStatement || !previousStatement.text) return;
        const sequenceLink = new Statement({
            text: statement.text,
            in_response_to: previousStatement.text,
            intent: statement.intent
        });
        await this.storage.update(sequenceLink);
    }

    /**
     * Learns that a given response statement is suitable for a specific intent.
     * Stores the response statement, setting its intent.
     * @param {Statement} responseStatement - The statement that was chosen as a response.
     * @param {string} intent - The intent of the input that triggered this response.
     */
    async learnResponseToIntent(responseStatement, intent) {
        if (!responseStatement || !responseStatement.text || !intent) return;

        const statementToLearn = new Statement({
            text: responseStatement.text,
            in_response_to: responseStatement.in_response_to,
            intent: intent
        });
        console.log(`Learning response for intent '${intent}': "${statementToLearn.text}"`);
        await this.storage.update(statementToLearn);
    }

    /**
     * Learns a user-provided correction.
     * Associates the correctResponseText with the originalInputText.
     * @param {string} originalInputText - The user's input that received a wrong answer.
     * @param {string} correctResponseText - The correct answer provided by the user.
     */
    async learnCorrection(originalInputText, correctResponseText) {
        let originalInputStatement = new Statement(originalInputText);
        let correctResponseStatement = new Statement(correctResponseText);

        // Preprocess and classify intent of the *original* input
        originalInputStatement = this.preprocess(originalInputStatement);
        originalInputStatement.intent = this.intentClassifier(originalInputStatement);

        // Preprocess the correct response
        correctResponseStatement = this.preprocess(correctResponseStatement);

        // Create the statement representing the correct association
        const correctedStatementToLearn = new Statement({
            text: correctResponseStatement.text,
            in_response_to: originalInputStatement.text,
            intent: originalInputStatement.intent
        });

        console.log(`Learning correction for intent '${correctedStatementToLearn.intent}': "${correctedStatementToLearn.text}" in response to "${originalInputStatement.text}"`);
        await this.storage.update(correctedStatementToLearn);
    }
}

module.exports = ChatBot;
