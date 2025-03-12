import os
import traceback
from dotenv import load_dotenv
from supabase import create_client, Client
from typing import Tuple, Optional

# Load environment variables if not already loaded
load_dotenv()

# Get Supabase credentials from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def get_supabase_client() -> Tuple[Optional[Client], str]:
    """
    Create and return a Supabase client instance
    
    Returns:
        Tuple[Optional[Client], str]: (client, error_message)
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None, "Supabase URL and Key must be provided in environment variables"
    
    try:
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        return client, ""
    except Exception as e:
        error_details = traceback.format_exc()
        return None, f"Error creating Supabase client: {str(e)}"

def initialize_supabase():
    """Initialize Supabase and return client"""
    try:
        client, error = get_supabase_client()
        if error:
            print(f"Supabase initialization warning: {error}")
        return client
    except Exception as e:
        print(f"Error initializing Supabase: {e}")
        return None
