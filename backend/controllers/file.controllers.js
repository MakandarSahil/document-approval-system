const path = require("path");
const fs = require("fs");
const File = require("../models/file.model");
const Notification = require("../models/notification.model");
const Department = require("../models/department.model");
const asyncHandler = require("../utils/asyncHandler");
const appConfig = require("../config/appConfig");
const { NotificationService } = require("../utils/NotificationService");
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

    const notification = new Notification({
        title: newFile.title,
        body: `${newFile.title} has been uploaded`,
        to: newFile.assignedTo,
        type: FileStatus.PENDING,
    });
    await notification.save();
    await newFile.populate("assignedTo");

    const deviceTokens = newFile?.assignedTo?.deviceTokens || [];

    for (const token of deviceTokens) {
        if (token) {
            await NotificationService.sendNotification(
                token,
                notification.title,
                notification.body
            );
            console.log("title", notification.title);
            console.log("body", notification.body);
        }
    }

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
    console.log("fileName", fileName);
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

    const filePath = path.join(appConfig.baseUploadDir, file.fileUniqueName);
    if (!fs.existsSync(filePath)) {
        const error = new Error("File not found");
        error.status = 404;
        return next(error);
    }
    const fileContent = fs.readFileSync(filePath, "utf8");
    res.send(fileContent);
});

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
    const dept = await Department.findOne({ departmentName: department });
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
        message: "documents fetched successfully",
        documents,
    });
});

const updateFileStatus = asyncHandler(async (req, res, next) => {
    let { fileUniqueName, status, remarks } = req.body;
    if (!fileUniqueName) {
        const error = new Error("Please provide fileUniqueName");
        error.status = 400;
        return next(error);
    }
    fileUniqueName = fileUniqueName.trim().toLowerCase();
    status = status.trim().toLowerCase();
    remarks = remarks?.trim();

    // Validate status
    if (!Object.values(FileStatus).includes(status)) {
        const error = new Error("Invalid status");
        error.status = 400;
        return next(error);
    }

    const file = await File.findOne({ fileUniqueName });
    if (!file) {
        const error = new Error("File not found");
        error.status = 404;
        return next(error);
    }
    if (file.status === FileStatus.REJECTED) {
        const error = new Error("File has already been rejected");
        error.status = 400;
        return next(error);
    }

    if (file.status === FileStatus.CORRECTION && !remarks) {
        const error = new Error("Remarks are required for correction");
        error.status = 400;
        return next(error);
    }
    // Populate and check authorization
    await file.populate("assignedTo");
    if (file.assignedTo.username !== req.user.username) {
        const error = new Error("You are not authorized to update this file");
        error.status = 403;
        return next(error);
    }

    // Update status and corresponding date
    file.status = status;
    file.remarks = remarks || "";

    // Update status-specific dates
    const dateFields = {
        [FileStatus.APPROVED]: "approvedDate",
        [FileStatus.REJECTED]: "rejectedDate",
        [FileStatus.CORRECTION]: "correctionDate",
    };

    if (dateFields[status]) {
        file[dateFields[status]] = new Date();
    }

    await file.save();
    const notification = new Notification({
        title: file.title,
        body: `File ${file.title} has been ${status.toLowerCase()}`,
        to: file.createdBy,
        type: status.toLowerCase(),
    });
    await notification.save();
    await file.populate("createdBy");
    const deviceTokens = file.createdBy?.deviceTokens || [];

    for (const token of deviceTokens) {
        if (token) {
            await NotificationService.sendNotification(
                token,
                notification.title,
                notification.body
            );
        }
    }
    return res.status(200).json({
        status: true,
        message: `File ${status.toLowerCase()} successfully`,
        file: {
            fileName: file.fileUniqueName,
            createdBy: file.createdBy.fullName,
            assignedTo: file.assignedTo.fullName,
            title: file.title,
            description: file.description,
            status: file.status,
        },
    });
});

// Usage examples:
const approveDocument = asyncHandler((req, res, next) => {
    req.body.status = FileStatus.APPROVED;
    return updateFileStatus(req, res, next);
});

const rejectDocument = asyncHandler((req, res, next) => {
    req.body.status = FileStatus.REJECTED;
    return updateFileStatus(req, res, next);
});

const requestCorrection = asyncHandler((req, res, next) => {
    req.body.status = FileStatus.CORRECTION;
    return updateFileStatus(req, res, next);
});
// const approveFile = asyncHandler(async (req, res, next) => {
//     const { fileUniqueName } = req.body;
//     const file = await Document.findOne({ fileUniqueName });
//     if (!file) {
//         const error = new Error("File not found");
//         error.status = 404;
//         return next(error);
//     }
//     await file.populate("assignedTo").execPopulate();
//     if (file.assignedTo.username !== req.user.username) {
//         const error = new Error("You are not authorized to approve this file");
//         error.status = 403;
//         return next(error);
//     }
//     file.status = FileStatus.APPROVED;
//     await file.save();
//     return res.status(200).json({
//         status: true,
//         message: "File approved successfully",
//         file,
//     });
// });
module.exports = {
    uploadPdf,
    downloadPdf,
    getDocumentsByQuery,
    approveDocument,
    rejectDocument,
    requestCorrection,
};
