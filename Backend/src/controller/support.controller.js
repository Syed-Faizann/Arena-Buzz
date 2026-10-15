import SupportTicket from "../models/support.js";
import User from "../models/user.js";
import Notification from "../models/notification.js";
import { uploadToImageKit } from "../lib/imagekit.js";

/**
 * @route   POST /api/support
 * @desc    Submit a feedback or support issue ticket (Contestant or Host) with optional image attachment
 * @access  Authenticated
 */
export const createSupportTicket = async (req, res) => {
  try {
    const currentUserId = req.session.userId;
    const { subject, category, priority, description } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ message: "Subject is required" });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ message: "Description is required" });
    }

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let attachmentUrl = "";
    let attachmentFileId = "";

    // If an image was attached, upload it to ImageKit
    if (req.file) {
      try {
        const uploadResult = await uploadToImageKit(
          req.file.buffer,
          `support_${Date.now()}_${req.file.originalname || "attachment"}`,
          "/fantasy_buzz/support",
          req.file.mimetype
        );
        attachmentUrl = uploadResult.url;
        attachmentFileId = uploadResult.fileId;
      } catch (uploadError) {
        console.error("Support ticket attachment upload failed:", uploadError);
        return res.status(500).json({
          message: uploadError.message || "Failed to upload image attachment",
        });
      }
    }

    const ticket = await SupportTicket.create({
      user: user._id,
      userName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
      userEmail: user.email,
      userRole: user.userType || "contestant",
      subject: subject.trim(),
      category: category || "bug",
      priority: priority || "medium",
      description: description.trim(),
      attachmentUrl,
      attachmentFileId,
      status: "pending",
    });

    return res.status(201).json({
      message: "Your ticket has been submitted successfully. Our team will review it shortly.",
      ticket,
    });
  } catch (error) {
    console.error("createSupportTicket error:", error);
    return res.status(500).json({ message: "Failed to submit support ticket" });
  }
};

/**
 * @route   GET /api/support/my-tickets
 * @desc    Retrieve tickets submitted by currently logged-in user
 * @access  Authenticated
 */
export const getMyTickets = async (req, res) => {
  try {
    const currentUserId = req.session.userId;

    const tickets = await SupportTicket.find({ user: currentUserId }).sort({
      createdAt: -1,
    });

    return res.status(200).json({ tickets });
  } catch (error) {
    console.error("getMyTickets error:", error);
    return res.status(500).json({ message: "Failed to load support tickets" });
  }
};

/**
 * @route   GET /api/support/admin/all
 * @desc    Get all support tickets with filtering, search, and metrics (Super Admin only)
 * @access  Super Admin
 */
export const getAllTicketsAdmin = async (req, res) => {
  try {
    const { status, category, priority, role, search } = req.query;

    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (category && category !== "all") {
      query.category = category;
    }

    if (priority && priority !== "all") {
      query.priority = priority;
    }

    if (role && role !== "all") {
      query.userRole = role;
    }

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { subject: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { userName: { $regex: q, $options: "i" } },
        { userEmail: { $regex: q, $options: "i" } },
      ];
    }

    const [tickets, totalCount, pendingCount, inReviewCount, resolvedCount, closedCount] =
      await Promise.all([
        SupportTicket.find(query)
          .populate("user", "firstName lastName email avatar userType organizationName")
          .populate("respondedBy", "firstName lastName email")
          .sort({ createdAt: -1 }),
        SupportTicket.countDocuments(),
        SupportTicket.countDocuments({ status: "pending" }),
        SupportTicket.countDocuments({ status: "in_review" }),
        SupportTicket.countDocuments({ status: "resolved" }),
        SupportTicket.countDocuments({ status: "closed" }),
      ]);

    return res.status(200).json({
      tickets,
      metrics: {
        total: totalCount,
        pending: pendingCount,
        inReview: inReviewCount,
        resolved: resolvedCount,
        closed: closedCount,
      },
    });
  } catch (error) {
    console.error("getAllTicketsAdmin error:", error);
    return res.status(500).json({ message: "Failed to retrieve support tickets" });
  }
};

/**
 * @route   PATCH /api/support/admin/:id
 * @desc    Update ticket status and/or add admin response resolution (Super Admin only)
 * @access  Super Admin
 */
export const updateTicketAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminResponse } = req.body;
    const adminUserId = req.session.userId;

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (status && ["pending", "in_review", "resolved", "closed"].includes(status)) {
      ticket.status = status;
    }

    if (adminResponse !== undefined) {
      ticket.adminResponse = adminResponse.trim();
      ticket.respondedAt = new Date();
      ticket.respondedBy = adminUserId;
    }

    await ticket.save();

    // Send in-app notification to ticket author (Host or Contestant)
    try {
      if (ticket.user) {
        const isResolved = ticket.status === "resolved";
        const trimmedResp = ticket.adminResponse ? ticket.adminResponse.trim() : "";
        const previewResp = trimmedResp
          ? ` — Resolution: "${trimmedResp.slice(0, 150)}${trimmedResp.length > 150 ? "..." : ""}"`
          : "";

        const notifTitle = isResolved
          ? `Support Issue Resolved: ${ticket.subject}`
          : `Support Ticket Updated: ${ticket.subject}`;

        const notifMessage = isResolved
          ? `Super Admin marked your support ticket "${ticket.subject}" as resolved${previewResp}`
          : `Super Admin updated your ticket status to "${ticket.status.replace("_", " ")}"${previewResp}`;

        await Notification.create({
          recipient: ticket.user,
          sender: adminUserId || null,
          type: isResolved ? "support_resolved" : "support_update",
          title: notifTitle,
          message: notifMessage,
          link: "/dashboard/support",
          metadata: {
            ticketId: ticket._id,
            status: ticket.status,
            category: ticket.category,
            priority: ticket.priority,
            hasAdminResponse: Boolean(ticket.adminResponse),
          },
        });
      }
    } catch (notifErr) {
      console.error("Failed to create support ticket resolution notification:", notifErr);
    }

    const populated = await SupportTicket.findById(id)
      .populate("user", "firstName lastName email avatar userType organizationName")
      .populate("respondedBy", "firstName lastName email");

    return res.status(200).json({
      message: "Ticket updated successfully",
      ticket: populated,
    });
  } catch (error) {
    console.error("updateTicketAdmin error:", error);
    return res.status(500).json({ message: "Failed to update support ticket" });
  }
};

/**
 * @route   DELETE /api/support/admin/:id
 * @desc    Delete a support ticket (Super Admin only)
 * @access  Super Admin
 */
export const deleteTicketAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await SupportTicket.findByIdAndDelete(id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    return res.status(200).json({ message: "Ticket deleted successfully" });
  } catch (error) {
    console.error("deleteTicketAdmin error:", error);
    return res.status(500).json({ message: "Failed to delete ticket" });
  }
};
