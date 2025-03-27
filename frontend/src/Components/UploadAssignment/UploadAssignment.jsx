import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";

const UploadAssignment = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [classId, setClassId] = useState("");
    const [classes, setClasses] = useState([]);
    const [assignment, setAssignment] = useState({
        title: "",
        description: "",
        deadline: "",
    });
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Get classId from state if available
        if (location.state && location.state.classId) {
            setClassId(location.state.classId);
        }
        
        // Fetch available classes
        const fetchClasses = async () => {
            try {
                const result = await axios.get("http://localhost:8080/class/getClasses", {
                    withCredentials: true,
                });
                setClasses(result.data.classes);
            } catch (err) {
                toast.error("Failed to fetch classes.");
            }
        };
        
        fetchClasses();
    }, [location]);

    const handleChange = (e) => {
        setAssignment({ ...assignment, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!classId) {
            toast.error("Please select a class");
            return;
        }

        const formData = new FormData();
        formData.append("title", assignment.title);
        formData.append("description", assignment.description);
        formData.append("deadline", assignment.deadline);
        formData.append("file", file);

        setLoading(true);
        try {
            const response = await axios.post(`http://localhost:8080/class/uploadAss/${classId}`, formData, {
                withCredentials: true,
                headers: { "Content-Type": "multipart/form-data" },
            });
            toast.success("Assignment uploaded successfully!");
            setAssignment({ title: "", description: "", deadline: "" });
            setFile(null);
            
            // Redirect to view class page after successful upload
            setTimeout(() => {
                navigate(`/EduMate/viewClass/${classId}`);
            }, 2000);
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to upload assignment.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto my-8 p-8 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">Upload Assignment</h2>
            <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
                {!location.state?.classId && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Class</label>
                        <select 
                            value={classId} 
                            onChange={(e) => setClassId(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            required
                        >
                            <option value="">Select a class</option>
                            {classes.map(cls => (
                                <option key={cls._id} value={cls._id}>
                                    {cls.className} - {cls.div}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input 
                        type="text" 
                        name="title" 
                        placeholder="Assignment Title" 
                        value={assignment.title} 
                        onChange={handleChange} 
                        required 
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea 
                        name="description" 
                        placeholder="Assignment Description" 
                        value={assignment.description} 
                        onChange={handleChange} 
                        required 
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 min-h-[120px] resize-y text-base"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                    <input 
                        type="date" 
                        name="deadline" 
                        value={assignment.deadline} 
                        onChange={handleChange} 
                        required 
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assignment File</label>
                    <input 
                        type="file" 
                        name="file" 
                        onChange={handleFileChange} 
                        required 
                        className="w-full p-3 text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 bg-gray-50 rounded-md"
                    />
                </div>
                
                <button 
                    type="submit" 
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={loading}
                >
                    {loading ? "Uploading..." : "Upload Assignment"}
                </button>
                
                <button 
                    type="button"
                    onClick={() => navigate(-1)}
                    className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md shadow-sm transition-colors"
                >
                    Cancel
                </button>
            </form>
            <ToastContainer position="top-right" autoClose={3000} />
        </div>
    );
};

export default UploadAssignment;
