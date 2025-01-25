import React from "react";
import { FaSearch } from "react-icons/fa";

const SentBackTabContent = () => {
  return (
    <div className="flex flex-col -top-6 space-y-6 p-4">
      {/* Search Section */}
      <div className="relative">
        <FaSearch className="absolute top-3 left-3 text-gray-400" />
        <input
          type="text"
          placeholder="Search"
          className="w-full pl-10 pr-4 py-2 rounded-md bg-gray-100 text-gray-800 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
        <select className="flex-1 px-4 py-2 rounded-md bg-gray-200 text-gray-700 border border-gray-300">
          <option>Category</option>
          <option>Health</option>
          <option>Education</option>
          <option>Transportation</option>
          <option>Finance</option>
        </select>
        <input
          type="date"
          className="flex-1 px-4 py-2 rounded-md bg-gray-200 text-gray-700 border border-gray-300"
        />
      </div>

      {/* Letters */}
      <div className="space-y-4">
        {[
          { title: "Letter Title 1", date: "01/02/2025", status: "CORRECTION" },
          { title: "Letter Title 2", date: "01/02/2025", status: "REJECTED" },
           
        ].map((letter, index) => (
          <div
            key={index}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-100 p-4 rounded-md shadow-md border border-gray-300 w-full"
          >
            <div className="flex items-start sm:items-center space-x-4">
              <div className="w-10 h-10 bg-gray-200 flex items-center justify-center rounded-md">
                📄
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-800">
                  {letter.title}
                </h3>
                <p className="text-xs text-gray-500">{letter.date}</p>
              </div>
            </div>
            <span
              className={`text-sm font-semibold mt-2 sm:mt-0 ${
                letter.status === "REJECTED"
                  ? "text-red-500"
                  : "text-yellow-600"
              }`}
            >
              {letter.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SentBackTabContent;