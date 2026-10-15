import Notification from "../models/notification.js";

/**
 * @route   GET /api/notifications
 * @desc    Get logged in user's notifications with unread count and category filtering
 * @access  Authenticated
 */
export const getNotifications = async (req, res) => {
  try {
    const currentUserId = req.session?.userId;
    if (!currentUserId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { filter } = req.query;
    const query = { recipient: currentUserId };

    if (filter === "unread") {
      query.read = false;
    } else if (filter === "contest") {
      query.type = "new_contest";
    } else if (filter === "support") {
      query.type = { $in: ["support_resolved", "support_update"] };
    }

    const [notifications, unreadCount, totalCount] = await Promise.all([
      Notification.find(query)
        .populate("sender", "firstName lastName avatar email organizationName organizationType")
        .sort({ createdAt: -1 })
        .limit(100),
      Notification.countDocuments({ recipient: currentUserId, read: false }),
      Notification.countDocuments({ recipient: currentUserId }),
    ]);

    return res.status(200).json({
      notifications,
      unreadCount,
      totalCount,
    });
  } catch (error) {
    console.error("getNotifications error:", error);
    return res.status(500).json({ message: "Failed to load notifications" });
  }
};

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a specific notification as read
 * @access  Authenticated
 */
export const markAsRead = async (req, res) => {
  try {
    const currentUserId = req.session?.userId;
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: currentUserId },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const unreadCount = await Notification.countDocuments({
      recipient: currentUserId,
      read: false,
    });

    return res.status(200).json({
      message: "Notification marked as read",
      notification,
      unreadCount,
    });
  } catch (error) {
    console.error("markAsRead error:", error);
    return res.status(500).json({ message: "Failed to update notification" });
  }
};

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all user's notifications as read
 * @access  Authenticated
 */
export const markAllAsRead = async (req, res) => {
  try {
    const currentUserId = req.session?.userId;

    await Notification.updateMany(
      { recipient: currentUserId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    return res.status(200).json({
      message: "All notifications marked as read",
      unreadCount: 0,
    });
  } catch (error) {
    console.error("markAllAsRead error:", error);
    return res.status(500).json({ message: "Failed to mark notifications as read" });
  }
};

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a specific notification
 * @access  Authenticated
 */
export const deleteNotification = async (req, res) => {
  try {
    const currentUserId = req.session?.userId;
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: currentUserId,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const unreadCount = await Notification.countDocuments({
      recipient: currentUserId,
      read: false,
    });

    return res.status(200).json({
      message: "Notification deleted",
      unreadCount,
    });
  } catch (error) {
    console.error("deleteNotification error:", error);
    return res.status(500).json({ message: "Failed to delete notification" });
  }
};

/**
 * @route   DELETE /api/notifications/clear-all
 * @desc    Clear/Delete all notifications for logged-in user
 * @access  Authenticated
 */
export const clearAllNotifications = async (req, res) => {
  try {
    const currentUserId = req.session?.userId;

    await Notification.deleteMany({ recipient: currentUserId });

    return res.status(200).json({
      message: "All notifications cleared",
      unreadCount: 0,
    });
  } catch (error) {
    console.error("clearAllNotifications error:", error);
    return res.status(500).json({ message: "Failed to clear notifications" });
  }
};
