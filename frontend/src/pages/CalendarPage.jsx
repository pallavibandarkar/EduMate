import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Plus, FileText } from 'lucide-react';
import axios from 'axios';

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([
    { id: 1, title: 'Team Meeting', date: new Date(2023, new Date().getMonth(), 15), time: '10:00 AM', type: 'meeting' },
    { id: 2, title: 'Project Deadline', date: new Date(2023, new Date().getMonth(), 22), time: '6:00 PM', type: 'deadline' },
    { id: 3, title: 'Workshop', date: new Date(2023, new Date().getMonth(), 10), time: '2:00 PM', type: 'workshop' },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  // Fetch assignments from all classes
  const fetchAssignments = async () => {
    setLoading(true);
    try {
      // First get all classes the user is in - changed endpoint from getAllClasses to getClasses
      const classResponse = await axios.get("http://localhost:8080/class/getClasses", { withCredentials: true });
      
      if (classResponse.data.classes) {
        const allAssignments = [];
        
        // Loop through each class to get assignments
        for (const classItem of classResponse.data.classes) {
          // Get detailed class info with assignments
          const classDetailResponse = await axios.get(`http://localhost:8080/class/getClass/${classItem._id}`, { withCredentials: true });
          
          if (classDetailResponse.data.class && classDetailResponse.data.class.assignments) {
            // Map assignments to calendar events
            const assignmentEvents = classDetailResponse.data.class.assignments.map(assignment => ({
              id: `assignment-${assignment._id}`,
              title: `${assignment.title} - ${classDetailResponse.data.class.className}`,
              date: new Date(assignment.deadline),
              time: new Date(assignment.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: 'assignment', // New type for assignments
              description: assignment.description,
              classId: classItem._id,
              className: classDetailResponse.data.class.className
            }));
            
            allAssignments.push(...assignmentEvents);
          }
        }
        
        // Add assignment events to existing events
        setEvents(prevEvents => {
          const currentEvents = [...prevEvents];
          // Filter out any existing assignment events (to avoid duplicates on refresh)
          const filteredEvents = currentEvents.filter(event => event.type !== 'assignment');
          return [...filteredEvents, ...allAssignments];
        });
      }
    } catch (error) {
      console.error("Error fetching assignments for calendar:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get the first day of the month
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = firstDayOfMonth.getDay();
  // Get the number of days in the month
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

  // Generate calendar days including padding for the first week
  const days = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null); // Padding for days before the first day of the month
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Get events for the selected date
  const getEventsForDate = (date) => {
    if (!date) return [];
    return events.filter(event => 
      event.date.getDate() === date && 
      event.date.getMonth() === currentDate.getMonth() && 
      event.date.getFullYear() === currentDate.getFullYear()
    );
  };

  // Navigate to previous month
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Navigate to next month
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Format month and year
  const formatMonthYear = () => {
    return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // New helper function to get color styling by event type
  const getEventTypeColor = (type) => {
    switch (type) {
      case 'meeting':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'deadline':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'workshop':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'assignment':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get icon based on event type
  const getEventTypeIcon = (type) => {
    switch (type) {
      case 'assignment':
        return <FileText size={14} className="mr-1" />;
      case 'meeting':
        return <Clock size={14} className="mr-1" />;
      default:
        return <Clock size={14} className="mr-1" />;
    }
  };

  // New helper function to determine if a day is today
  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
        <div className="flex items-center gap-3">
          {loading && <span className="text-gray-500">Loading assignments...</span>}
          <button 
            onClick={fetchAssignments} 
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <span>Refresh</span>
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        {/* Calendar header */}
        <div className="flex justify-between items-center p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <button 
            onClick={prevMonth}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-2xl font-semibold">{formatMonthYear()}</h2>
          <button 
            onClick={nextMonth}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>
        
        {/* Days of week */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-4 text-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {days.map((day, index) => {
            const hasEvents = day && getEventsForDate(day).length > 0;
            const isSelected = selectedDate === day;
            const todayClass = isToday(day) ? 'ring-2 ring-blue-500 ring-offset-2' : '';
            
            return (
              <div 
                key={index} 
                className={`min-h-[120px] p-3 border-r border-b border-gray-100 last:border-r-0 ${day ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-50'} ${isSelected ? 'bg-blue-50' : ''}`}
                onClick={() => day && setSelectedDate(day)}
              >
                {day && (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${isToday(day) ? 'bg-blue-600 text-white' : 'text-gray-700'} font-medium`}>
                        {day}
                      </span>
                      {hasEvents && (
                        <span className="flex gap-0.5">
                          {[...Array(Math.min(3, getEventsForDate(day).length))].map((_, i) => (
                            <span key={i} className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                          ))}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {getEventsForDate(day).slice(0, 2).map(event => (
                        <div 
                          key={event.id} 
                          className={`text-xs p-1.5 rounded-md border ${getEventTypeColor(event.type)} truncate`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {getEventsForDate(day).length > 2 && (
                        <div className="text-xs text-gray-500 pl-1">
                          +{getEventsForDate(day).length - 2} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Event details section */}
      {selectedDate && (
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              Events for {currentDate.toLocaleString('default', { month: 'long' })} {selectedDate}
            </h3>
            <button className="text-blue-600 hover:text-blue-700 transition-colors">
              <Plus size={20} />
            </button>
          </div>
          
          {getEventsForDate(selectedDate).length > 0 ? (
            <div className="space-y-4">
              {getEventsForDate(selectedDate).map(event => (
                <div key={event.id} className={`p-4 rounded-lg border ${getEventTypeColor(event.type)}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{event.title}</h4>
                      {event.description && (
                        <p className="text-sm mt-1 text-gray-600">{event.description}</p>
                      )}
                      {event.className && (
                        <div className="mt-1 text-xs font-medium text-gray-500">
                          {event.className}
                        </div>
                      )}
                    </div>
                    <span className="flex items-center text-sm gap-1">
                      {getEventTypeIcon(event.type)}
                      {event.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">No events scheduled for this day</p>
              <button className="text-blue-600 hover:text-blue-700 transition-colors">
                Add your first event
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
