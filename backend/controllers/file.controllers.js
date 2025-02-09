const path = require("path");
const fs = require("fs");
const File = require("../models/file.model");
const Notification = require("../models/notification.model");
const Department = require("../models/department.model");
const asyncHandler = require("../utils/asyncHandler");
const appConfig = require("../config/appConfig");
const { NotificationService } = require("../utils/NotificationService");
const { Role, FileStatus } = require("../utils/enums");
const forge = require("node-forge");
const crypto = require("crypto");
const User = require("../models/user.model");

const uploadPdf = asyncHandler(async (req, res, next) => {
    //only take description if available
    console.log("req.user", req.user);
    if (!req.user.assignedApprover) {
        const error = new Error("No approver assigned");
        error.statusCode = 403;
        return next(error);
    }
    await req.user.populate("assignedApprover");
    console.log("req.user.assignedApprover", req.user.assignedApprover);
    if (!req.user.assignedApprover.isActive) {
        const error = new Error("Approver is not active");
        error.statusCode = 403;
        return next(error);
    }
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
        status: FileStatus.PENDING,
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
            console.log("token", token);
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
    let {
        department,
        startDate,
        endDate,
        sortBy,
        status,
        createdBy,
        assignedTo,
    } = req.query;
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
    const requestedStatuses = status.toLowerCase().split("-");
    const invalidStatuses = requestedStatuses.filter(
        (status) => !fileStatuses.includes(status)
    );

    if (invalidStatuses.length > 0) {
        const error = new Error(
            `Invalid status values: ${invalidStatuses.join(", ")}`
        );
        error.status = 400;
        return next(error);
    }

    // $in operator to match any of the provided statuses
    query.status = { $in: requestedStatuses };

    // if (!fileStatuses.includes(status.toLowerCase())) {
    //     const error = new Error("Invalid status");
    //     error.status = 400;
    //     return next(error);
    // }
    // query.status = status.toLowerCase();

    switch (req.user.role) {
        case Role.SENIOR_ASSISTANT:
        case Role.ASSISTANT:
            if (createdBy || assignedTo) {
                const error = new Error("Access denied");
                error.status = 401;
                return next(error);
            }
            query.createdBy = req.user._id;
            break;
        case Role.APPROVER:
            if (createdBy || assignedTo) {
                const error = new Error("Access denied");
                error.status = 401;
                return next(error);
            }
            query.assignedTo = req.user._id;
            break;
        case Role.ADMIN:
            if (createdBy && assignedTo) {
                const error = new Error(
                    "Please provide either createdBy or assignedTo"
                );
                error.status = 400;
                return next(error);
            }
            if (createdBy) {
                const user = await User.findOne({ username: createdBy });
                query.createdBy = user._id;
            }
            if (assignedTo) {
                const user = await User.findOne({ username: assignedTo });
                query.assignedTo = user._id;
            }
            break;
        default:
            const error = new Error("Unauthorized role to fetch documents");
            error.status = 403;
            return next(error);
    }

    // Apply department filter if provided
    if (department) {
        const dept = await Department.findOne({ departmentName: department });
        if (dept) {
            query.department = dept._id;
        } else {
            const error = new Error(`Department ${department} not found`);
            error.status = 403;
            return next(error);
        }
    }

    // Apply date range filter if provided
    if (startDate || endDate) {
        try {
            query.createdDate = {};

            if (startDate) {
                const startDateTime = new Date(startDate);
                if (isNaN(startDateTime.getTime())) {
                    throw new Error("Invalid start date");
                }
                startDateTime.setUTCHours(0, 0, 0, 0);
                query.createdDate.$gte = startDateTime;
            }

            if (endDate) {
                const endDateTime = new Date(endDate);
                if (isNaN(endDateTime.getTime())) {
                    throw new Error("Invalid end date");
                }
                endDateTime.setUTCHours(23, 59, 59, 999);
                query.createdDate.$lte = endDateTime;
            }

            if (
                startDate &&
                endDate &&
                query.createdDate.$gte > query.createdDate.$lte
            ) {
                throw new Error("Start date cannot be after end date");
            }
        } catch (error) {
            return next({
                status: 400,
                message: error.message,
            });
        }
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
    fileUniqueName = fileUniqueName.trim();
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

const getEncKeyByFileName = asyncHandler(async (req, res, next) => {
    const { clientPublicKey, fileUniqueName } = req.body;
    if (!clientPublicKey || !fileUniqueName) {
        const error = new Error(
            "Please provide clientPublicKey and fileUniqueName"
        );
        error.status = 400;
        return next(error);
    }
    const file = await File.findOne({ fileUniqueName })
        .populate("createdBy")
        .select("encKey");
    if (!file) {
        const error = new Error("File not found");
        error.status = 404;
        return next(error);
    }

    const { encKey } = file.createdBy;
    const publicKey = forge.pki.publicKeyFromPem(clientPublicKey);
    // Encrypt the encKey using RSA-OAEP
    const encryptedEncKey = publicKey.encrypt(encKey, "RSA-OAEP", {
        md: forge.md.sha256.create(),
    });
    return res.status(200).json({
        status: true,
        message: "Encrypted key fetched successfully",
        encryptedEncKey: forge.util.encode64(encryptedEncKey),
    });
});

const getOwnEncKey = asyncHandler(async (req, res, next) => {
    const { clientPublicKey } = req.body;
    if (!clientPublicKey) {
        const error = new Error("Please provide clientPublicKey");
        error.status = 400;
        return next(error);
    }
    const { encKey } = req.user;
    const publicKey = forge.pki.publicKeyFromPem(clientPublicKey);
    // Encrypt the encKey using RSA-OAEP
    const encryptedEncKey = publicKey.encrypt(encKey, "RSA-OAEP", {
        md: forge.md.sha256.create(),
    });
    return res.status(200).json({
        status: true,
        message: "Encrypted key fetched successfully",
        encryptedEncKey: forge.util.encode64(encryptedEncKey),
    });
});
const getEncKey = asyncHandler(async (req, res, next) => {
    if (req.user.role === Role.APPROVER || req.user.role === Role.ADMIN) {
        return getEncKeyByFileName(req, res, next);
    } else {
        return getOwnEncKey(req, res, next);
    }
});
module.exports = {
    uploadPdf,
    downloadPdf,
    getDocumentsByQuery,
    approveDocument,
    rejectDocument,
    requestCorrection,
    getEncKey,
};
