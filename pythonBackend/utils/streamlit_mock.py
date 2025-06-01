"""
Provides mock implementations of streamlit functions for environments 
where streamlit is not installed or not being used.
"""

# Create a simple class that mimics the behavior of streamlit
class StreamlitMock:
    def __init__(self):
        pass
        
    def success(self, text):
        print(f"✅ SUCCESS: {text}")
        
    def error(self, text):
        print(f"🔴 ERROR: {text}")
        
    def warning(self, text):
        print(f"⚠️ WARNING: {text}")
        
    def info(self, text):
        print(f"ℹ️ INFO: {text}")
        
    def write(self, text):
        print(f"WRITE: {text}")
        
    def spinner(self, text):
        # Create a context manager that doesn't actually do anything
        class SpinnerContextManager:
            def __init__(self, text):
                self.text = text
                
            def __enter__(self):
                print(f"🔄 {self.text}")
                return self
                
            def __exit__(self, exc_type, exc_val, exc_tb):
                pass
                
        return SpinnerContextManager(text)

# Create a singleton instance
st = StreamlitMock()
