import json
import requests
import os
import tempfile
import traceback
import logging
import google.generativeai as genai
from google.generativeai import types
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Tuple, TypedDict, Union
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('grader')

load_dotenv()

# Use GEMINI_API_KEY to be consistent with main.py
GOOGLE_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if not GOOGLE_API_KEY:
    logger.warning("GEMINI_API_KEY environment variable is not set")

class PaperCheckResult(BaseModel):
    Name: str = Field("", description="Paper taker's name or anything that hels identify the paper taker")
    marks: int
    remarks: List[str]
    suggestions: List[str]
    errors: List[str]

class ProcessResult(TypedDict):
    success: bool
    error: str | None
    results: List[Dict[str, Any]] | None

def download_from_url(url: str) -> Tuple[str, str]:
    """
    Downloads a file from a URL to a temporary file
    Returns: Tuple of (temp_file_path, filename)
    """
    try:
        # Get filename from URL
        filename = url.split("/")[-1]
        logger.info(f"Downloading file: {filename} from URL: {url}")
        
        # Download the file to a temporary location
        response = requests.get(url, stream=True)
        response.raise_for_status()  # Raise an exception for 4XX/5XX responses
        
        # Create temporary file with appropriate extension
        file_ext = os.path.splitext(filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            for chunk in response.iter_content(chunk_size=8192):
                temp_file.write(chunk)
            temp_path = temp_file.name
        logger.info(f"File downloaded successfully to: {temp_path}")
        return temp_path, filename
    except Exception as e:
        logger.error(f"Error downloading file: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise Exception(f"Error downloading file: {str(e)}")

def prepare_document(file_path: str) -> Dict[str, Any]:
    """
    Prepares the document and gets initial response
    Returns: Dictionary with raw response
    """
    try:
        genai.configure(api_key=GOOGLE_API_KEY)
        logger.info("Uploading file to Google AI")
        uploaded_file = genai.upload_file(file_path)
        logger.info(f"File uploaded successfully: {uploaded_file}")

        initial_prompt = """
        Analyze this academic paper and provide feedback. Include:
        1. Overall quality score (0-100)
        2. Positive aspects of the paper
        3. Areas that need improvement
        4. Any errors or problems found
        """

        logger.info("Generating content with Gemini model")
        model = genai.GenerativeModel("gemini-1.5-flash")
        initial_response = model.generate_content([uploaded_file, initial_prompt])
        logger.info("Successfully received initial response from Gemini")

        return {
            "success": True,
            "uploaded_file": uploaded_file,
            "initial_response": initial_response.text
        }
    except Exception as e:
        logger.error(f"Error preparing document: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {"success": False, "error": f"Error preparing document: {str(e)}"}

def analyze_document(initial_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Takes initial response and converts it to structured format
    Returns: Dictionary with structured results
    """
    try:
        if not initial_result["success"]:
            logger.warning("Skipping analysis as initial result was not successful")
            return initial_result

        logger.info("Configuring Google AI for structured analysis")
        genai.configure(api_key=GOOGLE_API_KEY)

        structure_prompt = f"""
        Convert the following feedback into a structured JSON format:

        {initial_result['initial_response']}

        The JSON should have this structure:
        {{  "Name": "Roll No or name of the paper taker if found, otherwise empty string",
            "marks": integer (0-100) it should depend on how good remarks are and how many errors there are,
            "remarks": [list of positive comments],
            "suggestions": [list of improvement areas],
            "errors": [list of problems found]
        }}

        IMPORTANT: Ensure marks is a valid integer between 0 and 100. If no specific score is found, use 0.
        Ensure all arrays are empty lists [] instead of null when there are no items.
        Ensure Name is an empty string "" if no name is found.
        """

        # Get structured response with simpler structure
        logger.info("Generating structured JSON response")
        model = genai.GenerativeModel("gemini-2.0-flash")
        structured_response = model.generate_content(
            structure_prompt,
            generation_config={ 'response_mime_type': 'application/json' }
        )
        logger.info("Successfully received structured response from Gemini")

        # Parse the response safely
        try:
            response_text = structured_response.text.strip()
            logger.debug(f"Raw response text: {response_text[:100]}...")
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

            logger.info("Parsing JSON response")
            data = json.loads(response_text)

            if isinstance(data, dict):
                logger.info("Normalizing JSON fields")
                data["marks"] = int(data.get("marks", 0))
                data["Name"] = str(data.get("Name", ""))
                data["remarks"] = list(data.get("remarks", []))
                data["suggestions"] = list(data.get("suggestions", []))
                data["errors"] = list(data.get("errors", []))

        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {str(e)}")
            logger.error(f"Failed JSON text: {response_text}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {"success": False, "error": f"Failed to parse AI response: {str(e)}"}
        except (ValueError, TypeError) as e:
            logger.error(f"Value error in JSON conversion: {str(e)}")
            logger.error(f"Problematic data: {data}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {"success": False, "error": f"Invalid value conversion: {str(e)}"}

        if not isinstance(data, list):
            logger.info("Converting single result to list format")
            data = [data]

        logger.info(f"Creating {len(data)} PaperCheckResult objects")
        results = [PaperCheckResult(**item) for item in data]
        final_results = {"success": True, "results": [r.model_dump() for r in results]}
        logger.info("Successfully completed document analysis")
        return final_results

    except Exception as e:
        logger.error(f"Error analyzing document: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {"success": False, "error": str(e)}

def process_document(file_path_or_url: str) -> ProcessResult:
    """
    Main function that coordinates the document processing
    Accepts either a local file path or a URL
    """
    temp_file = None
    try:
        logger.info(f"Processing document: {file_path_or_url}")
        # Check if the input is a URL
        if file_path_or_url.startswith(('http://', 'https://')):
            logger.info(f"URL detected, downloading file: {file_path_or_url}")
            # Download the file from URL
            temp_file, filename = download_from_url(file_path_or_url)
            file_path = temp_file
            logger.info(f"Downloaded to temporary file: {file_path}")
        else:
            # Use the provided file path directly
            file_path = file_path_or_url
            logger.info(f"Using local file path: {file_path}")
        
        # First get raw analysis
        logger.info("Starting document preparation and initial analysis")
        initial_result = prepare_document(file_path)
        if not initial_result["success"]:
            logger.error(f"Document preparation failed: {initial_result['error']}")
            return {"success": False, "error": initial_result["error"], "results": None}
            
        # Then convert to structured format
        logger.info("Starting structured analysis")
        result = analyze_document(initial_result)
        if not result["success"]:
            logger.error(f"Document analysis failed: {result['error']}")
            return {"success": False, "error": result["error"], "results": None}
            
        logger.info("Document processing completed successfully")
        return {"success": True, "error": None, "results": result["results"]}
        
    except Exception as e:
        logger.error(f"Unexpected error in process_document: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {"success": False, "error": str(e), "results": None}
    finally:
        # Clean up temporary file if it was created
        if temp_file and os.path.exists(temp_file):
            try:
                logger.info(f"Cleaning up temporary file: {temp_file}")
                os.remove(temp_file)
            except Exception as e:
                logger.warning(f"Failed to clean up temporary file: {str(e)}")
                pass

if __name__ == "__main__":
    # Example file URL from Cloudinary
    file_url = "https://res.cloudinary.com/dvqkoleje/image/upload/v1741875116/EduMate/fcrikg6o5twe58iyqo7v.pdf"
    result = process_document(file_url)
    
    if result["success"]:
        for paper_result in result["results"]:
            print(f"Name: {paper_result['Name']}")
            print(f"Marks: {paper_result['marks']}")
            print(f"Remarks: {paper_result['remarks']}")
            print(f"Suggestions: {paper_result['suggestions']}")
            print(f"Errors: {paper_result['errors']}")
            print("-" * 50)
    else:
        print("Error:", result["error"])