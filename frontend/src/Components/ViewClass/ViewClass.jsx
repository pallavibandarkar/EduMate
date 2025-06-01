import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import "react-toastify/dist/ReactToastify.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleUser } from '@fortawesome/free-solid-svg-icons';
// Import Lucide icons
import { Calendar, Clock, FileText, Users, Bell, BarChart2 } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ViewClass = ({user}) => {
    const navigate = useNavigate()
    const { id } = useParams();
    const [classData, setClassData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState({});
    const [uploading, setUploading] = useState({});
    const [assignmentDetails, setAssignmentDetails] = useState({ title: "", description: "", deadline: "", file: null });
    const [submissionData, setSubmissionData] = useState([]);
    const [activeTab, setActiveTab] = useState("assignments");
    const [announcementContent, setAnnouncementContent] = useState("");
    const [submissionStats, setSubmissionStats] = useState({});
    const [updatedScores, setUpdatedScores] = useState({});
    const [openAssignmentId, setOpenAssignmentId] = useState(null);

    useEffect(() => {
        const fetchClassDetails = async () => {
            try {
                const response = await axios.get(`http://localhost:8080/class/getClass/${id}`,{withCredentials:true});
                setClassData(response.data.class);
            } catch (err) {
                if (err.response && err.response.status === 401) {
                    navigate("/EduMate/login");
                } else {
                    setError("Failed to fetch class details.");
                    toast.error("Error fetching class details!");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchClassDetails();
    }, [id]);

    const handleAssignmentChange = (e) => {
        setAssignmentDetails({ ...assignmentDetails, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e, assignmentId) => {
        setSelectedFiles({ ...selectedFiles, [assignmentId]: e.target.files[0] });
    };

    const handleAnnouncementChange = (e) => {
        setAnnouncementContent(e.target.value);
    };

    const handleFileUpload = async (assignmentId) => {
        if (!selectedFiles[assignmentId]) return alert("Please select a file!");

        const formData = new FormData();
        formData.append("file", selectedFiles[assignmentId]);
        setUploading({ ...uploading, [assignmentId]: true });
        try {
            const response = await axios.post(`http://localhost:8080/class/grade-submission/${assignmentId}`, formData, {withCredentials:true},{
                headers: { "Content-Type": "multipart/form-data" ,}
            });
            toast.success("Assignment submitted successfully!");
        } catch (err) {
            toast.error("Failed to submit assignment.");
        } finally {
            setUploading({ ...uploading, [assignmentId]: false });
            setSelectedFiles({ ...selectedFiles, [assignmentId]: null });
        }
    };

    const handleAssignmentFileChange = (e) => {
        setAssignmentDetails({ ...assignmentDetails, file: e.target.files[0] });
    };

    const handleAssignmentUpload = async () => {
        if (!assignmentDetails.title || !assignmentDetails.description || !assignmentDetails.deadline || !assignmentDetails.file) {
            return alert("Please fill all fields and upload a file!");
        }

        const formData = new FormData();
        formData.append("file", assignmentDetails.file);
        formData.append("title", assignmentDetails.title);
        formData.append("description", assignmentDetails.description);
        formData.append("deadline", assignmentDetails.deadline);

        try {
            const response = await axios.post(`http://localhost:8080/class/uploadAss/${id}`, formData, { withCredentials: true, headers: { "Content-Type": "multipart/form-data" } });
            setAssignmentDetails({ title: "", description: "", deadline: "", file: null })
            toast.success("Assignment uploaded successfully!");
        } catch (err) {
            toast.error("Failed to upload assignment.");
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === "review") {
            fetchSubmissionData();
            const submissionStats = getSubmissionStats();
        }

    };

    const handleAnnouncementSubmit = async () => {
        if (!announcementContent) {
            return alert("Please enter announcement content!");
        }

        try {
            const response = await axios.post(`http://localhost:8080/announcement/${classData._id}`, { content: announcementContent }, { withCredentials: true });
            toast.success("Announcement created successfully!");
            setAnnouncementContent("");
            await getAnnouncement()
        } catch (err) {
            toast.error("Failed to create announcement.");
        }
    };

    const getAnnouncement = async()=>{
        try {
            const response = await axios.get(`http://localhost:8080/announcement/${classData._id}`, { withCredentials: true });
            setClassData(prevData => ({ ...prevData, announcements: response.data.data })); 
        } catch (err) {
            toast.error("Failed to fetch announcements.");
        }
    }

    const fetchSubmissionData = async () => {
        try {
            const response = await axios.get(`http://localhost:8080/class/submissions/${classData._id}`, { withCredentials: true });
            setSubmissionData(response.data.submissions);
        } catch (err) {
            toast.error("Failed to fetch submission data.");
        }
        
    };

    
    const getSubmissionStats = () => {
    if (!classData || !classData.assignments) return {};

    const stats = {};
    classData.assignments.forEach(assignment => {
        stats[assignment._id] = {
            title: assignment.title,
            beforeDeadline: 0,
            afterDeadline: 0,
            totalSubmissions: 0,
        };
    });
    submissionData.forEach(submission => {
        const assignmentId = submission.assignmentId._id; 
        const submissionDate = new Date(submission.submittedOn);
        const deadline = new Date(submission.assignmentId.deadline); 

        if (stats[assignmentId]) {
            stats[assignmentId].totalSubmissions += 1;
            if (submissionDate <= deadline) {
                stats[assignmentId].beforeDeadline += 1;
            } else {
                stats[assignmentId].afterDeadline += 1;
            }
        } else {
        }
    });
    return stats;
};
    useEffect(() => {
        if (activeTab === "review") {
            fetchSubmissionData().then(() => {
                const stats = getSubmissionStats();
                setSubmissionStats(stats);
            });
        }
    }, [activeTab,submissionData]);

    const barData = {
        labels: Object.values(submissionStats).map(stat => stat.title),
        datasets: [
            {
                label: 'Submitted Before Deadline',
                data: Object.values(submissionStats).map(stat => stat.beforeDeadline),
                backgroundColor: '#28A745', // Green
            },
            {
                label: 'Submitted After Deadline',
                data: Object.values(submissionStats).map(stat => stat.afterDeadline),
                backgroundColor: '#DC3545', // Red
            },
        ],
    };

     const handleScoreChange = (submissionId, newScore) => {
        setUpdatedScores((prevScores) => ({
            ...prevScores,
            [submissionId]: newScore,
        }));
    };

    const handleUpdateScore = async (submissionId) => {
        const updatedScore = updatedScores[submissionId];
        if (updatedScore === undefined) {
            return alert("Please enter a new score.");
        }
        
        try {
            const response = await axios.put(`http://localhost:8080/class/updateScore/${submissionId}`, { score: updatedScore }, { withCredentials: true });
            toast.success("Score updated successfully!");
            fetchSubmissionData(); 
            
        } catch (err) {
            console.log(err)
            toast.error("Failed to update score.");
        }
    };

    // Group submissions by assignmentId._id
const submissionsByAssignment = submissionData.reduce((acc, submission) => {
  const assignmentId = submission.assignmentId._id;
  if (!acc[assignmentId]) {
    acc[assignmentId] = {
      assignment: submission.assignmentId,
      submissions: []
    };
  }
  acc[assignmentId].submissions.push(submission);
  return acc;
}, {});

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
        </div>
    );
    
    if (error) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="bg-red-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-red-800 font-semibold text-lg">Error</h3>
                <p className="text-red-600 mt-2">{error}</p>
            </div>
        </div>
    );

    const TabButton = ({ icon: Icon, label, tab }) => (
        <button
            onClick={() => handleTabChange(tab)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-200
                ${activeTab === tab 
                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:bg-gray-50'}`}
        >
            <Icon size={20} className={activeTab === tab ? 'text-indigo-600' : 'text-gray-500'} />
            <span className="font-medium">{label}</span>
        </button>
    );

    

    return (
        <div className="max-w-7xl mx-auto px-4 mt-[40px]">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 mb-8 text-white shadow-lg">
                <h1 className="text-3xl font-bold mb-2">{classData.className}</h1>
                <p className="text-blue-100">Division {classData.div}</p>
            </div>

            {/* Navigation */}
            <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                <TabButton icon={FileText} label="Assignments" tab="assignments" />
                <TabButton icon={Bell} label="Announcements" tab="announcements" />
                <TabButton icon={Users} label="People" tab="students" />
                <TabButton icon={BarChart2} label="Analytics" tab="review" />
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                {/* Assignment tab content */}
                {user && classData.classTeacher && user._id && user._id.toString() === classData.classTeacher._id.toString() && activeTab === "assignments" && (
                    <div className="bg-blue-50 p-6 rounded-lg shadow-md w-full mb-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Upload Assignment</h3>
                        <input 
                            type="text" 
                            name="title" 
                            placeholder="Title" 
                            className="w-full p-3 border border-blue-300 rounded-md mb-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                            value={assignmentDetails.title} 
                            onChange={handleAssignmentChange} 
                        />
                        <textarea 
                            name="description" 
                            placeholder="Description" 
                            className="w-full p-3 border border-blue-300 rounded-md mb-3 h-24 resize-none outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                            value={assignmentDetails.description} 
                            onChange={handleAssignmentChange}
                        ></textarea>
                        <input 
                            type="date" 
                            name="deadline" 
                            className="w-full p-3 border border-blue-300 rounded-md mb-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                            value={assignmentDetails.deadline} 
                            onChange={handleAssignmentChange} 
                        />
                        <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assignment File</label>
                            <input 
                                type="file" 
                                className="w-full p-2 border border-blue-300 rounded-md bg-white" 
                                onChange={handleAssignmentFileChange} 
                            />
                        </div>
                        <button 
                            className="w-full bg-blue-600 text-white p-3 rounded-md text-base font-medium cursor-pointer transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50" 
                            onClick={handleAssignmentUpload}
                        >
                            Upload Assignment
                        </button>
                    </div>
                )}

                {activeTab === "assignments" && (
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">Assignments</h3>
                        {classData.assignments.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {classData.assignments.map((assignment) => {
                                    // The user is a complete object, we need to compare with user._id
                                    const isStudent = classData.students.some(student => {
                                        // Handle both cases: when student is an object or just an ID string
                                        const studentId = typeof student === 'object' ? student._id : student;
                                        return studentId.toString() === user._id.toString();
                                    });
                                    
                                    const studentSubmission = isStudent && assignment.submissions?.find(sub => {
                                        const submissionStudentId = typeof sub.studentId === "object" ? 
                                            sub.studentId._id : sub.studentId;
                                        return submissionStudentId.toString() === user._id.toString();
                                    });
                                    
                                    return (
                                        <div className="bg-gray-50 p-5 rounded-lg shadow-md transition-all duration-300 hover:shadow-lg" key={assignment._id}>
                                            {/* ...existing assignment display code... */}
                                            <h4 className="mb-2 text-lg font-semibold text-gray-800">{assignment.title}</h4>
                                            <p className="text-gray-600 mb-3">{assignment.description}</p>
                                            <div className="flex items-center text-sm text-gray-500 mb-3">
                                                <Calendar size={16} className="mr-1" />
                                                <span>Deadline: {new Date(assignment.deadline).toLocaleDateString()}</span>
                                            </div>
                                            <a 
                                                href={assignment.file.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className=" mb-4 text-blue-600 flex items-center hover:text-blue-800"
                                            >
                                                <FileText size={16} className="mr-1" />
                                                <span>View Assignment File</span>
                                            </a>
                                        
                                            {isStudent && !studentSubmission && (
                                                <div className="mt-3 border-t pt-3 border-gray-200">
                                                    <input
                                                        type="file"
                                                        onChange={(e) => handleFileChange(e, assignment._id)}
                                                        className="mb-3 p-2 border border-gray-300 rounded-md w-full bg-white"
                                                    />
                                                    <button 
                                                        onClick={() => handleFileUpload(assignment._id)} 
                                                        disabled={uploading[assignment._id]}
                                                        className={`w-full py-2 px-4 rounded-md font-medium transition-all duration-200 ${uploading[assignment._id] ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                                    >
                                                        {uploading[assignment._id] ? "Uploading..." : "Submit Assignment"}
                                                    </button>
                                                </div>
                                            )}

                                            {isStudent && studentSubmission && (
                                                <button 
                                                    onClick={() => navigate(`/grading/${studentSubmission._id}`)}
                                                    className="w-full mt-3 py-2 px-4 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors"
                                                >
                                                    View Gradings
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-gray-500 italic">No assignments uploaded for this class</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "announcements" && (
                    <div>
                        {user && classData.classTeacher && user._id && user._id.toString() === classData.classTeacher._id.toString() && (
                            <div className="bg-blue-50 p-6 rounded-lg shadow-md mb-6">
                                <h3 className="text-xl font-bold text-gray-800 mb-4">Create Announcement</h3>
                                <textarea 
                                    value={announcementContent} 
                                    onChange={handleAnnouncementChange} 
                                    placeholder="Enter announcement content"
                                    className="w-full p-3 border border-blue-300 rounded-md mb-3 h-32 resize-none outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                                />
                                <button 
                                    onClick={handleAnnouncementSubmit}
                                    className="w-full bg-blue-600 text-white p-3 rounded-md text-base font-medium cursor-pointer transition-colors hover:bg-blue-700"
                                >
                                    Post Announcement
                                </button>
                            </div>
                        )}
                        
                        <h3 className="text-2xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">Announcements</h3>
                        
                        {classData.announcements && classData.announcements.length > 0 ? (
                            <div className="space-y-4">
                                {classData.announcements.map((announcement) => (
                                    <div key={announcement._id} className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md">
                                        <p className="text-gray-800 mb-3">{announcement.content}</p>
                                        <div className="flex items-center text-sm text-gray-500">
                                            <Clock size={14} className="mr-1" />
                                            <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-gray-500 italic">No announcements available.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "students" && (
                    <div>
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">Teacher</h3>
                            <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                                <FontAwesomeIcon icon={faCircleUser} className="text-blue-600 text-xl mr-3"/>
                                <span className="text-gray-800 font-medium">{classData.classTeacher.username}</span>
                            </div>
                        </div>
                        
                        <h3 className="text-2xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">Students</h3>
                        
                        {classData.students.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {classData.students.map((student) => (
                                    <div key={student._id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                                        <FontAwesomeIcon icon={faCircleUser} className="text-gray-600 text-xl mr-3"/>
                                        <span className="text-gray-800">{student.username}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-gray-500 italic">No students enrolled in this class.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "review" && (
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">Submission Analytics</h3>
                        
                        <div className="bg-gray-50 p-6 rounded-lg shadow-md">
                            {Object.keys(submissionStats).length > 0 ? (
                                <Bar 
                                    data={barData} 
                                    options={{ 
                                        responsive: true,
                                        plugins: {
                                            legend: {
                                                position: 'top',
                                            },
                                            title: {
                                                display: true,
                                                text: 'Assignment Submission Statistics'
                                            }
                                        }
                                    }} 
                                />
                            ) : (
                                <p className="text-center py-6 text-gray-500 italic">No submission data available</p>
                            )}
                        </div>

                    
                </div>
                )}

                {activeTab === "review" && (
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">Submissions by Assignment</h3>
                        {Object.values(submissionsByAssignment).map(({ assignment, submissions }) => (
  <div key={assignment._id} className="mb-6 border rounded-lg shadow">
    <button
      className="w-full text-left px-6 py-4 bg-blue-50 hover:bg-blue-100 font-semibold text-blue-700 text-lg rounded-t-lg transition"
      onClick={() => setOpenAssignmentId(openAssignmentId === assignment._id ? null : assignment._id)}
    >
      Assignment Title : {assignment.title}
    </button>
    {openAssignmentId === assignment._id && (
      <div className="overflow-x-auto p-4 bg-white rounded-b-lg">
        <table className="min-w-full bg-white rounded-lg shadow overflow-hidden">
          <thead>
            <tr className="bg-blue-100 text-blue-800">
              <th className="py-3 px-4 text-left font-semibold">Student</th>
              <th className="py-3 px-4 text-left font-semibold">Submission</th>
              <th className="py-3 px-4 text-left font-semibold">Assignment File</th>
              <th className="py-3 px-4 text-left font-semibold">Assignment Solution</th>
              <th className="py-3 px-4 text-left font-semibold">Score</th>
              <th className="py-3 px-4 text-left font-semibold">Update Score</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission, index) => (
              <tr
                key={submission._id}
                className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
              >
                <td className="py-3 px-4">{submission.studentId.username}</td>
                <td className="py-3 px-4">
                  {new Date(submission.submittedOn) <= new Date(assignment.deadline)
                    ? <span className="text-green-600 font-medium">Before Deadline</span>
                    : <span className="text-red-600 font-medium">After Deadline</span>
                  }
                </td>
                <td className="py-3 px-4">
                  <a
                    href={assignment.file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View Assignment
                  </a>
                </td>
                <td className="py-3 px-4">
                  <a
                    href={submission.file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View Solution
                  </a>
                </td>
                <td className="py-3 px-4 font-semibold text-center">{submission.aiGrade.score}</td>
                <td className="py-3 px-4 flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="New Score"
                    className="border border-gray-300 rounded px-2 py-1 w-20 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    onChange={(e) => handleScoreChange(submission._id, e.target.value)}
                  />
                  <button
                    onClick={() => handleUpdateScore(submission._id)}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                  >
                    Update
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
))}
                    </div>
                )}
            </div>



            <ToastContainer 
                position="bottom-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
            />
        </div>
    );
};

export default ViewClass;
