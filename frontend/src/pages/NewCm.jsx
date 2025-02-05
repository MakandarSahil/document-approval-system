import React, { useState, useEffect } from "react";
import { FaSearch } from "react-icons/fa";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import { ClipLoader } from "react-spinners";
import { AiOutlineClose, AiOutlineCheck, AiOutlineCloseCircle } from "react-icons/ai";
import { FaCommentDots } from "react-icons/fa";
import { IoMdRefresh } from "react-icons/io";
import '../index.css';

const NewCm = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredData, setFilteredData] = useState([]);
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [remark, setRemark] = useState("");

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      queryParams.append('status', 'pending');

      if (category) {
        queryParams.append('category', category);
      }
      if (startDate) {
        queryParams.append('startDate', startDate);
      }
      if (endDate) {
        queryParams.append('endDate', endDate);
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/file/get-documents?${queryParams}`,
        { withCredentials: true }
      );

      console.log('API Response:', response.data);

      if (response.data.status && response.data.documents) {
        setFilteredData(response.data.documents);
        console.log('Filtered Data:', response.data.documents);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.message || 'Failed to fetch documents');
      toast.error('Failed to load documents');
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [category, startDate, endDate]);

  const openModal = (document) => {
    setSelectedDocument(document);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDocument(null);
  };

  const openRemarkModal = (document) => {
    setSelectedDocument(document);
    setIsRemarkModalOpen(true);
  };

  const closeRemarkModal = () => {
    setIsRemarkModalOpen(false);
    setSelectedDocument(null);
  };

  const handleRemarkSubmit = () => {
    console.log("Remark submitted:", remark);
    closeRemarkModal();
  };

  const handleApprove = async (fileUniqueName) => {
    console.log('fileUniqueName:', fileUniqueName);
   
    try {
      toast.loading("Approving document...");
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/file/approve`,
        { fileUniqueName },
        { withCredentials: true }
      );
      closeModal();
  
      toast.dismiss();
      toast.success(response.data.message || "Document approved successfully!");
      fetchDocuments(); // Refresh list after approval
    } catch (error) {
      toast.dismiss();
      console.log(error.response?.data?.message);
      toast.error(error.response?.data?.message || "Approval failed");
    }
  };

  const handleReject = async (fileUniqueName) => {
    console.log("rejected file", fileUniqueName)
    try {
      toast.loading("Rejecting document...");
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/file/reject`,  
        { fileUniqueName },
        { withCredentials: true }
      );
      closeModal();
      toast.dismiss();
      toast.success(response.data.message || "Document rejected successfully!");
      fetchDocuments();
    } catch (error) {
      toast.dismiss();
      console.log(error.response?.data?.message);
      toast.error(error.response?.data?.message || "Rejection failed");
    }
  };

  return (
    <div className="flex flex-col font-sans space-y-6 p-4 mt-0">
      {/* Search Section */}
      <Toaster />
      <div className="relative -mt-2">
        <FaSearch className="absolute top-3 left-3 text-gray-400" />
        <input
          type="text"
          placeholder="Search"
          className="w-full pl-10 pr-4 py-2 rounded-md bg-gray-100 text-gray-800 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col space-y-2 tracking-tight scale-90 sm:flex-row sm:space-y-0 sm:space-x-4 items-center justify-center">
        <select
          className="flex-1 px-4 py-2 rounded-md bg-gray-200 text-gray-700 border border-gray-300 "
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Category</option>
          <option value="Health">Health</option>
          <option value="Education">Education</option>
          <option value="Transportation">Transportation</option>
          <option value="Finance">Finance</option>
        </select>
        <input
          type="date"
          className="flex-1 px-4 py-2 rounded-md bg-gray-200 text-gray-700 border border-gray-300"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="date"
          className="flex-1 px-4 py-2 rounded-md bg-gray-200 text-gray-700 border border-gray-300"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <button
          onClick={fetchDocuments}
          className="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md shadow-md hover:bg-blue-600 transition"
        >
          <IoMdRefresh className="h-5 w-5" />
        </button>
      </div>

      {/* Documents */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center">
            <ClipLoader size={35} color={"#123abc"} loading={isLoading} />
          </div>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : filteredData.length === 0 ? (
          <p className="text-gray-500 font-thin text-center text-lg ">No documents found</p>
        ) : (
          filteredData.map((item) => (
            <div
              key={item._id}
              className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-100 p-4 rounded-md shadow-md border border-gray-300"
            >
              <div className="flex items-start sm:items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 flex items-center justify-center rounded-md">
                  📄
                </div>
                <div className="flex flex-col">
                  <h3
                    className="text-xl font-bold tracking-tight font-open-sans text-gray-800 cursor-pointer"
                    onClick={() => openModal(item)}
                  >
                    {item.title}
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:space-x-4">
                    <span className="text-[13px] font-light text-gray-800">
                      <span className="font-semibold">Department:</span> {item.department?.departmentName || 'Unassigned'}
                    </span>
                    <span className="text-[13px] font-light text-gray-800">
                      <span className="font-semibold">Created By:</span> {item.createdBy?.fullName || item.createdBy?.username || 'Unknown'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{item.date}</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-blue-500 mt-2 sm:mt-0">
                {item.status.toUpperCase()}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Modal for PDF display */}
      {isModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 transition-opacity duration-300 ease-in-out"
          onClick={closeModal}
        >
          <div
            className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-3xl mx-2 sm:mx-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-2xl font-semibold text-gray-800">{selectedDocument?.title}</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <AiOutlineClose className="h-6 w-6" />
              </button>
            </div>

            {/* PDF Viewer Placeholder */}
            <div className="flex items-center justify-center h-64 bg-gray-100 rounded-md mb-4 border border-gray-300">
              <p className="text-center text-gray-500">PDF content goes here</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-end gap-2">
              <button onClick={() => handleApprove(selectedDocument.fileUniqueName)} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md shadow-md hover:bg-green-600 transition">
                <AiOutlineCheck className="h-5 w-5" />
                Approve
              </button>

              <button 
                onClick={() => handleReject(selectedDocument.fileUniqueName)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md shadow-md hover:bg-red-600 transition"
              >
                <AiOutlineCloseCircle className="h-5 w-5" />
                Reject
              </button>

              <button
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-md shadow-md hover:bg-yellow-600 transition"
                onClick={() => openRemarkModal(selectedDocument)}
              >
                <FaCommentDots className="h-5 w-5" />
                Give Remark
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Modal for Remarks */}
      {isRemarkModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 transition-opacity duration-300 ease-in-out"
          onClick={closeRemarkModal}
        >
          <div
            className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md mx-2 sm:mx-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-2xl font-semibold text-gray-800">Give Remark</h2>
              <button
                onClick={closeRemarkModal}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <AiOutlineClose className="h-6 w-6" />
              </button>
            </div>

            {/* Remark Input */}
            <textarea
              className="w-full p-2 border border-gray-300 bg-white resize-none text-black text-lg rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              rows="4"
              placeholder="Enter your remark here..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            ></textarea>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md shadow-md hover:bg-gray-400 transition"
                onClick={closeRemarkModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-md shadow-md hover:bg-blue-600 transition"
                onClick={handleRemarkSubmit}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewCm;