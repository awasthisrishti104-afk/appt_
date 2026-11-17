import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HeartPulse,
  LayoutDashboard,
  CalendarPlus,
  CalendarDays,
  Stethoscope,
  FileText,
  Pill,
  CreditCard,
  UserRound,
  Bell,
  Headset,
  LogOut,
  Search,
  Clock,
  MapPin,
  Video,
  Building2,
  Home as HomeIcon,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Bot,
  Send,
  ShieldCheck,
  Phone,
  Sparkles,
  Upload,
  AlertTriangle,
  Star,
} from "lucide-react";
import {
  getAuthToken,
  getSavedUser,
  fetchPatientProfile,
  updatePatientProfile,
  fetchDoctors,
  fetchMyAppointments,
  createAppointment,
  rescheduleAppointment,
  changeAppointmentStatus,
  fetchMedicalRecords,
  uploadMedicalRecord,
  fetchPrescriptions,
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsRead,
  fetchBillingRecords,
  payBillingInvoice,
  fetchSupportTickets,
  submitSupportTicket,
  sendAiAssistantMessage,
} from "../services/api";
import "./Dashboard.css";

const SIDEBAR_ITEMS = [
  { id: "overview", label: "Dashboard Overview", icon: LayoutDashboard },
  { id: "book", label: "Book Appointment", icon: CalendarPlus },
  { id: "appointments", label: "My Appointments", icon: CalendarDays },
  { id: "doctors", label: "Find Doctors", icon: Stethoscope },
  { id: "records", label: "Medical Records", icon: FileText },
  { id: "prescriptions", label: "My Prescriptions", icon: Pill },
  { id: "billing", label: "Billing & Payments", icon: CreditCard },
  { id: "profile", label: "Health Profile", icon: UserRound },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "support", label: "Support", icon: Headset },
];

const TIME_SLOTS = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
];

const CONSULTATION_MODES = [
  {
    id: "Online Consultation",
    title: "Schedule Online Consultation",
    desc: "Schedule text, audio or video call with Doctor",
    icon: Video,
  },
  {
    id: "Onsite Consultation",
    title: "Schedule Onsite Consultation",
    desc: "Visit Doctor's Clinic/Hospital for consultation",
    icon: Building2,
  },
  {
    id: "Home Service",
    title: "Request Home Service",
    desc: "Doctor will visit your home for consultation",
    icon: HomeIcon,
  },
];

const CLINIC_OPTIONS = [
  {
    name: "Prime Specialist Medical Center",
    location: "Sector 67, Medical Avenue • 2.5 km away",
  },
  {
    name: "Fortis & SmartCare Heart Institute",
    location: "Sector 62, Main Hospital Wing • 1.5 km away",
  },
];

const SPECIALIZATIONS = [
  "All",
  "Cardiology",
  "Neurology",
  "Ophthalmology",
  "Orthopedics",
  "Pulmonology",
  "Hematology",
];

export default function Dashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  // Backend Data States
  const [profile, setProfile] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [bills, setBills] = useState([]);
  const [tickets, setTickets] = useState([]);

  // Book Appointment State (Screenshot 1)
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedClinic, setSelectedClinic] = useState(CLINIC_OPTIONS[1].name);
  const [selectedMode, setSelectedMode] = useState("Onsite Consultation");
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().split("T")[0];
  });
  const [selectedSlot, setSelectedSlot] = useState("04:00 PM");
  const [bookingSymptoms, setBookingSymptoms] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  // My Appointments Filter & Reschedule State
  const [apptFilter, setApptFilter] = useState("All");
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("10:00 AM");

  // Find Doctors Search & Filter
  const [docSearch, setDocSearch] = useState("");
  const [docSpec, setDocSpec] = useState("All");

  // Digital Health Records Filter & Upload Form
  const [recordFilter, setRecordFilter] = useState("All");
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [newRecord, setNewRecord] = useState({
    record_type: "Lab Report",
    title: "",
    doctor_name: "Dr. Santosh Rajab",
    department: "Cardiology",
    diagnosis: "",
    notes: "",
    file_name: "",
  });

  // Notifications Filter
  const [notifFilter, setNotifFilter] = useState("All");

  // Support Ticket Form
  const [ticketForm, setTicketForm] = useState({
    category: "Appointment Help",
    subject: "",
    description: "",
  });

  // AI Health Assistant ("Luna" — Screenshot 2)
  const [aiMessages, setAiMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I'm Luna 👋 — Your personal SmartCare AI assistant. I can explain vitals, lab reports, hospital navigation, active medicines, and help with your appointments.",
      time: "Now",
    },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const showToastMessage = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  // Load All Dashboard Data from FastAPI + PostgreSQL
  const loadAllDashboardData = async () => {
    const token = getAuthToken();
    if (!token) {
      navigate("/login");
      return;
    }

    const savedUser = getSavedUser();
    const role = (savedUser?.role || "").toLowerCase().trim();
    if (role && role !== "patient") {
      if (role.includes("admin")) {
        navigate("/admin/dashboard");
      } else if (role === "doctor") {
        navigate("/doctor/dashboard");
      }
      return;
    }

    try {
      setLoading(true);
      const [
        profData,
        docData,
        apptData,
        recData,
        prescData,
        notifData,
        billData,
        ticketData,
      ] = await Promise.all([
        fetchPatientProfile(),
        fetchDoctors(),
        fetchMyAppointments(),
        fetchMedicalRecords(),
        fetchPrescriptions(),
        fetchNotifications(),
        fetchBillingRecords(),
        fetchSupportTickets(),
      ]);

      setProfile(profData);
      setDoctors(docData);
      if (docData.length > 0 && !selectedDoctor) {
        setSelectedDoctor(docData[0]);
      }
      setAppointments(apptData);
      setMedicalRecords(recData);
      setPrescriptions(prescData);
      setNotifications(notifData);
      setBills(billData);
      setTickets(ticketData);
    } catch (err) {
      if (
        err.message?.toLowerCase().includes("token") ||
        err.message?.toLowerCase().includes("expired") ||
        err.message?.toLowerCase().includes("unauthorized")
      ) {
        localStorage.removeItem("smartcare_token");
        sessionStorage.removeItem("smartcare_token");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Secure Logout
  const handleLogout = () => {
    localStorage.removeItem("smartcare_token");
    localStorage.removeItem("smartcare_token_type");
    localStorage.removeItem("smartcare_user");
    sessionStorage.removeItem("smartcare_token");
    sessionStorage.removeItem("smartcare_token_type");
    sessionStorage.removeItem("smartcare_user");
    navigate("/login");
  };

  // Book Appointment Handler (POST /appointments)
  const handleBookSubmit = async (e) => {
    e.preventDefault();
    const doc = selectedDoctor || doctors[0];
    if (!doc) return;

    try {
      setBookingLoading(true);
      const res = await createAppointment({
        doctor_id: doc.id,
        doctor_name: doc.name,
        specialization: doc.specialization,
        clinic: selectedClinic,
        consultation_mode: selectedMode,
        appointment_date: selectedDate,
        appointment_time: selectedSlot,
        symptoms: bookingSymptoms || "General Consultation",
        fee: doc.fee || 700,
      });

      setBookingSymptoms("");
      showToastMessage(res.message || "Appointment booked successfully!");
      const [updatedAppts, updatedNotifs, updatedBills] = await Promise.all([
        fetchMyAppointments(),
        fetchNotifications(),
        fetchBillingRecords(),
      ]);
      setAppointments(updatedAppts);
      setNotifications(updatedNotifs);
      setBills(updatedBills);
      setActiveTab("appointments");
    } catch (err) {
      showToastMessage(err.message || "Could not book appointment.");
    } finally {
      setBookingLoading(false);
    }
  };

  // Reschedule Handler (PUT /appointments/{id}/reschedule)
  const handleConfirmReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleTarget) return;

    try {
      const res = await rescheduleAppointment(rescheduleTarget.id, {
        appointment_date: rescheduleDate,
        appointment_time: rescheduleTime,
      });
      showToastMessage(res.message || "Appointment rescheduled!");
      setRescheduleTarget(null);
      const [updatedAppts, updatedNotifs] = await Promise.all([
        fetchMyAppointments(),
        fetchNotifications(),
      ]);
      setAppointments(updatedAppts);
      setNotifications(updatedNotifs);
    } catch (err) {
      showToastMessage(err.message);
    }
  };

  // Update Appointment Status (Pending, Confirmed, Completed, Cancelled)
  const handleStatusUpdate = async (appointmentId, newStatus) => {
    try {
      const res = await changeAppointmentStatus(appointmentId, newStatus);
      showToastMessage(res.message);
      const [updatedAppts, updatedNotifs] = await Promise.all([
        fetchMyAppointments(),
        fetchNotifications(),
      ]);
      setAppointments(updatedAppts);
      setNotifications(updatedNotifs);
    } catch (err) {
      showToastMessage(err.message);
    }
  };

  // Upload Medical Record (POST /medical-records)
  const handleCreateRecord = async (e) => {
    e.preventDefault();
    try {
      const res = await uploadMedicalRecord({
        ...newRecord,
        file_name: newRecord.file_name || "Patient_Uploaded_Report.pdf",
      });
      showToastMessage(res.message);
      setShowAddRecord(false);
      setNewRecord({
        record_type: "Lab Report",
        title: "",
        doctor_name: "Dr. Santosh Rajab",
        department: "Cardiology",
        diagnosis: "",
        notes: "",
        file_name: "",
      });
      const [recData, notifData] = await Promise.all([
        fetchMedicalRecords(),
        fetchNotifications(),
      ]);
      setMedicalRecords(recData);
      setNotifications(notifData);
    } catch (err) {
      showToastMessage(err.message);
    }
  };

  // Pay Invoice (POST /billing/{id}/pay)
  const handlePayInvoice = async (billId) => {
    try {
      const res = await payBillingInvoice(billId);
      showToastMessage(res.message);
      const [billData, notifData] = await Promise.all([
        fetchBillingRecords(),
        fetchNotifications(),
      ]);
      setBills(billData);
      setNotifications(notifData);
    } catch (err) {
      showToastMessage(err.message);
    }
  };

  // Save Health Profile (PUT /patient/profile)
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await updatePatientProfile(profile);
      setProfile(res.profile);
      showToastMessage(res.message || "Health profile saved!");
    } catch (err) {
      showToastMessage(err.message);
    }
  };

  // Mark Notification Read
  const handleReadNotif = async (id) => {
    try {
      await markNotificationAsRead(id);
      const notifData = await fetchNotifications();
      setNotifications(notifData);
    } catch (err) {
      showToastMessage(err.message);
    }
  };

  const handleReadAllNotifs = async () => {
    try {
      await markAllNotificationsRead();
      const notifData = await fetchNotifications();
      setNotifications(notifData);
      showToastMessage("All notifications marked as read.");
    } catch (err) {
      showToastMessage(err.message);
    }
  };

  // Submit Support Ticket
  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await submitSupportTicket(ticketForm);
      showToastMessage(res.message);
      setTicketForm({
        category: "Appointment Help",
        subject: "",
        description: "",
      });
      const updated = await fetchSupportTickets();
      setTickets(updated);
    } catch (err) {
      showToastMessage(err.message);
    }
  };

  // AI Health Assistant ("Luna") Handler
  const handleSendAiPrompt = async (promptText) => {
    const text = (promptText ?? aiInput).trim();
    if (!text) return;

    const userMsg = { sender: "user", text, time: "Just now" };
    setAiMessages((prev) => [...prev, userMsg]);
    setAiInput("");

    try {
      setAiLoading(true);
      const res = await sendAiAssistantMessage(text);
      setAiMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: res.reply,
          time: res.timestamp || "Just now",
        },
      ]);
    } catch {
      setAiMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "I'm here to help with general health FAQs, hospital timings (Mon-Sat 9 AM - 7 PM), and your appointments. For emergencies, please call 1066.",
          time: "Just now",
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const activeAppts = appointments.filter(
    (a) => a.status === "Confirmed" || a.status === "Pending"
  );
  const filteredDoctors = doctors.filter((d) => {
    const matchSpec =
      docSpec === "All" ||
      d.specialization.toLowerCase() === docSpec.toLowerCase();
    const matchSearch =
      !docSearch.trim() ||
      d.name.toLowerCase().includes(docSearch.toLowerCase()) ||
      d.specialization.toLowerCase().includes(docSearch.toLowerCase()) ||
      d.clinic.toLowerCase().includes(docSearch.toLowerCase());
    return matchSpec && matchSearch;
  });

  const filteredAppointments = appointments.filter(
    (a) => apptFilter === "All" || a.status === apptFilter
  );

  const filteredRecords = medicalRecords.filter(
    (r) => recordFilter === "All" || r.record_type === recordFilter
  );

  const filteredNotifications = notifications.filter(
    (n) => notifFilter === "All" || n.category === notifFilter
  );

  const currentDoc = selectedDoctor || doctors[0] || {
    id: 1,
    name: "Dr. Santosh Rajab",
    specialization: "Cardiology",
    clinic: "Fortis & SmartCare Heart Institute",
    fee: 800,
    avatar:
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=300&q=80",
  };

  const initials = (profile?.full_name || "Smart Patient")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="sc-dash-layout">
      {/* =======================================================
          1. LEFT SIDEBAR NAVIGATION
      ======================================================= */}
      <aside className="sc-dash-sidebar">
        <Link to="/" className="sc-sidebar-brand">
          <div className="sc-sidebar-logo">
            <HeartPulse size={24} />
          </div>
          <div>
            <strong>SmartCare</strong>
            <small>PATIENT PORTAL</small>
          </div>
        </Link>

        <div className="sc-sidebar-patient-mini">
          <div className="sc-patient-avatar">{initials}</div>
          <div className="sc-patient-mini-info">
            <strong>{profile?.full_name || "Verified Patient"}</strong>
            <span>● Blood Group: {profile?.blood_group || "O+"}</span>
          </div>
        </div>

        <nav className="sc-sidebar-menu" aria-label="Dashboard Sidebar">
          <span className="sc-sidebar-label">Main Navigation</span>

          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isNotif = item.id === "notifications";
            const isAppt = item.id === "appointments";
            return (
              <button
                key={item.id}
                type="button"
                className={`sc-nav-item ${
                  activeTab === item.id ? "active" : ""
                }`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {isNotif && unreadCount > 0 && (
                  <span className="sc-nav-badge">{unreadCount}</span>
                )}
                {isAppt && activeAppts.length > 0 && (
                  <span className="sc-nav-badge teal">{activeAppts.length}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sc-sidebar-footer">
          <button
            type="button"
            className="sc-nav-logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* =======================================================
          MAIN CONTENT AREA
      ======================================================= */}
      <div className="sc-dash-main">
        {/* TOP HEADER */}
        <header className="sc-dash-topbar">
          <div className="sc-topbar-title">
            <h1>
              {SIDEBAR_ITEMS.find((i) => i.id === activeTab)?.label ||
                "Patient Dashboard"}
            </h1>
            <p>
              Connected to SmartCare Hospital Database •{" "}
              {loading ? "Syncing live records..." : "All systems online"}
            </p>
          </div>

          <div className="sc-topbar-actions">
            <button
              type="button"
              className="sc-ai-pill-btn"
              onClick={() => setActiveTab("support")}
            >
              <Bot size={16} />
              Ask Luna (AI Health Assistant)
            </button>

            <button
              type="button"
              className="sc-notif-icon-btn"
              onClick={() => setActiveTab("notifications")}
              aria-label="Notifications"
            >
              <Bell size={19} />
              {unreadCount > 0 && <span className="sc-notif-dot" />}
            </button>
          </div>
        </header>

        {/* TOAST BANNER */}
        {toast && (
          <div
            role="status"
            style={{
              margin: "16px 32px 0",
              padding: "12px 18px",
              borderRadius: "12px",
              background: "#ecfdf5",
              border: "1px solid #6ee7b7",
              color: "#065f46",
              fontSize: "13.5px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <CheckCircle2 size={18} />
            {toast}
          </div>
        )}

        <main className="sc-dash-content">
          {/* ===================================================
              TAB 1: DASHBOARD OVERVIEW (INSPIRED BY SCREENSHOT 3)
          =================================================== */}
          {activeTab === "overview" && (
            <>
              <section className="sc-hero-welcome">
                <div>
                  <span className="sc-hero-tag">
                    <Sparkles size={13} /> SMARTCARE DIGITAL HEALTH PORTAL
                  </span>
                  <h2>
                    Welcome, {profile?.full_name?.split(" ")[0] || "Patient"}!
                  </h2>
                  <p>
                    Track your upcoming appointments, view verified lab reports
                    and active prescriptions, or chat with Luna — your personal
                    AI care assistant.
                  </p>
                  <div className="sc-hero-quick-btns">
                    <button
                      type="button"
                      className="sc-btn-white"
                      onClick={() => setActiveTab("book")}
                    >
                      <CalendarPlus size={16} /> Book Appointment
                    </button>
                    <button
                      type="button"
                      className="sc-btn-glass"
                      onClick={() => setActiveTab("records")}
                    >
                      <FileText size={16} /> Digital Health Records
                    </button>
                    <button
                      type="button"
                      className="sc-btn-glass"
                      onClick={() => setActiveTab("support")}
                    >
                      <Bot size={16} /> AI Health Assistant
                    </button>
                  </div>
                </div>

                {/* Next Appointment Highlight Card (Like Screenshot 3) */}
                {activeAppts[0] && (
                  <div
                    style={{
                      background: "#ffffff",
                      color: "#122c44",
                      padding: "20px 22px",
                      borderRadius: "18px",
                      minWidth: "270px",
                      boxShadow: "0 14px 32px rgba(0,0,0,0.14)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "10px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 800,
                          color: "#0284c7",
                          letterSpacing: "1px",
                        }}
                      >
                        NEXT APPOINTMENT • {activeAppts[0].token_number}
                      </span>
                      <span
                        className={`sc-status-pill ${activeAppts[0].status.toLowerCase()}`}
                      >
                        {activeAppts[0].status}
                      </span>
                    </div>
                    <strong style={{ fontSize: "16px", display: "block" }}>
                      {activeAppts[0].doctor_name},{" "}
                      {activeAppts[0].specialization}
                    </strong>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#475569",
                        display: "block",
                        marginTop: "4px",
                      }}
                    >
                      {activeAppts[0].appointment_date} •{" "}
                      {activeAppts[0].appointment_time}
                    </span>
                    <span
                      style={{
                        fontSize: "11.5px",
                        color: "#059669",
                        fontWeight: 700,
                        display: "block",
                        marginTop: "6px",
                      }}
                    >
                      {activeAppts[0].consultation_mode}
                    </span>
                  </div>
                )}
              </section>

              {/* 4 SUMMARY KPI CARDS */}
              <section className="sc-stats-grid">
                <div
                  className="sc-stat-card"
                  onClick={() => setActiveTab("appointments")}
                >
                  <div className="sc-stat-icon blue">
                    <CalendarDays size={24} />
                  </div>
                  <div>
                    <span>My Appointments</span>
                    <strong>{appointments.length}</strong>
                  </div>
                </div>

                <div
                  className="sc-stat-card"
                  onClick={() => setActiveTab("records")}
                >
                  <div className="sc-stat-icon emerald">
                    <FileText size={24} />
                  </div>
                  <div>
                    <span>Digital Health Records</span>
                    <strong>{medicalRecords.length}</strong>
                  </div>
                </div>

                <div
                  className="sc-stat-card"
                  onClick={() => setActiveTab("prescriptions")}
                >
                  <div className="sc-stat-icon purple">
                    <Pill size={24} />
                  </div>
                  <div>
                    <span>Active Prescriptions</span>
                    <strong>
                      {prescriptions.filter((p) => p.status === "Active").length}
                    </strong>
                  </div>
                </div>

                <div
                  className="sc-stat-card"
                  onClick={() => setActiveTab("notifications")}
                >
                  <div className="sc-stat-icon amber">
                    <Bell size={24} />
                  </div>
                  <div>
                    <span>Smart Alerts</span>
                    <strong>{unreadCount} New</strong>
                  </div>
                </div>
              </section>

              {/* OVERVIEW 2-COLUMN SECTION */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.35fr 1fr",
                  gap: "22px",
                }}
              >
                {/* Recent Appointments */}
                <section className="sc-panel-card">
                  <div className="sc-panel-title">
                    <span>Upcoming & Recent Appointments</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab("appointments")}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#0284c7",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Manage All →
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: "12px" }}>
                    {appointments.slice(0, 3).map((appt) => (
                      <div
                        key={appt.id}
                        style={{
                          padding: "14px 16px",
                          borderRadius: "14px",
                          border: "1px solid #e5eff7",
                          background: "#f9fcff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px",
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              color: "#0284c7",
                            }}
                          >
                            {appt.token_number} • {appt.consultation_mode}
                          </span>
                          <strong
                            style={{
                              display: "block",
                              fontSize: "14.5px",
                              color: "#122c44",
                              margin: "3px 0",
                            }}
                          >
                            {appt.doctor_name} ({appt.specialization})
                          </strong>
                          <span style={{ fontSize: "12px", color: "#64748b" }}>
                            {appt.appointment_date} at {appt.appointment_time} •{" "}
                            {appt.clinic}
                          </span>
                        </div>
                        <span
                          className={`sc-status-pill ${appt.status.toLowerCase()}`}
                        >
                          {appt.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Quick Portal Cards: Medications, Helpline, Smart Notifications */}
                <div style={{ display: "grid", gap: "16px" }}>
                  <section className="sc-panel-card">
                    <div className="sc-panel-title">
                      <span>Medications & Instructions</span>
                      <span className="sc-status-pill active">NEW</span>
                    </div>
                    {prescriptions.slice(0, 2).map((med) => (
                      <div
                        key={med.id}
                        style={{
                          padding: "10px 0",
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        <strong style={{ fontSize: "13.5px", display: "block" }}>
                          {med.medicine_name} ({med.dosage})
                        </strong>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          {med.frequency} • {med.duration}
                        </span>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setActiveTab("prescriptions")}
                      style={{
                        marginTop: "12px",
                        border: "none",
                        background: "#eef2ff",
                        color: "#4f46e5",
                        padding: "9px 14px",
                        borderRadius: "10px",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        width: "100%",
                      }}
                    >
                      View All Prescriptions →
                    </button>
                  </section>

                  <section
                    className="sc-panel-card"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div className="sc-stat-icon emerald">
                        <Phone size={20} />
                      </div>
                      <div>
                        <strong style={{ fontSize: "14px", display: "block" }}>
                          24/7 Hospital Helpline
                        </strong>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          +91 11-2658-9000 • Emergency: 1066
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("support")}
                      style={{
                        border: "1px solid #cbd5e1",
                        background: "#fff",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Support
                    </button>
                  </section>
                </div>
              </div>
            </>
          )}

          {/* ===================================================
              TAB 2: BOOK APPOINTMENT (MATCHING SCREENSHOT 1)
          =================================================== */}
          {activeTab === "book" && (
            <div className="sc-booking-container">
              {/* Left Column: Date Picker + 3 Consultation Mode Cards */}
              <div className="sc-panel-card">
                <h3 className="sc-panel-title">
                  <span>Select Date & Mode</span>
                  <CalendarDays size={18} color="#059669" />
                </h3>

                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#475569",
                    marginBottom: "8px",
                  }}
                >
                  Appointment Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    width: "100%",
                    height: "44px",
                    padding: "0 12px",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    color: "#122c44",
                    boxSizing: "border-box",
                  }}
                />

                <div className="sc-mode-cards">
                  {CONSULTATION_MODES.map((m) => {
                    const ModeIcon = m.icon;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        className={`sc-mode-card ${
                          selectedMode === m.id ? "selected" : ""
                        }`}
                        onClick={() => setSelectedMode(m.id)}
                      >
                        <div className="sc-mode-icon">
                          <ModeIcon size={19} />
                        </div>
                        <div>
                          <strong>{m.title}</strong>
                          <span>{m.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Doctor Details, Choose Clinic, Time Slot Grid */}
              <form className="sc-panel-card" onSubmit={handleBookSubmit}>
                <div className="sc-panel-title">
                  <span>Doctor Details</span>
                  <select
                    value={currentDoc.id}
                    onChange={(e) => {
                      const found = doctors.find(
                        (d) => d.id === Number(e.target.value)
                      );
                      if (found) setSelectedDoctor(found);
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      color: "#122c44",
                    }}
                  >
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.specialization})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Doctor Card */}
                <div className="sc-doctor-select-banner">
                  <div className="sc-doc-banner-left">
                    <img
                      src={currentDoc.avatar}
                      alt={currentDoc.name}
                      className="sc-doc-avatar-img"
                    />
                    <div>
                      <strong style={{ fontSize: "16px", display: "block" }}>
                        {currentDoc.name}
                      </strong>
                      <span
                        style={{
                          fontSize: "12.5px",
                          color: "#059669",
                          fontWeight: 700,
                        }}
                      >
                        {currentDoc.specialization} • {currentDoc.qualification}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: "12px",
                          color: "#64748b",
                          marginTop: "2px",
                        }}
                      >
                        Consultation Fee: ₹{currentDoc.fee} • {currentDoc.room}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="sc-emerald-btn"
                    disabled={bookingLoading}
                  >
                    {bookingLoading ? "Booking..." : "Continue & Book"}
                  </button>
                </div>

                {/* Choose Clinic */}
                <h4
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 800,
                    margin: "0 0 10px",
                    color: "#1e293b",
                  }}
                >
                  Choose Clinic
                </h4>
                <div className="sc-clinic-grid">
                  {CLINIC_OPTIONS.map((cl) => (
                    <div
                      key={cl.name}
                      className={`sc-clinic-card ${
                        selectedClinic === cl.name ? "selected" : ""
                      }`}
                      onClick={() => setSelectedClinic(cl.name)}
                    >
                      <strong>{cl.name}</strong>
                      <span>
                        <MapPin
                          size={12}
                          style={{ verticalAlign: "middle", marginRight: "4px" }}
                        />
                        {cl.location}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Time Slots Grid */}
                <h4
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 800,
                    margin: "0 0 4px",
                    color: "#1e293b",
                  }}
                >
                  {selectedDate} • Slot Availability
                </h4>
                <div className="sc-slot-grid">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      type="button"
                      key={slot}
                      className={`sc-slot-btn ${
                        selectedSlot === slot ? "selected" : ""
                      }`}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {slot}
                    </button>
                  ))}
                </div>

                {/* Symptoms / Reason Note */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      marginBottom: "6px",
                      color: "#334155",
                    }}
                  >
                    Symptoms or Reason for Consultation (Optional)
                  </label>
                  <input
                    type="text"
                    value={bookingSymptoms}
                    onChange={(e) => setBookingSymptoms(e.target.value)}
                    placeholder="e.g. Chest tightness, routine heart checkup, migraine..."
                    style={{
                      width: "100%",
                      height: "44px",
                      padding: "0 14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </form>
            </div>
          )}

          {/* ===================================================
              TAB 3: MY APPOINTMENTS (BOOK, RESCHEDULE, CANCEL, STATUS)
          =================================================== */}
          {activeTab === "appointments" && (
            <section className="sc-panel-card">
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px" }}>
                    My Appointments
                  </h3>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "12.5px",
                      color: "#64748b",
                    }}
                  >
                    Book, reschedule or cancel appointments. Statuses: Pending,
                    Confirmed, Completed, Cancelled.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {["All", "Pending", "Confirmed", "Completed", "Cancelled"].map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setApptFilter(st)}
                        style={{
                          padding: "7px 14px",
                          borderRadius: "20px",
                          border:
                            apptFilter === st
                              ? "1.5px solid #0284c7"
                              : "1px solid #cbd5e1",
                          background:
                            apptFilter === st ? "#e0f2fe" : "#ffffff",
                          color: apptFilter === st ? "#0369a1" : "#475569",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Reschedule Inline Modal */}
              {rescheduleTarget && (
                <form
                  onSubmit={handleConfirmReschedule}
                  style={{
                    background: "#f0fdf4",
                    border: "1.5px solid #10b981",
                    borderRadius: "16px",
                    padding: "18px 20px",
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <strong style={{ color: "#065f46", fontSize: "14px" }}>
                      Reschedule Appointment {rescheduleTarget.token_number} (
                      {rescheduleTarget.doctor_name})
                    </strong>
                    <button
                      type="button"
                      onClick={() => setRescheduleTarget(null)}
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        color: "#475569",
                        fontWeight: 700,
                      }}
                    >
                      ✕ Close
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "12px",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="date"
                      value={rescheduleDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      required
                      style={{
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                      }}
                    />
                    <select
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      style={{
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      {TIME_SLOTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="sc-emerald-btn">
                      Save New Date & Time
                    </button>
                  </div>
                </form>
              )}

              <div style={{ display: "grid", gap: "14px" }}>
                {filteredAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    style={{
                      padding: "18px 20px",
                      borderRadius: "16px",
                      border: "1px solid #e2ecf4",
                      background: "#ffffff",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "16px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "6px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11.5px",
                            fontWeight: 800,
                            color: "#0284c7",
                            background: "#e0f2fe",
                            padding: "3px 10px",
                            borderRadius: "20px",
                          }}
                        >
                          {appt.token_number}
                        </span>
                        <span
                          className={`sc-status-pill ${appt.status.toLowerCase()}`}
                        >
                          {appt.status}
                        </span>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          {appt.consultation_mode}
                        </span>
                      </div>

                      <strong
                        style={{
                          fontSize: "16px",
                          color: "#122c44",
                          display: "block",
                        }}
                      >
                        {appt.doctor_name} — {appt.specialization}
                      </strong>
                      <span
                        style={{
                          fontSize: "13px",
                          color: "#475569",
                          display: "block",
                          marginTop: "4px",
                        }}
                      >
                        <Clock
                          size={13}
                          style={{
                            verticalAlign: "middle",
                            marginRight: "5px",
                          }}
                        />
                        {appt.appointment_date} at {appt.appointment_time} •{" "}
                        {appt.clinic}
                      </span>
                      {appt.symptoms && (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#64748b",
                            display: "block",
                            marginTop: "4px",
                          }}
                        >
                          Note: {appt.symptoms}
                        </span>
                      )}
                    </div>

                    {/* Action Controls: Reschedule, Cancel, Status Change */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      {appt.status !== "Cancelled" &&
                        appt.status !== "Completed" && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setRescheduleTarget(appt);
                                setRescheduleDate(appt.appointment_date);
                                setRescheduleTime(appt.appointment_time);
                              }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "8px 13px",
                                borderRadius: "9px",
                                border: "1px solid #0284c7",
                                background: "#f0f9ff",
                                color: "#0284c7",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              <RefreshCw size={13} /> Reschedule
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleStatusUpdate(appt.id, "Cancelled")
                              }
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "8px 13px",
                                borderRadius: "9px",
                                border: "1px solid #fecaca",
                                background: "#fef2f2",
                                color: "#dc2626",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              <XCircle size={13} /> Cancel
                            </button>
                          </>
                        )}

                      <select
                        aria-label="Update appointment status"
                        value={appt.status}
                        onChange={(e) =>
                          handleStatusUpdate(appt.id, e.target.value)
                        }
                        style={{
                          padding: "8px 10px",
                          borderRadius: "9px",
                          border: "1px solid #cbd5e1",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#334155",
                          background: "#f8fafc",
                        }}
                      >
                        <option value="Pending">Status: Pending</option>
                        <option value="Confirmed">Status: Confirmed</option>
                        <option value="Completed">Status: Completed</option>
                        <option value="Cancelled">Status: Cancelled</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ===================================================
              TAB 4: FIND DOCTORS (SEARCH BY SPECIALIZATION)
          =================================================== */}
          {activeTab === "doctors" && (
            <section className="sc-panel-card">
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "14px",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "18px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "0 14px",
                    height: "44px",
                    borderRadius: "12px",
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    minWidth: "280px",
                    flex: 1,
                  }}
                >
                  <Search size={17} color="#64748b" />
                  <input
                    type="text"
                    placeholder="Search doctors by name, specialization, or clinic..."
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    style={{
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      width: "100%",
                      fontSize: "13.5px",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {SPECIALIZATIONS.map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setDocSpec(sp)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "20px",
                        border:
                          docSpec === sp
                            ? "1.5px solid #059669"
                            : "1px solid #cbd5e1",
                        background: docSpec === sp ? "#d1fae5" : "#fff",
                        color: docSpec === sp ? "#065f46" : "#475569",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {sp}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
                  gap: "18px",
                }}
              >
                {filteredDoctors.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      padding: "20px",
                      borderRadius: "18px",
                      border: "1px solid #e2ecf4",
                      background: "#ffffff",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "14px",
                    }}
                  >
                    <div style={{ display: "flex", gap: "14px" }}>
                      <img
                        src={doc.avatar}
                        alt={doc.name}
                        className="sc-doc-avatar-img"
                      />
                      <div>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            color: "#059669",
                            textTransform: "uppercase",
                          }}
                        >
                          {doc.specialization}
                        </span>
                        <strong
                          style={{
                            fontSize: "16px",
                            display: "block",
                            color: "#122c44",
                            margin: "2px 0",
                          }}
                        >
                          {doc.name}
                        </strong>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          {doc.qualification} • {doc.experience}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: "12.5px",
                        color: "#475569",
                        background: "#f8fafc",
                        padding: "10px 12px",
                        borderRadius: "10px",
                      }}
                    >
                      <div>
                        <strong>Clinic:</strong> {doc.clinic} ({doc.room})
                      </div>
                      <div style={{ marginTop: "4px" }}>
                        <strong>Timings:</strong> {doc.schedule}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: "15px",
                            fontWeight: 800,
                            color: "#0f2942",
                          }}
                        >
                          ₹{doc.fee}
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#f59e0b",
                            fontWeight: 700,
                            marginLeft: "10px",
                          }}
                        >
                          <Star
                            size={13}
                            fill="#f59e0b"
                            style={{ verticalAlign: "middle" }}
                          />{" "}
                          {doc.rating}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="sc-emerald-btn"
                        style={{ padding: "9px 16px", fontSize: "12.5px" }}
                        onClick={() => {
                          setSelectedDoctor(doc);
                          setActiveTab("book");
                        }}
                      >
                        Book Appointment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ===================================================
              TAB 5: DIGITAL HEALTH RECORDS
          =================================================== */}
          {activeTab === "records" && (
            <section className="sc-panel-card">
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: "18px",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px" }}>
                    Digital Health Records
                  </h3>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "12.5px",
                      color: "#64748b",
                    }}
                  >
                    Lab reports, prescriptions, diagnosis and previous
                    consultation history.
                  </p>
                </div>

                <button
                  type="button"
                  className="sc-emerald-btn"
                  onClick={() => setShowAddRecord(!showAddRecord)}
                >
                  <Upload size={15} />
                  {showAddRecord ? "Close Form" : "Upload Medical Record"}
                </button>
              </div>

              {showAddRecord && (
                <form
                  onSubmit={handleCreateRecord}
                  style={{
                    background: "#f8fbff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "16px",
                    padding: "18px",
                    marginBottom: "20px",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <select
                    value={newRecord.record_type}
                    onChange={(e) =>
                      setNewRecord({
                        ...newRecord,
                        record_type: e.target.value,
                      })
                    }
                    style={{
                      height: "42px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      padding: "0 10px",
                    }}
                  >
                    <option value="Lab Report">Lab Report</option>
                    <option value="Diagnosis">Diagnosis</option>
                    <option value="Consultation History">
                      Consultation History
                    </option>
                  </select>

                  <input
                    type="text"
                    placeholder="Report Title (e.g. Thyroid Profile) *"
                    value={newRecord.title}
                    onChange={(e) =>
                      setNewRecord({ ...newRecord, title: e.target.value })
                    }
                    required
                    style={{
                      height: "42px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      padding: "0 10px",
                    }}
                  />

                  <input
                    type="text"
                    placeholder="Summary / Diagnosis Findings *"
                    value={newRecord.diagnosis}
                    onChange={(e) =>
                      setNewRecord({ ...newRecord, diagnosis: e.target.value })
                    }
                    required
                    style={{
                      height: "42px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      padding: "0 10px",
                    }}
                  />

                  <button type="submit" className="sc-emerald-btn">
                    Save to Digital Records
                  </button>
                </form>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                  marginBottom: "16px",
                }}
              >
                {[
                  "All",
                  "Lab Report",
                  "Diagnosis",
                  "Consultation History",
                ].map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setRecordFilter(tp)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: "20px",
                      border:
                        recordFilter === tp
                          ? "1.5px solid #0284c7"
                          : "1px solid #cbd5e1",
                      background: recordFilter === tp ? "#e0f2fe" : "#fff",
                      color: recordFilter === tp ? "#0369a1" : "#475569",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {tp}
                  </button>
                ))}
              </div>

              <div style={{ display: "grid", gap: "14px" }}>
                {filteredRecords.map((rec) => (
                  <div
                    key={rec.id}
                    style={{
                      padding: "18px 20px",
                      borderRadius: "16px",
                      border: "1px solid #e2ecf4",
                      background: "#ffffff",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "14px",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          color: "#0284c7",
                          textTransform: "uppercase",
                        }}
                      >
                        {rec.record_type} • {rec.department} • {rec.record_date}
                      </span>
                      <strong
                        style={{
                          display: "block",
                          fontSize: "16px",
                          color: "#122c44",
                          margin: "4px 0",
                        }}
                      >
                        {rec.title}
                      </strong>
                      <span
                        style={{
                          display: "block",
                          fontSize: "13px",
                          color: "#334155",
                        }}
                      >
                        <strong>Diagnosis / Result:</strong> {rec.diagnosis}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: "12px",
                          color: "#64748b",
                          marginTop: "3px",
                        }}
                      >
                        Doctor: {rec.doctor_name} • {rec.notes}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <span
                        className={`sc-status-pill ${rec.status.toLowerCase()}`}
                      >
                        {rec.status}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          showToastMessage(
                            `Opened verified digital report: ${rec.file_name}`
                          )
                        }
                        style={{
                          padding: "8px 14px",
                          borderRadius: "9px",
                          border: "1px solid #cbd5e1",
                          background: "#f8fafc",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        📄 {rec.file_name || "View PDF"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ===================================================
              TAB 6: MY PRESCRIPTIONS
          =================================================== */}
          {activeTab === "prescriptions" && (
            <section className="sc-panel-card">
              <div className="sc-panel-title">
                <span>My Prescribed Medicines</span>
                <Pill size={19} color="#7c3aed" />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: "16px",
                }}
              >
                {prescriptions.map((med) => (
                  <div
                    key={med.id}
                    style={{
                      padding: "20px",
                      borderRadius: "16px",
                      border: "1px solid #e2ecf4",
                      background: "#ffffff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "10px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          color: "#7c3aed",
                        }}
                      >
                        {med.specialization} • {med.prescribed_date}
                      </span>
                      <span
                        className={`sc-status-pill ${med.status.toLowerCase()}`}
                      >
                        {med.status}
                      </span>
                    </div>

                    <strong
                      style={{
                        fontSize: "16px",
                        display: "block",
                        color: "#122c44",
                      }}
                    >
                      {med.medicine_name}
                    </strong>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#059669",
                        fontWeight: 700,
                        display: "block",
                        margin: "4px 0 10px",
                      }}
                    >
                      {med.dosage} • {med.frequency} ({med.duration})
                    </span>
                    <p
                      style={{
                        fontSize: "12.5px",
                        color: "#475569",
                        background: "#f8fafc",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        margin: "0 0 10px",
                      }}
                    >
                      {med.instructions}
                    </p>
                    <small style={{ fontSize: "11.5px", color: "#64748b" }}>
                      Prescribed by {med.doctor_name}
                    </small>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ===================================================
              TAB 7: BILLING & PAYMENTS
          =================================================== */}
          {activeTab === "billing" && (
            <section className="sc-panel-card">
              <div className="sc-panel-title">
                <span>Billing & Payment History</span>
                <CreditCard size={19} color="#0284c7" />
              </div>

              <div style={{ display: "grid", gap: "14px" }}>
                {bills.map((bill) => (
                  <div
                    key={bill.id}
                    style={{
                      padding: "18px 20px",
                      borderRadius: "16px",
                      border: "1px solid #e2ecf4",
                      background: "#ffffff",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "14px",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: "11.5px",
                          fontWeight: 800,
                          color: "#0284c7",
                        }}
                      >
                        {bill.invoice_no} • {bill.bill_date}
                      </span>
                      <strong
                        style={{
                          display: "block",
                          fontSize: "15.5px",
                          color: "#122c44",
                          margin: "3px 0",
                        }}
                      >
                        {bill.service}
                      </strong>
                      <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                        Doctor: {bill.doctor_name} • Method:{" "}
                        {bill.payment_method}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                      }}
                    >
                      <strong style={{ fontSize: "18px", color: "#0f2942" }}>
                        ₹{bill.amount}
                      </strong>
                      <span
                        className={`sc-status-pill ${bill.status.toLowerCase()}`}
                      >
                        {bill.status}
                      </span>
                      {bill.status === "Pending" && (
                        <button
                          type="button"
                          className="sc-emerald-btn"
                          style={{ padding: "8px 16px", fontSize: "12.5px" }}
                          onClick={() => handlePayInvoice(bill.id)}
                        >
                          Pay Now
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ===================================================
              TAB 8: HEALTH PROFILE (GET & PUT /patient/profile)
          =================================================== */}
          {activeTab === "profile" && profile && (
            <form className="sc-panel-card" onSubmit={handleSaveProfile}>
              <div className="sc-panel-title">
                <span>Personal & Health Profile</span>
                <ShieldCheck size={20} color="#059669" />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "16px",
                }}
              >
                {[
                  { label: "Full Name", key: "full_name" },
                  { label: "Phone Number", key: "phone" },
                  { label: "Date of Birth", key: "date_of_birth" },
                  { label: "Gender", key: "gender" },
                  { label: "Blood Group", key: "blood_group" },
                  { label: "Height", key: "height_cm" },
                  { label: "Weight", key: "weight_kg" },
                  { label: "Known Allergies", key: "allergies" },
                  { label: "Chronic Conditions", key: "chronic_conditions" },
                  {
                    label: "Emergency Contact Name",
                    key: "emergency_contact_name",
                  },
                  {
                    label: "Emergency Contact Phone",
                    key: "emergency_contact_phone",
                  },
                  { label: "Health Insurance", key: "insurance_provider" },
                ].map((f) => (
                  <div key={f.key}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#475569",
                        marginBottom: "6px",
                      }}
                    >
                      {f.label}
                    </label>
                    <input
                      type="text"
                      value={profile[f.key] || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, [f.key]: e.target.value })
                      }
                      style={{
                        width: "100%",
                        height: "42px",
                        padding: "0 12px",
                        borderRadius: "10px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "20px" }}>
                <button type="submit" className="sc-emerald-btn">
                  Save Health Profile
                </button>
              </div>
            </form>
          )}

          {/* ===================================================
              TAB 9: SMART NOTIFICATIONS
          =================================================== */}
          {activeTab === "notifications" && (
            <section className="sc-panel-card">
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: "18px",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px" }}>
                    Smart Notifications
                  </h3>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "12.5px",
                      color: "#64748b",
                    }}
                  >
                    Appointment reminders, report availability and payment
                    updates.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {[
                    "All",
                    "Appointment Reminder",
                    "Report Availability",
                    "Payment Update",
                  ].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNotifFilter(cat)}
                      style={{
                        padding: "7px 13px",
                        borderRadius: "20px",
                        border:
                          notifFilter === cat
                            ? "1.5px solid #0284c7"
                            : "1px solid #cbd5e1",
                        background: notifFilter === cat ? "#e0f2fe" : "#fff",
                        color: notifFilter === cat ? "#0369a1" : "#475569",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {cat}
                    </button>
                  ))}

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleReadAllNotifs}
                      style={{
                        padding: "7px 14px",
                        borderRadius: "20px",
                        border: "none",
                        background: "#0f2942",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Mark All Read
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gap: "12px" }}>
                {filteredNotifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "16px 18px",
                      borderRadius: "14px",
                      border: n.is_read
                        ? "1px solid #e2ecf4"
                        : "1.5px solid #38bdf8",
                      background: n.is_read ? "#ffffff" : "#f0f9ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "14px",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          color: "#0284c7",
                          textTransform: "uppercase",
                        }}
                      >
                        {n.category} • {n.time_label}
                      </span>
                      <strong
                        style={{
                          display: "block",
                          fontSize: "15px",
                          color: "#122c44",
                          margin: "3px 0",
                        }}
                      >
                        {n.title}
                      </strong>
                      <span style={{ fontSize: "13px", color: "#475569" }}>
                        {n.message}
                      </span>
                    </div>

                    {!n.is_read && (
                      <button
                        type="button"
                        onClick={() => handleReadNotif(n.id)}
                        style={{
                          padding: "7px 12px",
                          borderRadius: "8px",
                          border: "1px solid #0284c7",
                          background: "#ffffff",
                          color: "#0284c7",
                          fontSize: "11.5px",
                          fontWeight: 700,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ===================================================
              TAB 10: SUPPORT & AI HEALTH ASSISTANT ("LUNA" — SCREENSHOT 2)
          =================================================== */}
          {activeTab === "support" && (
            <div style={{ display: "grid", gap: "24px" }}>
              {/* AI Health Assistant Card ("I'm Luna 👋") */}
              <section className="sc-luna-card">
                <div className="sc-luna-header">
                  <div className="sc-luna-bot-icon">
                    <Bot size={30} />
                  </div>
                  <h3>I&apos;m Luna 👋</h3>
                  <p>
                    Your personal SmartCare AI assistant. I can explain vitals,
                    hospital navigation, active medicines, and help with your
                    appointments in simple language.
                  </p>
                </div>

                {/* Quick Chips from Screenshot 2 */}
                <div className="sc-luna-chips">
                  {[
                    "Check vitals status ❤️",
                    "Visiting hours & navigation? 🕒",
                    "Next doctor visit? 👨‍⚕️",
                    "Explain my meds 💊",
                    "Ask about billing 🧾",
                  ].map((chip) => (
                    <button
                      type="button"
                      key={chip}
                      className="sc-luna-chip"
                      onClick={() => handleSendAiPrompt(chip)}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Chat Messages */}
                <div className="sc-luna-messages">
                  {aiMessages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`sc-luna-msg ${
                        m.sender === "bot" ? "bot" : "user"
                      }`}
                    >
                      {m.text}
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="sc-luna-msg bot">
                      Luna is typing a response...
                    </div>
                  )}
                </div>

                <form
                  className="sc-luna-input-bar"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendAiPrompt();
                  }}
                >
                  <input
                    type="text"
                    placeholder="Type a message to Luna..."
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="sc-luna-send-btn"
                    aria-label="Send message"
                  >
                    <Send size={16} />
                  </button>
                </form>

                <div className="sc-luna-disclaimer">
                  <AlertTriangle
                    size={13}
                    style={{ verticalAlign: "middle", marginRight: "6px" }}
                  />
                  AI Health Assistant provides general health FAQs, hospital
                  navigation & appointment assistance — not a replacement for
                  emergency medical diagnosis. For emergencies, call{" "}
                  <strong>1066</strong>.
                </div>
              </section>

              {/* Help & Complaints Ticket Section */}
              <section className="sc-panel-card">
                <div className="sc-panel-title">
                  <span>Help Desk & Complaint Tickets</span>
                  <Headset size={19} color="#0284c7" />
                </div>

                <form
                  onSubmit={handleTicketSubmit}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "12px",
                    marginBottom: "20px",
                  }}
                >
                  <select
                    value={ticketForm.category}
                    onChange={(e) =>
                      setTicketForm({ ...ticketForm, category: e.target.value })
                    }
                    style={{
                      height: "42px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      padding: "0 12px",
                    }}
                  >
                    <option value="Appointment Help">Appointment Help</option>
                    <option value="Billing & Refund">Billing & Refund</option>
                    <option value="Lab Report Query">Lab Report Query</option>
                    <option value="Hospital Feedback / Complaint">
                      Hospital Feedback / Complaint
                    </option>
                  </select>

                  <input
                    type="text"
                    placeholder="Subject *"
                    value={ticketForm.subject}
                    onChange={(e) =>
                      setTicketForm({ ...ticketForm, subject: e.target.value })
                    }
                    required
                    style={{
                      height: "42px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      padding: "0 12px",
                    }}
                  />

                  <input
                    type="text"
                    placeholder="Describe your issue or query *"
                    value={ticketForm.description}
                    onChange={(e) =>
                      setTicketForm({
                        ...ticketForm,
                        description: e.target.value,
                      })
                    }
                    required
                    style={{
                      height: "42px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      padding: "0 12px",
                    }}
                  />

                  <button type="submit" className="sc-emerald-btn">
                    Submit Support Request
                  </button>
                </form>

                {tickets.length > 0 && (
                  <div style={{ display: "grid", gap: "10px" }}>
                    {tickets.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          padding: "12px 16px",
                          borderRadius: "12px",
                          border: "1px solid #e2ecf4",
                          background: "#f8fafc",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: "13.5px" }}>
                            {t.ticket_no} • {t.subject} ({t.category})
                          </strong>
                          <span
                            style={{
                              display: "block",
                              fontSize: "12px",
                              color: "#64748b",
                            }}
                          >
                            {t.description} • {t.created_date}
                          </span>
                        </div>
                        <span className="sc-status-pill open">{t.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
