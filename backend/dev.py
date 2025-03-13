import os
import json
import argparse
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv

import google.generativeai as genai

# Import shared functionality from embedder.py
from embedder import (
    init_pinecone,
    create_vector_store,
    check_document_relevance,
)

from search import google_search

# Import document processing functions
from document_loader import prepare_document, process_pdf, process_web, process_image

# Import agents
from agents.writeragents import get_query_rewriter_agent, get_rag_agent, test_url_detector

# Load environment variables
load_dotenv()

# Get API keys from environment variables with fallbacks
GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY", "")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "")

# Check if API keys are available
if not GOOGLE_API_KEY:
    print("Error: Missing GEMINI_API_KEY in environment variables")
if not PINECONE_API_KEY:
    print("Error: Missing PINECONE_API_KEY in environment variables")

# Hardcoded similarity threshold
SIMILARITY_THRESHOLD = 0.7

class ChatAssistant:
    def __init__(self):
        self.google_api_key = GOOGLE_API_KEY
        self.pinecone_api_key = PINECONE_API_KEY
        self.vector_store = None
        self.processed_documents = []
        self.history = []
        self.use_web_search = True
        self.similarity_threshold = SIMILARITY_THRESHOLD
        
        # Set up API keys
        os.environ["GOOGLE_API_KEY"] = self.google_api_key
        genai.configure(api_key=self.google_api_key)
        self.pinecone_client = init_pinecone(self.pinecone_api_key)
    
    def process_document(self, file_path: str) -> bool:
        """Process a document file and add to vector store."""
        if not os.path.exists(file_path):
            print(f"Error: File {file_path} not found")
            return False
            
        file_name = os.path.basename(file_path)
        if file_name in self.processed_documents:
            print(f"Document already processed: {file_name}")
            return False
            
        print(f"Processing document: {file_name}")
        file_ext = os.path.splitext(file_name)[1].lower()
        
        try:
            # Process based on file type
            if file_ext in ['.png', '.jpg', '.jpeg', '.gif', '.webp']:
                with open(file_path, 'rb') as f:
                    texts = process_image(f)
                doc_type = "Image"
            else:  # PDF or other document types
                with open(file_path, 'rb') as f:
                    texts = process_pdf(f)
                doc_type = "Document"
                
            if texts and self.pinecone_client:
                if self.vector_store:
                    self.vector_store.add_documents(texts)
                else:
                    self.vector_store = create_vector_store(self.pinecone_client, texts)
                self.processed_documents.append(file_name)
                print(f"✅ Added {doc_type}: {file_name}")
                return True
        except Exception as e:
            print(f"Error processing document: {e}")
        return False
    
    def process_url(self, web_url: str) -> bool:
        """Process a web URL and add to vector store."""
        if web_url in self.processed_documents:
            print(f"URL already processed: {web_url}")
            return False
            
        print(f"Processing URL: {web_url}")
        try:
            texts = process_web(web_url)
            if texts and self.pinecone_client:
                if self.vector_store:
                    self.vector_store.add_documents(texts)
                else:
                    self.vector_store = create_vector_store(self.pinecone_client, texts)
                self.processed_documents.append(web_url)
                print(f"✅ Added URL: {web_url}")
                return True
        except Exception as e:
            print(f"Error processing URL: {e}")
        return False
    
    def ask_question(self, prompt: str, force_web_search: bool = False) -> str:
        """Process a question and return the response."""
        self.history.append({"role": "user", "content": prompt})
        
        # Check for URLs in prompt
        print("Checking for URLs in prompt...")
        try:
            url_detector = test_url_detector(prompt)
            detected_urls = url_detector.urls
            
            if detected_urls:
                print(f"Found {len(detected_urls)} URLs in your query. Processing them...")
                for url in detected_urls:
                    self.process_url(url)
        except Exception as e:
            print(f"Error processing URLs: {str(e)}")
        
        # Rewrite the query for better retrieval
        print("Reformulating query...")
        try:
            query_rewriter = get_query_rewriter_agent()
            rewritten_query = query_rewriter.run(prompt).content
            print(f"Original: {prompt}")
            print(f"Rewritten: {rewritten_query}")
        except Exception as e:
            print(f"Error rewriting query: {str(e)}")
            rewritten_query = prompt

        # Choose search strategy
        context = ""
        search_links = []
        docs = []
        
        if not force_web_search and self.vector_store:
            # Try document search first
            has_relevant_docs, docs = check_document_relevance(
                rewritten_query, 
                self.vector_store, 
                self.similarity_threshold
            )
            
            if docs:
                context = "\n\n".join([d.page_content for d in docs])
                print(f"Found {len(docs)} relevant documents (similarity > {self.similarity_threshold})")
            elif self.use_web_search:
                print("No relevant documents found in database, falling back to Google search...")

        # Use Google search if applicable
        if (force_web_search or not context) and self.use_web_search:
            print("Searching with Google...")
            try:
                search_results, search_links = google_search(rewritten_query)
                if search_results:
                    context = f"Google Search Results:\n{search_results}"
                    if force_web_search:
                        print("Using Google search as requested.")
                    else:
                        print("Using Google search as fallback.")
                    
                    if search_links:
                        print("Search sources:")
                        for i, link in enumerate(search_links, 1):
                            print(f"{i}. {link}")
            except Exception as e:
                print(f"Google search error: {str(e)}")

        # Generate response using the RAG agent
        print("Generating response...")
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
                print("No relevant information found in documents or Google search.")

            response = rag_agent.run(full_prompt)
            
            # Add assistant response to history
            self.history.append({
                "role": "assistant",
                "content": response.content
            })
            
            return response.content
                
        except Exception as e:
            error_msg = f"Error generating response: {str(e)}"
            print(error_msg)
            return error_msg

def main():
    parser = argparse.ArgumentParser(description='Teacher Assistant CLI')
    parser.add_argument('--doc', type=str, help='Path to document to process')
    parser.add_argument('--url', type=str, help='URL to process')
    parser.add_argument('--query', type=str, help='Question to ask')
    parser.add_argument('--force-web', action='store_true', help='Force web search')
    args = parser.parse_args()
    
    assistant = ChatAssistant()
    
    if args.doc:
        assistant.process_document(args.doc)
    
    if args.url:
        assistant.process_url(args.url)
    
    if args.query:
        response = assistant.ask_question(args.query, force_web_search=args.force_web)
        print("\nResponse:")
        print("-" * 50)
        print(response)
        print("-" * 50)
    
    if not any([args.doc, args.url, args.query]):
        # Interactive mode
        print("Teacher Assistant CLI - Interactive Mode")
        print("Type 'exit' to quit")
        
        while True:
            command = input("\nCommand (ask/doc/url/exit): ").strip().lower()
            
            if command == 'exit':
                break
            elif command == 'doc':
                path = input("Enter document path: ").strip()
                assistant.process_document(path)
            elif command == 'url':
                url = input("Enter URL: ").strip()
                assistant.process_url(url)
            elif command == 'ask':
                query = input("Enter your question: ").strip()
                force_web = input("Force web search? (y/n): ").lower() == 'y'
                response = assistant.ask_question(query, force_web_search=force_web)
                print("\nResponse:")
                print("-" * 50)
                print(response)
                print("-" * 50)
            else:
                print("Unknown command. Available commands: ask, doc, url, exit")

if __name__ == "__main__":
    main()
