"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import banner from "../../assets/banner.jpg";
import { useAuth } from "../../context/AuthContext";
import { getContests } from "../../services/api";
import {
  isContestExpired,
  hasUserSubmittedContest,
  getUserSubmission,
  formatContestDateRange,
} from "../../services/contestUtils";
import { CheckCircle2, Trophy, Clock, Loader2, Award } from "lucide-react";

const Archived = ({ contests: propContests }) => {
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id;

  const [contests, setContests] = useState(propContests || []);
  const [loading, setLoading] = useState(!propContests);
  const [filterType, setFilterType] = useState("all"); // "all" | "completed" | "expired"
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const fetchArchivedContests = async () => {
    try {
      setLoading(true);
      const data = await getContests();
      if (data && Array.isArray(data.contests)) {
        // Filter for contests that have been submitted by the current user OR are expired / marked archived
        const filtered = data.contests.filter((c) => {
          const userSubmitted = hasUserSubmittedContest(c, currentUserId);
          const expired = isContestExpired(c.activeTill);
          const isArchivedStatus = c.status === "archived";
          return userSubmitted || expired || isArchivedStatus;
        });
        setContests(filtered);
      }
    } catch (err) {
      console.error("Error fetching archived contests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propContests) {
      setContests(propContests);
      setLoading(false);
    } else {
      fetchArchivedContests();
    }
  }, [propContests, currentUserId]);

  const completedContests = contests.filter((c) =>
    hasUserSubmittedContest(c, currentUserId)
  );

  const expiredContests = contests.filter(
    (c) => isContestExpired(c.activeTill) || c.status === "archived"
  );

  const displayedContests = contests.filter((c) => {
    if (filterType === "completed") {
      return hasUserSubmittedContest(c, currentUserId);
    }
    if (filterType === "expired") {
      return isContestExpired(c.activeTill) || c.status === "archived";
    }
    return true; // "all"
  });

  const totalPages = Math.ceil(displayedContests.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentContests = displayedContests.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    document
      .getElementById("archived-top")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-[#12BAB0]">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <p className="text-sm text-gray-500 font-medium">Loading archived contests...</p>
      </div>
    );
  }

  return (
    <div className="mt-4 relative z-20">
      <div id="archived-top" className="absolute top-0 -mt-20"></div>

      {/* Sub-filter options: All, Completed, Expired */}
      {contests.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white/90 p-2.5 px-4 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">
              Filter:
            </span>

            <button
              onClick={() => {
                setFilterType("all");
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === "all"
                  ? "bg-[#010B28] text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-black"
              }`}
            >
              All Contests
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  filterType === "all"
                    ? "bg-white/20 text-white"
                    : "bg-white text-gray-700 border border-gray-200"
                }`}
              >
                {contests.length}
              </span>
            </button>

            <button
              onClick={() => {
                setFilterType("completed");
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === "completed"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  filterType === "completed"
                    ? "bg-white/20 text-white"
                    : "bg-white text-emerald-800 border border-emerald-300"
                }`}
              >
                {completedContests.length}
              </span>
            </button>

            <button
              onClick={() => {
                setFilterType("expired");
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === "expired"
                  ? "bg-gray-800 text-white shadow-xs"
                  : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Expired
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  filterType === "expired"
                    ? "bg-white/20 text-white"
                    : "bg-white text-gray-700 border border-gray-200"
                }`}
              >
                {expiredContests.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-gray-500 font-medium hidden sm:block">
            {filterType === "all" && `Showing all ${contests.length} archived contests`}
            {filterType === "completed" && `Showing ${completedContests.length} completed contest${completedContests.length === 1 ? "" : "s"}`}
            {filterType === "expired" && `Showing ${expiredContests.length} expired contest${expiredContests.length === 1 ? "" : "s"}`}
          </div>
        </div>
      )}

      {displayedContests.length === 0 ? (
        <div className="bg-[#F0F0F3] rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto my-6 border border-gray-200 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            {filterType === "completed"
              ? "No Completed Contests Yet"
              : filterType === "expired"
              ? "No Expired Contests Found"
              : "No Completed or Archived Contests Yet"}
          </h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            {filterType === "completed"
              ? "When you finish and submit a contest test, it will appear here with your score and breakdown."
              : filterType === "expired"
              ? "Contests that reach their scheduled deadline will be archived here."
              : "When you complete and submit a contest test, it will automatically move here so you can review your score, community average, and solutions."}
          </p>
          <div className="inline-block text-xs text-gray-400 bg-white border border-gray-200 px-4 py-1.5 rounded-full">
            💡 Head to the Ongoing tab to take an active test
          </div>
        </div>
      ) : (
        currentContests.map((contest, index) => {
          const userSub = getUserSubmission(contest, currentUserId);
          const userSubmitted = hasUserSubmittedContest(contest, currentUserId);
          const expired = isContestExpired(contest.activeTill);
          const dateRangeText = formatContestDateRange(
            contest.startDate || contest.createdAt,
            contest.activeTill
          );

          return (
            <div
              key={contest._id || contest.id || index}
              className="bg-[#F0F0F3] rounded-2xl shadow-sm flex flex-col md:flex-row justify-between mb-6 overflow-hidden hover:shadow-md transition-all duration-300 border border-transparent hover:border-gray-300"
            >
              <div className="p-4 md:p-6 flex flex-col justify-between flex-1">
                <div>
                  {/* Title & Date Range */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <h2 className="text-base md:text-lg flex flex-wrap items-center gap-1 sm:gap-2 text-[#282828]">
                      <span className="text-lg sm:text-xl md:text-2xl font-bold">
                        {contest.name || contest.title || `Contest ${index + 1}`}
                      </span>
                      <span className="text-[11px] sm:text-base md:text-xl text-[#4C4D4E]">
                        | {dateRangeText}
                      </span>
                    </h2>

                    {/* Status Pill */}
                    {userSubmitted && userSub ? (
                      <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-300 w-fit">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        Completed • Score: {userSub.score}/{userSub.totalQuestions} ({userSub.percentage}%)
                      </span>
                    ) : expired ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-gray-200 text-gray-700 font-semibold px-2.5 py-1 rounded-full w-fit">
                        <Clock className="w-3.5 h-3.5 text-gray-500" /> Contest Expired
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-sky-100 text-sky-800 font-semibold px-2.5 py-0.5 rounded-full w-fit">
                        Completed
                      </span>
                    )}
                  </div>

                  {/* Description / Summary */}
                  <p className="text-[#282828] text-xs md:text-sm mt-2 line-clamp-2">
                    {userSub
                      ? `You scored ${userSub.score} out of ${userSub.totalQuestions} questions (${userSub.percentage}%). Click "See Details" to review your answers, correct solutions, and community stats.`
                      : contest.description
                      ? contest.description
                      : expired
                      ? `${contest.questions?.length || 0} Questions • Contest has expired and is now closed.`
                      : `${contest.questions?.length || 0} Questions`}
                  </p>
                </div>

                {/* Link to Contest Results */}
                <div className="mt-4 pt-3 border-t border-gray-200/60 flex items-center justify-between">
                  {userSubmitted ? (
                    <Link
                      href={`/dashboard/contest/${contest._id || contest.id}`}
                      className="text-[#12BAB0] text-xs md:text-sm font-bold underline hover:text-[#0fa89f] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Award className="w-4 h-4 text-[#12BAB0]" />
                      See Details & Review Solutions
                    </Link>
                  ) : (
                    <span className="text-gray-500 text-xs font-semibold inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      Contest Closed • Cannot Be Attempted
                    </span>
                  )}

                  <span className="text-xs text-gray-400">
                    {contest.questions?.length || 0} Questions
                  </span>
                </div>
              </div>

              {/* Banner Thumbnail */}
              <div className="relative w-full md:w-[233px] h-[140px] sm:h-[160px] md:min-h-[160px] bg-gray-200 flex-shrink-0">
                {contest.image ? (
                  <img
                    src={contest.image}
                    alt={contest.name || "Contest"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image
                    src={banner}
                    alt={contest.name || "Contest"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 100vw, 233px"
                  />
                )}
              </div>
            </div>
          );
        })
      )}

      {totalPages > 1 && (
        <div className="flex flex-wrap gap-2 mt-8 justify-center">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                currentPage === page
                  ? "bg-[#010B28] text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Archived;
