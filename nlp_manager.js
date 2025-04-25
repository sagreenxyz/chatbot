const { NlpManager } = require('@nlpjs/basic');

class NlpProcessor {
    constructor() {
        this.manager = new NlpManager({ languages: ['en'], forceNER: true });
        this.isReady = false;
    }

    async setup() {
        console.log('Setting up NLP Manager...');
        // --- Define Intents and Training Data ---
        // Greetings
        this.manager.addDocument('en', 'hello', 'greeting');
        this.manager.addDocument('en', 'hi', 'greeting');
        this.manager.addDocument('en', 'hey there', 'greeting');
        this.manager.addDocument('en', 'good morning', 'greeting');
        this.manager.addDocument('en', 'howdy', 'greeting');

        // Goodbyes
        this.manager.addDocument('en', 'bye', 'goodbye');
        this.manager.addDocument('en', 'goodbye', 'goodbye');
        this.manager.addDocument('en', 'see you later', 'goodbye');
        this.manager.addDocument('en', 'take care', 'goodbye');

        // Ask Status
        this.manager.addDocument('en', 'how are you', 'ask_status');
        this.manager.addDocument('en', 'how is it going', 'ask_status');
        this.manager.addDocument('en', 'are you okay', 'ask_status');

        // Ask Time
        this.manager.addDocument('en', 'what time is it', 'ask_time');
        this.manager.addDocument('en', 'current time', 'ask_time');
        this.manager.addDocument('en', 'tell me the time', 'ask_time');

        // Affirmative / Negative (Might be less reliable without more context/training)
        this.manager.addDocument('en', 'yes', 'affirmative');
        this.manager.addDocument('en', 'okay', 'affirmative');
        this.manager.addDocument('en', 'no', 'negative');
        this.manager.addDocument('en', 'nope', 'negative');

        // --- Define Answers (Optional, but good practice for nlp.js) ---
        // While our logic adapters handle responses, adding basic answers helps nlp.js training.
        this.manager.addAnswer('en', 'greeting', 'Hello!');
        this.manager.addAnswer('en', 'greeting', 'Hi there!');
        this.manager.addAnswer('en', 'goodbye', 'Goodbye!');
        this.manager.addAnswer('en', 'goodbye', 'See you!');
        this.manager.addAnswer('en', 'ask_status', "I'm doing well, thank you!"); // Example
        // Time answer is handled by TimeLogicAdapter
        // Affirmative/Negative answers are context-dependent

        // --- Train the Model ---
        console.log('Training NLP model...');
        await this.manager.train();
        this.manager.save('./model.nlp'); // Save the trained model
        console.log('NLP model trained and saved.');
        this.isReady = true;
    }

    async load() {
         console.log('Loading NLP model...');
         try {
            this.manager.load('./model.nlp');
            this.isReady = true;
            console.log('NLP model loaded.');
         } catch (err) {
             console.warn('Failed to load saved NLP model, setting up from scratch...', err.message);
             await this.setup(); // Fallback to setup if loading fails
         }
    }


    /**
     * Process input text to get intent and entities.
     * @param {string} text - The input text.
     * @returns {Promise<{intent: string, score: number, entities: Array}>} - The NLP processing result.
     */
    async process(text) {
        if (!this.isReady) {
            console.warn('NLP Manager not ready, returning default intent.');
            return { intent: 'unknown', score: 0, entities: [] };
        }
        try {
            const result = await this.manager.process('en', text);
            return {
                intent: result.intent || 'unknown',
                score: result.score || 0,
                entities: result.entities || []
                // You can also access result.sentiment, result.language etc.
            };
        } catch (error) {
             console.error("Error processing text with NLP Manager:", error);
             return { intent: 'unknown', score: 0, entities: [] }; // Fallback on error
        }
    }
}

// Export a single instance
const nlpProcessor = new NlpProcessor();
module.exports = nlpProcessor;
