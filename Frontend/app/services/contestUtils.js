/**
 * Contest utility functions for formatting dates, checking expiry, and determining submission status
 */

export function isContestExpired(activeTill) {
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

export function hasUserSubmittedContest(contest, userId) {
  if (!contest) return false;

  // 1. Check in MongoDB contest.submissions
  if (userId && contest.submissions && Array.isArray(contest.submissions)) {
    const found = contest.submissions.some((s) => {
      const subUserId = s.userId?._id || s.userId;
      return subUserId && subUserId.toString() === userId.toString();
    });
    if (found) return true;
  }

  // 2. Check in client-side localStorage fallback
  if (typeof window !== "undefined" && contest._id) {
    try {
      const localSubKey = `fantasy_submitted_contest_${contest._id}_${userId || "guest"}`;
      if (localStorage.getItem(localSubKey)) return true;
    } catch {
      // ignore
    }
  }

  return false;
}

export function getUserSubmission(contest, userId) {
  if (!contest || !contest.submissions || !Array.isArray(contest.submissions)) return null;
  if (!userId) return null;

  return (
    contest.submissions.find((s) => {
      const subUserId = s.userId?._id || s.userId;
      return subUserId && subUserId.toString() === userId.toString();
    }) || null
  );
}

export function formatContestDateRange(startDate, activeTill) {
  const formatPart = (d) => {
    if (!d) return "";
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return "";
    const yy = String(dateObj.getFullYear()).slice(-2);
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    return `${yy}/${mm}/${dd}`;
  };

  const start = formatPart(startDate) || "23/06/01";
  const end = activeTill?.date
    ? formatPart(activeTill.date) || activeTill.date
    : "23/07/01";

  return `${start} - ${end}`;
}
