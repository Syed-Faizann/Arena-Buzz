import Contest from "../models/contest.js";
import User from "../models/user.js";

/**
 * @route   GET /api/leaderboard
 * @desc    Get dynamic leaderboard with isolated organization scores:
 *          - Scores for every organization a contestant has joined are calculated & displayed separately
 *          - Shows which contestant scored more points in each specific organization
 *          - Host can only see their own organization's contestants and who is leading
 *          - Contestants can view global rankings (with per-org scores) and filter by any joined or platform institute
 * @access  Authenticated
 */
export const getLeaderboard = async (req, res) => {
  try {
    const currentUserId = req.session?.userId;
    if (!currentUserId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const currentUser = await User.findById(currentUserId).populate(
      "joinedOrganizations",
      "firstName lastName userType organizationName organizationType avatar inviteCode"
    );

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const userRole = currentUser.userType; // 'host' | 'contestant' | 'superadmin'
    let { scope, instituteId, search } = req.query;

    // Rule: Host can ONLY see their own organization leaderboard
    if (userRole === "host") {
      scope = "institute";
      instituteId = currentUser._id.toString();
    } else if (!scope) {
      scope = "global";
    }

    const joinedOrgIds = (currentUser.joinedOrganizations || [])
      .map((o) => (o?._id ? o._id.toString() : o?.toString()))
      .filter(Boolean);

    // Load all platform host organizations + any joined organization
    const allHosts = await User.find({
      $or: [
        { userType: "host" },
        { _id: { $in: joinedOrgIds } },
      ],
    }).select(
      "firstName lastName email userType organizationName organizationType organizationDescription avatar inviteCode createdAt"
    );

    // Map of host organizations by string ID and by normalized org name
    const hostById = new Map();
    const hostByName = new Map();
    allHosts.forEach((h) => {
      hostById.set(h._id.toString(), h);
      if (h.organizationName) {
        hostByName.set(h.organizationName.trim().toLowerCase(), h);
      }
    });

    // Load all contests with submissions
    const allContests = await Contest.find({}).select(
      "name host organizationName organizationType submissions createdAt"
    );

    // Load all contestants
    const allContestants = await User.find({ userType: "contestant" })
      .select("firstName lastName email userType avatar joinedOrganizations createdAt")
      .populate("joinedOrganizations", "firstName lastName userType organizationName organizationType avatar inviteCode");

    // =========================================================================
    // PRE-COMPUTE SCORES PER ORGANIZATION FOR ALL CONTESTANTS
    // Maps: orgId -> Map(contestantId -> { points, score, contestsCount, accuracySum, lastActive })
    // =========================================================================
    const orgScoresMap = new Map(); // hostId -> Map(userId -> stats)

    allHosts.forEach((h) => {
      orgScoresMap.set(h._id.toString(), new Map());
    });

    // Seed enrolled members in each host's map
    allContestants.forEach((contestant) => {
      const cId = contestant._id.toString();
      (contestant.joinedOrganizations || []).forEach((org) => {
        if (!org || !org._id) return;
        const orgIdStr = org._id.toString();
        const map = orgScoresMap.get(orgIdStr);
        if (map && !map.has(cId)) {
          map.set(cId, {
            user: {
              _id: contestant._id,
              firstName: contestant.firstName,
              lastName: contestant.lastName,
              email: contestant.email,
              avatar: contestant.avatar || "",
            },
            points: 0,
            score: 0,
            contestsPlayed: 0,
            accuracySum: 0,
            averageAccuracy: 0,
            lastActive: contestant.createdAt,
            isEnrolled: true,
          });
        }
      });
    });

    // Process all submissions and attribute points to the host organization of each contest
    allContests.forEach((contest) => {
      let targetHostId = null;
      if (contest.host) {
        targetHostId = contest.host.toString();
      } else if (contest.organizationName) {
        const found = hostByName.get(contest.organizationName.trim().toLowerCase());
        if (found) targetHostId = found._id.toString();
      }

      if (!targetHostId || !orgScoresMap.has(targetHostId)) {
        // If unknown host, ensure map exists
        if (targetHostId && !orgScoresMap.has(targetHostId)) {
          orgScoresMap.set(targetHostId, new Map());
        } else {
          return;
        }
      }

      const map = orgScoresMap.get(targetHostId);

      (contest.submissions || []).forEach((sub) => {
        if (!sub.userId) return;
        const uId = sub.userId.toString();
        let entry = map.get(uId);

        if (!entry) {
          const contestantDoc = allContestants.find((c) => c._id.toString() === uId);
          entry = {
            user: {
              _id: sub.userId,
              firstName: contestantDoc?.firstName || sub.userName || "Contestant",
              lastName: contestantDoc?.lastName || "",
              email: contestantDoc?.email || "",
              avatar: contestantDoc?.avatar || "",
            },
            points: 0,
            score: 0,
            contestsPlayed: 0,
            accuracySum: 0,
            averageAccuracy: 0,
            lastActive: sub.submittedAt,
            isEnrolled: false,
          };
          map.set(uId, entry);
        }

        const pts = (sub.score || 0) * 10;
        entry.points += pts;
        entry.score += sub.score || 0;
        entry.contestsPlayed += 1;
        entry.accuracySum += sub.percentage || 0;
        if (
          sub.submittedAt &&
          (!entry.lastActive || new Date(sub.submittedAt) > new Date(entry.lastActive))
        ) {
          entry.lastActive = sub.submittedAt;
        }
      });
    });

    // Build ranked leaderboards and identify leaders for each organization
    const orgRankingsMap = new Map(); // hostId -> ranked array of contestants in that org
    const orgLeaderMap = new Map(); // hostId -> top performer in that org

    allHosts.forEach((host) => {
      const hId = host._id.toString();
      const map = orgScoresMap.get(hId) || new Map();
      let rankedInOrg = Array.from(map.values()).map((entry) => ({
        ...entry,
        averageAccuracy:
          entry.contestsPlayed > 0 ? Math.round(entry.accuracySum / entry.contestsPlayed) : 0,
      }));

      // Sort: points DESC -> accuracy DESC -> contests DESC
      rankedInOrg.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.averageAccuracy !== a.averageAccuracy) return b.averageAccuracy - a.averageAccuracy;
        return b.contestsPlayed - a.contestsPlayed;
      });

      rankedInOrg = rankedInOrg.map((item, idx) => ({
        ...item,
        rank: idx + 1,
        isLeading: idx === 0 && item.points > 0,
      }));

      orgRankingsMap.set(hId, rankedInOrg);
      const leader = rankedInOrg.length > 0 && rankedInOrg[0].points > 0 ? rankedInOrg[0] : null;
      orgLeaderMap.set(hId, leader);
    });

    // Summary of all available organizations with their leader and contest counts
    const availableInstitutes = allHosts.map((h) => {
      const hId = h._id.toString();
      const leader = orgLeaderMap.get(hId);
      const ranked = orgRankingsMap.get(hId) || [];
      const orgContests = allContests.filter(
        (c) =>
          (c.host && c.host.toString() === hId) ||
          (c.organizationName &&
            c.organizationName.trim().toLowerCase() === (h.organizationName || "").trim().toLowerCase())
      );

      return {
        _id: h._id,
        name: h.organizationName || `${h.firstName} ${h.lastName}'s Institute`.trim(),
        type: h.organizationType || "institute",
        avatar: h.avatar || "",
        totalMembers: ranked.length,
        totalContests: orgContests.length,
        leader: leader
          ? {
              _id: leader.user._id,
              name: `${leader.user.firstName} ${leader.user.lastName}`.trim(),
              points: leader.points,
              accuracy: leader.averageAccuracy,
            }
          : null,
      };
    });

    // =========================================================================
    // CASE 1: INSTITUTE-SPECIFIC VIEW
    // (Used when a Host views their org OR when a contestant filters by an institute)
    // =========================================================================
    if (scope === "institute" && instituteId) {
      const instituteKey = instituteId.toString().trim();
      let hostUser = hostById.get(instituteKey) || hostByName.get(instituteKey.toLowerCase());

      if (!hostUser) {
        try {
          hostUser = await User.findById(instituteKey).select(
            "firstName lastName email userType organizationName organizationType organizationDescription avatar inviteCode createdAt"
          );
        } catch {
          hostUser = null;
        }
      }

      if (!hostUser) {
        return res.status(404).json({ message: "Host organization not found" });
      }

      // If user is a contestant without organization name, only then reject
      if (hostUser.userType === "contestant" && !hostUser.organizationName) {
        return res.status(404).json({ message: "Host organization not found" });
      }

      const hId = hostUser._id.toString();
      const instituteName =
        hostUser.organizationName || `${hostUser.firstName} ${hostUser.lastName}'s Institute`.trim();

      let rankedList = [...(orgRankingsMap.get(hId) || [])];

      // Optional text search filter
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        rankedList = rankedList.filter(
          (item) =>
            `${item.user.firstName} ${item.user.lastName}`.toLowerCase().includes(q) ||
            item.user.email?.toLowerCase().includes(q)
        );
      }

      // Mark current user
      rankedList = rankedList.map((item) => ({
        ...item,
        totalPoints: item.points, // normalized field
        isCurrentUser: currentUserId.toString() === item.user._id.toString(),
      }));

      const topPerformer = orgLeaderMap.get(hId) || (rankedList.length > 0 && rankedList[0].points > 0 ? rankedList[0] : null);

      const myStanding = rankedList.find(
        (item) => item.user._id.toString() === currentUserId.toString()
      );

      const orgContests = allContests.filter(
        (c) =>
          (c.host && c.host.toString() === hId) ||
          (c.organizationName &&
            c.organizationName.trim().toLowerCase() === (hostUser.organizationName || "").trim().toLowerCase())
      );

      const totalPointsAwarded = rankedList.reduce((acc, curr) => acc + curr.points, 0);

      return res.status(200).json({
        scope: "institute",
        userRole,
        institute: {
          _id: hostUser._id,
          name: instituteName,
          type: hostUser.organizationType || "institute",
          description: hostUser.organizationDescription || "",
          avatar: hostUser.avatar || "",
          inviteCode: hostUser.inviteCode,
          hostName: `${hostUser.firstName} ${hostUser.lastName}`.trim(),
          totalMembers: rankedList.length,
          totalContests: orgContests.length,
        },
        leaderboard: rankedList,
        totalParticipants: rankedList.length,
        topThree: rankedList.slice(0, 3),
        topPerformer: topPerformer
          ? {
              ...topPerformer,
              totalPoints: topPerformer.points,
            }
          : null,
        totalPointsAwarded,
        myStanding: myStanding || null,
        isCurrentUserLeading: myStanding?.isLeading || false,
        availableInstitutes,
      });
    }

    // =========================================================================
    // CASE 2: GLOBAL LEADERBOARD (Contestants & Superadmin)
    // - Every contestant shows an organization-by-organization score breakdown
    // - Shows which contestant scored more points in each organization
    // =========================================================================
    const globalUserMap = new Map();

    allContestants.forEach((c) => {
      const cId = c._id.toString();

      // Collect scores of every organization this contestant has joined or participated in
      const contestantOrgsBreakdown = [];
      const seenOrgIds = new Set();

      (c.joinedOrganizations || []).forEach((org) => {
        if (!org || !org._id) return;
        const orgIdStr = org._id.toString();
        seenOrgIds.add(orgIdStr);
        const orgMap = orgScoresMap.get(orgIdStr);
        const userOrgEntry = orgMap ? orgMap.get(cId) : null;
        const orgLeader = orgLeaderMap.get(orgIdStr);

        // Find user rank in this org
        const allOrgRanked = orgRankingsMap.get(orgIdStr) || [];
        const rankIdx = allOrgRanked.findIndex((item) => item.user._id.toString() === cId);
        const rankInOrg = rankIdx !== -1 ? rankIdx + 1 : allOrgRanked.length + 1;

        contestantOrgsBreakdown.push({
          orgId: org._id,
          orgName: org.organizationName || `${org.firstName}'s Institute`,
          orgType: org.organizationType || "college",
          points: userOrgEntry?.points || 0,
          contestsCount: userOrgEntry?.contestsPlayed || 0,
          accuracy: userOrgEntry?.averageAccuracy || 0,
          rankInOrg,
          isLeading: rankInOrg === 1 && (userOrgEntry?.points || 0) > 0,
          leaderName: orgLeader
            ? `${orgLeader.user.firstName} ${orgLeader.user.lastName}`.trim()
            : null,
          leaderPoints: orgLeader?.points || 0,
        });
      });

      // Also include any organization where contestant has played contests even if not in joinedOrganizations
      allHosts.forEach((host) => {
        const hId = host._id.toString();
        if (seenOrgIds.has(hId)) return;
        const orgMap = orgScoresMap.get(hId);
        const userOrgEntry = orgMap ? orgMap.get(cId) : null;
        if (userOrgEntry && (userOrgEntry.points > 0 || userOrgEntry.contestsPlayed > 0)) {
          seenOrgIds.add(hId);
          const orgLeader = orgLeaderMap.get(hId);
          const allOrgRanked = orgRankingsMap.get(hId) || [];
          const rankIdx = allOrgRanked.findIndex((item) => item.user._id.toString() === cId);
          const rankInOrg = rankIdx !== -1 ? rankIdx + 1 : allOrgRanked.length + 1;

          contestantOrgsBreakdown.push({
            orgId: host._id,
            orgName: host.organizationName || `${host.firstName}'s Institute`,
            orgType: host.organizationType || "college",
            points: userOrgEntry.points,
            contestsCount: userOrgEntry.contestsPlayed,
            accuracy: userOrgEntry.averageAccuracy,
            rankInOrg,
            isLeading: rankInOrg === 1 && userOrgEntry.points > 0,
            leaderName: orgLeader
              ? `${orgLeader.user.firstName} ${orgLeader.user.lastName}`.trim()
              : null,
            leaderPoints: orgLeader?.points || 0,
          });
        }
      });

      // Sort organizations breakdown so the org where the contestant has the highest score is first
      contestantOrgsBreakdown.sort((a, b) => b.points - a.points);

      // Compute total points across all organizations
      const totalPoints = contestantOrgsBreakdown.reduce((sum, o) => sum + o.points, 0);
      const totalContests = contestantOrgsBreakdown.reduce((sum, o) => sum + o.contestsCount, 0);

      globalUserMap.set(cId, {
        user: {
          _id: c._id,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          avatar: c.avatar || "",
          organizations: contestantOrgsBreakdown,
          primaryOrg: contestantOrgsBreakdown[0] || null,
        },
        totalPoints,
        totalScore: totalPoints / 10,
        contestsPlayed: totalContests,
        accuracySum: 0,
        averageAccuracy: 0,
        perfectScores: 0,
        lastActive: c.createdAt,
      });
    });

    // Accumulate all submissions for accuracy & perfect score stats
    allContests.forEach((contest) => {
      (contest.submissions || []).forEach((sub) => {
        if (!sub.userId) return;
        const uId = sub.userId.toString();
        let entry = globalUserMap.get(uId);
        if (!entry) return;

        entry.accuracySum += sub.percentage || 0;
        if (sub.percentage === 100) entry.perfectScores += 1;
        if (
          sub.submittedAt &&
          (!entry.lastActive || new Date(sub.submittedAt) > new Date(entry.lastActive))
        ) {
          entry.lastActive = sub.submittedAt;
        }
      });
    });

    let globalList = Array.from(globalUserMap.values()).map((item) => {
      const avg =
        item.contestsPlayed > 0 ? Math.round(item.accuracySum / item.contestsPlayed) : 0;
      return {
        ...item,
        averageAccuracy: avg,
      };
    });

    // Search query filter
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      globalList = globalList.filter(
        (item) =>
          `${item.user.firstName} ${item.user.lastName}`.toLowerCase().includes(q) ||
          item.user.email?.toLowerCase().includes(q) ||
          item.user.organizations?.some((org) => org.orgName.toLowerCase().includes(q))
      );
    }

    // Sort: Total Points DESC -> Average Accuracy DESC -> Contests Played DESC
    globalList.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.averageAccuracy !== a.averageAccuracy) return b.averageAccuracy - a.averageAccuracy;
      return b.contestsPlayed - a.contestsPlayed;
    });

    // Assign global ranks
    globalList = globalList.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      isLeading: idx === 0 && item.totalPoints > 0,
      isCurrentUser: currentUserId.toString() === item.user._id.toString(),
    }));

    // Find current user's global standing
    const myGlobalStanding = globalList.find(
      (item) => item.user._id.toString() === currentUserId.toString()
    );

    // =========================================================================
    // CONTESTANT "WHERE AM I LEADING?" SUMMARY FOR ENROLLED INSTITUTES
    // =========================================================================
    const myInstitutesSummary = [];
    if (userRole === "contestant" && currentUser.joinedOrganizations?.length > 0) {
      currentUser.joinedOrganizations.forEach((hostOrg) => {
        if (!hostOrg || !hostOrg._id) return;
        const hostId = hostOrg._id.toString();
        const rankedInOrg = orgRankingsMap.get(hostId) || [];
        const myIdx = rankedInOrg.findIndex(
          (m) => m.user._id.toString() === currentUserId.toString()
        );

        const myRank = myIdx !== -1 ? myIdx + 1 : rankedInOrg.length + 1;
        const myPoints = myIdx !== -1 ? rankedInOrg[myIdx].points : 0;
        const leader = orgLeaderMap.get(hostId);
        const isLeading = myRank === 1 && myPoints > 0;
        const pointsToLead = isLeading ? 0 : Math.max(0, (leader?.points || 0) - myPoints + 10);

        myInstitutesSummary.push({
          instituteId: hostOrg._id,
          instituteName: hostOrg.organizationName || `${hostOrg.firstName}'s Institute`,
          organizationType: hostOrg.organizationType || "college",
          avatar: hostOrg.avatar || "",
          inviteCode: hostOrg.inviteCode || "",
          myRank,
          totalContestants: rankedInOrg.length,
          myPoints,
          isLeading,
          leadingContestant: leader
            ? {
                name: `${leader.user.firstName} ${leader.user.lastName}`.trim(),
                points: leader.points,
              }
            : null,
          pointsToLead,
        });
      });
    }

    return res.status(200).json({
      scope: "global",
      userRole,
      leaderboard: globalList,
      totalParticipants: globalList.length,
      topThree: globalList.slice(0, 3),
      myStanding: myGlobalStanding || null,
      myInstitutes: myInstitutesSummary,
      availableInstitutes,
    });
  } catch (error) {
    console.error("getLeaderboard error:", error);
    return res.status(500).json({ message: "Failed to load leaderboard data" });
  }
};
