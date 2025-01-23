const path = require("path");
const File = require("../models/file.model");
const Department = require("../models/department.model");
const asyncHandler = require("../utils/asyncHandler");
const appConfig = require("../config/appConfig");
const { Role, FileStatus } = require("../utils/enums");
const uploadPdf = asyncHandler(async (req, res, next) => {
    //only take description if available
    const { department, title, description = null } = req.body;
    const file = req.file;
    const fileUniqueName = file.filename;
    const filePath = file.path;
    const newFile = await new File({
        fileUniqueName,
        filePath,
        createdBy: req.user._id,
        assignedTo: req.user.assignedApprover,
        department,
        title,
        description,
    }).save();

    const populatedFile = await newFile.populate([
        { path: "createdBy", select: "fullName" },
        { path: "assignedTo", select: "fullName" },
    ]);

    return res.status(200).json({
        status: true,
        message: "File uploaded successfully",
        file: {
            fileName: populatedFile.fileUniqueName,
            createdBy: populatedFile.createdBy.fullName,
            assignedTo: populatedFile.assignedTo.fullName,
            title: populatedFile.title,
            description: populatedFile.description,
        },
    });
});

const downloadPdf = asyncHandler(async (req, res, next) => {
    const fileName = req.params.filename;
    const file = await File.findOne({ fileUniqueName: fileName });
    if (!file) {
        const error = new Error("File not found");
        error.status = 404;
        return next(error);
    }
    if (req.user.role === Role.ASSISTANT && file.createdBy !== req.user.id) {
        const error = new Error("You are not authorized to download this file");
        error.status = 403;
        return next(error);
    }
    res.setHeader(
        "Content-disposition",
        `attachment; filename=${file.fileUniqueName}`
    );
    const filePath = path.join(appConfig.baseUploadDir, file.fileUniqueName);
    res.setHeader("Content-type", "application/pdf");
    res.sendFile(filePath);
});

const sendPendingDocsToAssistant = asyncHandler(async (req, res, next) => {
    //order by created data desc
    const pendingDocuments = await File.find({
        createdBy: req.user._id,
        status: "pending",
    }).sort({ createdDate: -1 });
    return res.status(200).json({
        status: true,
        message: "Pending documents fetched successfully",
        pendingDocuments,
    });
});
const sendPendingDocsToApprover = asyncHandler(async (req, res, next) => {
    //order by created data ascending
    const pendingDocuments = await File.find({
        assignedTo: req.user._id,
        status: "pending",
    }).sort({ createdDate: 1 });

    return res.status(200).json({
        status: true,
        message: "Pending documents fetched successfully",
        pendingDocuments,
    });
});
const sendPendingDocsToAdmin = asyncHandler(async (req, res, next) => {
    const pendingDocuments = await File.find({
        status: "pending",
    });
    return res.status(200).json({
        status: true,
        message: "Pending documents fetched successfully",
        pendingDocuments,
    });
});
// const getPendingDocuments = asyncHandler(async (req, res, next) => {
//     if (
//         req.user.role === Role.SENIOR_ASSISTANT ||
//         req.user.role === Role.ASSISTANT
//     ) {
//         sendPendingDocsToAssistant(req, res, next);
//     } else if (req.user.role === Role.ADMIN) {
//         sendPendingDocsToAdmin(req, res, next);
//     } else if (req.user.role === Role.APPROVER) {
//         sendPendingDocsToApprover(req, res, next);
//     }
// });

const fetchDocuments = async (query, sortOptions) => {
    return await File.find(query)
        .sort(sortOptions)
        .populate("department")
        .populate("createdBy", "fullName username email role")
        .populate("assignedTo", "fullName username email role");
};

const getDocumentsByQuery = asyncHandler(async (req, res, next) => {
    let { department, startDate, endDate, sortBy, status } = req.query;
    let query = {};
    let sortOptions = {};
    const fileStatuses = [
        FileStatus.APPROVED,
        FileStatus.PENDING,
        FileStatus.REJECTED,
        FileStatus.CORRECTION,
    ];
    if (!status) {
        const error = new Error("please provide status");
        error.status = 400;
        return next(error);
    }

    if (!fileStatuses.includes(status.toLowerCase())) {
        const error = new Error("Invalid status");
        error.status = 400;
        return next(error);
    }
    query.status = status.toLowerCase();

    switch (req.user.role) {
        case Role.SENIOR_ASSISTANT:
        case Role.ASSISTANT:
            query.createdBy = req.user._id;
            break;
        case Role.APPROVER:
            query.assignedTo = req.user._id;
            break;
        case Role.ADMIN:
            break;
        default:
            const error = new Error("Unauthorized role to fetch documents");
            error.status = 403;
            return next(error);
    }

    // Apply department filter if provided
    const dept = await Department.findOne({ name: department });
    if (dept) {
        query.department = dept._id;
    }

    // Apply date range filter if provided
    if (startDate || endDate) {
        query.createdDate = {};
        if (startDate) query.createdDate.$gte = new Date(startDate);
        if (endDate) query.createdDate.$lte = new Date(endDate);
    }

    // Apply sorting if provided
    if (sortBy) {
        const [field, order] = sortBy.split(":");
        sortOptions[field] = order === "desc" ? -1 : 1;
    } else {
        // Default sort by createdDate descending
        sortOptions = { createdDate: -1 };
    }
    console.log("query", query);
    const documents = await fetchDocuments(query, sortOptions);

    return res.status(200).json({
        status: true,
        message: "Pending documents fetched successfully",
        documents,
    });
});

module.exports = {
    uploadPdf,
    downloadPdf,
    getDocumentsByQuery,
};
