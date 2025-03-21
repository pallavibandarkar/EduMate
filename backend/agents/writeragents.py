from agno.agent import Agent
from agno.models.google import Gemini
from typing import Dict, Any, List
from pydantic import BaseModel
from google import genai
import json  # Add this missing import

def get_query_rewriter_agent() -> Agent:
    """Initialize a query rewriting agent."""
    return Agent(
        name="Query Rewriter",
        model=Gemini(id="gemini-2.0-flash"),
        instructions="""You are an expert at reformulating questions to be more precise and detailed. 
        Your task is to:
        1. Analyze the user's question
        2. Rewrite it to be more specific and search-friendly
        3. Expand any acronyms or technical terms
        4. Return ONLY the rewritten query without any additional text or explanations
        
        """,
        show_tool_calls=False,
        markdown=True,
    )


def get_rag_agent() -> Agent:
    """Initialize the main RAG agent."""
    return Agent(
        name="Gemini RAG Agent",
        model=Gemini(id="gemini-2.0-flash"),
        instructions="""You are an Intelligent Agent specializing in providing accurate answers.
        
        When given context from documents:
        - Focus on information from the provided documents
        - Be precise and cite specific details
        
        When given web search results:
        - Clearly indicate that the information comes from Google Search
        - Synthesize the information clearly
        - Reference the provided source links when possible
        
        Always maintain high accuracy and clarity in your responses.
        """,
        show_tool_calls=True,
        markdown=True,
    )


def get_session_title_generator() -> Agent:
    """Initialize a session title generator agent."""
    return Agent(
        name="Session Title Generator",
        model=Gemini(id="gemini-2.0-flash"),
        instructions="""You are an expert at creating short, concise titles.
        
        Your task is to:
        1. Read the provided user query
        2. Generate a short, descriptive title (4-5 words maximum)
        3. Make the title clearly represent the topic or question
        4. Return ONLY the title without any additional text or explanations
        
        """,
        show_tool_calls=False,
        markdown=True,
    )

def generate_session_title(query: str) -> str:
    """
    Generate a concise title (4-5 words) based on the user's query.
    
    Args:
        query (str): The user's query to base the title on
        
    Returns:
        str: A concise 4-5 word title
    """
    try:
        title_agent = get_session_title_generator()
        title = title_agent.run(f"Generate a concise 4-5 word title for this query: {query}").content
        return title.strip()
    except Exception as e:
        print(f"Error generating session title: {e}")
        return "Untitled Session"

client = genai.Client(api_key="AIzaSyD4lR1WQ1yaZumSFtMVTG_0Y8d0oRy1XhA")
class UrldetectionResult(BaseModel):
    urls: List[str]
    query: str
    
def test_url_detector(query: str) -> Dict[str, Any]:
    """
    Test the URL detector using direct Gemini API call.
    
    Args:
        query (str): The query to test
        
    Returns:
        Dict[str, Any]: Parsed JSON result with urls list and query fields
    """
   
    prompt = f"""You are an expert at identifying URLs in user queries.
    
    Your task is to:
    1. Analyze the following user input
    2. Identify ALL URLs present (http, https, or www formats)
    3. Extract ALL complete URLs and the actual question
    4. Return a structured JSON response with:
       - "urls": an array of all extracted URLs (empty array if none found)
       - "query": the actual question without the URLs
    
    If no URLs are detected, return:
    {{"urls": [], "query": "original question"}}
    
    Return ONLY the JSON object without any additional text or explanations.
    
    User input: {query}
    """
     
    try:
        # Use the GenerativeModel class instead of Client
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(
            prompt,
            generation_config={
                "response_mime_type": "application/json",
            }
        )
        
        # Parse the response JSON
        if hasattr(response, 'text'):
            result_json = json.loads(response.text)
            return UrldetectionResult(**result_json)
        else:
            return UrldetectionResult(urls=[], query=query)
            
    except Exception as e:
        print(f"Error processing response: {e}")
        return UrldetectionResult(urls=[], query=query)

def get_curriculum_modifier_agent() -> Agent:
    """Initialize an agent for modifying curriculum structure."""
    return Agent(
        name="Curriculum Modifier",
        model=Gemini(id="gemini-2.0-flash"),
        instructions="""You are an expert educational curriculum designer specializing in modifying existing curricula.

        Your task is to:
        1. Review the existing curriculum structure
        2. Apply the user's requested modifications
        3. Ensure the curriculum maintains logical flow and progression
        4. Return a modified JSON structure that maintains the original format
        
        Return ONLY the JSON object without any additional text or explanations.
        """,
        show_tool_calls=False,
        markdown=True,
    )

def modify_curriculum(curriculum, user_input: str) -> dict:
    """
    Modify a curriculum structure based on user input using Agno agent.
    
    Args:
        curriculum: The existing curriculum overview object
        user_input: The user's modification request
        
    Returns:
        dict: Modified curriculum data 
    """
    try:
        # Get the curriculum modifier agent
        modifier_agent = get_curriculum_modifier_agent()
        
        # Create a prompt that explains the current curriculum and asks for modifications
        prompt = f"""
        Here is a curriculum overview:
        
        Title: {curriculum.title}
        Overview: {curriculum.overview}
        Total Time: {curriculum.total_time}
        
        Current learning steps:
        {json.dumps([{"title": step.title, "estimated_time": step.estimated_time} for step in curriculum.steps])}
        
        The user wants to modify this curriculum with the following request:
        "{user_input}"
        
        Based on this request, update the curriculum steps.
        Return only a JSON object with this structure:
        {{
          "steps": [
            {{
              "title": "Step Title",
              "estimated_time": "X hours/weeks"
            }}
          ]
        }}
        """
        
        # Use the agent to process the modification
        response = modifier_agent.run(prompt)
        
        # Get the response content
        response_text = response.content
        
        # Clean up the response if needed (e.g., removing markdown code block markers)
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
            
        # Parse JSON
        modified_data = json.loads(response_text.strip())
        return modified_data
        
    except Exception as e:
        print(f"Error in modify_curriculum: {str(e)}")
        # Return default data structure if there's an error
        return {"steps": [{"title": step.title, "estimated_time": step.estimated_time} for step in curriculum.steps]}