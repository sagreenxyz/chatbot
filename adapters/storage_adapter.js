class StorageAdapter {
    constructor(options = {}) {
        this.tag = options.tag || 'storage';
    }

    /**
     * Finds a single statement matching the query.
     * @param {object} query - An object describing the query (e.g., { text: '...' }).
     * @returns {Promise<object|null>} - A promise resolving to the *serialized* data of the found statement or null.
     */
    async find(query) {
        throw new Error("The 'find' method is not implemented by this storage adapter.");
    }

    /**
     * Filters statements matching the query.
     * @param {object} query - An object describing the query (e.g., { in_response_to: '...' }).
     * @returns {Promise<Array<object>>} - A promise resolving to an array of *serialized* statement data.
     */
    async filter(query) {
        throw new Error("The 'filter' method is not implemented by this storage adapter.");
    }

    /**
     * Updates or creates a statement in the storage. Input should be a Statement object.
     * @param {Statement} statement - The statement object to be stored.
     * @returns {Promise<object>} - A promise resolving to the *serialized* data of the stored/updated statement.
     */
    async update(statement) {
        throw new Error("The 'update' method is not implemented by this storage adapter.");
    }

    // Optional methods like count, remove, etc.
}

module.exports = StorageAdapter;
