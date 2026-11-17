export const API_BASE_URL = "http://127.0.0.1:8000";

export function getAuthToken() {
  return (
    localStorage.getItem("smartcare_token") ||
    sessionStorage.getItem("smartcare_token")
  );
}

export function getSavedUser() {
  const raw =
    localStorage.getItem("smartcare_user") ||
    sessionStorage.getItem("smartcare_user");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAuthStorage() {
  localStorage.removeItem("smartcare_token");
  localStorage.removeItem("smartcare_token_type");
  localStorage.removeItem("smartcare_user");
  sessionStorage.removeItem("smartcare_token");
  sessionStorage.removeItem("smartcare_token_type");
  sessionStorage.removeItem("smartcare_user");
}

export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const message = Array.isArray(data.detail)
      ? data.detail.map((item) => item.msg).join(", ")
      : data.detail || "Something went wrong";
    throw new Error(message);
  }

  return data;
}

export async function registerUser(userData) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

export async function loginUser(credentials) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function getCurrentUser(token) {
  return apiRequest("/auth/me", {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

// =========================================================
// PATIENT DASHBOARD APIs
// =========================================================
export async function fetchPatientProfile() {
  return apiRequest("/patient/profile", { method: "GET" });
}

export async function updatePatientProfile(profileData) {
  return apiRequest("/patient/profile", {
    method: "PUT",
    body: JSON.stringify(profileData),
  });
}

export async function fetchDoctors(specialization = "", search = "") {
  const params = new URLSearchParams();
  if (specialization && specialization !== "All") {
    params.set("specialization", specialization);
  }
  if (search) {
    params.set("search", search);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest(`/doctors${query}`, { method: "GET" });
}

export async function fetchDepartments() {
  return apiRequest("/departments", { method: "GET" });
}

export async function fetchMyAppointments() {
  return apiRequest("/appointments/my", { method: "GET" });
}

export async function createAppointment(appointmentData) {
  return apiRequest("/appointments", {
    method: "POST",
    body: JSON.stringify(appointmentData),
  });
}

export async function rescheduleAppointment(appointmentId, rescheduleData) {
  return apiRequest(`/appointments/${appointmentId}/reschedule`, {
    method: "PUT",
    body: JSON.stringify(rescheduleData),
  });
}

export async function changeAppointmentStatus(appointmentId, status) {
  return apiRequest(`/appointments/${appointmentId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function fetchMedicalRecords() {
  return apiRequest("/medical-records", { method: "GET" });
}

export async function uploadMedicalRecord(recordData) {
  return apiRequest("/medical-records", {
    method: "POST",
    body: JSON.stringify(recordData),
  });
}

export async function fetchPrescriptions() {
  return apiRequest("/prescriptions", { method: "GET" });
}

export async function fetchNotifications() {
  return apiRequest("/notifications", { method: "GET" });
}

export async function markNotificationAsRead(notificationId) {
  return apiRequest(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsRead() {
  return apiRequest("/notifications/read-all", { method: "POST" });
}

export async function fetchBillingRecords() {
  return apiRequest("/billing", { method: "GET" });
}

export async function payBillingInvoice(billId) {
  return apiRequest(`/billing/${billId}/pay`, { method: "POST" });
}

export async function fetchSupportTickets() {
  return apiRequest("/support/tickets", { method: "GET" });
}

export async function submitSupportTicket(ticketData) {
  return apiRequest("/support/tickets", {
    method: "POST",
    body: JSON.stringify(ticketData),
  });
}

export async function sendAiAssistantMessage(message) {
  return apiRequest("/ai-assistant/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

// =========================================================
// DOCTOR DASHBOARD APIs
// =========================================================
export async function fetchDoctorDashboard() {
  return apiRequest("/doctor/dashboard", { method: "GET" });
}

export async function submitDoctorDecision(appointmentId, status, consultationNotes = "") {
  return apiRequest(`/doctor/appointments/${appointmentId}/decision`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
      consultation_notes: consultationNotes,
    }),
  });
}

export async function submitDoctorPrescription(appointmentId, prescriptionPayload) {
  return apiRequest(`/doctor/appointments/${appointmentId}/prescribe`, {
    method: "POST",
    body: JSON.stringify(prescriptionPayload),
  });
}

export async function updateDoctorAvailabilitySettings(availabilityPayload) {
  return apiRequest("/doctor/availability", {
    method: "PUT",
    body: JSON.stringify(availabilityPayload),
  });
}

// =========================================================
// SUPER ADMIN DASHBOARD APIs
// =========================================================
export async function fetchAdminDashboard() {
  return apiRequest("/admin/dashboard", { method: "GET" });
}

export async function approveDoctorRegistration(doctorId) {
  return apiRequest(`/admin/doctors/${doctorId}/approve`, {
    method: "POST",
  });
}

export async function rejectDoctorRegistration(doctorId) {
  return apiRequest(`/admin/doctors/${doctorId}/reject`, {
    method: "POST",
  });
}

export async function toggleDoctorAvailabilityAdmin(doctorId) {
  return apiRequest(`/admin/doctors/${doctorId}/toggle-availability`, {
    method: "PATCH",
  });
}

export async function toggleUserAccountStatus(userId) {
  return apiRequest(`/admin/users/${userId}/toggle-active`, {
    method: "PATCH",
  });
}

export async function createHospitalDepartment(deptPayload) {
  return apiRequest("/admin/departments", {
    method: "POST",
    body: JSON.stringify(deptPayload),
  });
}

export async function deleteHospitalDepartment(deptId) {
  return apiRequest(`/admin/departments/${deptId}`, {
    method: "DELETE",
  });
}

export async function adminCreateUser(userData) {
  return apiRequest("/admin/users", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

export async function adminFetchUsers() {
  return apiRequest("/admin/users", {
    method: "GET",
  });
}
