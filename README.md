# Node.js Customizable Chatbot

A simple, customizable web-based AI chatbot built with Node.js, inspired by the modular architecture of Python's ChatterBot library.

## Features

*   **Modular Design:** Easily swap components like storage and logic adapters.
*   **NLP Integration:** Uses **Nlp.js** for improved intent classification and entity recognition.
*   **Specific Logic:** Handles specific intents like asking the time with dedicated logic adapters.
*   **Learning:** Learns responses associated with intents, conversation flow, and user corrections. The NLP model is trained on startup.
*   **Preprocessors:** Includes basic text preprocessing (lowercase, whitespace cleaning).
*   **Simple Storage:** Uses a JSON file for storing conversation data (`db.json`).
*   **Web Interface:** Basic HTML interface for interaction, including response correction.
*   **API Endpoints:** `/chat` for getting responses, `/correct` for submitting corrections.

## Setup

1.  **Clone/Download:** Get the project files.
2.  **Navigate:** Open your terminal in the project directory (`/root/chatbot`).
3.  **Install Dependencies:**
    ```bash
    npm install
    ```
    *(This will install Express and @nlpjs/basic)*

## Running the Chatbot

*   **Start the server:**
    ```bash
    npm start
    ```
    The first time you run this, it will train the NLP model (`model.nlp`), which might take a few seconds. Subsequent starts will load the saved model. The bot runs on `http://localhost:3001`.

*   **Restart (Kill existing process on port 3001 and start):**
    ```bash
    npm run restart
    ```
    *(Note: This uses `sudo` and may prompt for your password)*

## Available Scripts (`package.json`)

*   `npm start`: Starts the Node.js server.
*   `npm run killport -- <PORT>`: Attempts to kill the process running on the specified `<PORT>`. Requires `sudo`.
    *   Example: `npm run killport -- 3001`
*   `npm run restart`: Runs `killport` for port 3001 and then runs `start`. Useful for development. Requires `sudo`.

## Basic Usage

1.  Run the chatbot using `npm start` or `npm run restart`.
2.  Open your web browser to `http://localhost:3001` (or the configured port).
3.  Interact with the bot. Try asking "What time is it?".
4.  **Correcting Responses:** If the bot gives an unsatisfactory answer, click the "Correct This Response" button that appears next to it. Enter the response you think the bot *should* have given and click "Submit Correction". The bot will learn this new association for future interactions.

## API Interaction

*   **Get Response:** Send a POST request to `/chat` with a JSON body:
    ```json
    {
      "text": "Your message here"
    }
    ```
    The response includes the original input and the bot's reply:
    ```json
    {
      "original_input": "Your message here",
      "response": {
        "text": "Bot's response text",
        "confidence": 0.9
      }
    }
    ```

*   **Submit Correction:** Send a POST request to `/correct` with a JSON body:
    ```json
    {
      "originalInputText": "The user input that got the wrong answer",
      "incorrectResponseText": "The bot's actual wrong answer (optional for server)",
      "correctResponseText": "The answer the bot should have given"
    }
    ```
    The response indicates success:
    ```json
    {
      "success": true,
      "message": "Correction learned."
    }
    ```

## Architecture Overview

*   **`server.js`**: Entry point, sets up Express server, initializes the bot (including NLP), and defines API endpoints.
*   **`chatbot.js`**: Core `ChatBot` class orchestrating adapters, NLP processing, and learning.
*   **`statement.js`**: `Statement` class representing conversational entries (includes `intent`, `entities`, `nlp_score`).
*   **`preprocessors.js`**: Functions to clean/modify input text.
*   **`nlp_manager.js`**: Manages the Nlp.js instance, including training, loading, and processing text.
*   **`adapters/`**: Contains base classes and implementations for:
    *   **`storage_adapter.js`**: Interface for storing/retrieving statements.
        *   `json_file_storage_adapter.js`: Stores data in `db.json`.
    *   **`logic_adapter.js`**: Interface for selecting responses.
        *   `time_logic_adapter.js`: Specifically handles requests for the current time.
        *   `best_match_logic_adapter.js`: Finds responses primarily based on matching the detected intent.
*   **`db.json`**: Default database file (created automatically).
*   **`model.nlp`**: Saved trained NLP model (created automatically, ignored by git).

## Customization

*   **Intents & Training:** Modify the training data (documents, answers) within `nlp_manager.js` to add/change intents, entities, or improve recognition.
*   **NLP Configuration:** Adjust Nlp.js settings in `nlp_manager.js`.
*   **Logic:** Create new `LogicAdapter` classes (potentially using intent and entities) and add them to the `logicAdapters` array in `server.js`.
*   **Storage:** Create new `StorageAdapter` classes and set it as the `storageAdapter` in `server.js`.
*   **Preprocessors:** Add new functions to `preprocessors.js` and include them in the `preprocessors` array in `server.js`.
*   **Response Selection:** Modify `BestMatchLogicAdapter` or custom adapters.

## Future Improvements

*   **Context Management:** Implement a more robust way to track conversation context across multiple turns, potentially using NLP entities.
*   **Entity-Driven Logic:** Create logic adapters that react specifically to recognized entities (e.g., locations, names, dates).
*   **Sentiment Analysis:** Use NLP.js sentiment results to tailor responses.
*   **More Logic Adapters:** Add adapters for calculations, weather, external APIs, etc.
*   **Database Storage:** Create storage adapters for databases (MongoDB, PostgreSQL, Redis).
*   **Confidence Scoring:** Refine confidence calculation using NLP scores and adapter logic.
*   **Testing:** Add unit/integration tests.
*   **User Authentication/Profiles:** Allow separate conversation histories.
*   **Deployment:** Add deployment instructions (Heroku, AWS, Docker).
*   **Training Interface:** Build a separate interface for training.