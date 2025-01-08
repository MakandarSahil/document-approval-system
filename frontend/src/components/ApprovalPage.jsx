import React, { useState } from "react";
import { FiSearch } from "react-icons/fi";
import { BsPlus, BsPersonCircle } from "react-icons/bs";

const ApprovalPage = () => {
  const [selectedTab, setSelectedTab] = useState("APPROVED");

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-white to-blue-100 " >
      <div className="w-full max-w-2xl bg-white shadow-lg border border-gray-200 rounded-lg p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-t-lg">
          <h1 className="text-xxl font-bold w">APPROVE</h1>
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer">
            <BsPersonCircle className="text-4xl text-gray-500" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-around border-b border-gray-300 pb-2">
          {["APPROVED", "REJECTED", "REMARK", "PENDING"].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                selectedTab === tab
                  ? "text-white border-b-2 border-blue-500"
                  : "text-white hover:text-blue-500"
              }`}
              onClick={() => setSelectedTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="p-4 flex flex-wrap items-center gap-4 bg-gray-50">
          <div className="relative w-full">
            <FiSearch className="absolute top-3 left-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2 rounded-md bg-gray-100 text-gray-800 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <select
            className="px-4 py-2 rounded-md bg-gray-100 text-gray-800 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option>Department</option>
            <option>HR</option>
            <option>Finance</option>
            <option>Operations</option>
          </select>

          <input
            type="date"
            className="px-4 py-2 rounded-md bg-gray-100 text-gray-800 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Document List */}
        <div className="p-4 space-y-4 bg-gray-50 rounded-b-md">
          {[1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="flex items-center justify-between bg-gray-100 p-4 rounded-md shadow-md border border-gray-300"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 flex items-center justify-center rounded-md">
                  <span className="text-gray-500 text-xl">📄</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-800">Letter Title</h3>
                  <p className="text-xs text-gray-500">01/02/2025</p>
                </div>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 text-blue-500 focus:ring-blue-500 border-gray-300 bg-gray-100 rounded"
              />
            </div>
          ))}
        </div>

        {/* Floating Action Button */}
        <button
          className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-blue-500 text-white shadow-lg flex items-center justify-center hover:bg-blue-600 transition duration-200"
        >
          <BsPlus className="text-2xl" />
        </button>
      </div>
    </div>
  );
};

export default ApprovalPage;
