import React, { useState, useEffect } from "react";
import { FaSearch, FaBars } from "react-icons/fa";
import Navbar from "../components/Navbar";
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
import DocumentsList from "../components/DocumentsList";
import { IoMdRefresh } from "react-icons/io";
import Loader from "react-loaders";
import "loaders.css/loaders.min.css";
import { FaPlus } from "react-icons/fa";

const AssistantDashboard = () => {
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

  // Fetch Documents
  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setDocuments([]);
      const apiUrl = `${import.meta.env.VITE_API_URL}/file/get-documents?status=${selectedTab.toLowerCase()}`;
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
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/department/get-all-departments`,
          { withCredentials: true }
        );
        console.log("departments : ", response.data.data);
        setDepartments(response.data.data);
      } catch (error) {
        console.error("Error fetching departments:", error);
      }
    };
    fetchDepartments();
  }, []);

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
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden p-2 text-gray-600 rounded-md"
        disabled={loading}
      >
        <FaBars />
      </button>

      <main className="p-6 flex-grow">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-4 mb-6 border-b">
          {["PENDING", "APPROVED", "REJECTED", "CORRECTION"].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-4 py-2 ${
                selectedTab === tab
                  ? "border-b-2 border-blue-500 text-blue-500"
                  : "text-gray-600 hover:text-blue-500"
              }`}
              disabled={loading}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full max-w-xs mx-auto mb-6">
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
            <label className="block text-sm font-medium text-gray-700">
              Date Range
            </label>
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="p-2 border bg-white border-gray-300 rounded-md"
                disabled={loading}
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="p-2 border bg-white border-gray-300 rounded-md"
                min={startDate}
                disabled={loading}
              />
              <button
                onClick={handleRefresh}
                className="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md shadow-md hover:bg-blue-600 transition"
                disabled={loading}
              >
                <IoMdRefresh className="h-5 w-5" />
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
          <DocumentsList
            documents={filteredData}
            status={selectedTab.toLowerCase()}
            department={selectedCategory}
            handleTitleClick={(url) => {
              setCurrentPdfUrl(url);
              setViewPdfDialogOpen(true);
            }}
          />
        )}
      </main>

      {/* New Document Dialog */}
      <Dialog
        open={newDocDialogOpen}
        onClose={() => setNewDocDialogOpen(false)}
      >
        <DialogTitle>Prepare New Document</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Document Title"
            type="text"
            fullWidth
            value={newDocTitle}
            onChange={(e) => setNewDocTitle(e.target.value)}
            disabled={loading}
          />
          <TextField
            select
            margin="dense"
            fullWidth
            value={newDocDepartment}
            onChange={(e) => setNewDocDepartment(e.target.value)}
            SelectProps={{ native: true }}
            disabled={loading}
          >
            <option value="">Select Department</option>
            {departments?.map((department, idx) => (
              <option key={idx} value={department}>
                {department}
              </option>
            ))}
          </TextField>

          <input
            type="file"
            onChange={(e) => setNewDocFile(e.target.files[0])}
            className="my-4"
            disabled={loading}
          />
          <TextField
            margin="dense"
            label="Description"
            type="text"
            fullWidth
            multiline
            rows={4}
            value={newDocDesc}
            onChange={(e) => setNewDocDesc(e.target.value)}
            disabled={loading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewDocDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleDocumentUpload} disabled={loading}>
            Encrypt & Upload
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Document Button */}
      <div className="fixed bottom-6 right-4 bg-blue-500 p-2 rounded-full text-white font-bold">
        <FaPlus
          className="text-2xl"
          onClick={() => setNewDocDialogOpen(true)}
          disabled={loading}
        />
      </div>

      {/* PDF Preview Dialog */}
      <Dialog
        open={viewPdfDialogOpen}
        onClose={() => setViewPdfDialogOpen(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>Document Preview</DialogTitle>
        <DialogContent>
          <div style={{ width: "100%", height: "80vh" }}>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewPdfDialogOpen(false)} disabled={loading}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AssistantDashboard;