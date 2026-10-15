import Contest from "../models/contest.js";
import User from "../models/user.js";
import Notification from "../models/notification.js";
import { uploadToImageKit } from "../lib/imagekit.js";
import { checkSubscriptionStatus } from "../lib/subscription.js";

// @route   POST /api/contests
export const createContest = async (req, res) => {
  try {
    const { name, image, activeTill, questions, organizationName, organizationType } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Contest name is required" });
    }

    if (!req.session?.userId) {
      return res.status(401).json({ message: "You must be logged in to create a contest" });
    }

    const hostUser = await User.findById(req.session.userId);
    if (!hostUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Enforce 3 free trial contests & subscription expiration checks for hosts
    if (hostUser.userType === "host") {
      const subStatus = await checkSubscriptionStatus(hostUser);
      if (!subStatus.canCreateContest) {
        return res.status(403).json({
          message: subStatus.blockReason,
          code: "SUBSCRIPTION_REQUIRED",
          subStatus,
        });
      }
    }

    // Resolve host organization details
    let finalOrgName = (organizationName || "").trim();
    let finalOrgType = (organizationType || "college").trim();

    if (hostUser) {
      if (!finalOrgName && hostUser.organizationName) {
        finalOrgName = hostUser.organizationName;
      }
      if (!finalOrgType && hostUser.organizationType) {
        finalOrgType = hostUser.organizationType;
      }

      // If host provided an organizationName and their profile doesn't have one, sync it
      if (finalOrgName && (!hostUser.organizationName || !hostUser.organizationType)) {
        if (!hostUser.organizationName) hostUser.organizationName = finalOrgName;
        if (!hostUser.organizationType) hostUser.organizationType = finalOrgType;
        await hostUser.save();
      }
    }

    // Filter and sanitize questions
    const validQuestions = Array.isArray(questions)
      ? questions
          .filter((q) => q && q.question && q.question.trim())
          .map((q) => ({
            question: q.question.trim(),
            options: Array.isArray(q.options)
              ? q.options.filter((opt) => opt && opt.trim())
              : [],
            correctAnswer: q.correctAnswer || (Array.isArray(q.options) && q.options[0]) || "",
            activeTill: q.activeTill || { date: "", time: "" },
            timer: q.timer ? Number(q.timer) : 30,
            source: q.source || "",
          }))
      : [];

    const newContest = await Contest.create({
      name: name.trim(),
      image: image || "",
      activeTill: activeTill || { date: "", time: "" },
      host: req.session?.userId || null,
      organizationName: finalOrgName,
      organizationType: finalOrgType,
      status: "ongoing",
      questions: validQuestions,
    });

    // Notify all contestants who are members of this host organization
    if (hostUser) {
      try {
        const memberContestants = await User.find({
          userType: "contestant",
          joinedOrganizations: hostUser._id,
        }).select("_id");

        if (memberContestants && memberContestants.length > 0) {
          const orgDisplayName =
            finalOrgName ||
            hostUser.organizationName ||
            `${hostUser.firstName || ""} ${hostUser.lastName || ""}`.trim() ||
            "Your Organization";

          const notificationDocs = memberContestants.map((c) => ({
            recipient: c._id,
            sender: hostUser._id,
            type: "new_contest",
            title: `New Contest: ${newContest.name}`,
            message: `${orgDisplayName} posted a new contest "${newContest.name}". Jump in and compete!`,
            link: "/dashboard",
            metadata: {
              contestId: newContest._id,
              organizationName: orgDisplayName,
              hostId: hostUser._id,
            },
          }));

          await Notification.insertMany(notificationDocs);
        }
      } catch (notifError) {
        console.error("Error creating member contest notifications:", notifError);
      }
    }

    return res.status(201).json({
      message: "Contest created successfully",
      contest: newContest,
    });
  } catch (error) {
    console.error("createContest error:", error);
    return res.status(500).json({ message: error.message || "Failed to create contest" });
  }
};

// @route   GET /api/contests
export const getContests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    const currentUserId = req.session?.userId;
    let currentUser = null;
    if (currentUserId) {
      currentUser = await User.findById(currentUserId);
    }

    // Institute membership filtering:
    // Contestants ONLY see contests from institutes/hosts they have joined
    if (currentUser && currentUser.userType === "contestant") {
      const joinedHostIds = (currentUser.joinedOrganizations || []).map((id) =>
        id?._id ? id._id : id
      );
      filter.host = { $in: joinedHostIds };
    } else if (currentUser && currentUser.userType === "host") {
      // Hosts see contests they posted
      filter.host = currentUser._id;
    } else if (!currentUser || !currentUserId) {
      // Unauthenticated users see 0 private institute contests
      filter.host = { $in: [] };
    }
    // Superadmin has no filter.host applied, allowing full supervision

    const contests = await Contest.find(filter)
      .populate("host", "firstName lastName email avatar organizationName organizationType inviteCode")
      .sort({ createdAt: -1 });

    return res.status(200).json({ contests });
  } catch (error) {
    console.error("getContests error:", error);
    return res.status(500).json({ message: "Failed to fetch contests" });
  }
};

// @route   GET /api/contests/:id
export const getContestById = async (req, res) => {
  try {
    const { id } = req.params;
    const contest = await Contest.findById(id).populate(
      "host",
      "firstName lastName email avatar organizationName organizationType inviteCode"
    );

    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    const currentUserId = req.session?.userId;
    if (!currentUserId) {
      return res.status(401).json({ message: "Please log in to view this contest." });
    }

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(401).json({ message: "User not found." });
    }

    // If contestant, verify they have joined this host's institute
    if (currentUser.userType === "contestant") {
      if (!contest.host) {
        return res.status(403).json({
          message: "Access denied. This contest is not associated with an institute you have joined.",
          restricted: true,
        });
      }
      const contestHostIdStr = (contest.host._id || contest.host).toString();
      const hasJoined = (currentUser.joinedOrganizations || []).some(
        (orgId) => (orgId?._id || orgId).toString() === contestHostIdStr
      );

      if (!hasJoined) {
        return res.status(403).json({
          message: `Access denied. This contest is exclusively for contestants who joined ${
            contest.organizationName || contest.host.organizationName || "this institute"
          }. No other contestant can view or attempt it.`,
          restricted: true,
          instituteName: contest.organizationName || contest.host?.organizationName,
          inviteCode: contest.host?.inviteCode,
        });
      }
    }

    return res.status(200).json({ contest });
  } catch (error) {
    console.error("getContestById error:", error);
    return res.status(500).json({ message: "Failed to fetch contest" });
  }
};

// @route   POST /api/contests/upload-image
export const uploadContestImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const { url, fileId, provider } = await uploadToImageKit(
      req.file.buffer,
      req.file.originalname,
      "/fantasy_buzz/contests",
      req.file.mimetype
    );

    return res.status(200).json({
      message: "Contest image uploaded successfully",
      url,
      fileId,
      provider,
    });
  } catch (error) {
    console.error("uploadContestImage error:", error);
    return res.status(500).json({ message: error.message || "Failed to upload image" });
  }
};

// @route   PUT /api/contests/:id
export const updateContest = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const currentUserId = req.session?.userId;

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    const isSuperAdmin = req.session?.user?.userType === "superadmin";
    const isCreator =
      currentUserId && contest.host && contest.host.toString() === currentUserId.toString();

    if (!isCreator && !isSuperAdmin) {
      return res.status(403).json({
        message: "Access denied. Only the host who created this contest can edit it.",
      });
    }

    const updatedContest = await Contest.findByIdAndUpdate(id, updates, { new: true });
    return res.status(200).json({ message: "Contest updated successfully", contest: updatedContest });
  } catch (error) {
    console.error("updateContest error:", error);
    return res.status(500).json({ message: "Failed to update contest" });
  }
};

// @route   DELETE /api/contests/:id
export const deleteContest = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.session?.userId;

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    const isSuperAdmin = req.session?.user?.userType === "superadmin";
    const isCreator =
      currentUserId && contest.host && contest.host.toString() === currentUserId.toString();

    if (!isCreator && !isSuperAdmin) {
      return res.status(403).json({
        message: "Access denied. Only the host who created this contest can delete it.",
      });
    }

    await Contest.findByIdAndDelete(id);
    return res.status(200).json({ message: "Contest deleted successfully" });
  } catch (error) {
    console.error("deleteContest error:", error);
    return res.status(500).json({ message: "Failed to delete contest" });
  }
};

// @route   PUT /api/contests/:id/questions/:questionId
export const updateContestQuestion = async (req, res) => {
  try {
    const { id, questionId } = req.params;
    const updatedData = req.body;
    const currentUserId = req.session?.userId;

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    // Only the host who created this contest (or superadmin) can edit its questions
    const isSuperAdmin = req.session?.user?.userType === "superadmin";
    const isCreator =
      currentUserId && contest.host && contest.host.toString() === currentUserId.toString();

    if (!isCreator && !isSuperAdmin) {
      return res.status(403).json({
        message: "Access denied. Only the host who created this contest can edit its questions.",
      });
    }

    const question = contest.questions.id(questionId);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    if (updatedData.question !== undefined) question.question = updatedData.question;
    if (updatedData.options !== undefined) question.options = updatedData.options;
    if (updatedData.activeTill !== undefined) question.activeTill = updatedData.activeTill;
    if (updatedData.timer !== undefined) question.timer = Number(updatedData.timer);
    if (updatedData.source !== undefined) question.source = updatedData.source;
    if (updatedData.correctAnswer !== undefined) question.correctAnswer = updatedData.correctAnswer;

    await contest.save();

    return res.status(200).json({
      message: "Question updated successfully",
      question,
      contest,
    });
  } catch (error) {
    console.error("updateContestQuestion error:", error);
    return res.status(500).json({ message: "Failed to update question" });
  }
};

// @route   DELETE /api/contests/:id/questions/:questionId
export const deleteContestQuestion = async (req, res) => {
  try {
    const { id, questionId } = req.params;
    const currentUserId = req.session?.userId;

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    // Only the host who created this contest (or superadmin) can delete its questions
    const isSuperAdmin = req.session?.user?.userType === "superadmin";
    const isCreator =
      currentUserId && contest.host && contest.host.toString() === currentUserId.toString();

    if (!isCreator && !isSuperAdmin) {
      return res.status(403).json({
        message: "Access denied. Only the host who created this contest can delete its questions.",
      });
    }

    contest.questions.pull({ _id: questionId });
    await contest.save();

    return res.status(200).json({
      message: "Question deleted successfully",
      contest,
    });
  } catch (error) {
    console.error("deleteContestQuestion error:", error);
    return res.status(500).json({ message: "Failed to delete question" });
  }
};

function isContestExpired(activeTill) {
  if (!activeTill) return false;
  const dateStr = typeof activeTill === "string" ? activeTill : activeTill.date;
  if (!dateStr) return false;

  try {
    const timeStr = (typeof activeTill === "object" && activeTill.time) || "23:59:59";
    const target = new Date(`${dateStr}T${timeStr}`);
    if (isNaN(target.getTime())) return false;
    return target - new Date() <= 0;
  } catch {
    return false;
  }
}

// @route   POST /api/contests/:id/questions/:questionId/answer
export const submitQuestionAnswer = async (req, res) => {
  try {
    const { id, questionId } = req.params;
    const { selectedOption } = req.body;

    if (!selectedOption) {
      return res.status(400).json({ message: "Please select an option" });
    }

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    // Expired contests cannot be answered or re-attempted
    if (contest.status === "archived" || isContestExpired(contest.activeTill)) {
      return res.status(400).json({
        message: "This contest has expired and can no longer be submitted or re-attempted.",
      });
    }

    const userId = req.session?.userId || null;

    // Check if user already submitted this contest
    if (userId && contest.submissions && contest.submissions.length > 0) {
      const alreadySubmitted = contest.submissions.some(
        (s) => s.userId && s.userId.toString() === userId.toString()
      );
      if (alreadySubmitted) {
        return res.status(400).json({
          message: "You have already completed this contest. Retakes are not allowed.",
        });
      }
    }

    const question = contest.questions.id(questionId);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Membership check: contestants can only answer questions from institutes they joined
    if (userId) {
      const currentUser = await User.findById(userId);
      if (currentUser && currentUser.userType === "contestant") {
        if (!contest.host) {
          return res.status(403).json({
            message: "Access denied. You must join this institute to answer its contest questions.",
          });
        }
        const contestHostIdStr = (contest.host._id || contest.host).toString();
        const hasJoined = (currentUser.joinedOrganizations || []).some(
          (orgId) => (orgId?._id || orgId).toString() === contestHostIdStr
        );
        if (!hasJoined) {
          return res.status(403).json({
            message: "Access denied. You must join this institute to answer its contest questions.",
          });
        }
      }
    }

    if (!question.answers) {
      question.answers = [];
    }

    const existingAnswerIndex = userId
      ? question.answers.findIndex((a) => a.userId && a.userId.toString() === userId.toString())
      : -1;

    if (existingAnswerIndex !== -1) {
      question.answers[existingAnswerIndex].selectedOption = selectedOption;
      question.answers[existingAnswerIndex].submittedAt = new Date();
    } else {
      question.answers.push({
        userId,
        selectedOption,
        submittedAt: new Date(),
      });
    }

    await contest.save();

    return res.status(200).json({
      message: "Answer submitted successfully",
      selectedOption,
      questionId,
    });
  } catch (error) {
    console.error("submitQuestionAnswer error:", error);
    return res.status(500).json({ message: "Failed to submit answer" });
  }
};

// @route   POST /api/contests/:id/submit
export const submitWholeContest = async (req, res) => {
  try {
    const { id } = req.params;
    const { userAnswers } = req.body; // { [questionId]: selectedOption }
    const userId = req.session?.userId;

    if (!userAnswers || typeof userAnswers !== "object") {
      return res.status(400).json({ message: "Invalid user answers payload" });
    }

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    // Membership check: contestants can only attempt/submit contests from institutes they joined
    if (userId) {
      const currentUser = await User.findById(userId);
      if (currentUser && currentUser.userType === "contestant") {
        if (!contest.host) {
          return res.status(403).json({
            message: "Access denied. You must join this institute to attempt or submit this contest.",
          });
        }
        const contestHostIdStr = (contest.host._id || contest.host).toString();
        const hasJoined = (currentUser.joinedOrganizations || []).some(
          (orgId) => (orgId?._id || orgId).toString() === contestHostIdStr
        );
        if (!hasJoined) {
          return res.status(403).json({
            message: "Access denied. You must join this institute to attempt or submit this contest.",
          });
        }
      }
    }

    // Expired contests cannot be submitted or re-attempted
    if (contest.status === "archived" || isContestExpired(contest.activeTill)) {
      return res.status(400).json({
        message: "This contest has expired and can no longer be submitted or re-attempted.",
      });
    }

    const total = contest.questions.length;
    let correctCount = 0;

    const breakdown = contest.questions.map((q) => {
      const qIdStr = q._id.toString();
      const chosen = userAnswers[qIdStr] || "";
      const expected = q.correctAnswer || (q.options && q.options[0]) || "";
      const isCorrect = Boolean(chosen && chosen.trim() === expected.trim());

      if (isCorrect) correctCount++;

      return {
        questionId: qIdStr,
        question: q.question,
        options: q.options,
        chosenOption: chosen,
        correctAnswer: expected,
        isCorrect,
        source: q.source || "",
      };
    });

    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const userName = req.session?.user
      ? `${req.session.user.firstName} ${req.session.user.lastName}`
      : "Contestant";

    if (!contest.submissions) {
      contest.submissions = [];
    }

    // Save contestant's score - disallow retakes
    const existingIndex = userId
      ? contest.submissions.findIndex((s) => s.userId && s.userId.toString() === userId.toString())
      : -1;

    if (existingIndex !== -1) {
      return res.status(400).json({
        message: "You have already completed this contest. Retakes are not allowed.",
        submission: contest.submissions[existingIndex],
      });
    }

    const submissionData = {
      userId,
      userName,
      score: correctCount,
      totalQuestions: total,
      percentage,
      answers: userAnswers,
      submittedAt: new Date(),
    };

    contest.submissions.push(submissionData);

    await contest.save();

    // Calculate community contest average
    const allPercentages = contest.submissions.map((s) => s.percentage || 0);
    const averageScore =
      allPercentages.length > 0
        ? Math.round(allPercentages.reduce((a, b) => a + b, 0) / allPercentages.length)
        : percentage;

    return res.status(200).json({
      message: "Contest submitted successfully!",
      score: correctCount,
      totalQuestions: total,
      percentage,
      averageScore,
      totalContestants: contest.submissions.length,
      breakdown,
    });
  } catch (error) {
    console.error("submitWholeContest error:", error);
    return res.status(500).json({ message: error.message || "Failed to submit contest" });
  }
};

// @route   GET /api/contests/:id/results
export const getContestResults = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session?.userId;

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    // Membership check: contestants can only view results from institutes they joined
    if (userId) {
      const currentUser = await User.findById(userId);
      if (currentUser && currentUser.userType === "contestant") {
        if (!contest.host) {
          return res.status(403).json({
            message: "Access denied. You have not joined this institute.",
          });
        }
        const contestHostIdStr = (contest.host._id || contest.host).toString();
        const hasJoined = (currentUser.joinedOrganizations || []).some(
          (orgId) => (orgId?._id || orgId).toString() === contestHostIdStr
        );
        if (!hasJoined) {
          return res.status(403).json({
            message: "Access denied. You have not joined this institute.",
          });
        }
      }
    }

    const allPercentages = (contest.submissions || []).map((s) => s.percentage || 0);
    const averageScore =
      allPercentages.length > 0
        ? Math.round(allPercentages.reduce((a, b) => a + b, 0) / allPercentages.length)
        : 0;

    const userSubmission = userId
      ? (contest.submissions || []).find(
          (s) => s.userId && s.userId.toString() === userId.toString()
        )
      : null;

    let breakdown = null;
    if (userSubmission && userSubmission.answers) {
      breakdown = contest.questions.map((q) => {
        const qIdStr = q._id.toString();
        const chosen = userSubmission.answers[qIdStr] || "";
        const expected = q.correctAnswer || (q.options && q.options[0]) || "";
        return {
          questionId: qIdStr,
          question: q.question,
          options: q.options,
          chosenOption: chosen,
          correctAnswer: expected,
          isCorrect: Boolean(chosen && chosen.trim() === expected.trim()),
          source: q.source || "",
        };
      });
    }

    return res.status(200).json({
      contest: {
        _id: contest._id,
        name: contest.name,
        image: contest.image,
        totalQuestions: contest.questions.length,
        totalContestants: (contest.submissions || []).length,
      },
      averageScore,
      userSubmission: userSubmission
        ? {
            score: userSubmission.score,
            totalQuestions: userSubmission.totalQuestions,
            percentage: userSubmission.percentage,
            submittedAt: userSubmission.submittedAt,
            breakdown,
          }
        : null,
    });
  } catch (error) {
    console.error("getContestResults error:", error);
    return res.status(500).json({ message: "Failed to fetch contest results" });
  }
};


