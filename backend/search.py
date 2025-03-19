from google import genai
from google.genai import types
from typing import List, Tuple
import streamlit as st

def google_search(query: str) -> Tuple[str, List[str]]:
    """
    Perform a Google search using Gemini's built-in search capability.
    Returns a tuple containing (text_response, search_links)
    """
    try:
        client = genai.Client(api_key='AIzaSyAqA979bDpQE6j0cHZ1tOBzVwZ3gq9FzeA')
        
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=query,
            config=types.GenerateContentConfig(
                temperature=0.2,
                tools=[types.Tool(
                    google_search=types.GoogleSearchRetrieval()
                )]
            )
        )
        
        # Extract links from citations and grounding metadata
        links = []
        if hasattr(response, 'candidates') and response.candidates:
            for candidate in response.candidates:
                # Extract links from citation metadata
                if hasattr(candidate, 'citation_metadata') and candidate.citation_metadata:
                    for citation in candidate.citation_metadata.citations:
                        if hasattr(citation, 'url') and citation.url:
                            links.append(citation.url)
                # Extract links from grounding metadata
                if hasattr(candidate, 'grounding_metadata') and candidate.grounding_metadata:
                    for chunk in candidate.grounding_metadata.grounding_chunks:
                        if hasattr(chunk, 'web') and chunk.web:
                            links.append(chunk.web.uri)
                            
        return response.text, links
    except Exception as e:
        st.error(f"🔍 Google search error: {str(e)}")
        return "", []