from agno.agent import Agent
from agno.models.google import Gemini
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
import os
import json
import traceback
from google import genai

# Import search functionality
from search import google_search

class StepDetailInput(BaseModel):
    """Input model for detailed curriculum step generation"""
    step_title: str
    estimated_time: str
    subject: str = ""
    user_modifications: Optional[str] = None

class DetailedStep(BaseModel):
    """Model for the detailed curriculum step"""
    step_title: str
    estimated_time: str
    learning_objectives: List[str] = Field(default_factory=list)
    subtopics: List[str] = Field(default_factory=list)  # Added new field for subtopics
    core_concepts: str = ""
    learning_resources: List[Dict[str, str]] = Field(default_factory=list)
    practice_exercises: List[Dict[str, str]] = Field(default_factory=list)
    assessment_methods: str = ""
    advanced_topics: List[str] = Field(default_factory=list)
    connections: Dict[str, str] = Field(default_factory=dict)

def get_detail_generator_agent() -> Agent:
    """Initialize a detailed curriculum step generator agent"""
    return Agent(
        name="Curriculum Detail Generator",
        model=Gemini(id="gemini-2.0-flash"),
        instructions="""You are an expert educational content developer specializing in creating 
        detailed, comprehensive learning materials. Your task is to expand a curriculum step 
        outline into detailed learning content.

        When given a step title and estimated time, create comprehensive detailed content that includes:
        - 3-5 key learning objectives based on the step title and estimated time
        - Subtopics that should be covered under this step
        - Brief overview of core concepts (keep minimal as we now have subtopics)
        - Learning resources (identified through search) with mix of types (articles, videos, tutorials)
          marked as essential or supplementary
        - Practice exercises of varying difficulty with clear instructions, expected outcomes, and hints
        - Assessment methods aligned with learning objectives, including evaluation criteria
        - Advanced topics or extensions for further exploration
        - Connections to previous and next steps

        Make content educational, practical, and engaging, focusing on both theoretical understanding 
        and practical skills. Ensure content is comprehensive but focused on the estimated time frame.

        Format your response as a structured JSON object with all the above sections.
        """,
        show_tool_calls=True,
        markdown=True,
    )

def generate_step_detail(input_data: StepDetailInput) -> DetailedStep:
    """
    Generate detailed content for a curriculum step
    
    Args:
        input_data: The input data containing step title, estimated time, etc.
        
    Returns:
        DetailedStep: The detailed curriculum step
    """
    try:
        # Perform an initial search to gather context and resources
        search_results = ""
        resource_links = []
        
        try:
            print(f"Searching for resources on: {input_data.step_title}")
            # First search for general content on the topic
            search_query = f"{input_data.step_title} learning resources tutorial"
            if input_data.subject:
                search_query += f" {input_data.subject}" 
                
            search_text, links = google_search(search_query)
            if search_text:
                search_results = f"\nSearch Results for Resources:\n{search_text}"
                resource_links = links
                print(f"Found {len(links)} resource links")
        except Exception as e:
            print(f"Error performing search for resources: {e}")
        
        # Use Gemini API to generate the detailed step content
        api_key = os.getenv("GEMINI_API_KEY", "")
        client = genai.Client(api_key=api_key)
        
        # Create a prompt for Gemini
        detail_prompt = f"""
        You are an expert educational content developer specializing in creating detailed, comprehensive learning materials.
        Your task is to expand a curriculum step outline into detailed learning content.

        **Input:**
        - Step title: {input_data.step_title}
        - Estimated time: {input_data.estimated_time}
        - User modifications: {input_data.user_modifications or "None provided"}
        
        {search_results}
        
        **Output Requirements:**
        - Generate 3-5 key learning objectives based on the step title and estimated time.
        - Create comprehensive detailed content for the curriculum step, with the following sections:
          - Subtopics: List the subtitles of the subtopics the user should learn under this step.
          - Learning Resources: Use the search results to curate a list of the top 3-5 resources, ensuring a mix of types (articles, videos, tutorials). Mark which are essential vs. supplementary.
          - Practice Exercises: Provide 3-5 practical exercises of varying difficulty with clear instructions, expected outcomes, and hints.
          - Assessment Methods: Design quizzes, projects, or other assessments aligned with learning objectives, including evaluation criteria.
          - Advanced Topics: Suggest deeper or related topics for further exploration.
        - Incorporate any user modifications if provided.

        Generate detailed educational content in JSON format with the following structure:
        {{
          "learning_objectives": ["objective1", "objective2", "objective3"],
          "subtopics": ["subtopic1", "subtopic2", "subtopic3"],
          "core_concepts": "Brief overview of core concepts (keep minimal as we now have subtopics)",
          "learning_resources": [
            {{"title": "Resource title", "url": "url", "description": "Brief description", "type": "essential/supplementary"}}
          ],
          "practice_exercises": [
            {{"title": "Exercise title", "description": "Exercise description with clear instructions and expected outcomes", "difficulty": "beginner/intermediate/advanced"}}
          ],
          "assessment_methods": "Description of quizzes, projects or assessments with evaluation criteria in bullet points",
          "advanced_topics": ["topic1", "topic2", "topic3"],
          "connections": {{
            "previous": "How this builds on previous knowledge",
            "next": "How this prepares for future learning"
          }}
        }}
        
        Ensure the learning resources include these URLs when relevant: {json.dumps(resource_links)}
        Use formatting (bullet points, section headings) to make content digestible.
        Ensure content is comprehensive but focused on the estimated time frame.
        Make the content educational, practical, and engaging, focusing on both theoretical understanding and practical skills.
        """
        
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=detail_prompt,
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
        detail_data = json.loads(response_text.strip())
        
        # Create and return the detailed step
        return DetailedStep(
            step_title=input_data.step_title,
            estimated_time=input_data.estimated_time,
            learning_objectives=detail_data.get("learning_objectives", []),
            subtopics=detail_data.get("subtopics", []),  # Added new field
            core_concepts=detail_data.get("core_concepts", ""),
            learning_resources=detail_data.get("learning_resources", []),
            practice_exercises=detail_data.get("practice_exercises", []),
            assessment_methods=detail_data.get("assessment_methods", ""),
            advanced_topics=detail_data.get("advanced_topics", []),
            connections=detail_data.get("connections", {})
        )
    
    except Exception as e:
        print(f"Error generating step detail: {e}\n{traceback.format_exc()}")
        
        # Create a minimal fallback response
        return DetailedStep(
            step_title=input_data.step_title,
            estimated_time=input_data.estimated_time,
            learning_objectives=["Understand key concepts", "Apply basic techniques", "Develop fundamental skills"],
            subtopics=["Introduction", "Key Concepts", "Practical Applications"],  # Added default subtopics
            core_concepts="Content generation failed. Please try again.",
            learning_resources=[],
            practice_exercises=[],
            assessment_methods="Standard quizzes and assignments to evaluate understanding.",
            advanced_topics=["Further study in this area"],
            connections={"previous": "Builds on foundational knowledge", "next": "Prepares for advanced topics"}
        )

def format_detailed_step_text(detailed_step: DetailedStep) -> str:
    """
    Format the detailed step as human-readable markdown text
    
    Args:
        detailed_step: The detailed curriculum step object
        
    Returns:
        str: Formatted text representation of the detailed step
    """
    text = f"# {detailed_step.step_title}\n\n"
    text += f"**Estimated Time:** {detailed_step.estimated_time}\n\n"
    
    # Learning Objectives
    text += "## Learning Objectives\n\n"
    for i, objective in enumerate(detailed_step.learning_objectives, 1):
        text += f"{i}. {objective}\n"
    text += "\n"
    
    # Subtopics - new section
    text += "## Subtopics\n\n"
    for i, subtopic in enumerate(detailed_step.subtopics, 1):
        text += f"- {subtopic}\n"
    text += "\n"
    
    # Core Concepts
    text += "## Overview of Core Concepts\n\n"
    text += f"{detailed_step.core_concepts}\n\n"
    
    # Learning Resources
    text += "## Learning Resources\n\n"
    for i, resource in enumerate(detailed_step.learning_resources, 1):
        resource_type = resource.get("type", "")
        type_label = f" ({resource_type})" if resource_type else ""
        text += f"{i}. [{resource.get('title', 'Resource')}]({resource.get('url', '#')}){type_label}\n"
        text += f"   {resource.get('description', '')}\n\n"
    
    # Practice Exercises
    text += "## Practice Exercises\n\n"
    for i, exercise in enumerate(detailed_step.practice_exercises, 1):
        difficulty = exercise.get("difficulty", "")
        difficulty_label = f" (Difficulty: {difficulty})" if difficulty else ""
        text += f"### Exercise {i}: {exercise.get('title', '')}{difficulty_label}\n\n"
        text += f"{exercise.get('description', '')}\n\n"
    
    # Assessment Methods
    text += "## Assessment Methods\n\n"
    text += f"{detailed_step.assessment_methods}\n\n"
    
    # Advanced Topics
    text += "## Advanced Topics for Further Exploration\n\n"
    for topic in detailed_step.advanced_topics:
        text += f"- {topic}\n"
    text += "\n"
    
    # Connections
    text += "## Connections to Other Steps\n\n"
    text += f"**Building From:** {detailed_step.connections.get('previous', 'Foundation knowledge')}\n\n"
    text += f"**Leading To:** {detailed_step.connections.get('next', 'Advanced topics')}\n\n"
    
    return text

if __name__ == "__main__":
    # Example usage for testing
    test_input = StepDetailInput(
        step_title="Introduction to Python Variables and Data Types",
        estimated_time="2 weeks",
        subject="Programming"
    )
    
    result = generate_step_detail(test_input)
    formatted_text = format_detailed_step_text(result)
    
    print("DETAILED STEP GENERATION COMPLETE")
    print(formatted_text)
