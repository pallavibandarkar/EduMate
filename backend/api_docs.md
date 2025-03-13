# Teacher Assistant API Documentation

## Authentication

All API endpoints can be secured with an API key. To use authentication:

1. Set the `API_KEY` environment variable 
2. Include the API key in requests with the `X-API-Key` header

Example:
```
curl -X GET http://localhost:8000/sessions -H "X-API-Key: your-api-key"
```

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

Creates a new chat session and returns its ID.

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

Processes a chat message and returns a response using RAG and/or web search.

### Rewrite Query

```
POST /chat/rewrite-query
```

Request body:
```json
{
  "query": "How gravity work?"
}
```

Rewrites a query to make it more effective for information retrieval.

### Perform Web Search

```
POST /chat/search
```

Request body:
```json
{
  "query": "Latest research on quantum computing"
}
```

Performs a Google search and returns the results and source links.

## Health Check

```
GET /health
```

Returns the current status of the API and its dependencies.
