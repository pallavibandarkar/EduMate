# Configure imports first
import os
import json
import uuid
import pickle
from pathlib import Path
from typing import List, Dict, Any

import streamlit as st
import google.generativeai as genai
from langchain_pinecone import PineconeVectorStore

# Import embedder components before using them
from embedder import (
    init_pinecone,
    create_vector_store,
    check_document_relevance,
    INDEX_NAME,
    GeminiEmbedder,
)

from utils.formaturl import format_url_display
from utils.supabase_client import initialize_supabase  # Import Supabase client
from utils.session_manager import (  # Import session management functions
    save_session,
    load_session,
    get_available_sessions,
    get_session_vector_store,
    save_current_session,
    load_session_data,
    create_new_session,
    delete_session
)
from search import google_search
from agents.intentdetectorAgent import detect_google_search_intent
from document_loader import prepare_document, process_pdf, process_web, process_image
from agents.writeragents import get_query_rewriter_agent, get_rag_agent, test_url_detector, generate_session_title

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Constants
GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY", "")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "")
SIMILARITY_THRESHOLD = 0.7

# Initialize API clients first
os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY
genai.configure(api_key=GOOGLE_API_KEY)
pinecone_client = init_pinecone(PINECONE_API_KEY)
supabase_client = initialize_supabase()  # Initialize Supabase client

# Streamlit App Initialization
st.title("Agentic Chatbot")

# Session State Initialization
if 'google_api_key' not in st.session_state:
    st.session_state.google_api_key = GOOGLE_API_KEY
if 'pinecone_api_key' not in st.session_state:
    st.session_state.pinecone_api_key = PINECONE_API_KEY
if 'vector_store' not in st.session_state:
    st.session_state.vector_store = None
if 'processed_documents' not in st.session_state:
    st.session_state.processed_documents = []
if 'history' not in st.session_state:
    st.session_state.history = []
if 'use_web_search' not in st.session_state:
    st.session_state.use_web_search = False
if 'force_web_search' not in st.session_state:
    st.session_state.force_web_search = False
if 'similarity_threshold' not in st.session_state:
    st.session_state.similarity_threshold = SIMILARITY_THRESHOLD
# New session state variables to preserve messages
if 'info_messages' not in st.session_state:
    st.session_state.info_messages = []
if 'rewritten_query' not in st.session_state:
    st.session_state.rewritten_query = {"original": "", "rewritten": ""}
if 'search_sources' not in st.session_state:
    st.session_state.search_sources = []
if 'doc_sources' not in st.session_state:
    st.session_state.doc_sources = []
# Chat session namespace management
if 'chat_session_id' not in st.session_state:
    st.session_state.chat_session_id = str(uuid.uuid4())
if 'session_vector_stores' not in st.session_state:
    st.session_state.session_vector_stores = {}
if 'available_sessions' not in st.session_state:
    st.session_state.available_sessions = get_available_sessions()
if 'supabase_errors' not in st.session_state:
    st.session_state.supabase_errors = []
if 'show_error_container' not in st.session_state:
    st.session_state.show_error_container = False


# Sidebar Configuration
st.sidebar.header("⚙️ Configuration")

# Session Management
with st.sidebar.expander("💬 Session Management"):
    st.write(f"Current Session ID: {st.session_state.chat_session_id}")
    
    # Option to create a new session
    if st.button("🆕 New Chat"):
        with st.spinner("Creating chat..."):
            try:
                # Create a new session
                new_session_id = create_new_session(st.session_state)
                st.success(f"Created new Chat: {new_session_id}")
                st.rerun()
            except Exception as e:
                # Store error in persistent state
                error_msg = f"Failed to create new Chat: {str(e)}"
                st.session_state.supabase_errors.append(error_msg)
                st.rerun()
    
    # Display available sessions as clickable items
    sessions_list, sessions_error = get_available_sessions()
    if sessions_error:
        # Store error in persistent state
        st.session_state.supabase_errors.append(f"Error loading sessions: {sessions_error}")
        st.session_state.supabase_errors.append("Please check your Supabase connection and try again.")
        st.rerun()
    else:
        available_sessions = sessions_list
        st.session_state.available_sessions = available_sessions
    
    if available_sessions:
        st.write("### Previous Sessions")
        for session in available_sessions:
            session_id = session["session_id"]
            session_name = session["session_name"]
            
            # Create two columns for each session - one for the button, one for delete
            col1, col2 = st.columns([0.8, 0.2])
            
            # Create a button for each session that loads when clicked
            with col1:
                if st.button(f"{session_name} ({session_id[:8]}...)", key=f"session_{session_id}"):
                    with st.spinner(f"Loading session '{session_name}'..."):
                        success = load_session_data(session_id, st.session_state, pinecone_client)
                        if success:
                            st.success(f"Loaded session: {session_name}")
                            st.rerun()
            
            # Add a delete button
            with col2:
                if st.button("🗑️", key=f"delete_{session_id}", help="Delete this session"):
                    with st.spinner(f"Deleting session '{session_name}'..."):
                        success, error = delete_session(session_id)
                        if success:
                            # Remove from available sessions
                            st.session_state.available_sessions = [s for s in st.session_state.available_sessions 
                                                                  if s["session_id"] != session_id]
                            st.success(f"Deleted session: {session_name}")
                            st.rerun()
                        else:
                            st.session_state.supabase_errors.append(f"Failed to delete session: {error}")
                            st.rerun()
# Clear Chat Button
if st.sidebar.button("🗑️ Clear Chat History"):
    st.session_state.history = []
    st.session_state.info_messages = []
    st.session_state.rewritten_query = {"original": "", "rewritten": ""}
    st.session_state.search_sources = []
    st.session_state.doc_sources = []
    st.rerun()

# Web Search Configuration
st.sidebar.header("🌐 Web Search Configuration")
st.session_state.use_web_search = st.sidebar.checkbox("Enable Google Search", value=st.session_state.use_web_search)
os.environ["GOOGLE_API_KEY"] = st.session_state.google_api_key
genai.configure(api_key=st.session_state.google_api_key)
pinecone_client = init_pinecone(st.session_state.pinecone_api_key)

# Display persistent error messages that require user acknowledgment
if st.session_state.supabase_errors:
    with st.container():
        st.error("⚠️ Database Errors")
        for error in st.session_state.supabase_errors:
            st.error(error)
        if st.button("Acknowledge Errors"):
            st.session_state.supabase_errors = []
            st.rerun()

# Display chat history (moved to top of app flow)
for message in st.session_state.history:
    with st.chat_message(message["role"]):
        st.write(message["content"])

# Display source information right after chat history
# Show document sources if available
if st.session_state.doc_sources:
    with st.expander("🔍 See document sources"):
        for i, doc in enumerate(st.session_state.doc_sources, 1):
            source_type = doc["source_type"]
            if source_type == "image":
                source_icon = "🖼️"
            elif source_type == "document":
                source_icon = "📄"
            else:
                source_icon = "🌐"

            # Create source name with link for web pages
            if source_type == "web_page" and "url" in doc:
                source_display = f"{source_icon} Source {i} from [{doc['source_name']}]({doc['url']})"
                st.markdown(source_display)
            else:
                st.write(f"{source_icon} Source {i} from {doc['source_name']}:")

            st.write(doc["content"])

# Show search links if available
if st.session_state.search_sources:
    with st.expander("🔗 Web Search Sources"):
        for i, link in enumerate(st.session_state.search_sources, 1):
            display_link = format_url_display(link)
            st.write(f"{i}. [{display_link}]({link})")

# Display persistent info messages
for message in st.session_state.info_messages:
    st.info(message)

# Display rewritten query if available
if st.session_state.rewritten_query["original"]:
    with st.expander("🔄 See rewritten query"):
        st.write(f"Original: {st.session_state.rewritten_query['original']}")
        st.write(f"Rewritten: {st.session_state.rewritten_query['rewritten']}")

# Main Application Flow
# File/URL Upload Section
st.sidebar.header("📁 Data Upload")
uploaded_file = st.sidebar.file_uploader("Upload Document", type=["pdf", "png", "jpg", "jpeg", "gif", "webp"])
web_url = st.sidebar.text_input("Or enter URL")

# Process documents using unified approach
if uploaded_file:
    file_name = uploaded_file.name
    if file_name not in st.session_state.processed_documents:
        with st.spinner('Processing document...'):
            file_ext = os.path.splitext(file_name)[1].lower()
            
            # Process based on file type
            if file_ext in ['.png', '.jpg', '.jpeg', '.gif', '.webp']:
                texts = process_image(uploaded_file)
                doc_type = "Image"
            else:  # PDF or other document types
                texts = process_pdf(uploaded_file)
                doc_type = "Document"
                
            if texts and pinecone_client:
                # Create or get vector store with session namespace
                session_id = st.session_state.chat_session_id
                if st.session_state.vector_store:
                    # Update existing vector store with session namespace
                    vector_store = create_vector_store(pinecone_client, texts, namespace=session_id)
                else:
                    vector_store = create_vector_store(pinecone_client, texts, namespace=session_id)
                    
                st.session_state.vector_store = vector_store
                st.session_state.session_vector_stores[session_id] = vector_store
                st.session_state.processed_documents.append(file_name)
                st.success(f"✅ Added {doc_type}: {file_name} to session {session_id}")

if web_url:
    if web_url not in st.session_state.processed_documents:
        with st.spinner('Processing URL...'):
            texts = process_web(web_url)
            if texts and pinecone_client:
                # Create or get vector store with session namespace
                session_id = st.session_state.chat_session_id
                if st.session_state.vector_store:
                    # Update existing vector store with session namespace
                    vector_store = create_vector_store(pinecone_client, texts, namespace=session_id)
                else:
                    vector_store = create_vector_store(pinecone_client, texts, namespace=session_id)
                    
                st.session_state.vector_store = vector_store
                st.session_state.session_vector_stores[session_id] = vector_store
                st.session_state.processed_documents.append(web_url)
                st.success(f"✅ Added URL: {web_url} to session {session_id}")

# Display sources in sidebar with appropriate icons
if st.session_state.processed_documents:
    st.sidebar.header("📚 Processed Sources")
    for source in st.session_state.processed_documents:
        if source.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
            st.sidebar.text(f"🖼️ {source}")
        elif source.endswith('.pdf'):
            st.sidebar.text(f"📄 {source}")
        else:
            st.sidebar.text(f"🌐 {source}")

# Chat Interface - Replace with form-based approach
# Create two columns for chat input and search toggle
with st.form(key="chat_form", clear_on_submit=True):
    chat_col, toggle_col = st.columns([0.9, 0.1])
    
    with chat_col:
        prompt = st.text_input("Ask about your documents...", key="chat_input")
    
    with toggle_col:
        force_web_search = st.checkbox('🌐', value=st.session_state.force_web_search, 
                                      help="Force Google search")
    
    submit_button = st.form_submit_button("Send")
    
    if submit_button and prompt:
        # Clear previous messages
        st.session_state.info_messages = []
        st.session_state.rewritten_query = {"original": "", "rewritten": ""}
        st.session_state.search_sources = []
        st.session_state.doc_sources = []
        
        # Update the force search toggle state
        st.session_state.force_web_search = force_web_search
        
        # Make sure we have the session's vector store
        session_vector_store = get_session_vector_store(pinecone_client, st.session_state)
        if session_vector_store:
            st.session_state.vector_store = session_vector_store
        
        # Add user message to history
        st.session_state.history.append({"role": "user", "content": prompt})
        
        # Process query (the existing logic)
        with st.spinner("🔍 Checking for URLs..."):
            try:
                url_detector = test_url_detector(prompt)
                detected_urls = url_detector.urls
                
                # Process any detected URLs
                if detected_urls:
                    st.toast(f"📎 Found {len(detected_urls)} URLs in your query. Processing them...")
                    
                    for url in detected_urls:
                        if url not in st.session_state.processed_documents:
                            with st.spinner(f'Processing URL: {url}...'):
                                texts = process_web(url)
                                if texts and pinecone_client:
                                    # Use session namespace
                                    session_id = st.session_state.chat_session_id
                                    if st.session_state.vector_store:
                                        vector_store = create_vector_store(pinecone_client, texts, namespace=session_id)
                                    else:
                                        vector_store = create_vector_store(pinecone_client, texts, namespace=session_id)
                                    
                                    st.session_state.vector_store = vector_store
                                    st.session_state.session_vector_stores[session_id] = vector_store
                                    st.session_state.processed_documents.append(url)
                                    st.toast(f"✅ Added URL from query: {url}")
            
            except Exception as e:
                st.error(f"❌ Error processing URLs: {str(e)}")
                # Continue with original prompt if URL detection fails
                 
        # Step 1: Rewrite the query for better retrieval (continue with existing code)
        with st.spinner("🤔 Reformulating query..."):
            try:
                query_rewriter = get_query_rewriter_agent()
                rewritten_query = query_rewriter.run(prompt).content
                
                # Save for display after rerun
                st.session_state.rewritten_query = {
                    "original": prompt,
                    "rewritten": rewritten_query
                }
            except Exception as e:
                st.error(f"❌ Error rewriting query: {str(e)}")
                rewritten_query = prompt

        # Step 2: Choose search strategy based on force_web_search toggle
        context = ""
        search_links = []
        docs = []
        search_intent_detected = False

        # Check if query needs web search based on intent detection
        with st.spinner("🧠 Analyzing query intent..."):
            try:
                search_intent_detected = detect_google_search_intent(rewritten_query)
                if search_intent_detected and not st.session_state.use_web_search:
                    # Only toggle and notify if web search wasn't already enabled
                    st.session_state.use_web_search = True
                    st.toast("🔄 Automatically enabling web search based on query needs", icon="ℹ️")
            except Exception as e:
                st.error(f"❌ Error detecting search intent: {str(e)}")
                # Fall back to regular behavior if intent detection fails

        # First, try document search if not forcing web search
        if not st.session_state.force_web_search and st.session_state.vector_store:
            # Try document search with session namespace
            session_id = st.session_state.chat_session_id
            has_relevant_docs, docs = check_document_relevance(
                rewritten_query, 
                st.session_state.vector_store, 
                st.session_state.similarity_threshold,
                namespace=session_id
            )
            if docs:
                context = "\n\n".join([d.page_content for d in docs])
                st.toast(f"📊 Found {len(docs)} relevant documents")
                # Save doc sources for display
                st.session_state.doc_sources = [
                    {
                        "source_type": doc.metadata.get("source_type", "unknown"),
                        "source_name": doc.metadata.get("file_name", "unknown"),
                        "url": doc.metadata.get("url", ""),  # Extract URL from metadata
                        "content": doc.page_content[:200] + "..."
                    }
                    for doc in docs
                ]
            elif st.session_state.use_web_search and search_intent_detected:
                st.toast("🔄 No relevant documents found, using web search...")

        # Step 3: Use Google search if:
        # 1. Web search is forced ON via toggle, or
        # 2. No relevant documents found AND web search is enabled AND intent detection suggests it, or
        # 3. Web search is enabled AND search intent is detected (regardless of documents)
        should_use_web_search = (
            st.session_state.force_web_search or 
            (not docs and st.session_state.use_web_search and search_intent_detected) or
            (st.session_state.use_web_search and search_intent_detected)
        )
        
        if should_use_web_search:
            with st.spinner("🔍 Searching with Google..."):
                try:
                    search_results, search_links = google_search(rewritten_query)
                    if search_results:
                        # If we have both doc results and search results, combine them
                        if context:
                            context = f"{context}\n\n--- Additional Information from Google Search ---\n\n{search_results}"
                        else:
                            context = f"Google Search Results:\n{search_results}"
                            
                        if st.session_state.force_web_search:
                            st.toast("ℹ️ Using Google search as requested", icon="🌐")
                        
                        # Save search links for display after rerun
                        st.session_state.search_sources = search_links
                except Exception as e:
                    st.error(f"❌ Google search error: {str(e)}")

        # Step 4: Generate response using the RAG agent
        with st.spinner("🤖 Thinking..."):
            try:
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
                    st.session_state.info_messages.append("ℹ️ No relevant information found in documents or Google search.")

                response = rag_agent.run(full_prompt)
                
                # Add assistant response to history
                st.session_state.history.append({
                    "role": "assistant",
                    "content": response.content
                })
                
                # Generate and save session title after getting a response
                save_current_session(st.session_state)
                
            except Exception as e:
                st.error(f"❌ Error generating response: {str(e)}")
                
        # Rerun after processing to show updated chat
        st.rerun()