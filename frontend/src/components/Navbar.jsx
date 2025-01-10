import React from "react";
import { FaHistory, FaBell, FaUserAlt, FaSearch, FaHome } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { SiTask } from "react-icons/si";

import DashboardIcon from '@mui/icons-material/Dashboard';
import { IconButton } from '@mui/material';

const Navbar = ({ role }) => {
  const navigate = useNavigate();

  const navigateNoti = () => {
    navigate("/notifications");
  };
  const navigateHistory = () => {
    navigate("/history");
  };

  const navigateProfile = () => {
    navigate("/profile");
    };

  const navigateHome = () => {
    navigate("/dashboard");
  };

  return (
    <div>
      <div className="navbar w-full h-[8vh] flex items-center justify-between bg-white text-gray-700 px-8 shadow-md">
        <button className="text-lg text-gray-600 hover:text-blue-500"  onClick={navigateHistory}>
          <FaHistory />
        </button>
        <h1 className="text-center text-lg font-semibold tracking-wider">
          {role === "approver"
            ? "Approver Dashboard"
            : role === "assistant"
            ? "Assistant Dashboard"
            : "Profile Dashboard"}
        </h1>
        <div className="flex space-x-6">
          <button
            onClick={navigateNoti}
            className="text-gray-600 hover:text-blue-500"
          >
            <FaBell />
          </button>
          {role === "approver" || role === "assistant" ? (
            <button className="text-gray-600 hover:text-blue-500"  onClick={navigateProfile}>
              <FaUserAlt />
            </button>
          ) : (
            <button
              onClick={navigateHome}
              className="text-gray-600 hover:text-blue-500"
            >
              <DashboardIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
