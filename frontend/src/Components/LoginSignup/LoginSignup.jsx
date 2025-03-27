import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const LoginSignup = ({setUser}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: "", password: "" ,username:""});
  const navigate = useNavigate();

  const toggleForm = () => setIsLogin(!isLogin);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit =async (e) => {
    e.preventDefault();
    try {
      let result;
      if (isLogin) {
        result = await axios.post("http://localhost:8080/profile/login", {
          username: formData.username,
          password: formData.password,
        },{withCredentials:true});
        console.log(result.data.data._id)
        setUser(result.data.data._id)
        toast.success("Login successful! Welcome Back!!",{
          autoClose:2000
        })
      } else {
        result = await axios.post("http://localhost:8080/profile/signup", {
          username: formData.username,
          password: formData.password,
          email: formData.email,
        }, {
          headers: { "Content-Type": "application/json" },withCredentials:true
        });
        toast.success("Signup successful!",{autoClose:2000})
      }
  
      console.log(result.data);
      setFormData({ username: "", password: "", email: "" });
      setTimeout(()=>{
        navigate("/EduMate")
      },3000)
  
    } catch (err) {
      console.log(err.response?.data || err.message);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <ToastContainer position="top-right" autoClose={2000} />
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <h2 className="mb-4 text-gray-800 text-xl font-semibold">{isLogin ? "Login" : "Sign Up"}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col">
          <input
            type="username"
            name="username"
            placeholder="Enter your username"
            value={formData.username}
            onChange={handleChange}
            required
            className="p-2.5 my-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {isLogin?<></>:
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            required
            className="p-2.5 my-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />}

          <input
            type="password"
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            required
            className="p-2.5 my-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            type="submit"
            className="p-2.5 mt-2.5 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-700 transition-colors"
          >
            {isLogin ? "Login" : "Sign Up"}
          </button>
        </form>
        <p className="mt-2.5 text-sm">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <span 
            onClick={toggleForm}
            className="text-blue-500 cursor-pointer hover:underline"
          >
            {isLogin ? "Sign Up" : "Login"}
          </span>
        </p>
      </div>
    </div>
  );
};

export default LoginSignup;
