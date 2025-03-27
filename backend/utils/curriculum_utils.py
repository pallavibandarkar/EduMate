import uuid
from typing import Dict, Any, Optional, Tuple, List
from utils.supabase_client import initialize_supabase

def create_curriculum_step(step_title: str, estimated_time: str, overview=None, detailed_content=None) -> Tuple[str, bool]:
    """
    Create a new curriculum step and save to Supabase
    
    Args:
        step_title: Title of the curriculum step
        estimated_time: Estimated time for completion
        overview: JSON data for overview (optional)
        detailed_content: JSON data for detailed content (optional)
        
    Returns:
        Tuple[str, bool]: (step_id, success)
    """
    step_id = str(uuid.uuid4())
    success = save_curriculum_step(step_id, step_title, estimated_time, overview, detailed_content)
    return step_id, success

def save_curriculum_step(step_id: str, step_title: str, estimated_time: str, overview=None, detailed_content=None) -> bool:
    """
    Save curriculum step to Supabase
    
    Args:
        step_id: UUID for the curriculum step
        step_title: Title of the curriculum step
        estimated_time: Estimated time for completion
        overview: JSON data for overview (optional)
        detailed_content: JSON data for detailed content (optional)
        
    Returns:
        bool: True if save was successful, False otherwise
    """
    try:
        # Initialize Supabase client
        supabase = initialize_supabase()
        if not supabase:
            print("Failed to initialize Supabase client")
            return False
            
        # Prepare data
        data = {
            "step_id": step_id,
            "step_title": step_title,
            "estimated_time": estimated_time
        }
        
        # Add JSON data if provided
        if overview:
            data["overview"] = overview
            
        if detailed_content:
            data["detailed_content"] = detailed_content
            
        # Insert data into Supabase
        response = supabase.table("curriculum_steps").insert(data).execute()
        print(f"Successfully saved curriculum step with ID: {step_id}")
        return True
        
    except Exception as e:
        print(f"Error saving curriculum step to Supabase: {e}")
        return False

def get_curriculum_step(step_id: str) -> Optional[Dict[str, Any]]:
    """
    Get curriculum step from Supabase
    
    Args:
        step_id: UUID of the curriculum step
        
    Returns:
        Optional[Dict[str, Any]]: Curriculum step data or None if not found
    """
    try:
        print(f"DEBUG: get_curriculum_step called for step_id={step_id}")
        
        # Initialize Supabase client
        supabase = initialize_supabase()
        if not supabase:
            print("DEBUG: ERROR - Failed to initialize Supabase client")
            return None
            
        # Query Supabase
        print(f"DEBUG: Querying Supabase for step_id={step_id}")
        response = supabase.table("curriculum_steps").select("*").eq("step_id", step_id).execute()
        
        if response and response.data and len(response.data) > 0:
            print(f"DEBUG: Found curriculum step with ID {step_id}")
            step_data = response.data[0]
            print(f"DEBUG: Step data keys: {list(step_data.keys())}")
            return step_data
            
        print(f"DEBUG: ERROR - No curriculum step found with ID {step_id}")
        return None
        
    except Exception as e:
        print(f"DEBUG: ERROR getting curriculum step from Supabase: {e}")
        import traceback
        print(traceback.format_exc())
        return None

def get_all_curriculum_steps() -> List[Dict[str, Any]]:
    """
    Get all curriculum steps from Supabase
    
    Returns:
        List[Dict[str, Any]]: List of curriculum step data
    """
    try:
        # Initialize Supabase client
        supabase = initialize_supabase()
        if not supabase:
            print("Failed to initialize Supabase client")
            return []
            
        # Query Supabase
        response = supabase.table("curriculum_steps").select("*").execute()
        
        if response and response.data:
            return response.data
            
        return []
        
    except Exception as e:
        print(f"Error getting curriculum steps from Supabase: {e}")
        return []

def update_curriculum_step(step_id: str, step_title: str, estimated_time: str, overview=None, detailed_content=None) -> bool:
    """
    Update an existing curriculum step in Supabase
    
    Args:
        step_id: UUID for the curriculum step
        step_title: Title of the curriculum step
        estimated_time: Estimated time for completion
        overview: JSON data for overview (optional)
        detailed_content: JSON data for detailed content (optional)
        
    Returns:
        bool: True if update was successful, False otherwise
    """
    try:
        # Initialize Supabase client
        supabase = initialize_supabase()
        if not supabase:
            print("Failed to initialize Supabase client")
            return False
            
        # Prepare data
        data = {
            "step_title": step_title,
            "estimated_time": estimated_time
        }
        
        # Add JSON data if provided
        if overview:
            data["overview"] = overview
            
        if detailed_content:
            data["detailed_content"] = detailed_content
            
        # Update data in Supabase
        response = supabase.table("curriculum_steps").update(data).eq("step_id", step_id).execute()
        print(f"Successfully updated curriculum step with ID: {step_id}")
        return True
        
    except Exception as e:
        print(f"Error updating curriculum step in Supabase: {e}")
        return False
