import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const GradingReport = () => {
    let { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const gradingData = async () => {
        try {
            const result = await axios.get(`http://localhost:8080/class/getGrading/${id}`, { withCredentials: true });
            setData(result.data?.data || {});
        } catch (err) {
            setError("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        gradingData();
    }, []);

    if (loading) return <p className="text-lg text-blue-500 italic">Loading...</p>;
    if (error) return <p className="text-lg text-red-600 font-bold">{error}</p>;
    if (!data) return <p className="text-lg text-gray-500">No grading data found.</p>;

    // Function to split text at ".," and create separate list items
    const splitText = (textArray) => {
        return textArray?.flatMap(text => text.split(".,").map(item => item.trim())).filter(item => item);
    };

    return (
        <div className="w-4/5 bg-white p-5 rounded-xl shadow-md text-center transition-all duration-300 ease-in-out mx-auto mt-24 hover:shadow-lg md:w-4/5 sm:w-11/12">
            <h2 className="text-2xl text-gray-800 mb-4">Grading Report</h2>
            <div className="bg-blue-50 p-4 rounded-lg text-lg font-bold text-blue-600 mb-4">
                <h3>Score: {data.score}/100</h3>
            </div>
            <div className="bg-orange-50 p-4 mt-3 rounded-lg text-left">
                <h3 className="text-orange-700">Remarks:</h3>
                <ul className="list-disc pl-5 text-gray-600">
                    {splitText(data.remarks)?.map((remark, index) => (
                        <li key={index} className="text-base mb-1.5 leading-relaxed">{remark}</li>
                    ))}
                </ul>
            </div>
            <div className="bg-green-50 p-4 mt-3 rounded-lg text-left">
                <h3 className="text-green-700">Suggestions:</h3>
                <ul className="list-disc pl-5 text-gray-600">
                    {splitText(data.suggestions)?.map((suggestion, index) => (
                        <li key={index} className="text-base mb-1.5 leading-relaxed">{suggestion}</li>
                    ))}
                </ul>
            </div>
            <div className="bg-red-50 p-4 mt-3 rounded-lg text-left">
                <h3 className="text-red-700">Errors:</h3>
                <ul className="list-disc pl-5 text-gray-600">
                    {splitText(data.errors)?.map((error, index) => (
                        <li key={index} className="text-base mb-1.5 leading-relaxed">{error}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default GradingReport;
