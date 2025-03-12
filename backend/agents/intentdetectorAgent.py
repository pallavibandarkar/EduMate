import os
from google import genai
from typing import Dict, Any, Tuple
from pydantic import BaseModel

api_key = "AIzaSyD4lR1WQ1yaZumSFtMVTG_0Y8d0oRy1XhA"
client = genai.Client(api_key=api_key)

class GoogleSearchIntentResult(BaseModel):
    requires_search: bool



def detect_google_search_intent(query: str) -> bool:
    """
    Determines if the user's query requires internet access to answer properly.
    
    Args:
        query (str): The user's query
        
    Returns:
        bool: True if the query requires internet access, False otherwise
    """
   
    prompt = f"""You are an expert at determining when a query requires up-to-date information from the internet.
    
    Your task is to:
    1. Analyze the following user query
    2. Determine if an LLM without internet access can provide a satisfactory answer
    3. If the query likely needs internet access (e.g., current events, specific data, recent information), return: {{"requires_search": true}}
    4. If the query can be answered without internet access (e.g., general knowledge, coding help), return: {{"requires_search": false}}
    
    Examples requiring internet:
    - Current news or events
    - Recent statistics or data
    - Real-time information (weather, stocks)
    - Specific factual lookups that aren't common knowledge
    - Information that changes frequently
    
    Return ONLY the JSON object without any additional text.
    
    User query: {query}
    """
     
    try:
        
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': GoogleSearchIntentResult,
            },
        )
        
        result = response.parsed
        return result.requires_search
    except Exception as e:
        print(f"Error detecting search intent: {e}")
        return False
