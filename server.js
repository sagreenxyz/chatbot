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
            original_input: inputText,
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

// --- New Endpoint for Corrections ---
app.post('/correct', async (req, res) => {
    const { originalInputText, incorrectResponseText, correctResponseText } = req.body;

    if (!originalInputText || !correctResponseText) {
         return res.status(400).json({ error: 'Missing originalInputText or correctResponseText in request body' });
    }

    try {
        // Call a new method on the bot to learn the correction
        await bot.learnCorrection(originalInputText, correctResponseText);
        res.json({ success: true, message: 'Correction learned.' });
    } catch (error) {
        console.error("Error processing correction:", error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// --- Simple Web UI (Updated) ---
app.get('/', (req, res) => {
    res.send(`
        <h1>Node.js ChatBot</h1>
        <div id="conversation">
             <div id="last-interaction">
                <p><strong>You:</strong> <span id="last-input">...</span></p>
                <p><strong>Bot:</strong> <span id="last-response">...</span> (<span id="last-confidence">...</span>)
                   <button id="correct-btn" style="display:none;">Correct This Response</button>
                </p>
             </div>
             <div id="correction-form" style="display:none;">
                 <label for="correct-text">Enter correct response:</label>
                 <input type="text" id="correct-text" size="50">
                 <button id="submit-correction-btn">Submit Correction</button>
                 <button id="cancel-correction-btn">Cancel</button>
             </div>
             <div id="response-status"></div> <!-- For status messages -->
        </div>
        <form id="chat-form">
            <input type="text" id="message" placeholder="Type your message..." required>
            <button type="submit">Send</button>
        </form>

        <script>
            const chatForm = document.getElementById('chat-form');
            const messageInput = document.getElementById('message');
            const lastInputSpan = document.getElementById('last-input');
            const lastResponseSpan = document.getElementById('last-response');
            const lastConfidenceSpan = document.getElementById('last-confidence');
            const correctBtn = document.getElementById('correct-btn');
            const correctionForm = document.getElementById('correction-form');
            const correctTextInput = document.getElementById('correct-text');
            const submitCorrectionBtn = document.getElementById('submit-correction-btn');
            const cancelCorrectionBtn = document.getElementById('cancel-correction-btn');
            const responseStatusDiv = document.getElementById('response-status');

            let currentInputText = ''; // Store the input that led to the current response
            let currentResponseText = ''; // Store the bot's current response text

            chatForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const text = messageInput.value;
                messageInput.value = '';
                responseStatusDiv.textContent = 'Thinking...';
                lastInputSpan.textContent = text; // Show user input immediately
                lastResponseSpan.textContent = '...';
                lastConfidenceSpan.textContent = '...';
                correctBtn.style.display = 'none'; // Hide button until response arrives
                correctionForm.style.display = 'none'; // Hide correction form

                currentInputText = text; // Store for potential correction

                try {
                    const response = await fetch('/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text })
                    });
                    const data = await response.json();

                    if (response.ok && data.response) {
                        currentResponseText = data.response.text; // Store for potential correction
                        lastResponseSpan.textContent = data.response.text;
                        lastConfidenceSpan.textContent = \`Confidence: \${data.response.confidence?.toFixed(2) || 'N/A'}\`;
                        responseStatusDiv.textContent = ''; // Clear thinking message
                        correctBtn.style.display = 'inline-block'; // Show correction button
                    } else {
                        lastResponseSpan.textContent = 'Error';
                        lastConfidenceSpan.textContent = 'N/A';
                        responseStatusDiv.textContent = 'Error: ' + (data.error || data.message || 'Unknown error');
                        correctBtn.style.display = 'none';
                    }
                } catch (err) {
                    lastResponseSpan.textContent = 'Network Error';
                    lastConfidenceSpan.textContent = 'N/A';
                    responseStatusDiv.textContent = 'Network Error: ' + err.message;
                    correctBtn.style.display = 'none';
                }
            });

            correctBtn.addEventListener('click', () => {
                correctionForm.style.display = 'block';
                correctTextInput.value = currentResponseText; // Pre-fill with bot's response
                correctTextInput.focus();
                correctBtn.style.display = 'none'; // Hide button while correcting
            });

            cancelCorrectionBtn.addEventListener('click', () => {
                correctionForm.style.display = 'none';
                correctBtn.style.display = 'inline-block'; // Show button again
            });

            submitCorrectionBtn.addEventListener('click', async () => {
                const correctedText = correctTextInput.value.trim();
                if (!correctedText) {
                    responseStatusDiv.textContent = 'Please enter a corrected response.';
                    return;
                }

                responseStatusDiv.textContent = 'Submitting correction...';

                try {
                    const response = await fetch('/correct', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            originalInputText: currentInputText,
                            incorrectResponseText: currentResponseText, // Send incorrect one too (optional for server)
                            correctResponseText: correctedText
                        })
                    });
                    const data = await response.json();

                    if (response.ok && data.success) {
                        responseStatusDiv.textContent = 'Correction submitted successfully!';
                        // Optionally update the displayed response immediately
                        // lastResponseSpan.textContent = correctedText;
                    } else {
                         responseStatusDiv.textContent = 'Error submitting correction: ' + (data.error || data.message || 'Unknown error');
                    }
                } catch (err) {
                     responseStatusDiv.textContent = 'Network error during correction: ' + err.message;
                } finally {
                    correctionForm.style.display = 'none';
                    // Decide whether to show the correct button again immediately or not
                    // correctBtn.style.display = 'inline-block';
                }
            });
        </script>
    `);
});


app.listen(port, () => {
    console.log(`Chatbot server listening at http://localhost:${port}`);
});
