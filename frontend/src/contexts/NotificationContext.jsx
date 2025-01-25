import React, { createContext, useState, useContext } from "react";
import axios from "axios";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [fcmToken, setFcmToken] = useState("");
  const fetchNotifications = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/notification/get-notifications`,
        { withCredentials: true }
      );
      console.log("Notifications fetched:", response);
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.notifications.length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
      setUnreadCount(0);
    }
  };
  const markAllAsRead = async () => {
    try {
      const markReadUrl =
        import.meta.env.VITE_API_URL + "/notification/mark-seen";
      const response = await axios.post(
        markReadUrl,
        {},
        { withCredentials: true }
      );
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };
  const incrementCount = () => {
    setUnreadCount((prev) => prev + 1);
  };

  const resetCount = () => {
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        incrementCount,
        resetCount,
        fetchNotifications,
        fcmToken,
        setFcmToken,
        notifications,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
