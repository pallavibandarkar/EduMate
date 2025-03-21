import os
import streamlit as st
import json
from dotenv import load_dotenv
import google.generativeai as genai
from typing import Dict, Any, List, Optional
import traceback

# Import curriculum generation components
from coordinator_agent import CoordinatorInput, coordinate
from agents.overview_agent import CurriculumStep, CurriculumOverview, format_curriculum_text
from utils.curriculum_utils import save_curriculum_step, get_curriculum_step, update_curriculum_step
from utils.supabase_client import initialize_supabase
# Import the new curriculum modification function
from agents.writeragents import modify_curriculum

# Load environment variables
load_dotenv()

# Initialize API clients
GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY", "")
os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY
genai.configure(api_key=GOOGLE_API_KEY)
supabase_client = initialize_supabase()

def process_modification_request(curriculum: CurriculumOverview, user_input: str) -> CurriculumOverview:
    """
    Process a user's request to modify the curriculum
    
    Args:
        curriculum: The current curriculum overview
        user_input: The user's modification request
        
    Returns:
        CurriculumOverview: The modified curriculum overview
    """
    try:
        # Use the new agent-based modification function instead of direct API call
        modified_data = modify_curriculum(curriculum, user_input)
        
        # Create new steps from the JSON data
        new_steps = []
        for step_data in modified_data.get("steps", []):
            new_steps.append(CurriculumStep(
                title=step_data.get("title", "Untitled Step"),
                estimated_time=step_data.get("estimated_time", "Not specified")
            ))
        
        # Create a new curriculum with the updated steps
        updated_curriculum = CurriculumOverview(
            curriculum_id=curriculum.curriculum_id,
            title=curriculum.title,
            overview=curriculum.overview,
            steps=new_steps,
            total_time=curriculum.total_time
        )
        
        return updated_curriculum
        
    except Exception as e:
        error_details = f"Error in process_modification_request: {e}\n{traceback.format_exc()}"
        st.session_state.debug_errors.append(error_details)
        # Return the original curriculum if there's an error
        return curriculum

# Save or update curriculum step based on whether it already exists
def save_or_update_curriculum_step(step_id, step_title, estimated_time, overview_data):
    """
    Checks if curriculum step exists and updates it, otherwise creates a new one
    
    Args:
        step_id: UUID for the curriculum step
        step_title: Title of the curriculum step
        estimated_time: Estimated time for completion
        overview_data: JSON data for overview
        
    Returns:
        bool: True if save was successful, False otherwise
    """
    try:
        # First check if this step already exists
        existing_step = get_curriculum_step(step_id)
        
        if existing_step:
            # Step exists, update it
            return update_curriculum_step(step_id, step_title, estimated_time, overview_data)
        else:
            # Step doesn't exist, create new
            return save_curriculum_step(step_id, step_title, estimated_time, overview_data)
    except Exception as e:
        error_details = f"Error in save_or_update_curriculum_step: {e}\n{traceback.format_exc()}"
        st.session_state.debug_errors.append(error_details)
        return False

# Streamlit app
st.title("📚 Interactive Curriculum Generator")

# Session state initialization
if 'curriculum' not in st.session_state:
    st.session_state.curriculum = None
if 'chat_history' not in st.session_state:
    st.session_state.chat_history = []
if 'debug_errors' not in st.session_state:
    st.session_state.debug_errors = []
if 'show_errors' not in st.session_state:
    st.session_state.show_errors = True
if 'errors' not in st.session_state:
    st.session_state.errors = []

# Debug error display - place at top so it's always visible
st.sidebar.checkbox("Show Debug Errors", value=st.session_state.show_errors, key="show_errors")
if st.session_state.show_errors and st.session_state.debug_errors:
    st.error("⚠️ DEBUG ERRORS:")
    for error in st.session_state.debug_errors:
        st.code(error, language="python")
    if st.button("Clear Debug Errors"):
        st.session_state.debug_errors = []

# Create an error container at the top of the app
if st.session_state.errors:
    with st.expander("Debug Errors", expanded=True):
        for error in st.session_state.errors:
            st.error(error)
        if st.button("Clear Errors"):
            st.session_state.errors = []
            st.rerun()

# Sidebar for curriculum input
with st.sidebar:
    st.header("Curriculum Parameters")
    
    # Curriculum subject input
    subject = st.text_input("Subject", placeholder="e.g., Introduction to Python")
    
    # Optional syllabus URL
    syllabus_url = st.text_input("Syllabus URL (optional)", placeholder="https://example.com/syllabus.pdf")
    
    # Time constraint
    time_constraint = st.text_input("Time Constraint", placeholder="e.g., 8 weeks")
    
    # Generate button
    if st.button("Generate Curriculum"):
        if subject:
            with st.spinner("Generating curriculum..."):
                try:
                    # Create input for coordinator
                    coordinator_input = CoordinatorInput(
                        query=subject,
                        syllabus_url=syllabus_url if syllabus_url else None,
                        time_constraint=time_constraint if time_constraint else None
                    )
                    
                    # Generate curriculum
                    result = coordinate(coordinator_input)
                    
                    # Store in session state
                    st.session_state.curriculum = result.overview
                    st.session_state.formatted_text = result.formatted_text
                    
                    # Add system message to chat history
                    st.session_state.chat_history.append({
                        "role": "system", 
                        "content": "Curriculum generated successfully. You can now review it and suggest modifications."
                    })
                    
                    # Force rerun to refresh UI
                    st.rerun()
                except Exception as e:
                    error_details = f"Error generating curriculum: {e}\n{traceback.format_exc()}"
                    st.session_state.debug_errors.append(error_details)
                    st.error(error_details)
        else:
            st.warning("Please enter a subject to generate a curriculum.")

# Main area for displaying curriculum and chat interface
if st.session_state.curriculum:
    # Display the curriculum
    st.header(st.session_state.curriculum.title)
    
    with st.expander("Curriculum Overview", expanded=True):
        # Display overview text
        st.markdown(st.session_state.formatted_text)
        
        # Display a download button for the curriculum
        st.download_button(
            label="Download Curriculum",
            data=st.session_state.formatted_text,
            file_name=f"{st.session_state.curriculum.title.replace(' ', '_')}.md",
            mime="text/markdown"
        )
    
    # Chat interface for modifications
    st.header("Curriculum Modifications")
    st.write("Chat with the AI to suggest modifications to the curriculum steps.")
    
    # Display chat history
    for message in st.session_state.chat_history:
        with st.chat_message(message["role"]):
            st.write(message["content"])
    
    # Input for new messages
    if prompt := st.chat_input("Suggest modifications to the curriculum..."):
        # Add user message to chat history
        st.session_state.chat_history.append({"role": "user", "content": prompt})
        
        # Display user message
        with st.chat_message("user"):
            st.write(prompt)
        
        # Process the modification request
        with st.spinner("Processing your request..."):
            try:
                # Store the previous curriculum for comparison
                previous_curriculum = st.session_state.curriculum
                
                # Update curriculum based on user's suggestions
                updated_curriculum = process_modification_request(
                    st.session_state.curriculum,
                    prompt
                )
                
                # Update session state with modified curriculum
                st.session_state.curriculum = updated_curriculum
                
                # Update formatted text
                st.session_state.formatted_text = format_curriculum_text(updated_curriculum)
                
                # Generate response message listing the changes
                changes_message = "I've updated the curriculum based on your suggestions:\n\n"
                if len(updated_curriculum.steps) != len(previous_curriculum.steps):
                    changes_message += f"- Changed number of steps from {len(previous_curriculum.steps)} to {len(updated_curriculum.steps)}\n"
                
                # List the new steps
                changes_message += "\nUpdated curriculum steps:\n"
                for i, step in enumerate(updated_curriculum.steps, 1):
                    changes_message += f"{i}. {step.title} ({step.estimated_time})\n"
                
                # Add system response to chat history
                st.session_state.chat_history.append({
                    "role": "assistant",
                    "content": changes_message
                })
                
                # Save updated curriculum to database
                try:
                    overview_data = {
                        "steps": [{"title": step.title, "estimated_time": step.estimated_time} 
                                for step in updated_curriculum.steps]
                    }
                    
                    # Use the new save_or_update function instead
                    save_result = save_or_update_curriculum_step(
                        updated_curriculum.curriculum_id,
                        updated_curriculum.title,
                        updated_curriculum.total_time,
                        overview_data
                    )
                    
                    if not save_result:
                        st.warning("Warning: Failed to save updated curriculum to database.")
                except Exception as e:
                    st.warning(f"Warning: Error saving curriculum update: {e}")
                
                # Force rerun to refresh UI ONLY if no errors
                st.rerun()
            except Exception as e:
                error_details = f"Error processing request: {e}\n{traceback.format_exc()}"
                st.session_state.debug_errors.append(error_details)
                
                # Add error to chat history without calling rerun
                st.session_state.chat_history.append({
                    "role": "assistant",
                    "content": f"⚠️ Error: {str(e)}\n\nCheck the debug errors section for details."
                })
                
                # Display the error in chat without rerunning
                with st.chat_message("assistant"):
                    st.error(f"⚠️ Error: {str(e)}\n\nCheck the debug errors section for details.")
else:
    # Display instructions if no curriculum is generated yet
    st.info("👈 Enter curriculum details in the sidebar and click 'Generate Curriculum' to get started.")
    st.write("""
    This tool helps you generate a well-structured curriculum for any subject.
    
    You can:
    1. Specify the subject you want to create a curriculum for
    2. Optionally provide a syllabus URL for more context
    3. Set a time constraint for the curriculum
    4. After generation, suggest modifications through the chat interface
    """)

# Add some spacing at the bottom
st.write("")
st.write("")
st.caption("Powered by Gemini-2.0-Flash")
