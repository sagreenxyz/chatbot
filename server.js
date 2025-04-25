const express = require('express');
const ChatBot = require('./chatbot');
const Statement = require('./statement'); // Import Statement
const JsonFileStorageAdapter = require('./adapters/json_file_storage_adapter');
const BestMatchLogicAdapter = require('./adapters/best_match_logic_adapter');
const preprocessors = require('./preprocessors'); // Import preprocessors

const app = express();
const port = process.env.PORT || 3001; // Ensure this matches your desired port

// Middleware to parse JSON bodies
app.use(express.json());

// --- Configure the ChatBot ---
// Pass preprocessors during instantiation
const bot = new ChatBot('NodeBot', {
    storageAdapter: new JsonFileStorageAdapter({ databasePath: './db.json' }),
    logicAdapters: [
        new BestMatchLogicAdapter()
        // Add more logic adapters here
    ],
    preprocessors: [ // Explicitly define preprocessors used
        preprocessors.cleanWhitespace,
        preprocessors.lowercase
    ]
});

// --- API Endpoint ---
app.post('/chat', async (req, res) => {
    const inputText = req.body.text;

    if (!inputText) {
        return res.status(400).json({ error: 'Missing "text" in request body' });
    }

    try {
        // Input is now processed by bot.getResponse, which handles Statement creation
        const responseStatement = await bot.getResponse(inputText); // Pass raw text

        // Return the text and confidence from the response Statement
        res.json({
            response: {
                text: responseStatement.text,
                confidence: responseStatement.confidence
                // Add other fields from responseStatement if needed by the client
            }
         });

    } catch (error) {
        console.error("Error processing chat request:", error);
        // Include more error details if helpful for debugging, but be cautious in production
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// --- Simple Web UI (Optional) ---
// The existing web UI should still work, as it expects a response object
// with a 'text' property within the 'response' field.
app.get('/', (req, res) => {
    res.send(`
        <h1>Node.js ChatBot</h1>
        <form id="chat-form">
            <input type="text" id="message" placeholder="Type your message..." required>
            <button type="submit">Send</button>
        </form>
        <div id="response"></div>
        <script>
            const form = document.getElementById('chat-form');
            const messageInput = document.getElementById('message');
            const responseDiv = document.getElementById('response');

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const text = messageInput.value;
                messageInput.value = '';
                responseDiv.textContent = 'Thinking...';

                try {
                    const response = await fetch('/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text })
                    });
                    const data = await response.json();
                    if (response.ok && data.response) { // Check if data.response exists
                        // Display text and optionally confidence
                        responseDiv.textContent = \`Bot: \${data.response.text} (Confidence: \${data.response.confidence?.toFixed(2) || 'N/A'})\`;
                    } else {
                        responseDiv.textContent = 'Error: ' + (data.error || data.message || 'Unknown error');
                    }
                } catch (err) {
                    responseDiv.textContent = 'Network Error: ' + err.message;
                }
            });
        </script>
    `);
});


app.listen(port, () => {
    console.log(`Chatbot server listening at http://localhost:${port}`);
});
