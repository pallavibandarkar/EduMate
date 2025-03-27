import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const JoinClass = () => {
    const [classCode, setClassCode] = useState("");
    const navigate = useNavigate()
    const handleJoinClass = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(
                "http://localhost:8080/class/join",
                { classCode },
                { withCredentials: true } 
            );
            toast.success("Successfully joined the class!");
            setClassCode("");
            setTimeout(()=>{
                navigate("/EduMate")
            },3000)
        } catch (error) {
            console.log(error)
            toast.error(error.response?.data?.error || "Failed to join class.");
            console.log(error.response?.data?.error || "Failed to join class.");
        }
    };

    return (
        <>
        <div className="w-4/5 bg-white p-5 rounded-xl shadow-md text-center mx-auto mt-24 hover:shadow-lg transition-all duration-300 ease-in-out md:w-3/5 sm:w-11/12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Join a Class</h2>
            <form onSubmit={handleJoinClass} className="flex flex-col gap-4">
                <input
                    type="text"
                    placeholder="Enter Class Code"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value)}
                    required
                    className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                />
                <button type="submit" className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition-colors font-medium">Join Class</button>
            </form>
        </div>
         <ToastContainer position="top-right" autoClose={3000} />
         </>
    );
};

export default JoinClass;
