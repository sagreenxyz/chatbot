const LogicAdapter = require('./logic_adapter');
const Statement = require('../statement'); // Import Statement

class BestMatchLogicAdapter extends LogicAdapter {
    constructor(options = {}) {
        super(options);
        this.responseSelectionMethod = options.responseSelectionMethod || this._selectRandomResponse;
        this.fixedConfidence = options.fixedConfidence || 0.9; // Confidence when intent match found
        this.unknownIntentConfidence = options.unknownIntentConfidence || 0.3; // Lower confidence for unknown intent matches
    }

    /**
     * Finds potential responses based on the *intent* of the input statement.
     * @param {Statement} statement - The input statement (preprocessed, with intent classified).
     * @param {StorageAdapter} storageAdapter - The storage adapter instance.
     * @returns {Promise<{response: Statement | null, confidence: number}>} - The result.
     */
    async process(statement, storageAdapter) {
        // Ensure the statement has an intent classified
        if (!statement.intent) {
            console.warn("BestMatchLogicAdapter: Input statement has no intent classified.");
            return { response: null, confidence: 0 };
        }

        let potentialResponseData = [];
        try {
             // Filter storage for statements that are responses *to the detected intent*.
             // We look for stored statements whose *own* intent matches the input's intent,
             // AND which are marked as responses (e.g., have an 'in_response_to' field,
             // although we might relax this requirement depending on learning strategy).
             // Let's simplify: Find stored statements *whose intent matches the input intent*.
             // We assume these stored statements *are* potential responses for that intent.
             potentialResponseData = await storageAdapter.filter({
                intent: statement.intent
                // Optionally, could also filter for statements that have 'in_response_to' != null
                // to ensure they were learned as responses, but let's keep it broad for now.
            });

             // --- Fallback (Optional): If no intent match, search by text like before? ---
             // if (!potentialResponseData || potentialResponseData.length === 0) {
             //    console.log(`No responses found for intent '${statement.intent}'. Falling back to text match.`);
             //    potentialResponseData = await storageAdapter.filter({ in_response_to: statement.text });
             // }

        } catch (error) {
             console.error("Error filtering storage in BestMatchLogicAdapter:", error);
             return { response: null, confidence: 0 };
        }

        if (!potentialResponseData || potentialResponseData.length === 0) {
            return { response: null, confidence: 0 };
        }

        const potentialResponses = potentialResponseData
            .map(data => Statement.deserialize(data))
            .filter(stmt => stmt && stmt.text); // Ensure valid statements

        if (potentialResponses.length === 0) {
             return { response: null, confidence: 0 };
        }

        // Assign confidence based on whether the intent was known
        const confidence = (statement.intent === require('../intent_classifier').DEFAULT_INTENT)
                           ? this.unknownIntentConfidence
                           : this.fixedConfidence;

        const selectedResponseStatement = this.responseSelectionMethod(potentialResponses);

        return { response: selectedResponseStatement, confidence: confidence };
    }

    _selectFirstResponse(statements) {
        return statements[0];
    }

    _selectRandomResponse(statements) {
        const randomIndex = Math.floor(Math.random() * statements.length);
        return statements[randomIndex];
    }
}

module.exports = BestMatchLogicAdapter;
