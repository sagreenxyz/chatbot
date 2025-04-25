# Node.js Customizable Chatbot

A simple, customizable web-based AI chatbot built with Node.js, inspired by the modular architecture of Python's ChatterBot library.

## Features

*   **Modular Design:** Easily swap components like storage and logic adapters.
*   **Learning:** Learns responses based on conversation flow.
*   **Preprocessors:** Includes basic text preprocessing (lowercase, whitespace cleaning).
*   **Simple Storage:** Uses a JSON file for storing conversation data (`db.json`).
*   **Web Interface:** Basic HTML interface for interaction.
*   **API Endpoint:** `/chat` endpoint for programmatic interaction.

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
3.  Interact with the bot through the input field. The bot learns by associating consecutive statements. For example:
    *   You: Hello
    *   Bot: I'm sorry, I don't understand.
    *   You: How are you?
    *   Bot: I'm sorry, I don't understand. *(Learns "How are you?" follows "Hello")*
    *   You: Hello
    *   Bot: How are you? *(Responds with learned statement)*

## API Interaction

Send a POST request to `/chat` with a JSON body:

```json
{
  "text": "Your message here"
}
```

The response will be JSON containing the bot's reply:

```json
{
  "response": {
    "text": "Bot's response text",
    "confidence": 0.9
  }
}
```

## Architecture Overview

*   **`server.js`**: Entry point, sets up Express server and API endpoints.
*   **`chatbot.js`**: Core `ChatBot` class orchestrating adapters and learning.
*   **`statement.js`**: `Statement` class representing conversational entries.
*   **`preprocessors.js`**: Functions to clean/modify input text.
*   **`adapters/`**: Contains base classes and implementations for:
    *   **`storage_adapter.js`**: Interface for storing/retrieving statements.
        *   `json_file_storage_adapter.js`: Stores data in `db.json`.
    *   **`logic_adapter.js`**: Interface for selecting responses.
        *   `best_match_logic_adapter.js`: Finds responses based on previous interactions.
*   **`db.json`**: Default database file (created automatically).

## Customization

*   **Logic:** Create new classes inheriting from `LogicAdapter` and add them to the `logicAdapters` array in `server.js`.
*   **Storage:** Create new classes inheriting from `StorageAdapter` and set it as the `storageAdapter` in `server.js`.
*   **Preprocessors:** Add new functions to `preprocessors.js` and include them in the `preprocessors` array in `server.js`.
*   **Response Selection:** Modify or add methods in `BestMatchLogicAdapter` (or your custom logic adapter) to change how responses are chosen when multiple matches exist.