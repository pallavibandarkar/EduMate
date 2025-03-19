# Teacher Assistant API Documentation

## Authentication

Authentication for API endpoints is optional by default in development environments.

To enable authentication:

1. Set the `API_AUTH_REQUIRED=true` environment variable
2. Set the `API_KEY` environment variable with your desired API key
3. Include the API key in requests with the `X-API-Key` header

Example:
```
curl -X GET http://localhost:8000/sessions -H "X-API-Key: your-api-key"
```

Note: For local development, the default configuration allows all requests without authentication.

## Session Management

### Get All Sessions

```
GET /sessions
```

Returns a list of all available chat sessions.

### Create a New Session

```
POST /sessions
```

Request body (optional):
```json
{
  "session_name": "Physics Questions"
}
```

Parameters:
- `session_name` (optional): A name for the session. Defaults to "Untitled Session" if not provided.

Internal fields (automatically initialized):
- `session_id`: Unique identifier for the session (UUID)
- `history`: Empty array to store conversation history
- `processed_documents`: Empty array to track processed documents 
- `info_messages`: Empty array for information messages
- `rewritten_query`: Empty object for query rewriting data
- `search_sources`: Empty array for search sources
- `doc_sources`: Empty array for document sources
- `use_web_search`: Boolean flag, set to true by default

Response:
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_name": "Physics Questions"
}
```

Creates a new chat session and returns its ID and name.

### Get Session Details

```
GET /sessions/{session_id}
```

Returns details about a specific session, including chat history and processed documents.

### Delete a Session

```
DELETE /sessions/{session_id}
```

Deletes a specific session.

## Document Processing

### Process a Document

```
POST /process/document
```

Form data:
- `file`: The document file (PDF, image, etc.)
- `session_id`: (Optional) Session ID to associate the document with

Processes a document and adds it to the vector store for a session.

### Process a URL

```
POST /process/url
```

Request body:
```json
{
  "url": "https://example.com/article",
  "session_id": "optional-session-id"
}
```

Processes a web page and adds its content to the vector store.

### Get Session Sources

```
GET /sources/{session_id}
```

Returns a list of all processed document sources for a session.

## Chat Functionality

### Chat Message

```
POST /chat
```

Request body:
```json
{
  "content": "What is the formula for gravitational force?",
  "force_web_search": false,
  "session_id": "optional-session-id"
}
```

Processes a chat message and returns a response using integrated features:
- Automatically rewrites the query for better information retrieval
- Searches documents in the vector store for relevant information
- Uses Google Search when needed or when forced via `force_web_search: true`
- Combines information from multiple sources to generate a comprehensive response

The response includes:
- The generated answer
- A list of sources used (documents and/or web search results)
- The session ID

## Health Check

```
GET /health
```

Returns the current status of the API and its dependencies.
