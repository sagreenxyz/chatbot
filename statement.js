class Statement {
    constructor(config) {
        // config can be a string or an object
        if (typeof config === 'string') {
            this.text = config;
            this.intent = null; // Initialize intent
            this.entities = []; // Initialize entities
            // Initialize defaults for other properties when created from string
            this.in_response_to = null;
            this.conversation = 'default';
            this.confidence = 0;
            this.storage_data = {};
            this.timestamp = Date.now();
        } else if (typeof config === 'object' && config !== null) {
            this.text = config.text || '';
            this.in_response_to = config.in_response_to || null; // Text of the statement this responds to
            this.conversation = config.conversation || 'default'; // Conversation thread identifier
            this.confidence = config.confidence || 0;
            this.storage_data = config.storage_data || {}; // Extra data for storage adapter
            this.timestamp = config.timestamp || Date.now();
            this.intent = config.intent || null; // Add intent property
            this.entities = config.entities || []; // Add entities property
        } else {
             throw new Error("Invalid Statement configuration");
        }
    }

    // Method to get data suitable for storage (e.g., plain object)
    serialize() {
        return {
            text: this.text,
            in_response_to: this.in_response_to,
            conversation: this.conversation,
            timestamp: this.timestamp,
            intent: this.intent, // Include intent in serialized data
            entities: this.entities // Include entities
            // Note: Confidence is usually calculated, not stored directly this way
            // storage_data could be merged here if needed
        };
    }

    // Static method to create a Statement from serialized data (e.g., from storage)
    static deserialize(data) {
        // Ensure data is an object before creating statement
        if (typeof data !== 'object' || data === null) {
             console.warn("Attempted to deserialize invalid data:", data);
             // Return a default/empty statement or throw error?
             return new Statement({ text: '' });
        }
        return new Statement(data);
    }

    // Compare statements (useful for storage adapters)
    isEqualTo(otherStatement) {
         if (!(otherStatement instanceof Statement)) {
            return false;
         }
         // Simple comparison based on text for now (case-insensitive)
         return this.text.toLowerCase() === otherStatement.text.toLowerCase();
    }
}

module.exports = Statement;
