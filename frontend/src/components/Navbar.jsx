import React from 'react'
import { FaHistory, FaBell, FaUserAlt, FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Navbar = () => {const navigate = useNavigate();

    const navigateNoti = () => {
      navigate("/notifications");
    };
  return (
    <div>
         <div className="navbar w-full h-[8vh] flex items-center justify-between bg-white text-gray-700 px-8 shadow-md">
        <button className="text-lg text-gray-600 hover:text-blue-500">
          <FaHistory />
        </button>
        <h1 className="text-center text-lg font-semibold tracking-wider">
       Assistant   Dashboard
        </h1>
        <div className="flex space-x-6">
          <button
            onClick={navigateNoti}
            className="text-gray-600 hover:text-blue-500"
          >
            <FaBell />
          </button>
          <button className="text-gray-600 hover:text-blue-500">
            <FaUserAlt />
          </button>
        </div>
      </div>̥
    </div>
  )
}

export default Navbar