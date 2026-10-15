"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Bell,
  ChevronDown,
  Camera,
  Upload,
  User,
  Mail,
  Shield,
  CheckCircle2,
  LogOut,
  Edit3,
  Check,
  X,
  Loader2,
  Crown,
  Sparkles,
  ExternalLink,
  PlusCircle,
  Building2,
  Trophy,
  LifeBuoy,
  ArrowRight,
  CheckCheck,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../services/api";

export default function AccountDropdown() {
  const { user, logout, uploadAvatar, updateProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editOrgName, setEditOrgName] = useState("");
  const [editOrgType, setEditOrgType] = useState("college");
  const [editCustomOrgType, setEditCustomOrgType] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);
  const notifRef = useRef(null);

  // Fetch live notifications
  const loadHeaderNotifications = async () => {
    if (!user) return;
    try {
      const res = await getUserNotifications("all");
      if (res && res.notifications) {
        setNotifications(res.notifications);
        setUnreadNotifsCount(res.unreadCount ?? 0);
      }
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    loadHeaderNotifications();
  }, [user]);

  // Sync edit form with current user
  useEffect(() => {
    if (user) {
      setEditFirstName(user.firstName || "");
      setEditLastName(user.lastName || "");
      setEditOrgName(user.organizationName || "");
      const standardTypes = ["school", "college", "university", "institute", "company"];
      const loadedType = user.organizationType || "college";
      const isStandard = standardTypes.includes(loadedType.toLowerCase());
      setEditOrgType(isStandard ? loadedType.toLowerCase() : "other");
      if (!isStandard && loadedType) {
        setEditCustomOrgType(loadedType);
      }
    }
  }, [user]);

  // Close dropdown on outside click or escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsEditing(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsEditing(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({ type: "error", text: "Image must be under 5MB" });
      setTimeout(() => setStatusMessage(null), 4000);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatusMessage({ type: "error", text: "Please select an image file" });
      setTimeout(() => setStatusMessage(null), 4000);
      return;
    }

    try {
      setIsUploading(true);
      setStatusMessage(null);
      const res = await uploadAvatar(file);
      setStatusMessage({
        type: "success",
        text: res?.provider === "local_base64"
          ? "Photo updated! (Add ImageKit keys to .env for CDN hosting)"
          : "Photo uploaded to ImageKit successfully!",
      });
      setTimeout(() => setStatusMessage(null), 4500);
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to upload photo",
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsUploading(false);
      // Reset input value so same file can be picked again if desired
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editFirstName.trim() || !editLastName.trim()) {
      setStatusMessage({ type: "error", text: "First and last name cannot be empty" });
      return;
    }

    try {
      setIsSavingProfile(true);
      const resolvedOrgType =
        editOrgType === "other" && editCustomOrgType.trim()
          ? editCustomOrgType.trim()
          : editOrgType;

      const profilePayload = {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
      };

      if (isHost) {
        profilePayload.organizationName = editOrgName.trim();
        profilePayload.organizationType = resolvedOrgType;
      }

      await updateProfile(profilePayload);
      setIsEditing(false);
      setStatusMessage({ type: "success", text: "Account details updated!" });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message || "Failed to update profile" });
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const userInitials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase()
    : "FB";
  const fullName = user ? `${user.firstName} ${user.lastName}` : "Fantasy Buzz";
  const isSuperAdmin = user?.userType === "superadmin";
  const isHost = user?.userType === "host";

  return (
    <div className="flex items-center gap-3 relative select-none">
      {/* Hidden File Input for ImageKit Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
      />

      {/* Notification Bell */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => {
            setShowNotifications(!showNotifications);
            if (!showNotifications) loadHeaderNotifications();
          }}
          className="relative p-2.5 rounded-xl hover:bg-white text-gray-500 hover:text-[#010B28] transition-all duration-200 border border-transparent hover:border-gray-200/80 hover:shadow-sm cursor-pointer group"
          title="Notifications"
        >
          <Bell className="w-5 h-5 transition-transform group-hover:scale-110" />
          {unreadNotifsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#12BAB0] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#12BAB0]"></span>
            </span>
          )}
        </button>

        {/* Notifications Popover */}
        {showNotifications && (
          <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-[#010B28]">Notifications</span>
                {unreadNotifsCount > 0 && (
                  <span className="text-[10px] text-[#12BAB0] font-bold bg-[#12BAB0]/10 px-2 py-0.5 rounded-full">
                    {unreadNotifsCount} new
                  </span>
                )}
              </div>

              {unreadNotifsCount > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    await markAllNotificationsAsRead().catch(() => {});
                    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                    setUnreadNotifsCount(0);
                  }}
                  className="text-[11px] text-gray-500 hover:text-[#12BAB0] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            {/* Notification items list */}
            <div className="py-2 space-y-2 max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-xs">
                  <Bell className="w-8 h-8 text-gray-300 mx-auto mb-1.5" />
                  <p className="font-medium">No notifications yet</p>
                </div>
              ) : (
                notifications.slice(0, 4).map((notif) => {
                  const isContest = notif.type === "new_contest";
                  const isSupport =
                    notif.type === "support_resolved" || notif.type === "support_update";

                  return (
                    <Link
                      key={notif._id}
                      href={notif.link || "/dashboard/notifications"}
                      onClick={async () => {
                        setShowNotifications(false);
                        if (!notif.read) {
                          await markNotificationAsRead(notif._id).catch(() => {});
                          setUnreadNotifsCount((c) => Math.max(0, c - 1));
                        }
                      }}
                      className={`block p-2.5 rounded-2xl transition-colors ${
                        notif.read
                          ? "hover:bg-gray-50 text-gray-600"
                          : "bg-teal-50/40 hover:bg-teal-50/70 text-gray-900 border border-teal-100/60"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isContest
                              ? "bg-amber-100 text-amber-600"
                              : isSupport
                              ? "bg-teal-100 text-[#12BAB0]"
                              : "bg-purple-100 text-purple-600"
                          }`}
                        >
                          {isContest ? (
                            <Trophy className="w-4 h-4" />
                          ) : isSupport ? (
                            <LifeBuoy className="w-4 h-4" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate">{notif.title}</p>
                          <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5 leading-snug">
                            {notif.message}
                          </p>
                          <span className="text-[9px] text-gray-400 mt-1 block font-medium">
                            {notif.createdAt
                              ? new Date(notif.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Recently"}
                          </span>
                        </div>

                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-[#12BAB0] mt-1 shrink-0"></span>
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

            {/* View all button */}
            <div className="pt-2 border-t border-gray-100 text-center">
              <Link
                href="/dashboard/notifications"
                onClick={() => setShowNotifications(false)}
                className="inline-flex items-center gap-1.5 text-xs text-[#12BAB0] font-bold hover:underline py-1"
              >
                <span>View Full Notification Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Modern Gradient Divider */}
      <div className="h-7 w-[1px] bg-gradient-to-b from-transparent via-gray-300 to-transparent mx-1"></div>

      {/* Main Profile Trigger & Dropdown Container */}
      <div className="relative" ref={dropdownRef}>
        {/* Cool Profile Trigger Pill */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-3 p-1.5 pr-3.5 rounded-full transition-all duration-200 cursor-pointer text-left border ${
            isOpen
              ? "bg-white shadow-md border-gray-200 ring-2 ring-[#12BAB0]/20"
              : "hover:bg-white hover:shadow-sm border-transparent hover:border-gray-200/80"
          }`}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          {/* Avatar with Ring & Status Indicator */}
          <div className="relative flex-shrink-0">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={fullName}
                className="w-9 h-9 lg:w-10 lg:h-10 rounded-full object-cover ring-2 ring-[#12BAB0]/40 shadow-sm"
              />
            ) : (
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-[#12BAB0] to-[#010B28] text-white flex items-center justify-center font-bold text-xs lg:text-sm tracking-wider shadow-sm">
                {userInitials}
              </div>
            )}
            {/* Online Indicator */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>

          {/* User Details in Header */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${isSuperAdmin ? "text-purple-600" : "text-[#12BAB0]"}`}>
                {isSuperAdmin ? "Super Admin" : user?.userType || "User"}
              </span>
              {isSuperAdmin ? (
                <span className="inline-flex items-center text-[10px] bg-purple-100 text-purple-700 font-extrabold px-1.5 py-0.2 rounded border border-purple-200">
                  ROOT
                </span>
              ) : isHost ? (
                <span className="inline-flex items-center text-[10px] bg-[#12BAB0]/15 text-[#0d8780] font-semibold px-1.5 py-0.2 rounded">
                  PRO
                </span>
              ) : null}
            </div>
            <span className="text-black font-bold text-sm lg:text-[15px] truncate max-w-[130px] lg:max-w-[160px] leading-tight">
              {fullName}
            </span>
          </div>

          {/* Chevron */}
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform duration-300 ml-0.5 ${
              isOpen ? "rotate-180 text-[#12BAB0]" : ""
            }`}
          />
        </button>

        {/* Dropdown Card */}
        {isOpen && (
          <div className="absolute right-0 mt-3 w-84 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
            {/* Card Header with Rich Gradient */}
            <div className="relative bg-gradient-to-br from-[#010B28] via-[#091E42] to-[#12BAB0] p-6 text-white overflow-hidden">
              {/* Background ambient lighting */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#12BAB0]/30 rounded-full blur-2xl pointer-events-none"></div>

              {/* Status Banner inside Header */}
              {statusMessage && (
                <div
                  className={`mb-3 p-2.5 rounded-xl text-xs flex items-center gap-2 transition-all ${
                    statusMessage.type === "success"
                      ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30"
                      : "bg-red-500/20 text-red-200 border border-red-400/30"
                  }`}
                >
                  {statusMessage.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <X className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span className="font-medium">{statusMessage.text}</span>
                </div>
              )}

              <div className="flex items-center gap-4 relative z-10">
                {/* Large Interactive Avatar with "Add Pic" / Camera Button */}
                <div className="relative group/pic flex-shrink-0">
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full border-2 border-white/80 shadow-lg overflow-hidden bg-[#010B28]/60 relative flex items-center justify-center">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl sm:text-2xl font-black text-white tracking-widest">
                        {userInitials}
                      </span>
                    )}

                    {/* Loading Overlay */}
                    {isUploading && (
                      <div className="absolute inset-0 bg-[#010B28]/80 backdrop-blur-sm flex flex-col items-center justify-center">
                        <Loader2 className="w-6 h-6 text-[#12BAB0] animate-spin" />
                        <span className="text-[10px] text-white mt-1 font-medium">Uploading</span>
                      </div>
                    )}

                    {/* Hover Camera Overlay */}
                    {!isUploading && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover/pic:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                        title="Click to change profile picture"
                      >
                        <Camera className="w-5 h-5 mb-0.5 text-[#12BAB0]" />
                        <span className="text-[10px] font-semibold">Change</span>
                      </button>
                    )}
                  </div>

                  {/* Camera icon badge at bottom-right */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="absolute -bottom-1 -right-1 p-1.5 bg-[#12BAB0] hover:bg-[#0fa89f] text-white rounded-full shadow-md border-2 border-[#010B28] cursor-pointer transition-transform hover:scale-110"
                    title="Upload profile picture"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* User Info inside Gradient Banner */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-white/15 px-2.5 py-0.5 rounded-full backdrop-blur-md">
                      {isSuperAdmin ? (
                        <>
                          <Shield className="w-3 h-3 text-amber-300" /> Super Admin
                        </>
                      ) : isHost ? (
                        <>
                          <Crown className="w-3 h-3 text-amber-300" /> Host Account
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3 text-[#12BAB0]" /> Contestant
                        </>
                      )}
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold text-white truncate mt-1">
                    {fullName}
                  </h3>

                  <p className="text-xs text-gray-200/90 truncate flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3 h-3 text-[#12BAB0] flex-shrink-0" />
                    <span className="truncate">{user?.email || "No email available"}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-1.5 text-gray-700 hover:text-[#12BAB0] font-semibold py-1 px-2.5 rounded-lg hover:bg-white transition-all cursor-pointer border border-transparent hover:border-gray-200"
              >
                <Upload className="w-3.5 h-3.5 text-[#12BAB0]" />
                <span>Upload Pic</span>
              </button>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-1.5 text-gray-700 hover:text-[#12BAB0] font-semibold py-1 px-2.5 rounded-lg hover:bg-white transition-all cursor-pointer border border-transparent hover:border-gray-200"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#12BAB0]" />
                <span>{isEditing ? "Close Edit" : "Edit Profile"}</span>
              </button>
            </div>

            {/* Inline Profile Edit Form */}
            {isEditing && (
              <form
                onSubmit={handleSaveProfile}
                className="p-5 bg-teal-50/40 border-b border-teal-100 animate-in slide-in-from-top-2 duration-150"
              >
                <span className="text-xs font-bold text-[#010B28] block mb-2.5">
                  Edit Personal Details
                </span>
                <div className="grid grid-cols-2 gap-2.5 mb-3">
                  <div>
                    <label className="text-[11px] font-medium text-gray-600 block mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12BAB0] text-gray-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-gray-600 block mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12BAB0] text-gray-800"
                      required
                    />
                  </div>
                </div>

                {/* Host Organization Details */}
                {isHost && (
                  <div className="space-y-2.5 mb-3 pt-2 border-t border-teal-200/60">
                    <span className="text-[11px] font-bold text-[#010B28] block">
                      Institute Affiliation Details
                    </span>
                    <div>
                      <label className="text-[11px] font-medium text-gray-600 block mb-1">
                        Institute / College / School Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Oxford College, Apex Academy"
                        value={editOrgName}
                        onChange={(e) => setEditOrgName(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12BAB0] text-gray-800"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-medium text-gray-600 block mb-1">
                          Category
                        </label>
                        <select
                          value={editOrgType}
                          onChange={(e) => setEditOrgType(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12BAB0] text-gray-800 font-medium"
                        >
                          <option value="school">School</option>
                          <option value="college">College</option>
                          <option value="university">University</option>
                          <option value="institute">Coaching / Academy / Institute</option>
                          <option value="company">Corporate / Company</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      {editOrgType === "other" && (
                        <div>
                          <label className="text-[11px] font-medium text-gray-600 block mb-1">
                            Specify Other
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Sports Club, NGO"
                            value={editCustomOrgType}
                            onChange={(e) => setEditCustomOrgType(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12BAB0] text-gray-800"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-[#12BAB0] hover:bg-[#0fa89f] text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {/* Account Details Specs */}
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between text-xs py-2 px-3 bg-gray-50/80 rounded-xl">
                <span className="text-gray-500 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-[#12BAB0]" />
                  Role
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 capitalize">
                    {isSuperAdmin ? "Super Admin" : user?.userType || "Contestant"}
                  </span>
                  {!isSuperAdmin && (
                    <button
                      type="button"
                      onClick={async () => {
                        const nextType = isHost ? "contestant" : "host";
                        try {
                          await updateProfile({ userType: nextType });
                          setStatusMessage({
                            type: "success",
                            text: `Switched account to ${nextType === "host" ? "Host" : "Contestant"}!`,
                          });
                          setTimeout(() => setStatusMessage(null), 3000);
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className="px-2 py-0.5 text-[10px] font-bold bg-[#12BAB0]/15 text-[#0d8780] hover:bg-[#12BAB0] hover:text-white rounded-md transition-colors cursor-pointer"
                      title="Click to toggle between Host and Contestant role"
                    >
                      Switch to {isHost ? "Contestant" : "Host"}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs py-2 px-3 bg-gray-50/80 rounded-xl">
                <span className="text-gray-500 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#12BAB0]" />
                  Email
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-800 max-w-[140px] truncate">
                    {user?.email}
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" title="Verified email" />
                </div>
              </div>

              {/* Super Admin Quick Link */}
              {isSuperAdmin && (
                <Link
                  href="/dashboard/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between w-full py-2.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-colors cursor-pointer group border border-purple-200"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-600" />
                    Super Admin Console
                  </span>
                  <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full shadow-2xs group-hover:translate-x-0.5 transition-transform">
                    Open
                  </span>
                </Link>
              )}

              {/* Host Organization Dashboard Link */}
              {isHost && (
                <Link
                  href="/dashboard/host"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between w-full py-2.5 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-bold transition-colors cursor-pointer group border border-teal-200"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#12BAB0]" />
                    Host Organization Hub
                  </span>
                  <span className="text-[10px] bg-[#12BAB0] text-white px-2 py-0.5 rounded-full shadow-2xs group-hover:translate-x-0.5 transition-transform">
                    {user?.inviteCode || "Open"}
                  </span>
                </Link>
              )}

              {/* Host Quick Link */}
              {isHost && !isSuperAdmin && (
                <Link
                  href="/dashboard/create"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between w-full py-2.5 px-3 bg-[#12BAB0]/10 hover:bg-[#12BAB0]/20 text-[#0d8780] rounded-xl text-xs font-bold transition-colors cursor-pointer group"
                >
                  <span className="flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-[#12BAB0]" />
                    Create New Contest
                  </span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-full shadow-2xs group-hover:translate-x-0.5 transition-transform">
                    Go
                  </span>
                </Link>
              )}
            </div>

            {/* Footer with Sign Out */}
            <div className="p-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 font-medium pl-2">
                Fantasy Buzz v1.0
              </span>
              <button
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors font-bold cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
