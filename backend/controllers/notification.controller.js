const Notification = require("../models/notification.model");
const asyncHandler = require("../utils/asyncHandler");

const getNotifications = asyncHandler(async (req, res, next) => {
    const notifications = await Notification.find({
        to: req.user._id,
        seen: false,
    })
        .populate("to", "fullName username")
        .sort({ date: -1 });
    if (notifications.length === 0) {
        return res.status(200).json({
            status: true,
            message: "Notifications fetched successfully",
            notifications,
        });
    }
    return res.status(200).json({
        status: true,
        message: "Notifications fetched successfully",
        notifications,
    });
});

const markNotificationsAsSeen = asyncHandler(async (req, res, next) => {
    await Notification.updateMany(
        {
            to: req.user._id,
            seen: false,
        },
        { $set: { seen: true } }
    );
    return res.status(200).json({
        status: true,
        message: "Notifications marked as seen",
    });
});

module.exports = {
    getNotifications,
    markNotificationsAsSeen,
};
