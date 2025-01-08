import React, { useState } from "react";
import { FaBell, FaArrowLeft, FaUser, FaHistory, FaCheckCircle, FaTimesCircle, FaExclamationCircle } from "react-icons/fa";
import { toast } from "react-hot-toast";

const Notifications = () => {
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Document Accepted", description: "Your Document was Accepted By CM.", time: "5 minutes ago", type: "accepted", read: false },
    { id: 2, title: "Document Rejected", description: "Your Document was Rejected By CM.", time: "1 hour ago", type: "rejected", read: false },
    { id: 3, title: "Correction Spotted", description: "Document has Correction.", time: "3 hours ago", type: "correction", read: false },
  ]);

  const handleMarkAsRead = (id) => {
    setNotifications((prevNotifications) =>
      prevNotifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
    toast.success("Notification marked as read!", {
      position: "top-right",
      duration: 3000,
    });
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "accepted":
        return "bg-green-200 text-green-600";
      case "rejected":
        return "bg-red-200 text-red-600";
      case "correction":
        return "bg-yellow-200 text-white";
      default:
        return "bg-blue-50 text-blue-600";
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "accepted":
        return <FaCheckCircle size={20} />;
      case "rejected":
        return <FaTimesCircle size={20} />;
      case "correction":
        return <FaExclamationCircle size={20} />;
      default:
        return <FaBell size={20} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-r from-white to-blue-100">
      {/* Navbar */}
      <div className="flex justify-between items-center bg-white shadow-md px-6 py-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">NOTIFICATIONS</h1>
        <div className="flex gap-4 items-center">
          <button className="text-gray-500 flex gap-4  transition-colors duration-300">
            <FaHistory size={24} className="hover:text-gray-700" />
            <FaUser size={24} className="hover:text-gray-700"  />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center flex-grow">
        <div className="w-96 bg-white shadow-lg border border-gray-200 rounded-lg p-8">
          {/* Back Button */}
          <button className="text-blue-600 hover:text-blue-800 mb-6 flex items-center transition-colors duration-300">
            <FaArrowLeft size={24} className="mr-2" />
          </button>

          {/* Notifications List */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Your Notifications</h2>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex justify-between items-center p-4 mb-4 rounded-lg ${getNotificationColor(notification.type)} transition-all`}
              >
                <div className="flex items-center gap-4">
                  {getNotificationIcon(notification.type)}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{notification.title}</h3>
                    <p className="text-sm text-zinc-900">{notification.description}</p>
                    <span className="text-xs font-semibold text-zinc-900">{notification.time}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleMarkAsRead(notification.id)}
                  className="text-blue-600 hover:text-blue-800 w-20 font-semibold transition-colors duration-300"
                >
                  {notification.read ? "Read" : "Mark as Read"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
