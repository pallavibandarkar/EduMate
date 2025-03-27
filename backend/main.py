import os
import json
import tempfile
import uuid
import importlib
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks, Query, Header, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, HttpUrl
from contextlib import asynccontextmanager
import google.generativeai as genai
import sys
from pathlib import Path

# Improve the project path setup
current_dir = Path(__file__).parent.absolute()
project_root = current_dir.parent  # This is the teacherassistant directory

# Ensure the paths are properly added to sys.path
# The order is important - add project root first so it takes precedence
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(current_dir))
# Add parent of project_root to support teacherassistant.backend imports
sys.path.insert(0, str(project_root.parent))

# Now import the modules
# Import shared functionality from embedder.py
from embedder import (
    init_pinecone,
    create_vector_store,
    check_document_relevance,
    GeminiEmbedder
)
from langchain_pinecone import PineconeVectorStore

from search import google_search

# Import document processing functions using direct imports
from document_loader import prepare_document, process_pdf, process_web, process_image

# Import agents using direct imports
from agents.writeragents import get_query_rewriter_agent, get_rag_agent, test_url_detector, generate_session_title

# Import session management functions
from utils.session_manager import (
    save_session,
    load_session,
    get_available_sessions,
    delete_session,
    create_new_session
)

# Import supabase client
from utils.supabase_client import initialize_supabase

from agents.intentdetectorAgent import detect_google_search_intent

# Import curriculum service
from curriculum_service import (
    CurriculumRequest,
    CurriculumModificationRequest,
    CurriculumResponse,
    StepDetailResponse,
    generate_curriculum,
    get_curriculum,
    modify_curriculum_by_id,
    generate_curriculum_details,
    get_step_detail
)

# Import curriculum service with new functions
from curriculum_service import (
    CurriculumRequest,
    CurriculumModificationRequest,
    CurriculumResponse,
    StepDetailResponse,
    CurriculumListResponse,
    CurriculumCreateRequest,
    generate_curriculum,
    get_curriculum,
    modify_curriculum_by_id,
    generate_curriculum_details,
    get_step_detail,
    get_all_curriculums,
    create_curriculum,
    delete_curriculum_by_id
)

# Load environment variables
load_dotenv()

# Get API keys from environment variables with fallbacks
GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY", "")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "")
API_KEY = os.getenv("API_KEY", "")  # Remove default value to make authentication optional
API_AUTH_REQUIRED = os.getenv("API_AUTH_REQUIRED", "false").lower() == "true"  # Default to not requiring auth

# Hardcoded similarity threshold
SIMILARITY_THRESHOLD = 0.7

# Initialize app state
app_state = {
    "vector_store": None,
    "processed_documents": [],
    "pinecone_client": None,
    "supabase_client": None,
    "session_vector_stores": {}
}

# Setup security
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def get_api_key(api_key: str = Security(api_key_header)):
    # If authentication is not required or no API key is set, allow all access
    if not API_AUTH_REQUIRED or not API_KEY:
        return True
        
    # If authentication is required and API key is set, validate the provided key
    if api_key == API_KEY:
        return True
        
    raise HTTPException(
        status_code=403,
        detail="Invalid API key",
    )

# Setup lifespan for FastAPI
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize on startup
    os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY
    genai.configure(api_key=GOOGLE_API_KEY)
    app_state["pinecone_client"] = init_pinecone(PINECONE_API_KEY)
    app_state["supabase_client"] = initialize_supabase()
    
    yield
    
    # Clean up on shutdown
    app_state["vector_store"] = None
    app_state["processed_documents"] = []
    app_state["session_vector_stores"] = {}

app = FastAPI(
    title="Teacher Assistant API", 
    description="API for teacher assistant with RAG capabilities",
    lifespan=lifespan,
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for requests and responses
class MessageRequest(BaseModel):
    content: str
    force_web_search: bool = False
    session_id: Optional[str] = None

class MessageResponse(BaseModel):
    content: str
    sources: List[Dict[str, str]] = []
    session_id: str

class ProcessUrlRequest(BaseModel):
    url: HttpUrl
    session_id: Optional[str] = None

class ProcessResponse(BaseModel):
    success: bool
    sources: List[str] = []
    session_id: str

class SourceResponse(BaseModel):
    sources: List[str]

class SessionInfo(BaseModel):
    session_id: str
    session_name: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class SessionListResponse(BaseModel):
    sessions: List[SessionInfo]

class SessionResponse(BaseModel):
    session_id: str
    session_name: str
    history: List[Dict[str, str]] = []
    processed_documents: List[str] = []
    use_web_search: bool = False

class CreateSessionRequest(BaseModel):
    session_name: Optional[str] = None

class CreateSessionResponse(BaseModel):
    session_id: str
    session_name: str

# Performance tracking dictionary
performance_metrics = {
    "vector_store_creation_time": [],
    "vector_store_query_time": [],
    "session_load_time": [],
    "session_save_time": [],
    "api_response_time": {},
    "gemini_api_calls": 0
}

# Helper function to get or create session vector store with caching and performance tracking
def get_session_vector_store(session_id: str):
    import time
    start_time = time.time()
    
    if session_id in app_state["session_vector_stores"]:
        return app_state["session_vector_stores"][session_id]
    
    if app_state["pinecone_client"]:
        try:
            # Check if we have too many namespaces already (Pinecone can have limits)
            if len(app_state["session_vector_stores"]) > 100:  # Adjust this threshold as needed
                # Remove least recently used vector stores to prevent namespace explosion
                # This is a simple implementation - consider a more sophisticated LRU cache
                oldest_sessions = sorted(app_state["session_vector_stores"].keys())[:10]
                for old_session in oldest_sessions:
                    del app_state["session_vector_stores"][old_session]
                print(f"Cleaned up {len(oldest_sessions)} old vector store sessions")
            
            index = app_state["pinecone_client"].Index("gemini-thinking-agent-agno")
            from embedder import GeminiEmbedder
            vector_store = PineconeVectorStore(
                index=index,
                embedding=GeminiEmbedder(api_key=GOOGLE_API_KEY),
                text_key="text",
                namespace=session_id
            )
            app_state["session_vector_stores"][session_id] = vector_store
            
            # Track performance metric
            creation_time = time.time() - start_time
            performance_metrics["vector_store_creation_time"].append(creation_time)
            if creation_time > 1.0:  # Log slow operations
                print(f"WARNING: Slow vector store creation: {creation_time:.2f}s for session {session_id}")
                
            return vector_store
        except Exception as e:
            print(f"Error initializing vector store: {e}")
    
    return None

# API routes
@app.get("/")
async def root():
    return {"message": "Teacher Assistant API is running"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "google_api_key": bool(GOOGLE_API_KEY),
        "pinecone_api_key": bool(PINECONE_API_KEY),
        "pinecone_client": bool(app_state["pinecone_client"]),
        "supabase_client": bool(app_state["supabase_client"]),
        "documents_processed": len(app_state["processed_documents"]),
        "sessions_active": len(app_state["session_vector_stores"])
    }

# SESSION MANAGEMENT ENDPOINTS
@app.get("/sessions", response_model=SessionListResponse, dependencies=[Depends(get_api_key)])
async def get_sessions():
    """Get all available sessions"""
    try:
        sessions_list, error = get_available_sessions()
        if error:
            raise HTTPException(status_code=500, detail=f"Error fetching sessions: {error}")
        
        return {"sessions": sessions_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/sessions", response_model=CreateSessionResponse, dependencies=[Depends(get_api_key)])
async def create_session(request: CreateSessionRequest = None):
    """Create a new chat session"""
    try:
        # Create new session with Supabase
        session_id = str(uuid.uuid4())
        session_name = request.session_name if request and request.session_name else "Untitled Session"
        
        # Initialize empty session data
        session_data = {
            "session_id": session_id,
            "session_name": session_name,
            "history": [],
            "processed_documents": [],
            "info_messages": [],
            "rewritten_query": {"original": "", "rewritten": ""},
            "search_sources": [],
            "doc_sources": [],
            "use_web_search": True
        }
        
        # Save session to database
        success, error = save_session(session_id, session_data)
        if not success:
            raise HTTPException(status_code=500, detail=f"Failed to create session: {error}")
        
        return {"session_id": session_id, "session_name": session_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating session: {str(e)}")

@app.get("/sessions/{session_id}", response_model=SessionResponse, dependencies=[Depends(get_api_key)])
async def get_session(session_id: str):
    """Get information about a specific session"""
    try:
        session_data, error = load_session(session_id)
        if error:
            raise HTTPException(status_code=404, detail=f"Session not found: {error}")
        
        return {
            "session_id": session_data.get("session_id", session_id),
            "session_name": session_data.get("session_name", "Untitled Session"),
            "history": session_data.get("history", []),
            "processed_documents": session_data.get("processed_documents", []),
            "use_web_search": session_data.get("use_web_search", False)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.delete("/sessions/{session_id}", dependencies=[Depends(get_api_key)])
async def remove_session(session_id: str):
    """Delete a specific session"""
    try:
        success, error = delete_session(session_id)
        if not success:
            raise HTTPException(status_code=500, detail=f"Failed to delete session: {error}")
        
        # Also clean up any vector stores
        if session_id in app_state["session_vector_stores"]:
            del app_state["session_vector_stores"][session_id]
        
        return {"success": True, "message": f"Session {session_id} deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# DOCUMENT PROCESSING ENDPOINTS
@app.post("/process/document", response_model=ProcessResponse, dependencies=[Depends(get_api_key)])
async def process_document(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None)
):
    """Process a document and add to vector store"""
    file_name = file.filename
    
    # Generate session ID if not provided
    if not session_id:
        session_id = str(uuid.uuid4())
    
    try:
        # Check file size (10 MB limit)
        file_size = 0
        chunk_size = 1024 * 1024  # 1 MB
        file_content = bytearray()
        
        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            file_content.extend(chunk)
            file_size += len(chunk)
            
            # Stop if file is too large (over 10MB)
            if file_size > 10 * 1024 * 1024:
                raise HTTPException(
                    status_code=413,
                    detail="File too large, maximum size is 10 MB"
                )
        
        # Reset file position for reading again
        await file.seek(0)
        
        # Check file type based on extension
        file_ext = os.path.splitext(file_name)[1].lower()
        allowed_extensions = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp']
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file format: {file_ext}. Supported formats are: PDF, PNG, JPG, JPEG, GIF, WEBP"
            )
        
        # Save uploaded file to temp location
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            temp_file.write(file_content)
            temp_path = temp_file.name
        
        # Process based on file type
        try:
            if file_ext in ['.png', '.jpg', '.jpeg', '.gif', '.webp']:
                texts = process_image(temp_path)
                doc_type = "Image"
            else:  # PDF or other document types
                texts = process_pdf(temp_path)
                doc_type = "Document"
                
            # Ensure we got valid text chunks
            if not texts or len(texts) == 0:
                raise ValueError("No text content could be extracted from the file")
                
            print(f"Successfully processed {doc_type}: {file_name}, extracted {len(texts)} text chunks")
            
        except Exception as e:
            print(f"Error processing {doc_type} content: {str(e)}")
            os.unlink(temp_path)  # Clean up temp file
            raise HTTPException(
                status_code=422, 
                detail=f"Failed to process {doc_type.lower()} content: {str(e)}"
            )
            
        # Clean up temp file
        os.unlink(temp_path)
        
        # Add to vector store
        if texts and app_state["pinecone_client"]:
            try:
                # Get or create vector store for the session
                vector_store = get_session_vector_store(session_id)
                if not vector_store:
                    # Create new vector store with session namespace
                    vector_store = create_vector_store(app_state["pinecone_client"], texts, namespace=session_id)
                    app_state["session_vector_stores"][session_id] = vector_store
                else:
                    # Add to existing vector store
                    vector_store.add_documents(texts)
                
            except Exception as e:
                print(f"Error adding to vector store: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to add document to vector store: {str(e)}"
                )
                
            # Track processed document in session
            processed_documents = [file_name]
            
            # Update session in database if it exists
            session_data, _ = load_session(session_id)
            if session_data:
                # Append to existing documents if any
                if "processed_documents" in session_data:
                    processed_documents = list(set(session_data["processed_documents"] + [file_name]))
                
                # Update session
                session_data["processed_documents"] = processed_documents
                save_session(session_id, session_data)
            
            return {"success": True, "sources": processed_documents, "session_id": session_id}
        else:
            raise HTTPException(status_code=422, detail="No content could be extracted from the document")
            
    except HTTPException as e:
        # Re-raise HTTP exceptions as they already have status_code and detail
        raise e
    except Exception as e:
        print(f"Unexpected error processing document: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")

@app.post("/process/url", response_model=ProcessResponse, dependencies=[Depends(get_api_key)])
async def process_url(request: ProcessUrlRequest):
    """Process a URL and add to vector store"""
    web_url = str(request.url)
    
    # Generate session ID if not provided
    session_id = request.session_id or str(uuid.uuid4())
    
    try:
        texts = process_web(web_url)
        if texts and app_state["pinecone_client"]:
            # Get or create vector store for the session
            vector_store = get_session_vector_store(session_id)
            if not vector_store:
                # Create new vector store with session namespace
                vector_store = create_vector_store(app_state["pinecone_client"], texts, namespace=session_id)
                app_state["session_vector_stores"][session_id] = vector_store
            else:
                # Add to existing vector store
                vector_store.add_documents(texts)
            
            # Track processed URL in session
            processed_documents = [web_url]
            
            # Update session in database if it exists
            session_data, _ = load_session(session_id)
            if session_data:
                # Append to existing documents if any
                if "processed_documents" in session_data:
                    processed_documents = list(set(session_data["processed_documents"] + [web_url]))
                
                # Update session
                session_data["processed_documents"] = processed_documents
                save_session(session_id, session_data)
            
            return {"success": True, "sources": processed_documents, "session_id": session_id}
        else:
            raise HTTPException(status_code=500, detail="Failed to process URL")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing URL: {str(e)}")

@app.get("/sources/{session_id}", response_model=SourceResponse, dependencies=[Depends(get_api_key)])
async def get_session_sources(session_id: str):
    """Get all processed document sources for a session"""
    try:
        session_data, error = load_session(session_id)
        if error:
            raise HTTPException(status_code=404, detail=f"Session not found: {error}")
        
        return {"sources": session_data.get("processed_documents", [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# CHAT ENDPOINTS
@app.post("/chat", response_model=MessageResponse, dependencies=[Depends(get_api_key)])
async def chat(request: MessageRequest):
    """
    Process a chat message and return response
    
    This endpoint handles:
    1. Query rewriting automatically
    2. Web search when force_web_search=true or when appropriate
    3. Document retrieval from vector store
    4. Response generation with all available context
    """
    prompt = request.content
    force_web_search = request.force_web_search
    session_id = request.session_id or str(uuid.uuid4())
    
    # Process and respond to the message
    try:
        # Load or initialize session data
        session_data = None
        if session_id:
            session_data, _ = load_session(session_id)
        
        if not session_data:
            session_data = {
                "session_id": session_id,
                "session_name": "Untitled Session",
                "history": [],
                "processed_documents": [],
                "info_messages": [],
                "rewritten_query": {"original": "", "rewritten": ""},
                "search_sources": [],
                "doc_sources": [],
                "use_web_search": True
            }
        
        # Add user message to history
        history = session_data.get("history", [])
        history.append({"role": "user", "content": prompt})
        session_data["history"] = history
        
        # Check for URLs in prompt
        url_detector = test_url_detector(prompt)
        detected_urls = url_detector.urls
        
        # Process any detected URLs
        for url in detected_urls:
            if url not in session_data.get("processed_documents", []):
                texts = process_web(url)
                if texts and app_state["pinecone_client"]:
                    # Get or create vector store for the session
                    vector_store = get_session_vector_store(session_id)
                    if not vector_store:
                        # Create new vector store with session namespace
                        vector_store = create_vector_store(app_state["pinecone_client"], texts, namespace=session_id)
                        app_state["session_vector_stores"][session_id] = vector_store
                    else:
                        # Add to existing vector store
                        vector_store.add_documents(texts)
                    
                    # Add to processed documents
                    processed_docs = session_data.get("processed_documents", [])
                    processed_docs.append(url)
                    session_data["processed_documents"] = processed_docs
        
        # Rewrite the query for better retrieval
        query_rewriter = get_query_rewriter_agent()
        rewritten_query = query_rewriter.run(prompt).content
        
        # Save for display
        session_data["rewritten_query"] = {
            "original": prompt,
            "rewritten": rewritten_query
        }
        
        # Choose search strategy
        context = ""
        search_links = []
        source_docs = []
        
        # Get vector store for session
        vector_store = get_session_vector_store(session_id)
        
        # First, try document search if not forcing web search
        if not force_web_search and vector_store:
            # Try document search first
            has_relevant_docs, docs = check_document_relevance(
                rewritten_query,
                vector_store,
                SIMILARITY_THRESHOLD,
                namespace=session_id
            )
            
            if docs:
                context = "\n\n".join([d.page_content for d in docs])
                source_docs = docs
                
                # Track documents used
                doc_sources = []
                for doc in docs:
                    source_type = doc.metadata.get("source_type", "unknown")
                    source_name = doc.metadata.get("file_name", "unknown")
                    doc_sources.append({
                        "source_type": source_type,
                        "source_name": source_name,
                        "url": doc.metadata.get("url", ""),
                        "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content
                    })
                session_data["doc_sources"] = doc_sources
        
        # Check if we should use web search
        use_web_search = session_data.get("use_web_search", True)
        search_intent_detected = False
        
        # Check if query needs web search based on intent detection
        try:
            search_intent_detected = detect_google_search_intent(rewritten_query)
        except Exception as e:
            # Fall back to regular behavior if intent detection fails
            pass
            
        # Use Google search if applicable
        should_use_web_search = (
            force_web_search or 
            (not source_docs and use_web_search and search_intent_detected) or
            (use_web_search and search_intent_detected)
        )
        
        if should_use_web_search:
            search_results, search_links = google_search(rewritten_query)
            if search_results:
                if context:
                    context = f"{context}\n\n--- Additional Information from Google Search ---\n\n{search_results}"
                else:
                    context = f"Google Search Results:\n{search_results}"
                
                session_data["search_sources"] = search_links
        
        # Generate response using the RAG agent
        rag_agent = get_rag_agent()
        
        if context:
            full_prompt = f"""Context: {context}

Original Question: {prompt}
Rewritten Question: {rewritten_query}

"""
            if search_links:
                full_prompt += f"Source Links:\n" + "\n".join([f"- {link}" for link in search_links]) + "\n\n"
            
            full_prompt += "Please provide a comprehensive answer based on the available information."
        else:
            full_prompt = f"Original Question: {prompt}\nRewritten Question: {rewritten_query}"
            session_data["info_messages"] = ["No relevant information found in documents or Google search."]

        response = rag_agent.run(full_prompt)
        
        # Add assistant response to history
        history.append({"role": "assistant", "content": response.content})
        session_data["history"] = history
        
        # Generate and save session title if not set
        if session_data.get("session_name") == "Untitled Session":
            session_data["session_name"] = generate_session_title(prompt)
        
        # Save session data
        save_session(session_id, session_data)
        
        # Prepare sources for response
        sources = []
        
        # Add document sources
        if source_docs:
            for doc in source_docs:
                source_type = doc.metadata.get("source_type", "unknown")
                source_name = doc.metadata.get("file_name", "unknown")
                sources.append({
                    "type": source_type,
                    "name": source_name,
                    "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                    "url": doc.metadata.get("url", "")
                })
        
        # Add search sources
        if search_links:
            for link in search_links:
                sources.append({
                    "type": "web",
                    "name": link,
                    "url": link,
                    "content": ""
                })
        
        return {"content": response.content, "sources": sources, "session_id": session_id}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing message: {str(e)}")

# CURRICULUM API ENDPOINTS - PLURAL FORM (RECOMMENDED)
@app.get("/curriculums", response_model=CurriculumListResponse, dependencies=[Depends(get_api_key)])
async def list_curriculums():
    """Get a list of all available curriculums"""
    try:
        result = get_all_curriculums()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing curriculums: {str(e)}")

@app.post("/curriculums", dependencies=[Depends(get_api_key)])
async def create_new_curriculum(request: CurriculumCreateRequest):
    """Create a new empty curriculum"""
    try:
        result = create_curriculum(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating curriculum: {str(e)}")

@app.get("/curriculums/{curriculum_id}", response_model=CurriculumResponse, dependencies=[Depends(get_api_key)])
async def get_curriculum_by_id(curriculum_id: str):
    """Get a specific curriculum by ID"""
    try:
        result = get_curriculum(curriculum_id)
        return result
    except Exception as e:
        if "not found" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=f"Error retrieving curriculum: {str(e)}")

@app.delete("/curriculums/{curriculum_id}", dependencies=[Depends(get_api_key)])
async def delete_curriculum(curriculum_id: str):
    """Delete a specific curriculum"""
    try:
        success = delete_curriculum_by_id(curriculum_id)
        return {"success": success, "message": f"Curriculum {curriculum_id} deleted"}
    except Exception as e:
        if "not found" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=f"Error deleting curriculum: {str(e)}")

# CURRICULUM API ENDPOINTS - SINGULAR FORM (KEPT FOR BACKWARD COMPATIBILITY)
@app.post("/curriculum", response_model=CurriculumResponse, dependencies=[Depends(get_api_key)])
async def create_curriculum_endpoint(request: CurriculumRequest):
    """Generate a new curriculum based on subject, syllabus URL, and time constraint"""
    try:
        result = generate_curriculum(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating curriculum: {str(e)}")

@app.get("/curriculum/{curriculum_id}", response_model=CurriculumResponse, dependencies=[Depends(get_api_key)])
async def retrieve_curriculum(curriculum_id: str):
    """Get a specific curriculum by ID"""
    try:
        result = get_curriculum(curriculum_id)
        return result
    except Exception as e:
        if "not found" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=f"Error retrieving curriculum: {str(e)}")

@app.put("/curriculum/{curriculum_id}", response_model=CurriculumResponse, dependencies=[Depends(get_api_key)])
async def update_curriculum(curriculum_id: str, request: CurriculumModificationRequest):
    """Modify a curriculum based on the modification request"""
    try:
        result = modify_curriculum_by_id(curriculum_id, request)
        return result
    except Exception as e:
        if "not found" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=f"Error modifying curriculum: {str(e)}")

@app.post("/curriculum/{curriculum_id}/details", response_model=Dict[str, StepDetailResponse], dependencies=[Depends(get_api_key)])
async def create_curriculum_details(curriculum_id: str):
    """Generate detailed content for all steps in a curriculum"""
    try:
        result = generate_curriculum_details(curriculum_id)
        # Convert integer keys to strings for JSON serialization
        return {str(k): v for k, v in result.items()}
    except Exception as e:
        if "not found" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=f"Error generating curriculum details: {str(e)}")

@app.get("/curriculum/{curriculum_id}/details/{step_index}", response_model=StepDetailResponse, dependencies=[Depends(get_api_key)])
async def retrieve_step_detail(curriculum_id: str, step_index: int):
    """Get detailed content for a specific step"""
    try:
        result = get_step_detail(curriculum_id, step_index)
        return result
    except Exception as e:
        if "not found" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=f"Error retrieving step detail: {str(e)}")

from grader import process_document
from pydantic import BaseModel
from fastapi import HTTPException, Depends

class GradeRequest(BaseModel):
    file_url: str

@app.post("/grade", dependencies=[Depends(get_api_key)])
async def grade_document(request: GradeRequest):
    """Grade a document from a URL"""
    try:
        result = process_document(request.file_url)
        
        if result['success']:
            return {"success": True, "results": result['results']}
        else:
            raise HTTPException(status_code=500, detail=result['error'])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error grading document: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
