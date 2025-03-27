import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const CreateClass = () => {
//   const [className, setClassName] = useState("");
//   const [div, setDiv] = useState("");
const navigate = useNavigate()
const [data,setData] = useState({
    className : "",
    div : ""
})

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await axios.post("http://localhost:8080/class/create",{
        className:data.className,
        div: data.div
      },{withCredentials:true})
      console.log(result)
      toast.success("Class created successfully!");
      setData({
        className:"",
        div:"",
      })
      navigate("/EduMate",1500)
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create class.");
      navigate("/EduMate")
    }
  };

  return (
    <div className="flex mt-20">
      <div className="flex-grow p-2.5 overflow-y-auto bg-white rounded-lg m-2.5">
        <div className="max-w-md mx-auto bg-gray-100 rounded-lg p-6 shadow-md">
          <h2 className="text-2xl font-semibold text-center mb-6">Create a New Class</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Class Name"
              value={data.className}
              name="className"
              onChange={(e) => setData({ ...data, [e.target.name]: e.target.value })}
              required
              className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Division (Optional)"
              value={data.div}
              name="div"
              onChange={(e) => setData({ ...data, [e.target.name]: e.target.value })}
              className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              type="submit" 
              className="py-2 px-3 bg-blue-500 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Create Class
            </button>
          </form>
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default CreateClass;
