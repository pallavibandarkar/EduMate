import uuid
import streamlit as st
from typing import Dict, Any, List, Tuple, Optional
from langchain_pinecone import PineconeVectorStore
import traceback

from utils.supabase_client import initialize_supabase
from embedder import INDEX_NAME, GeminiEmbedder
from agents.writeragents import generate_session_title

# Initialize Supabase client
supabase_client = initialize_supabase()

def convert_uuid_to_str(obj):
    """
    Recursively convert UUID objects to strings for JSON serialization
    
    Args:
        obj: Any object that might contain UUID objects
        
    Returns:
        The same object with UUID objects converted to strings
    """
    if isinstance(obj, uuid.UUID):
        return str(obj)
    elif isinstance(obj, dict):
        return {k: convert_uuid_to_str(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_uuid_to_str(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(convert_uuid_to_str(item) for item in obj)
    return obj

def delete_session(session_id: str) -> Tuple[bool, str]:
    """
    Delete a session from Supabase
    
    Args:
        session_id: The ID of the session to delete
        
    Returns:
        Tuple[bool, str]: (success, error_message)
    """
    try:
        # Delete the session from Supabase
        supabase_client.table('sessions').delete().eq('session_id', session_id).execute()
        return True, ""
    except Exception as e:
        error_details = traceback.format_exc()
        error_message = f"Error deleting session: {str(e)}"
        return False, error_message

def save_session(session_id: str, session_data: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Save session data to Supabase
    
    Returns:
        Tuple[bool, str]: (success, error_message)
    """
    try:
        # Convert session_id to UUID if it's a string
        if isinstance(session_id, str) and not session_id.startswith('session_'):
            session_id = uuid.UUID(session_id)
        
        # If session_id starts with 'session_', generate a new UUID
        if isinstance(session_id, str) and session_id.startswith('session_'):
            session_id = uuid.uuid4()
        
        # Convert session_id to string for database operations if it's a UUID
        db_session_id = str(session_id) if isinstance(session_id, uuid.UUID) else session_id
        
        # Convert all UUID objects in session_data to strings for JSON serialization
        serializable_data = convert_uuid_to_str(session_data)
        
        # Check if session exists
        response = supabase_client.table('sessions').select('session_id').eq('session_id', db_session_id).execute()
        
        if len(response.data) > 0:
            # Update existing session
            supabase_client.table('sessions').update({
                'session_name': serializable_data.get('session_name', 'Untitled Session'),
                'history': serializable_data['history'],
                'processed_documents': serializable_data['processed_documents'],
                'info_messages': serializable_data['info_messages'],
                'rewritten_query': serializable_data['rewritten_query'],
                'search_sources': serializable_data['search_sources'],
                'doc_sources': serializable_data['doc_sources'],
                'use_web_search': serializable_data['use_web_search'],
                'updated_at': 'now()'
            }).eq('session_id', db_session_id).execute()
        else:
            # Insert new session
            supabase_client.table('sessions').insert({
                'session_id': db_session_id,
                'session_name': serializable_data.get('session_name', 'Untitled Session'),
                'history': serializable_data['history'],
                'processed_documents': serializable_data['processed_documents'],
                'info_messages': serializable_data['info_messages'],
                'rewritten_query': serializable_data['rewritten_query'],
                'search_sources': serializable_data['search_sources'],
                'doc_sources': serializable_data['doc_sources'],
                'use_web_search': serializable_data['use_web_search']
            }).execute()
        return True, ""
    except Exception as e:
        error_details = traceback.format_exc()
        error_message = f"Error saving session: {str(e)}"
        return False, error_message

def load_session(session_id: str) -> Tuple[Optional[Dict[str, Any]], str]:
    """
    Load session data from Supabase
    
    Returns:
        Tuple[Optional[Dict], str]: (session_data, error_message)
    """
    try:
        response = supabase_client.table('sessions').select('*').eq('session_id', session_id).execute()
        
        if len(response.data) > 0:
            return response.data[0], ""
        return None, "Session not found"
    except Exception as e:
        error_details = traceback.format_exc()
        error_message = f"Error loading session: {str(e)}"
        return None, error_message

def get_available_sessions() -> Tuple[List[Dict[str, Any]], str]:
    """
    Get list of available saved sessions from Supabase
    
    Returns:
        Tuple[List[Dict], str]: (sessions_list, error_message)
    """
    try:
        response = supabase_client.table('sessions').select('session_id, session_name, created_at').order('updated_at', desc=True).execute()
        return response.data, ""
    except Exception as e:
        error_details = traceback.format_exc()
        error_message = f"Error fetching sessions: {str(e)}"
        return [], error_message

def get_session_vector_store(pinecone_client, session_state):
    """Get or create a vector store for the current session."""
    session_id = session_state.chat_session_id
    
    # If the session already has a vector store, return it
    if session_id in session_state.session_vector_stores:
        return session_state.session_vector_stores[session_id]
    
    # If we have a global vector store, but not for this session,
    # create one with the appropriate namespace
    if pinecone_client:
        # Initialize empty vector store with namespace
        try:
            index = pinecone_client.Index(INDEX_NAME)
            vector_store = PineconeVectorStore(
                index=index,
                embedding=GeminiEmbedder(),
                text_key="text",
                namespace=session_id
            )
            session_state.session_vector_stores[session_id] = vector_store
            return vector_store
        except Exception as e:
            st.error(f"Error initializing vector store: {e}")
    
    return None

def save_current_session(session_state):
    """Save the current session state to Supabase"""
    session_id = session_state.chat_session_id
    
    # Check if a session name already exists in the database
    session_name = "Untitled Session"
    
    # First try to get existing session name from Supabase
    existing_session, error = load_session(session_id)
    if existing_session and existing_session.get("session_name") and existing_session.get("session_name") != "Untitled Session":
        # Use the existing session name if it exists and isn't the default
        session_name = existing_session.get("session_name")
    elif session_state.history:
        # If no existing name or default name and we have history, generate name from first user query
        for message in session_state.history:
            if message["role"] == "user":
                session_name = generate_session_title(message["content"])
                break
    
    session_data = {
        "history": session_state.history,
        "processed_documents": session_state.processed_documents,
        "info_messages": session_state.info_messages,
        "rewritten_query": session_state.rewritten_query,
        "search_sources": session_state.search_sources,
        "doc_sources": session_state.doc_sources,
        "use_web_search": session_state.use_web_search,
        "session_id": session_id,
        "session_name": session_name
    }
    
    success, error_message = save_session(session_id, session_data)
    if not success:
        # Store error in persistent state instead of displaying directly
        if 'supabase_errors' not in session_state:
            session_state.supabase_errors = []
        session_state.supabase_errors.append(error_message)
        session_state.supabase_errors.append("Failed to save session. Please try again or check your Supabase connection.")
    
    # Update available sessions list
    sessions_list, sessions_error = get_available_sessions()
    if sessions_error:
        # Store error in persistent state instead of displaying directly
        if 'supabase_errors' not in session_state:
            session_state.supabase_errors = []
        session_state.supabase_errors.append(sessions_error)
    else:
        session_state.available_sessions = sessions_list
    
    return session_id

def load_session_data(session_id, session_state, pinecone_client):
    """Load a session from Supabase"""
    session_data, error_message = load_session(session_id)
    
    if error_message:
        # Store error in persistent state instead of displaying directly
        if 'supabase_errors' not in session_state:
            session_state.supabase_errors = []
        session_state.supabase_errors.append(error_message)
        session_state.supabase_errors.append("Failed to load session. Please try again or check your Supabase connection.")
        return False
    
    if session_data:
        try:
            session_state.chat_session_id = session_data.get("session_id", session_id)
            session_state.history = session_data.get("history", [])
            session_state.processed_documents = session_data.get("processed_documents", [])
            session_state.info_messages = session_data.get("info_messages", [])
            session_state.rewritten_query = session_data.get("rewritten_query", {"original": "", "rewritten": ""})
            session_state.search_sources = session_data.get("search_sources", [])
            session_state.doc_sources = session_data.get("doc_sources", [])
            session_state.use_web_search = session_data.get("use_web_search", False)
            
            # Get vector store for this session
            session_state.vector_store = get_session_vector_store(pinecone_client, session_state)
            
            return True
        except Exception as e:
            # Store error in persistent state instead of displaying directly
            if 'supabase_errors' not in session_state:
                session_state.supabase_errors = []
            session_state.supabase_errors.append(f"Error processing session data: {str(e)}")
            return False
    
    # Store warning in persistent state instead of displaying directly
    if 'supabase_errors' not in session_state:
        session_state.supabase_errors = []
    session_state.supabase_errors.append("No session data found")
    return False

def create_new_session(session_state):
    """Create a new session with empty state"""
    # Save current session before creating a new one
    try:
        save_current_session(session_state)
    except Exception as e:
        # Store error in persistent state instead of displaying directly
        if 'supabase_errors' not in session_state:
            session_state.supabase_errors = []
        session_state.supabase_errors.append(f"Failed to save current session before creating new one: {str(e)}")
    
    # Generate a new session ID
    new_session_id = str(uuid.uuid4())
    session_state.chat_session_id = new_session_id
    session_state.history = []
    session_state.info_messages = []
    session_state.rewritten_query = {"original": "", "rewritten": ""}
    session_state.search_sources = []
    session_state.doc_sources = []
    session_state.vector_store = None
    session_state.processed_documents = []
    return new_session_id
