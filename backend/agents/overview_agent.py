import os
import json
from typing import Dict, Any, List, Optional, TYPE_CHECKING
from pydantic import BaseModel, Field
from google import genai

# Import Google search functionality
from search import google_search

# Use TYPE_CHECKING to avoid circular imports
if TYPE_CHECKING:
    # Only imports during type checking, not at runtime
    from coordinator_agent import CoordinatorOutput

class CurriculumStep(BaseModel):
    """Model for a curriculum step"""
    title: str
    estimated_time: str
    # Removed objectives field

class CurriculumOverview(BaseModel):
    """Model for the complete curriculum overview"""
    curriculum_id: str
    title: str
    overview: str
    steps: List[CurriculumStep]
    total_time: str

def generate_overview(coordinator_output: "CoordinatorOutput") -> CurriculumOverview:
    """
    Generate a simplified curriculum overview from coordinator output
    
    Args:
        coordinator_output: The structured output from the coordinator agent
        
    Returns:
        CurriculumOverview: The simplified curriculum overview with steps
    """
    # Extract key data from coordinator output
    curriculum_id = coordinator_output.curriculum_id
    subject = coordinator_output.subject
    description = coordinator_output.description
    extracted_topics = coordinator_output.extracted_topics
    suggested_structure = coordinator_output.suggested_structure
    time_allocation = coordinator_output.time_allocation
    total_time = coordinator_output.total_time
    
    # Perform additional Google search to enhance curriculum context
    search_results = ""
    try:
        print(f"Performing additional search for curriculum context on: {subject} curriculum")
        search_query = f"{subject} curriculum best practices educational standards"
        search_text, _ = google_search(search_query)
        if search_text:
            search_results = f"\nAdditional context from search:\n{search_text}"
            print("Successfully retrieved additional context from search")
        else:
            print("No additional context retrieved from search")
    except Exception as e:
        print(f"Error performing additional search: {e}")
    
    # Use Gemini API to generate the curriculum overview
    try:
        api_key = os.getenv("GEMINI_API_KEY", "")
        client = genai.Client(api_key=api_key)
        
        # Create a prompt for Gemini using the coordinator data with simplified requirements
        overview_prompt = f"""
        You are an expert educational curriculum designer. Create a simplified curriculum overview 
        for the subject: {subject}
        
        Here are the extracted topics and their relationships:
        {json.dumps(extracted_topics)}
        
        Here is the suggested curriculum structure:
        {json.dumps(suggested_structure)}
        
        Time constraint: {total_time}
        {search_results}
        
        Generate a curriculum with the following:
        1. A concise title for the curriculum
        2. A brief overview paragraph (3-5 sentences) describing the curriculum's purpose and structure
        3. 5-10 logical learning steps that progress from beginner to advanced level
        4. For each step, provide:
           - A clear, descriptive title
           - Estimated time to complete (in hours or weeks)
        
        Format your response as JSON with this structure:
        {{
          "title": "Curriculum Title",
          "overview": "Brief overview paragraph",
          "steps": [
            {{
              "title": "Step Title",
              "estimated_time": "X hours/weeks"
            }}
          ]
        }}
        """
        
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=overview_prompt,
            config={
                'response_mime_type': 'application/json'
            }
        )
        
        # Process the response
        response_text = response.text
        
        # Clean up the response if needed
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
            
        # Parse JSON
        overview_data = json.loads(response_text.strip())
        
        # Create steps from the JSON data
        steps = []
        for step_data in overview_data.get("steps", []):
            steps.append(CurriculumStep(
                title=step_data.get("title", "Untitled Step"),
                estimated_time=step_data.get("estimated_time", "Not specified")
            ))
        
        # Create and return the full curriculum overview
        return CurriculumOverview(
            curriculum_id=curriculum_id,
            title=overview_data.get("title", f"Curriculum for {subject}"),
            overview=overview_data.get("overview", description),
            steps=steps,
            total_time=total_time
        )
    
    except Exception as e:
        print(f"Error generating curriculum overview: {e}")
        
        # Create a fallback overview if API call fails
        steps = []
        for i, topic in enumerate(extracted_topics[:5], 1):
            steps.append(CurriculumStep(
                title=topic.get("name", f"Step {i}"),
                estimated_time="2 weeks"
            ))
        
        return CurriculumOverview(
            curriculum_id=curriculum_id,
            title=f"Curriculum for {subject}",
            overview=f"This curriculum covers the fundamentals of {subject}, progressing from basic concepts to advanced applications.",
            steps=steps,
            total_time=total_time
        )

def format_curriculum_text(overview: CurriculumOverview) -> str:
    """
    Format the curriculum overview as a human-readable text
    
    Args:
        overview: The curriculum overview object
        
    Returns:
        str: Formatted text representation of the curriculum
    """
    text = f"# {overview.title}\n\n"
    text += f"## Overview\n{overview.overview}\n\n"
    text += f"**Total Time: {overview.total_time}**\n\n"
    text += "## Learning Steps\n\n"
    
    for i, step in enumerate(overview.steps, 1):
        text += f"### {i}. {step.title}\n"
        text += f"**Estimated Time:** {step.estimated_time}\n\n"
    
    return text

if __name__ == "__main__":
    # For testing purposes
    from coordinator_agent import CoordinatorInput, coordinate
    
    test_input = CoordinatorInput(
        query="Introduction to Machine Learning",
        time_constraint="8 weeks"
    )
    
    coordinator_result = coordinate(test_input)
    overview_result = generate_overview(coordinator_result)
    
    print("Overview Generation Complete!")
    print(f"Title: {overview_result.title}")
    print(f"Overview: {overview_result.overview}")
    print("\nSteps:")
    for i, step in enumerate(overview_result.steps, 1):
        print(f"{i}. {step.title}")
        print(f"   Estimated Time: {step.estimated_time}")
    
    # Print formatted text version
    print("\nFormatted Curriculum:")
    print(format_curriculum_text(overview_result))
