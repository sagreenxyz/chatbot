# Node.js Customizable Chatbot

A simple, customizable web-based AI chatbot built with Node.js, inspired by the modular architecture of Python's ChatterBot library.

## Features

*   **Modular Design:** Easily swap components like storage and logic adapters.
*   **Intent-Based Understanding:** Attempts to classify user input intent (e.g., greeting, goodbye, ask_time) for more robust responses.
*   **Specific Logic:** Handles specific intents like asking the time with dedicated logic adapters.
*   **Learning:** Learns responses associated with intents, conversation flow, and user corrections.
*   **Preprocessors:** Includes basic text preprocessing (lowercase, whitespace cleaning).
*   **Simple Storage:** Uses a JSON file for storing conversation data (`db.json`), including intents.
*   **Web Interface:** Basic HTML interface for interaction, including response correction.
*   **API Endpoints:** `/chat` for getting responses, `/correct` for submitting corrections.

## Setup

1.  **Clone/Download:** Get the project files.
2.  **Navigate:** Open your terminal in the project directory (`/root/chatbot`).
3.  **Install Dependencies:**
    ```bash
    npm install
    ```

## Running the Chatbot

*   **Start the server:**
    ```bash
    npm start
    ```
    The bot will typically run on `http://localhost:3001` (or the port specified in `server.js` or by the `PORT` environment variable).

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

*   **`server.js`**: Entry point, sets up Express server and API endpoints.
*   **`chatbot.js`**: Core `ChatBot` class orchestrating adapters, intent classification, and learning.
*   **`statement.js`**: `Statement` class representing conversational entries (now includes `intent`).
*   **`preprocessors.js`**: Functions to clean/modify input text.
*   **`intent_classifier.js`**: Simple keyword-based component to determine user input intent.
*   **`adapters/`**: Contains base classes and implementations for:
    *   **`storage_adapter.js`**: Interface for storing/retrieving statements (handles `intent`).
        *   `json_file_storage_adapter.js`: Stores data in `db.json`.
    *   **`logic_adapter.js`**: Interface for selecting responses.
        *   `time_logic_adapter.js`: Specifically handles requests for the current time.
        *   `best_match_logic_adapter.js`: Finds responses primarily based on matching the detected intent (fallback).
*   **`db.json`**: Default database file (created automatically).

## Customization

*   **Intents:** Modify `intent_classifier.js` to add/change intents and keywords, or replace it with a more sophisticated classifier (e.g., using NLP libraries). Configure a custom classifier via `ChatBot` options in `server.js`.
*   **Logic:** Create new classes inheriting from `LogicAdapter` (potentially using intent information) and add them to the `logicAdapters` array in `server.js`.
*   **Storage:** Create new classes inheriting from `StorageAdapter` and set it as the `storageAdapter` in `server.js`.
*   **Preprocessors:** Add new functions to `preprocessors.js` and include them in the `preprocessors` array in `server.js`.
*   **Response Selection:** Modify or add methods in `BestMatchLogicAdapter` (or your custom logic adapter) to change how responses are chosen when multiple responses exist for an intent.

## Future Improvements

*   **Advanced NLP:** Integrate more sophisticated NLP libraries (e.g., Natural, Nlp.js) for better intent classification, entity recognition, and sentiment analysis.
*   **Context Management:** Implement a more robust way to track conversation context across multiple turns.
*   **More Logic Adapters:** Add adapters for specific tasks like calculations, weather lookups, or integrating with external APIs.
*   **Database Storage:** Create storage adapters for databases like MongoDB, PostgreSQL, or Redis for better scalability and performance.
*   **Confidence Scoring:** Implement more nuanced confidence calculation in logic adapters based on match quality, context, etc.
*   **Testing:** Add unit and integration tests for adapters, preprocessors, and the core chatbot logic.
*   **User Authentication/Profiles:** Allow different users to have separate conversation histories.
*   **Deployment:** Add instructions and configurations for deploying to platforms like Heroku, AWS, or Docker.
*   **Training Interface:** Build a separate interface or process for training the bot with predefined conversation corpora.