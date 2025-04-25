/**
 * Convert the statement text to lowercase.
 * @param {Statement} statement - The input statement.
 * @returns {Statement} - The statement with lowercase text.
 */
function lowercase(statement) {
    statement.text = statement.text.toLowerCase();
    return statement;
}

/**
 * Remove leading/trailing whitespace from the statement text.
 * @param {Statement} statement - The input statement.
 * @returns {Statement} - The statement with trimmed text.
 */
function cleanWhitespace(statement) {
    statement.text = statement.text.trim();
    return statement;
}

module.exports = {
    lowercase,
    cleanWhitespace
};
