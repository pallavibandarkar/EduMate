import time
import functools
import statistics
from typing import Dict, List, Any, Callable
import threading
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='performance.log'
)
logger = logging.getLogger("performance_monitor")

class PerformanceMonitor:
    def __init__(self):
        self.metrics = {
            "api_response_times": {},  # Endpoint -> list of response times
            "db_operation_times": {},  # Operation -> list of times
            "vector_store_times": {},  # Operation -> list of times
            "llm_api_calls": {         # API name -> count and total time
                "count": 0,
                "total_time": 0,
                "times": []
            },
            "active_requests": 0,
            "peak_concurrent_requests": 0,
            "memory_usage": []
        }
        self.lock = threading.Lock()
        
    def track_api_call(self, endpoint: str, time_taken: float):
        """Track API endpoint response time"""
        with self.lock:
            if endpoint not in self.metrics["api_response_times"]:
                self.metrics["api_response_times"][endpoint] = []
            self.metrics["api_response_times"][endpoint].append(time_taken)
            
            # Log slow API calls (over 3 seconds)
            if time_taken > 3.0:
                logger.warning(f"Slow API call to {endpoint}: {time_taken:.2f}s")
    
    def track_llm_call(self, time_taken: float):
        """Track LLM API call time"""
        with self.lock:
            self.metrics["llm_api_calls"]["count"] += 1
            self.metrics["llm_api_calls"]["total_time"] += time_taken
            self.metrics["llm_api_calls"]["times"].append(time_taken)
            
            # Log slow LLM calls (over 2 seconds)
            if time_taken > 2.0:
                logger.warning(f"Slow LLM API call: {time_taken:.2f}s")
    
    def track_vector_store_operation(self, operation: str, time_taken: float):
        """Track vector store operation time"""
        with self.lock:
            if operation not in self.metrics["vector_store_times"]:
                self.metrics["vector_store_times"][operation] = []
            self.metrics["vector_store_times"][operation].append(time_taken)
            
            # Log slow vector store operations
            if time_taken > 1.0:
                logger.warning(f"Slow vector store {operation}: {time_taken:.2f}s")
    
    def track_db_operation(self, operation: str, time_taken: float):
        """Track database operation time"""
        with self.lock:
            if operation not in self.metrics["db_operation_times"]:
                self.metrics["db_operation_times"][operation] = []
            self.metrics["db_operation_times"][operation].append(time_taken)
            
            # Log slow database operations
            if time_taken > 0.5:
                logger.warning(f"Slow DB {operation}: {time_taken:.2f}s")
    
    def request_started(self):
        """Track an active request"""
        with self.lock:
            self.metrics["active_requests"] += 1
            self.metrics["peak_concurrent_requests"] = max(
                self.metrics["peak_concurrent_requests"], 
                self.metrics["active_requests"]
            )
    
    def request_ended(self):
        """Track request completion"""
        with self.lock:
            self.metrics["active_requests"] = max(0, self.metrics["active_requests"] - 1)
    
    def get_summary(self) -> Dict[str, Any]:
        """Get a summary of performance metrics"""
        with self.lock:
            summary = {
                "api_response_times": {},
                "llm_api_calls": {
                    "count": self.metrics["llm_api_calls"]["count"],
                    "avg_time": 0
                },
                "vector_store_operations": {},
                "db_operations": {},
                "current_active_requests": self.metrics["active_requests"],
                "peak_concurrent_requests": self.metrics["peak_concurrent_requests"]
            }
            
            # Calculate API response time statistics
            for endpoint, times in self.metrics["api_response_times"].items():
                if times:
                    summary["api_response_times"][endpoint] = {
                        "avg": statistics.mean(times[-100:]),  # Last 100 calls
                        "p95": sorted(times[-100:])[min(len(times[-100:]) - 1, int(len(times[-100:]) * 0.95))],
                        "max": max(times[-100:]),
                        "count": len(times)
                    }
            
            # Calculate LLM API call statistics
            times = self.metrics["llm_api_calls"]["times"]
            if times:
                summary["llm_api_calls"]["avg_time"] = statistics.mean(times[-100:])
                summary["llm_api_calls"]["p95"] = sorted(times[-100:])[min(len(times[-100:]) - 1, int(len(times[-100:]) * 0.95))]
            
            # Calculate vector store statistics
            for operation, times in self.metrics["vector_store_times"].items():
                if times:
                    summary["vector_store_operations"][operation] = {
                        "avg": statistics.mean(times[-100:]),
                        "max": max(times[-100:]),
                        "count": len(times)
                    }
            
            # Calculate DB operation statistics
            for operation, times in self.metrics["db_operation_times"].items():
                if times:
                    summary["db_operations"][operation] = {
                        "avg": statistics.mean(times[-100:]),
                        "max": max(times[-100:]),
                        "count": len(times)
                    }
                    
            return summary

# Create singleton instance
performance_monitor = PerformanceMonitor()

# Decorator for tracking API endpoint performance
def track_endpoint_performance(endpoint_name: str = None):
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            endpoint = endpoint_name or func.__name__
            start_time = time.time()
            performance_monitor.request_started()
            
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                elapsed = time.time() - start_time
                performance_monitor.track_api_call(endpoint, elapsed)
                performance_monitor.request_ended()
                
        return wrapper
    return decorator

# Decorator for tracking LLM API call performance
def track_llm_performance(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        elapsed = time.time() - start_time
        performance_monitor.track_llm_call(elapsed)
        return result
    return wrapper

# Decorator for tracking vector store operations
def track_vector_store(operation: str):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            result = func(*args, **kwargs)
            elapsed = time.time() - start_time
            performance_monitor.track_vector_store_operation(operation, elapsed)
            return result
        return wrapper
    return decorator

# Decorator for tracking database operations
def track_db_operation(operation: str):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            result = func(*args, **kwargs)
            elapsed = time.time() - start_time
            performance_monitor.track_db_operation(operation, elapsed)
            return result
        return wrapper
    return decorator
