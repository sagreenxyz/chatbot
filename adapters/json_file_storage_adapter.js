const fs = require('fs').promises;
const path = require('path');
const StorageAdapter = require('./storage_adapter');
const Statement = require('../statement'); // Import Statement for type checking and serialization

class JsonFileStorageAdapter extends StorageAdapter {
    constructor(options = {}) {
        super(options);
        this.databasePath = options.databasePath || path.join(__dirname, '../db.json');
        this._data = null; // Cache for loaded data { statements: [...] }
        this._loadPromise = null; // To prevent race conditions on load
    }

    // Improved loading with lock
    async _loadData() {
        if (this._data) return this._data;
        if (this._loadPromise) return this._loadPromise; // Wait for existing load operation

        this._loadPromise = (async () => {
            try {
                const fileContent = await fs.readFile(this.databasePath, 'utf8');
                this._data = JSON.parse(fileContent);
                if (!Array.isArray(this._data.statements)) { // Ensure statements is an array
                    console.warn(`Database file ${this.databasePath} has invalid format. Resetting statements.`);
                    this._data.statements = [];
                }
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.log(`Database file ${this.databasePath} not found. Creating new one.`);
                    this._data = { statements: [] };
                    await this._saveData(); // Create the file
                } else {
                    console.error(`Error loading database file ${this.databasePath}:`, error);
                    // Fallback to empty data to prevent crashes, but data is lost/inaccessible
                    this._data = { statements: [] };
                }
            } finally {
                this._loadPromise = null; // Release lock
            }
            return this._data;
        })();
        return this._loadPromise;
    }

    // Saving remains the same
    async _saveData() {
        if (!this._data) return; // Don't save if data hasn't been loaded
        try {
            // Ensure statements is always an array before saving
            if (!Array.isArray(this._data.statements)) {
                console.error("Attempted to save invalid data structure. Aborting save.");
                return;
            }
            await fs.writeFile(this.databasePath, JSON.stringify(this._data, null, 2), 'utf8');
        } catch (error) {
            console.error("Error saving database:", error);
        }
    }

    /**
     * Finds a single statement matching the query text (case-insensitive).
     * Returns serialized data.
     */
    async find(query) {
        const data = await this._loadData();
        const queryTextLower = query.text?.toLowerCase();
        if (!queryTextLower) return null;

        // Ensure statements is an array before searching
        const statements = Array.isArray(data?.statements) ? data.statements : [];

        const foundStatementData = statements.find(stmtData =>
            typeof stmtData?.text === 'string' && // Check type before calling toLowerCase
            stmtData.text.toLowerCase() === queryTextLower
        );
        return foundStatementData || null; // Return serialized data or null
    }

    /**
     * Filters statements based on query criteria (e.g., in_response_to, case-insensitive).
     * Returns an array of serialized data.
     */
    async filter(query) {
        const data = await this._loadData();
        // Ensure statements is an array before filtering
        let statementsToFilter = Array.isArray(data?.statements) ? data.statements : [];

        // Filter by 'in_response_to' (case-insensitive)
        if (query.in_response_to !== undefined && query.in_response_to !== null) {
            // Ensure query.in_response_to is a string before calling toLowerCase
            const responseToLower = typeof query.in_response_to === 'string'
                ? query.in_response_to.toLowerCase()
                : null;

            if (responseToLower !== null) {
                statementsToFilter = statementsToFilter.filter(stmtData =>
                    typeof stmtData?.in_response_to === 'string' && // Check type
                    stmtData.in_response_to.toLowerCase() === responseToLower
                );
            } else {
                // If query.in_response_to is not a valid string, return empty? Or filter differently?
                statementsToFilter = [];
            }
        }

        // Add other filter criteria here if needed (e.g., conversation, tags)

        return statementsToFilter; // Return array of serialized data
    }

    /**
     * Updates or creates a statement. Expects a Statement object as input.
     * Stores serialized data. Returns serialized data.
     */
    async update(statement) {
        if (!(statement instanceof Statement)) {
            throw new Error("JsonFileStorageAdapter.update expects a Statement object.");
        }
        const dbData = await this._loadData();
        // Ensure statements is an array
        if (!Array.isArray(dbData.statements)) {
            console.error("Cannot update database: statements array is missing or invalid.");
            dbData.statements = []; // Attempt recovery
        }

        const statementData = statement.serialize(); // Get serializable data

        // Find existing based on text (case-insensitive)
        const textToCompare = typeof statementData.text === 'string' ? statementData.text.toLowerCase() : null;
        let existingIndex = -1;
        if (textToCompare !== null) {
            existingIndex = dbData.statements.findIndex(stmtData =>
                typeof stmtData?.text === 'string' &&
                stmtData.text.toLowerCase() === textToCompare
            );
        }

        if (existingIndex === -1) {
            // Add new statement data only if text is valid
            if (textToCompare !== null) {
                dbData.statements.push(statementData);
            } else {
                console.warn("Skipping update: Statement text is invalid.", statement);
                return null; // Indicate failure or skip?
            }
        } else {
            // Update existing statement data (simple merge for now)
            dbData.statements[existingIndex] = {
                ...dbData.statements[existingIndex], // Keep existing data
                ...statementData // Overwrite with new data (like in_response_to, timestamp)
            };
        }

        await this._saveData();
        // Return the data that was actually stored/updated
        const resultData = existingIndex === -1 ? statementData : dbData.statements[existingIndex];
        // Ensure we return null if the operation was skipped
        return (existingIndex !== -1 || textToCompare !== null) ? resultData : null;
    }

    // Add other methods like count, remove etc. as needed
}

module.exports = JsonFileStorageAdapter;
