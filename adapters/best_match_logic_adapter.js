const LogicAdapter = require('./logic_adapter');
const Statement = require('../statement'); // Import Statement

class BestMatchLogicAdapter extends LogicAdapter {
    constructor(options = {}) {
        super(options);
        this.responseSelectionMethod = options.responseSelectionMethod || this._selectRandomResponse;
        // Example confidence score to assign when a match is found
        this.fixedConfidence = options.fixedConfidence || 0.9;
    }

    /**
     * Finds potential responses in storage that were made in response to the input statement's text.
     * @param {Statement} statement - The input statement (already preprocessed).
     * @param {StorageAdapter} storageAdapter - The storage adapter instance.
     * @returns {Promise<{response: Statement | null, confidence: number}>} - The result.
     */
    async process(statement, storageAdapter) {
        // Storage adapter's filter method should handle finding statements
        // where 'in_response_to' matches the input statement's text.
        // We expect the storage adapter to return an array of *serialized* statement data.
        let potentialResponseData = [];
        try {
             potentialResponseData = await storageAdapter.filter({
                in_response_to: statement.text // Match based on the processed text
            });
        } catch (error) {
             console.error("Error filtering storage in BestMatchLogicAdapter:", error);
             return { response: null, confidence: 0 }; // Return no match on storage error
        }


        if (!potentialResponseData || potentialResponseData.length === 0) {
            // Return null response and 0 confidence if no matches found
            return { response: null, confidence: 0 };
        }

        // Convert raw data from storage back into Statement objects
        const potentialResponses = potentialResponseData
            .map(data => Statement.deserialize(data))
            .filter(stmt => stmt && stmt.text); // Ensure deserialization worked and text exists


        if (potentialResponses.length === 0) {
             console.warn("Found potential response data, but failed to deserialize or filter:", potentialResponseData);
             return { response: null, confidence: 0 };
        }


        // --- Confidence Calculation ---
        // Using a fixed confidence for simplicity when matches are found.
        const confidence = this.fixedConfidence;

        // Select a response Statement from the potential ones
        const selectedResponseStatement = this.responseSelectionMethod(potentialResponses);

        // Return the selected response Statement and calculated confidence
        return { response: selectedResponseStatement, confidence: confidence };
    }

    _selectFirstResponse(statements) {
        return statements[0];
    }

    _selectRandomResponse(statements) {
        const randomIndex = Math.floor(Math.random() * statements.length);
        return statements[randomIndex];
    }

    // Add other response selection methods here
}

module.exports = BestMatchLogicAdapter;
