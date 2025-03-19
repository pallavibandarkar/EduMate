import tempfile
from datetime import datetime
from typing import List, Tuple, Optional
import os

import streamlit as st
import bs4
from langchain_community.document_loaders import PyPDFLoader, WebBaseLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from google import genai

def prepare_document(file_path: str) -> List[Document]:
    """
    Processes any document type using Gemini API and returns it in a format
    compatible with the vector storage system.
    
    Args:
        file_path (str): Path to the document file
        
    Returns:
        List[Document]: List containing the processed document
    """
    try:
        # Use API key from session state or environment
        api_key = st.session_state.get("google_api_key", os.getenv("GEMINI_API_KEY", ""))
        client = genai.Client(api_key=api_key)
        
        # Upload the file
        uploaded_file = client.files.upload(file=file_path)
        
        # Determine appropriate prompt based on file type
        file_extension = os.path.splitext(file_path)[1].lower()
        
        if file_extension in ['.png', '.jpg', '.jpeg', '.gif', '.webp']:
            prompt = """
            Please analyze and describe this image in detail. Include:
            1. Type of content and main subject
            2. Key information or features
            3. Visual elements and their significance
            4. Any text present in the image
            5. Overall meaning and context
            """
            source_type = "image"
        else:
            prompt = """
            Please analyze and summarize this document in detail. Include:
            1. Type of content and main subject
            2. Key information or facts
            3. Structure and organization
            4. Main arguments or points
            5. Overall context and significance
            """
            source_type = "document"
        
        # Generate content
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[uploaded_file, prompt],
        )
        
        content = response.text
        print(f"Generated content length: {len(content)}")
        
        # Create a Document object
        doc = Document(
            page_content=content,
            metadata={
                "source_type": source_type,
                "file_name": os.path.basename(file_path),
                "timestamp": datetime.now().isoformat()
            }
        )
        
        # Apply text splitting
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        chunks = text_splitter.split_documents([doc])
        print(f"Number of document chunks: {len(chunks)}")
        
        return chunks
        
    except Exception as e:
        st.error(f"📄 Document processing error: {str(e)}")
        return []

# Keep existing functions for backward compatibility
def process_pdf(file) -> List:
    """Process PDF file and add source metadata."""
    try:
        file_path = None
        # Check if file is a Streamlit UploadFile or a file-like object
        if hasattr(file, 'getvalue'):
            # Streamlit UploadFile object
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                tmp_file.write(file.getvalue())
                file_path = tmp_file.name
        elif hasattr(file, 'read'):
            # File-like object from FastAPI
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                tmp_file.write(file.read())
                file_path = tmp_file.name
        else:
            # Assume file is a path string
            file_path = file
            
        # Use the new document processor instead
        return prepare_document(file_path)
    except Exception as e:
        if 'st' in globals():
            st.error(f"📄 PDF processing error: {str(e)}")
        print(f"PDF processing error: {str(e)}")
        return []


def load_web_document(url: str) -> List:
    """
    Load a document from a specified URL using WebBaseLoader.

    Args:
        url (str): The URL of the webpage to load.

    Returns:
        List: The loaded document(s).
    """
    try:
        loader = WebBaseLoader(url)
        docs = loader.load()
        print(f"Number of web documents loaded: {len(docs)}")
        return docs
    except Exception as e:
        st.error(f"🌐 Web loading error: {str(e)}")
        return []


# Keep the remaining functions as they are
def extract_title_and_split_content(docs: List) -> Tuple[Optional[str], List]:
    """Extract title and split content into chunks."""
    if not docs:
        return None, []
    
    # Get title from the first document's metadata
    title = docs[0].metadata.get('title')
    
    # Add source metadata
    for doc in docs:
        doc.metadata.update({
            "source_type": "url",
            "timestamp": datetime.now().isoformat()
        })
    
    # Apply text splitter
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    content_chunks = text_splitter.split_documents(docs)
    print(f"Number of content chunks after splitting: {len(content_chunks)}")
    
    return title, content_chunks


def process_web(url: str) -> List:
    """Process web URL by loading document and splitting into chunks."""
    docs = load_web_document(url)
    if not docs:
        return []
    
    title, content_chunks = extract_title_and_split_content(docs)
    print(f"Title of the web document: {title}")  # Print statement
    return content_chunks

def process_image(file) -> List:
    """Process image file and add source metadata."""
    try:
        file_path = None
        file_ext = '.png'  # Default extension
        
        # Check if file is a Streamlit UploadFile
        if hasattr(file, 'getvalue'):
            # Determine file extension from the uploaded file name
            file_ext = os.path.splitext(file.name)[1].lower()
            # Create temporary file with appropriate extension
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
                tmp_file.write(file.getvalue())
                file_path = tmp_file.name
        # Check if file is a file-like object
        elif hasattr(file, 'read'):
            # Try to get name if available
            if hasattr(file, 'name'):
                file_ext = os.path.splitext(file.name)[1].lower() or file_ext
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
                tmp_file.write(file.read())
                file_path = tmp_file.name
        else:
            # Assume file is a path string
            file_path = file
            
        # Use the document processor to handle the image
        return prepare_document(file_path)
    except Exception as e:
        if 'st' in globals():
            st.error(f"🖼️ Image processing error: {str(e)}")
        print(f"Image processing error: {str(e)}")
        return []