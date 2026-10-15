const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function request(path, { token, ...options } = {}) {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    const text = await res.text().catch(() => "");
    data = { message: text || res.statusText };
  }

  if (!res.ok) {
    const error = new Error(data.message || data.error || `Error ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export default request;

// =============================
// CONTESTS API
// =============================

export function getContests(token) {
  return request("/api/contests", { token });
}

export function getContestById(id, token) {
  return request(`/api/contests/${id}`, { token });
}

export function createContest(contestData, token) {
  return request("/api/contests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contestData),
    token,
  });
}

export function uploadContestImage(file, token) {
  const formData = new FormData();
  formData.append("image", file);
  return request("/api/contests/upload-image", {
    method: "POST",
    body: formData,
    token,
  });
}

export function updateContest(id, updates, token) {
  return request(`/api/contests/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
    token,
  });
}

export function deleteContest(id, token) {
  return request(`/api/contests/${id}`, {
    method: "DELETE",
    token,
  });
}

export function updateContestQuestion(contestId, questionId, questionData, token) {
  return request(`/api/contests/${contestId}/questions/${questionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(questionData),
    token,
  });
}

export function deleteContestQuestion(contestId, questionId, token) {
  return request(`/api/contests/${contestId}/questions/${questionId}`, {
    method: "DELETE",
    token,
  });
}

export function submitQuestionAnswer(contestId, questionId, selectedOption, token) {
  return request(`/api/contests/${contestId}/questions/${questionId}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedOption }),
    token,
  });
}

export function submitWholeContest(contestId, userAnswers, token) {
  return request(`/api/contests/${contestId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userAnswers }),
    token,
  });
}

export function getContestResults(contestId, token) {
  return request(`/api/contests/${contestId}/results`, { token });
}

// =============================
// SUPER ADMIN API
// =============================

export function getAdminStats(token) {
  return request("/api/admin/stats", { token });
}

export function getAdminUsers(params = {}, token) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/admin/users${query ? `?${query}` : ""}`, { token });
}

export function createAdminUser(userData, token) {
  return request("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
    token,
  });
}

export function updateAdminUserRole(userId, userType, token) {
  return request(`/api/admin/users/${userId}/role`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userType }),
    token,
  });
}

export function updateAdminUserStatus(userId, status, token) {
  return request(`/api/admin/users/${userId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
    token,
  });
}

export function resetAdminUserPassword(userId, newPassword, token) {
  return request(`/api/admin/users/${userId}/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword }),
    token,
  });
}

export function deleteAdminUser(userId, token) {
  return request(`/api/admin/users/${userId}`, {
    method: "DELETE",
    token,
  });
}

export function getAdminSessions(token) {
  return request("/api/admin/sessions", { token });
}

export function terminateAdminSession(sessionId, token) {
  return request(`/api/admin/sessions/${sessionId}`, {
    method: "DELETE",
    token,
  });
}

export function getAdminContests(token) {
  return request("/api/admin/contests", { token });
}

export function deleteAdminContest(contestId, token) {
  return request(`/api/admin/contests/${contestId}`, {
    method: "DELETE",
    token,
  });
}

export function getAdminPayments(params = {}, token) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/admin/payments${query ? `?${query}` : ""}`, { token });
}

// =============================
// ORGANIZATION & HOST API
// =============================

export function getOrganizationPublic(inviteCode, token) {
  return request(`/api/org/public/${inviteCode}`, { token });
}

export function joinOrganizationByCode(inviteCode, token) {
  return request(`/api/org/join/${inviteCode}`, {
    method: "POST",
    token,
  });
}

export function leaveOrganization(target, token) {
  return request(`/api/org/leave/${target}`, {
    method: "POST",
    token,
  });
}

export function getHostDashboardData(token) {
  return request("/api/org/host/dashboard", { token });
}

export function getMyOrganizations(token) {
  return request("/api/org/my-organizations", { token });
}

// =============================
// SUBSCRIPTION & BILLING API
// =============================

export function getSubscriptionStatus(token) {
  return request("/api/subscription/status", { token });
}

export function createSubscriptionCheckout(plan = "monthly", token) {
  return request("/api/subscription/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
    token,
  });
}

export function verifyStripeSession(sessionId, token) {
  return request("/api/subscription/verify-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
    token,
  });
}

export function sandboxSubscribe(options = {}, token) {
  return request("/api/subscription/sandbox-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
    token,
  });
}

export function processCardPayment(paymentData = {}, token) {
  return request("/api/subscription/process-card-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(paymentData),
    token,
  });
}

export function cancelSubscription(options = { immediate: true }, token) {
  return request("/api/subscription/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
    token,
  });
}

// =============================
// FEEDBACK & SUPPORT API
// =============================

export function createSupportTicket(formData, token) {
  return request("/api/support", {
    method: "POST",
    body: formData,
    token,
  });
}

export function getMySupportTickets(token) {
  return request("/api/support/my-tickets", { token });
}

export function getAllSupportTicketsAdmin(params = {}, token) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val && val !== "all") query.append(key, val);
  });
  const queryString = query.toString() ? `?${query.toString()}` : "";
  return request(`/api/support/admin/all${queryString}`, { token });
}

export function updateSupportTicketAdmin(id, payload, token) {
  return request(`/api/support/admin/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    token,
  });
}

export function deleteSupportTicketAdmin(id, token) {
  return request(`/api/support/admin/${id}`, {
    method: "DELETE",
    token,
  });
}

// =============================
// NOTIFICATIONS API
// =============================

export function getUserNotifications(filter = "all", token) {
  const query = filter && filter !== "all" ? `?filter=${filter}` : "";
  return request(`/api/notifications${query}`, { token });
}

export function markNotificationAsRead(id, token) {
  return request(`/api/notifications/${id}/read`, {
    method: "PATCH",
    token,
  });
}

export function markAllNotificationsAsRead(token) {
  return request("/api/notifications/read-all", {
    method: "PATCH",
    token,
  });
}

export function deleteNotification(id, token) {
  return request(`/api/notifications/${id}`, {
    method: "DELETE",
    token,
  });
}

export function clearAllNotifications(token) {
  return request("/api/notifications/clear-all", {
    method: "DELETE",
    token,
  });
}

// =============================
// LEADERBOARD API
// =============================

export function getLeaderboardData(params = {}, token) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val && val !== "all") query.append(key, val);
  });
  const queryString = query.toString() ? `?${query.toString()}` : "";
  return request(`/api/leaderboard${queryString}`, { token });
}






