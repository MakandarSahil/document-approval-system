import React, { useState, useEffect } from "react";
import { FaSearch, FaBars } from "react-icons/fa";
import Navbar from "../components/Navbar";
import { HiDocumentPlus } from "react-icons/hi2";

import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
} from "@mui/material";
import { toast, Toaster } from "react-hot-toast";
import axios from "axios";
import CryptoJS from "crypto-js";
import DocumentsListHistory from "../pages/DocumentsListHistory";
import { IoIosAdd, IoMdRefresh } from "react-icons/io";
import Loader from "react-loaders";
import "loaders.css/loaders.min.css";
import { FaPlus } from "react-icons/fa";
import { IoMdEye } from "react-icons/io";
import { AiOutlineClose } from "react-icons/ai";

const AdminDashboard = () => {
  // State Management
  const [selectedTab, setSelectedTab] = useState("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filteredData, setFilteredData] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dialog States
  const [openDialog, setOpenDialog] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [currentDocumentId, setCurrentDocumentId] = useState(null);
  const [newDocDialogOpen, setNewDocDialogOpen] = useState(false);
  const [viewPdfDialogOpen, setViewPdfDialogOpen] = useState(false);
  const [currentPdfUrl, setCurrentPdfUrl] = useState("");
  const [departments, setDepartments] = useState([]);

  // Filter States
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // New Document States
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocDepartment, setNewDocDepartment] = useState("");
  const [newDocFile, setNewDocFile] = useState(null);
  const [newDocDesc, setNewDocDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentDocDetails, setCurrentDocDetails] = useState({
    description: "",
    remarks: "",
    title: "",
    department: "",
    createdBy: "",
    createdDate: "",
    status: "",
  });
  // Add this helper function near your other utility functions
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "text-green-700 bg-green-100 border border-green-500 px-2 py-1 rounded-md font-semibold";
      case "rejected":
        return "text-red-700 bg-red-100 border border-red-500 px-2 py-1 rounded-md font-semibold";
      case "correction":
        return "text-yellow-700 bg-yellow-100 border border-yellow-500 px-2 py-1 rounded-md font-semibold";
      case "pending":
        return "text-blue-700 bg-blue-100 border border-blue-500 px-2 py-1 rounded-md font-semibold";
      default:
        return "text-gray-700 bg-gray-100 border border-gray-400 px-2 py-1 rounded-md font-medium";
    }
  };
  // Fetch Documents
  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setDocuments([]);
      const apiUrl = `${
        import.meta.env.VITE_API_URL
      }/file/get-documents?status=${selectedTab.toLowerCase()}`;
      console.log("apiUrl", apiUrl);

      const response = await axios.get(apiUrl, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        withCredentials: true,
      });

      console.log("fetched data", response.data);
      setDocuments(response.data.documents);
      setFilteredData(response.data.documents);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to fetch documents";
      setError(errorMessage);
      console.error("Error fetching documents:", err);
      setDocuments([]);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchDocuments();
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedTab]);

  // Fetch Departments
  const fetchDepartments = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/department/get-all-departments`,
        { withCredentials: true }
      );
      if (response.data && response.data.data) {
        // Add console.log to debug the response
        console.log("API Response:", response.data);
        setDepartments(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("Failed to fetch departments");
    }
  };
  useEffect(() => {
    fetchDepartments();
  }, []);

  const resetFilters = () => {
    // toast.loading("Resetting filters...");
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setSelectedCategory("");
    toast.success("Filters reset successfully");
    // toast.dismiss();
  };

  // Filter Documents
  useEffect(() => {
    const filtered = documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (!selectedCategory || doc.category === selectedCategory) &&
        (!startDate || new Date(doc.date) >= new Date(startDate)) &&
        (!endDate || new Date(doc.date) <= new Date(endDate))
    );
    setFilteredData(filtered);
  }, [searchQuery, selectedCategory, startDate, endDate, documents]);

  // Handle Document Upload
  const handleDocumentUpload = async () => {
    const toastId = toast.loading("Uploading document...");
    setLoading(true);

    // Validate all fields
    if (!newDocFile || !newDocDepartment || !newDocTitle) {
      toast.error("Please fill all required fields");
      setLoading(false);
      return;
    }

    // Validate file type
    if (!newDocFile.type.includes("pdf")) {
      toast.error("Please upload only PDF files");
      setLoading(false);
      return;
    }

    try {
      // Encrypt the file
      const arrayBuffer = await newDocFile.arrayBuffer();
      const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
      const encrypted = CryptoJS.AES.encrypt(wordArray, "mykey");
      const encryptedContent = encrypted.toString();

      // Prepare form data
      const formData = new FormData();
      const blob = new Blob([encryptedContent], { type: "text/plain" });
      formData.append("pdfFile", new File([blob], `${newDocFile.name}.enc`));
      formData.append("department", newDocDepartment);
      formData.append("title", newDocTitle);
      formData.append("description", newDocDesc || "");

      // Upload the file
      const uploadUrl = import.meta.env.VITE_API_URL + "/file/upload-pdf";
      const response = await axios.post(uploadUrl, formData, {
        withCredentials: true,
      });

      if (response.data) {
        toast.dismiss(toastId);
        toast.success("Document uploaded successfully");

        // Reset form fields
        setNewDocFile(null);
        setNewDocDepartment("");
        setNewDocTitle("");
        setNewDocDesc("");

        // Refresh the document list
        fetchDocuments();

        // Close the dialog
        setNewDocDialogOpen(false);
      }
    } catch (error) {
      toast.dismiss(toastId);
      console.error("Upload error:", error);
      toast.error(error.response?.data?.message || "Error uploading document");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 text-gray-800">
      {/*    role="Personal Assistant - Approval Dashboard" /> */}
      <Toaster />

      <main className="p-6 flex-grow">
        {/* Status Tabs */}

        {/* Search Bar */}
        <div className="flex  justify-start items-start md:flex-row gap-4">
          <div className="relative w-full left-10 max-w-xs mx-auto mb-6">
            <FaSearch className="absolute top-3 left-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-md border bg-white border-gray-300 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              disabled={loading}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col md:flex-row gap-4">
          <div className="flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full md:w-auto mt-1 p-2 text-sm border border-gray-300 bg-white rounded-md"
              disabled={loading}
            >
              <option value="">All</option>
              {departments?.map((department, idx) => (
                <option key={idx} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-grow">
            <label className="block text-sm font-medium  ">Date Range</label>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Start Date Picker */}
              <div className="relative">
                <input
                  ref={(input) => (window.startDateInput = input)}
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="p-2 border bg-white text-black border-gray-300 rounded-md appearance-none pointer-events-none"
                  disabled={loading}
                />
                <svg
                  className="absolute right-3 top-3 w-5 h-5 text-black cursor-pointer"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  onClick={() => window.startDateInput?.showPicker()} // Opens Date Picker on SVG Click
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7V3M16 7V3M3 11h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
                  />
                </svg>
              </div>

              {/* End Date Picker */}
              <div className="relative">
                <input
                  ref={(input) => (window.endDateInput = input)}
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="p-2 border bg-white text-black border-gray-300 rounded-md appearance-none pointer-events-none"
                  min={startDate}
                  disabled={loading}
                />
                <svg
                  className="absolute right-3 top-3 w-5 h-5 text-black  cursor-pointer"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  onClick={() => window.endDateInput?.showPicker()} // Opens Date Picker on SVG Click
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7V3M16 7V3M3 11h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
                  />
                </svg>
              </div>

              <button
                onClick={handleRefresh}
                className="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md shadow-md hover:bg-blue-600 transition"
                disabled={loading}
              >
                <IoMdRefresh className="h-5 w-5" />
              </button>

              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-500 text-white rounded-md shadow-md hover:bg-gray-600 transition"
                disabled={isLoading}
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Document List */}
        {isLoading || loading ? (
          <div className="flex justify-center items-center">
            <Loader type="ball-pulse" active />
          </div>
        ) : (
          <DocumentsListHistory
            status={selectedTab.toLowerCase()}
            department={selectedCategory}
            startDate={startDate}
            endDate={endDate}
            searchQuery={searchQuery}
            handleTitleClick={(url, details) => {
              setCurrentPdfUrl(url);
              setCurrentDocDetails(details);
              setViewPdfDialogOpen(true);
            }}
          />
        )}
      </main>

      {/* New Document Dialog */}

      {/* Add Document Button */}

      {/* PDF Preview Dialog */}
      <Dialog
        open={viewPdfDialogOpen}
        onClose={() => setViewPdfDialogOpen(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>
          <div className="flex justify-between items-center">
            <span>{currentDocDetails.title || "Document Preview"}</span>
            <span className={getStatusColor(currentDocDetails.status)}>
              {currentDocDetails.status?.toUpperCase() || "UNKNOWN"}
            </span>
            <button onClick={() => setViewPdfDialogOpen(false)}>

            <AiOutlineClose  />
          </button>
          </div>
        </DialogTitle>
        <DialogContent>
          <div className="flex gap-4 h-[80vh]">
            {/* PDF Viewer - Left Side */}
            <div className="flex-grow">
              <object
                data={currentPdfUrl}
                type="application/pdf"
                width="100%"
                height="100%"
              >
                <p>
                  Your browser does not support PDFs.{" "}
                  <a href={currentPdfUrl}>Download the PDF</a>.
                </p>
              </object>
            </div>

            {/* Details Panel - Right Side */}
            <div className="w-80 bg-gray-50 p-4 rounded-lg overflow-y-auto">
              {/* Document Details */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Document Details</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Department:</span>{" "}
                    {currentDocDetails.department || "Not assigned"}
                  </p>
                  <p>
                    <span className="font-medium">Created By:</span>{" "}
                    {currentDocDetails.createdBy || "Unknown"}
                  </p>
                  <p>
                    <span className="font-medium">Date:</span>{" "}
                    {currentDocDetails.createdDate
                      ? new Date(
                          currentDocDetails.createdDate
                        ).toLocaleDateString()
                      : "Not available"}
                  </p>
                </div>
              </div>

              {/* Description Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <div className="bg-white p-3 rounded-md border border-gray-200">
                  <p className="text-gray-700">
                    {currentDocDetails.description ||
                      "No description available"}
                  </p>
                </div>
              </div>

              {/* Remarks Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Remarks</h3>
                <div className="bg-white p-3 rounded-md border border-gray-200">
                  <p className="text-gray-700">
                    {currentDocDetails.remarks || "No remarks available"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogActions>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
