import tempfile
from datetime import datetime
from typing import List, Tuple, Optional
import os
import logging
from pathlib import Path

import bs4
from langchain_community.document_loaders import PyPDFLoader, WebBaseLoader, CSVLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from google import genai
from google.generativeai import types

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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
        # Handle API key retrieval from environment
        api_key = os.getenv("GEMINI_API_KEY", "")
        client = genai.Client(api_key=api_key)
        
        # Determine appropriate prompt based on file type
        file_extension = os.path.splitext(file_path)[1].lower()
        
        # Upload the file directly using a simpler approach
        try:
            uploaded_file = client.files.upload(file=file_path)
            logger.info(f"File uploaded successfully: {uploaded_file}")
        except Exception as upload_error:
            logger.error(f"File upload failed: {str(upload_error)}")
            raise ValueError(f"File upload failed: {str(upload_error)}")

        # Build appropriate prompt based on file type
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
        elif file_extension in ['.csv', '.xlsx', '.xls']:
            prompt = """
            Please analyze this CSV data thoroughly. For each row and column:
            1. Extract all data in a structured format
            2. List all column headers
            3. Provide a summary of the data
            4. Include all numerical values and text content exactly as they appear
            5. Preserve any relationships between data points
            """
            source_type = "csv"
        else:
            prompt = """
            just type all the content of the document in a single line without any formatting.
            if there is any image describe it in detail.
            """
            source_type = "document"

        # Generate content with a simpler approach
        try:
            # First try non-streaming method as fallback if needed
            try:
                response = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=[uploaded_file, prompt],
                )
                content = response.text
                logger.info(f"Generated content using non-streaming method, length: {len(content)}")
            except Exception as non_streaming_error:
                logger.error(f"Non-streaming attempt failed: {str(non_streaming_error)}")
                # Try streaming as backup
                response_chunks = []
                for chunk in client.models.generate_content_stream(
                    model="gemini-2.0-flash",
                    contents=[uploaded_file, prompt],
                ):
                    if hasattr(chunk, 'text') and chunk.text:
                        response_chunks.append(chunk.text)
                    
                if not response_chunks:
                    raise ValueError("No content received from the streaming API")
                    
                content = "".join(response_chunks)
                logger.info(f"Generated content using streaming method, length: {len(content)}")
            
            if not content:
                raise ValueError("Empty content received from the API")
                
        except Exception as generation_error:
            logger.error(f"Detailed generation error: {str(generation_error)}")
            raise ValueError(f"Content generation failed: {str(generation_error)}")
        
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
        logger.info(f"Number of document chunks: {len(chunks)}")
        
        return chunks
        
    except Exception as e:
        logger.error(f"Document processing error: {str(e)}")
        # Re-raise the exception with a clearer message
        raise ValueError(f"No text content could be extracted from the file: {str(e)}")

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
        logger.error(f"PDF processing error: {str(e)}")
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
        logger.info(f"Number of web documents loaded: {len(docs)}")
        return docs
    except Exception as e:
        logger.error(f"Web loading error: {str(e)}")
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
    logger.info(f"Number of content chunks after splitting: {len(content_chunks)}")
    
    return title, content_chunks


def process_web(url: str) -> List:
    """Process web URL by loading document and splitting into chunks."""
    docs = load_web_document(url)
    if not docs:
        return []
    
    title, content_chunks = extract_title_and_split_content(docs)
    logger.info(f"Title of the web document: {title}")
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
        logger.error(f"Image processing error: {str(e)}")
        return []

def process_csv(file) -> List:
    """Process CSV file and add source metadata."""
    try:
        file_path = None
        # Check if file is a Streamlit UploadFile or a file-like object
        if hasattr(file, 'getvalue'):
            # Streamlit UploadFile object
            with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as tmp_file:
                tmp_file.write(file.getvalue())
                file_path = tmp_file.name
        elif hasattr(file, 'read'):
            # File-like object from FastAPI
            with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as tmp_file:
                tmp_file.write(file.read())
                file_path = tmp_file.name
        else:
            # Assume file is a path string
            file_path = file
            
        # First try using CSVLoader directly
        try:
            # Use CSVLoader to process the CSV file
            loader = CSVLoader(file_path=file_path)
            documents = loader.load()
            
            # Add metadata to each document
            for doc in documents:
                doc.metadata.update({
                    "source_type": "csv",
                    "file_name": os.path.basename(file_path),
                    "timestamp": datetime.now().isoformat()
                })
            
            # Apply text splitting
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200
            )
            chunks = text_splitter.split_documents(documents)
            
            logger.info(f"Number of CSV document chunks: {len(chunks)}")
            
            # If we got chunks, return them
            if chunks and len(chunks) > 0:
                return chunks
                
            # Otherwise, fall back to prepare_document
            logger.info("CSVLoader did not return any chunks, falling back to prepare_document")
        except Exception as csv_loader_error:
            logger.error(f"CSVLoader error, falling back to prepare_document: {str(csv_loader_error)}")
            
        # Fallback: Use the document processor with improved CSV handling
        chunks = prepare_document(file_path)
        
        # Make sure we got chunks
        if not chunks or len(chunks) == 0:
            raise ValueError("Could not extract any content from the CSV file")
            
        return chunks
    except Exception as e:
        logger.error(f"CSV processing error: {str(e)}")
        # Raise the error instead of returning an empty list
        raise ValueError(f"Failed to process CSV file: {str(e)}")