import google.generativeai as genai
from typing import List, Tuple, Optional
from pinecone import Pinecone, ServerlessSpec
from langchain_pinecone import PineconeVectorStore
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Constants
INDEX_NAME = "gemini-thinking-agent-agno"
EMBEDDING_DIMENSION = 768  # Gemini embedding-004 dimension

class GeminiEmbedder(Embeddings):
    def __init__(self, model_name="models/text-embedding-004", api_key=None):
        # Use provided API key or get from environment
        api_key = api_key or os.getenv("GOOGLE_API_KEY", "")
        genai.configure(api_key=api_key)
        self.model = model_name

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self.embed_query(text) for text in texts]

    def embed_query(self, text: str) -> List[float]:
        response = genai.embed_content(
            model=self.model,
            content=text,
            task_type="retrieval_document"
        )
        return response['embedding']


def init_pinecone(api_key=None):
    """Initialize Pinecone client with configured settings."""
    # Use provided API key or get from environment
    api_key = api_key or os.getenv("PINECONE_API_KEY", "")
    if not api_key:
        return None
        
    try:
        pc = Pinecone(api_key=api_key)
        
        # Check if index exists, create if not
        existing_indexes = [index.name for index in pc.list_indexes()]
        
        if INDEX_NAME not in existing_indexes:
            pc.create_index(
                name=INDEX_NAME,
                dimension=EMBEDDING_DIMENSION,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1")
            )
            logger.info(f"Created new index: {INDEX_NAME}")
            
        return pc
    except Exception as e:
        logger.error(f"Pinecone connection failed: {str(e)}")
        return None


def create_vector_store(pc_client, texts, namespace: Optional[str] = None, curriculum_id: Optional[str] = None):
    """
    Create and initialize vector store with documents.
    
    Args:
        pc_client: Pinecone client instance
        texts: Documents to add to the vector store
        namespace: Optional namespace for isolating chat session data
        curriculum_id: Optional curriculum ID to use as namespace
    """
    try:
        # Initialize vector store
        index = pc_client.Index(INDEX_NAME)
        
        # Use curriculum_id as namespace if provided (takes precedence)
        if curriculum_id:
            namespace = curriculum_id
            
        vector_store = PineconeVectorStore(
            index=index,
            embedding=GeminiEmbedder(),
            text_key="text",
            namespace=namespace
        )
        
        # Add documents
        logger.info('Uploading documents to Pinecone...')
        vector_store.add_documents(texts)
        ns_msg = f" in namespace '{namespace}'" if namespace else ""
        logger.info(f"Documents stored successfully{ns_msg}")
        return vector_store
            
    except Exception as e:
        logger.error(f"Vector store error: {str(e)}")
        return None


def check_document_relevance(query: str, vector_store, threshold: float = 0.7, namespace: Optional[str] = None, curriculum_id: Optional[str] = None) -> Tuple[bool, List[Document]]:
    """
    Check if documents in vector store are relevant to the query.
    
    Args:
        query: The search query
        vector_store: The vector store to search in
        threshold: Similarity threshold
        namespace: Optional namespace to search within
        curriculum_id: Optional curriculum ID to use as namespace
        
    Returns:
        tuple[bool, List]: (has_relevant_docs, relevant_docs)
    """
    if not vector_store:
        return False, []
    
    # Use curriculum_id as namespace if provided (takes precedence)
    if curriculum_id:
        namespace = curriculum_id
    
    # Set the namespace if provided and not already set in vector_store
    if namespace and not getattr(vector_store, 'namespace', None):
        vector_store.namespace = namespace
        
    retriever = vector_store.as_retriever(
        search_type="similarity_score_threshold",
        search_kwargs={"k": 5, "score_threshold": threshold, "namespace": namespace}
    )
    docs = retriever.invoke(query)
    return bool(docs), docs