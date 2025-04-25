const Statement = require('./statement');
const preprocessors = require('./preprocessors');
// const { classifyIntent, DEFAULT_INTENT } = require('./intent_classifier'); // Remove simple classifier
const nlpProcessor = require('./nlp_manager'); // Import the NLP manager instance
const JsonFileStorageAdapter = require('./adapters/json_file_storage_adapter');
const BestMatchLogicAdapter = require('./adapters/best_match_logic_adapter');

class ChatBot {
    constructor(name, options = {}) {
        this.name = name;
        this.storage = options.storageAdapter || new JsonFileStorageAdapter();
        this.logicAdapters = options.logicAdapters || [new BestMatchLogicAdapter()];
        this.preprocessors = options.preprocessors || [
            preprocessors.cleanWhitespace,
            preprocessors.lowercase // Keep lowercase for NLP processing
        ];
        this.previous_statement = null;

        // NLP Manager is now managed externally via nlp_manager.js
        // We just use the imported instance 'nlpProcessor'
        this.nlpReady = false; // Flag to track NLP readiness
    }

    // Add an async initialization method
    async initialize() {
        if (!nlpProcessor.isReady) {
            // Try loading first, setup if loading fails (handled within nlpProcessor.load)
            await nlpProcessor.load();
        }
        this.nlpReady = nlpProcessor.isReady;
        if (!this.nlpReady) {
             console.error("FATAL: NLP Processor failed to initialize.");
             // Handle failure appropriately - maybe throw an error or exit
        }
    }

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

    async getResponse(inputData) {
        if (!this.nlpReady) {
             return new Statement({ text: "I'm still starting up, please wait a moment.", confidence: 0 });
        }

        let inputStatement = (inputData instanceof Statement) ? inputData : new Statement(inputData);

        // 1. Preprocess
        inputStatement = this.preprocess(inputStatement);

        // 2. Classify Intent & Entities using NLP Manager
        const nlpResult = await nlpProcessor.process(inputStatement.text);
        inputStatement.intent = nlpResult.intent;
        inputStatement.entities = nlpResult.entities;
        inputStatement.nlp_score = nlpResult.score; // Store NLP confidence
        console.log(`NLP Result: Intent=${inputStatement.intent}, Score=${inputStatement.nlp_score.toFixed(2)}, Entities=`, inputStatement.entities);

        // --- Learning based on previous interaction (Input Sequence) ---
        if (this.previous_statement) {
             await this.learnInputSequence(inputStatement, this.previous_statement);
        }
        // --- End Input Sequence Learning ---

        // 3. Find Response using Logic Adapters
        let bestMatch = null;
        let maxConfidence = -1;
        for (const adapter of this.logicAdapters) {
            if (adapter.canProcess(inputStatement)) {
                const result = await adapter.process(inputStatement, this.storage);
                // Logic adapters might now use entities as well
                // Confidence should reflect adapter's certainty + potentially NLP score
                let combinedConfidence = result.confidence; // Start with adapter's confidence
                // Optional: Factor in NLP score (e.g., lower confidence if NLP score is low)
                // if (inputStatement.nlp_score < 0.5) { combinedConfidence *= inputStatement.nlp_score; }

                if (combinedConfidence > maxConfidence) {
                    maxConfidence = combinedConfidence;
                    bestMatch = result; // result = { response: Statement, confidence: number }
                }
            }
        }

        // 4. Select Response or Default
        let responseStatement;
        // Use a threshold for selecting the best match based on combined confidence
        const confidenceThreshold = 0.4; // Adjust as needed
        if (bestMatch && bestMatch.response && maxConfidence >= confidenceThreshold) {
             responseStatement = bestMatch.response;
             // Set the final confidence on the response statement
             responseStatement.confidence = maxConfidence;

             // --- Learn Response Association ---
             // Learn that this responseStatement is a good response for the inputStatement's INTENT.
             await this.learnResponseToIntent(responseStatement, inputStatement.intent);
             // --- End Response Association Learning ---

        } else {
            // Default response
            let defaultText = `I'm not sure how to respond to '${inputStatement.text}'.`;
            if (inputStatement.intent !== 'unknown' && inputStatement.nlp_score > 0.5) {
                 defaultText = `I understand you're asking about '${inputStatement.intent}', but I don't have a specific answer for '${inputStatement.text}' yet.`;
            }
            responseStatement = new Statement({
                text: defaultText,
                confidence: 0, // Confidence is 0 for default response
                in_response_to: inputStatement.text,
                intent: 'default_response'
            });
            // Do not learn the default response association
        }

        // 5. Update previous statement
        this.previous_statement = inputStatement;

        return responseStatement;
    }

    async learnInputSequence(statement, previousStatement) {
        if (!statement || !statement.text || !previousStatement || !previousStatement.text) return;
        const sequenceLink = new Statement({
            text: statement.text,
            in_response_to: previousStatement.text,
            intent: statement.intent
        });
        await this.storage.update(sequenceLink);
    }

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

    async learnCorrection(originalInputText, correctResponseText) {
        let originalInputStatement = new Statement(originalInputText);
        let correctResponseStatement = new Statement(correctResponseText);

        // Preprocess original input
        originalInputStatement = this.preprocess(originalInputStatement);
        // Classify original input using NLP
        const nlpResult = await nlpProcessor.process(originalInputStatement.text);
        originalInputStatement.intent = nlpResult.intent;
        originalInputStatement.entities = nlpResult.entities;
        originalInputStatement.nlp_score = nlpResult.score;


        // Preprocess the correct response
        correctResponseStatement = this.preprocess(correctResponseStatement);

        // Create the statement representing the correct association
        const correctedStatementToLearn = new Statement({
            text: correctResponseStatement.text,
            in_response_to: originalInputStatement.text,
            intent: originalInputStatement.intent, // Associate with the original input's INTENT
            // Optionally, try to infer intent/entities for the corrected response itself?
        });

        console.log(`Learning correction for intent '${correctedStatementToLearn.intent}': "${correctedStatementToLearn.text}" in response to "${originalInputStatement.text}"`);
        await this.storage.update(correctedStatementToLearn);
    }
}

module.exports = ChatBot;
