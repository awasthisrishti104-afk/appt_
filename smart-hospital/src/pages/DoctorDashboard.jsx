import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HeartPulse,
  LayoutDashboard,
  Clock,
  CalendarDays,
  Users,
  Stethoscope,
  Settings,
  LogOut,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  Phone,
  Mail,
  Video,
  Building2,
  Pill,
  BadgeCheck,
  UserCheck,
  AlertCircle,
  CreditCard,
  Star,
  MessageSquare,
  Send,
  Download,
  Printer,
  DollarSign,
  Receipt,
  ThumbsUp,
  CornerDownRight,
  PlusCircle,
} from "lucide-react";
import {
  getAuthToken,
  getSavedUser,
  clearAuthStorage,
  fetchDoctorDashboard,
  submitDoctorDecision,
  submitDoctorPrescription,
  updateDoctorAvailabilitySettings,
} from "../services/api";

const DOC_MENU = [
  { id: "appointments", label: "Appointments", icon: CalendarDays },
  { id: "requests", label: "Requests", icon: Clock },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "patients", label: "My Patients", icon: Users },
  { id: "timings", label: "Available Timings", icon: Stethoscope },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "profile", label: "Profile Settings", icon: Settings },
];

export default function DoctorDashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("appointments");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const [doctor, setDoctor] = useState(null);
  const [stats, setStats] = useState({
    total_appointments: 0,
    pending_requests: 0,
    upcoming_confirmed: 0,
    completed_visits: 0,
    total_patients: 0,
  });
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);

  // Consultation & Prescription Modal State
  const [consultModalAppt, setConsultModalAppt] = useState(null);
  const [rxForm, setRxForm] = useState({
    diagnosis: "",
    consultation_notes: "",
    medicine_name: "",
    dosage: "1 Tablet",
    frequency: "Twice Daily (Morning & Night)",
    duration: "7 Days",
    instructions: "Take after meals with warm water.",
  });

  // Patient History Modal
  const [historyPatient, setHistoryPatient] = useState(null);

  // Availability Form
  const [availForm, setAvailForm] = useState({
    available: true,
    schedule: "Mon - Sat • 09:00 AM - 05:00 PM",
    fee: 800,
    clinic: "Fortis & SmartCare Heart Institute",
    room: "Wing A • Room 101",
    qualification: "MD, DM",
    experience: "12 Years",
  });

  // ==========================================
  // 1. PATIENT INVOICES STATE
  // ==========================================
  const [invoices, setInvoices] = useState([
    {
      id: "INV-2026-081",
      patient_name: "Amit Kumar",
      appointment_token: "SC-301",
      date: "Nov 4, 2026",
      service: "Cardiology Consultation & ECG",
      amount: 800,
      status: "Paid",
      payment_mode: "UPI (Google Pay)",
    },
    {
      id: "INV-2026-082",
      patient_name: "Suman Roy",
      appointment_token: "SC-302",
      date: "Nov 4, 2026",
      service: "Orthopedics & Spine Checkup",
      amount: 700,
      status: "Pending",
      payment_mode: "Cash on Visit",
    },
    {
      id: "INV-2026-083",
      patient_name: "Riya Gupta",
      appointment_token: "SC-303",
      date: "Nov 3, 2026",
      service: "Neurology Specialist OPD",
      amount: 750,
      status: "Paid",
      payment_mode: "Debit Card",
    },
    {
      id: "INV-2026-084",
      patient_name: "Pooja Verma",
      appointment_token: "SC-304",
      date: "Nov 2, 2026",
      service: "Comprehensive Cardiac Review",
      amount: 800,
      status: "Paid",
      payment_mode: "Net Banking",
    },
  ]);
  const [invoiceFilter, setInvoiceFilter] = useState("All");

  // ==========================================
  // 2. PAYMENTS STATE
  // ==========================================
  const [paymentStats] = useState({
    total_revenue: 48600,
    available_payout: 12400,
    today_earnings: 2400,
    total_transactions: 58,
  });
  const [payoutRequested, setPayoutRequested] = useState(false);

  // ==========================================
  // 3. REVIEWS STATE
  // ==========================================
  const [reviews, setReviews] = useState([
    {
      id: 1,
      patient_name: "Amit Kumar",
      rating: 5,
      date: "Nov 3, 2026",
      treatment: "Cardiac Consultation",
      comment:
        "Dr. Santosh is very thorough and patient. He explained my ECG reports clearly and the prescription helped alleviate my symptoms within 2 days.",
      doctor_reply: "Thank you Amit, take care and stay healthy!",
    },
    {
      id: 2,
      patient_name: "Riya Gupta",
      rating: 5,
      date: "Nov 2, 2026",
      treatment: "Migraine & Neurology Review",
      comment:
        "Very professional doctor. Clinic setup is clean and time management was on point. Highly recommended!",
      doctor_reply: null,
    },
    {
      id: 3,
      patient_name: "Vikram Joshi",
      rating: 4,
      date: "Oct 29, 2026",
      treatment: "Hypertension Routine OPD",
      comment:
        "Good consultation and practical lifestyle advice given. Very helpful follow-up system.",
      doctor_reply: "Glad to help Vikram!",
    },
  ]);
  const [replyInputs, setReplyInputs] = useState({});

  // ==========================================
  // 4. MESSAGES / PATIENT CHAT STATE
  // ==========================================
  const [selectedChatPatient, setSelectedChatPatient] = useState("Amit Kumar");
  const [chatInput, setChatInput] = useState("");
  const [chatConversations, setChatConversations] = useState({
    "Amit Kumar": [
      {
        id: 1,
        sender: "patient",
        text: "Hello Doctor, I received the prescription for Atorvastatin. Should I take it before or after dinner?",
        time: "10:15 AM",
      },
      {
        id: 2,
        sender: "doctor",
        text: "Hello Amit. Please take it once daily after dinner with warm water.",
        time: "10:20 AM",
      },
      {
        id: 3,
        sender: "patient",
        text: "Understood Doctor, thank you so much!",
        time: "10:22 AM",
      },
    ],
    "Suman Roy": [
      {
        id: 1,
        sender: "patient",
        text: "Doctor, can I get my appointment rescheduled for tomorrow?",
        time: "Yesterday",
      },
      {
        id: 2,
        sender: "doctor",
        text: "Yes Suman, you can select any slot from the patient portal or I can confirm 11:30 AM for you.",
        time: "Yesterday",
      },
    ],
    "Riya Gupta": [
      {
        id: 1,
        sender: "patient",
        text: "Doctor, the migraine pain has significantly reduced after 3 days of medicine.",
        time: "Nov 3",
      },
      {
        id: 2,
        sender: "doctor",
        text: "Glad to hear that, Riya! Continue the course for 7 full days as prescribed.",
        time: "Nov 3",
      },
    ],
    "Vikram Joshi": [
      {
        id: 1,
        sender: "patient",
        text: "Doctor, should I do a fasting blood sugar test before next Monday's visit?",
        time: "Nov 1",
      },
      {
        id: 2,
        sender: "doctor",
        text: "Yes please, 12-hour fasting report will give us exact baseline numbers.",
        time: "Nov 1",
      },
    ],
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const loadDoctorPortal = async () => {
    const token = getAuthToken();
    if (!token) {
      navigate("/login");
      return;
    }

    const savedUser = getSavedUser();
    const role = (savedUser?.role || "").toLowerCase().trim();
    if (role && role !== "doctor") {
      if (role.includes("admin")) {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }
      return;
    }

    try {
      setLoading(true);
      const data = await fetchDoctorDashboard();
      setDoctor(data.doctor);
      setStats(data.stats);
      setAppointments(data.appointments || []);
      setPatients(data.patients || []);
      if (data.doctor) {
        setAvailForm({
          available: data.doctor.available,
          schedule: data.doctor.schedule || "Mon - Sat • 09:00 AM - 05:00 PM",
          fee: data.doctor.fee || 800,
          clinic: data.doctor.clinic || "SmartCare Hospital",
          room: data.doctor.room || "Wing A • Room 101",
          qualification: data.doctor.qualification || "MBBS, MD",
          experience: data.doctor.experience || "10 Years",
        });
      }
    } catch (err) {
      if (
        err.message?.toLowerCase().includes("token") ||
        err.message?.toLowerCase().includes("unauthorized") ||
        err.message?.toLowerCase().includes("forbidden")
      ) {
        navigate("/login");
      } else {
        showToast(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorPortal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    clearAuthStorage();
    navigate("/login");
  };

  const handleDecision = async (apptId, status) => {
    try {
      const res = await submitDoctorDecision(apptId, status);
      showToast(res.message);
      await loadDoctorPortal();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handlePrescribeSubmit = async (e) => {
    e.preventDefault();
    if (!consultModalAppt) return;

    try {
      const res = await submitDoctorPrescription(consultModalAppt.id, rxForm);
      showToast(res.message);
      setConsultModalAppt(null);
      setRxForm({
        diagnosis: "",
        consultation_notes: "",
        medicine_name: "",
        dosage: "1 Tablet",
        frequency: "Twice Daily (Morning & Night)",
        duration: "7 Days",
        instructions: "Take after meals with warm water.",
      });
      await loadDoctorPortal();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleSaveAvailability = async (e) => {
    e.preventDefault();
    try {
      const res = await updateDoctorAvailabilitySettings(availForm);
      showToast(res.message);
      await loadDoctorPortal();
    } catch (err) {
      showToast(err.message);
    }
  };

  // SEND MESSAGE HANDLER
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: "doctor",
      text: chatInput.trim(),
      time: "Just now",
    };

    setChatConversations((prev) => ({
      ...prev,
      [selectedChatPatient]: [
        ...(prev[selectedChatPatient] || []),
        newMsg,
      ],
    }));

    setChatInput("");
    showToast(`Message sent to ${selectedChatPatient}!`);
  };

  // SUBMIT REVIEW REPLY HANDLER
  const handleReplyReview = (reviewId) => {
    const text = replyInputs[reviewId]?.trim();
    if (!text) return;

    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId ? { ...r, doctor_reply: text } : r
      )
    );
    setReplyInputs((prev) => ({ ...prev, [reviewId]: "" }));
    showToast("Reply published to patient review!");
  };

  const filteredAppointments = appointments.filter((a) => {
    const matchStatus =
      statusFilter === "All"
        ? true
        : statusFilter === "Upcoming"
        ? a.status === "Confirmed" || a.status === "Pending"
        : a.status === statusFilter;
    const matchSearch =
      !searchQuery.trim() ||
      a.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.token_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.symptoms?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const pendingAppointments = appointments.filter(
    (a) => a.status === "Pending"
  );

  const filteredInvoices = invoices.filter((inv) =>
    invoiceFilter === "All" ? true : inv.status === invoiceFilter
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f7fc",
        fontFamily: "'Inter', system-ui, sans-serif",
        color: "#1e293b",
        textAlign: "left",
      }}
    >
      {/* TOP NAVBAR */}
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "14px 5%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
            color: "#0f2942",
          }}
        >
          <span
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #0d6efd, #0ea5e9)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
            }}
          >
            <HeartPulse size={22} />
          </span>
          <div>
            <strong style={{ fontSize: "20px", display: "block" }}>
              SmartCare
            </strong>
            <small
              style={{
                fontSize: "10px",
                color: "#0d6efd",
                fontWeight: 800,
                letterSpacing: "1px",
              }}
            >
              DOCTOR PORTAL
            </small>
          </div>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              background: doctor?.available ? "#dcfce7" : "#fee2e2",
              color: doctor?.available ? "#15803d" : "#b91c1c",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            ● {doctor?.available ? "Available for OPD" : "Away / In OT"}
          </span>

          {doctor && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <img
                src={doctor.avatar}
                alt={doctor.name}
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid #0d6efd",
                }}
              />
              <div style={{ fontSize: "13px" }}>
                <strong style={{ display: "block", color: "#0f172a" }}>
                  {doctor.name}
                </strong>
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  {doctor.specialization}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* PAGE BANNER */}
      <div
        style={{
          background:
            "linear-gradient(180deg, #eef5ff 0%, #f8fbff 100%)",
          padding: "26px 5%",
          textAlign: "center",
          borderBottom: "1px solid #e2ecf7",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            color: "#64748b",
            fontWeight: 600,
            marginBottom: "6px",
          }}
        >
          🏠 &gt; Doctor &gt;{" "}
          <span style={{ color: "#0d6efd", fontWeight: 700 }}>
            {DOC_MENU.find((m) => m.id === activeTab)?.label || "Appointments"}
          </span>
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: "28px",
            fontWeight: 800,
            color: "#0f172a",
          }}
        >
          {DOC_MENU.find((m) => m.id === activeTab)?.label || "Appointments"}
        </h1>
      </div>

      {/* TOAST */}
      {toast && (
        <div
          style={{
            maxWidth: "1260px",
            margin: "16px auto 0",
            padding: "12px 18px",
            borderRadius: "12px",
            background: "#eff6ff",
            border: "1px solid #93c5fd",
            color: "#1d4ed8",
            fontWeight: 700,
            fontSize: "13.5px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}

      {/* MAIN 2-COLUMN LAYOUT */}
      <div
        style={{
          maxWidth: "1300px",
          margin: "28px auto",
          padding: "0 4%",
          display: "grid",
          gridTemplateColumns: "290px 1fr",
          gap: "26px",
          alignItems: "start",
        }}
      >
        {/* LEFT DOCTOR PROFILE & SIDEBAR CARD */}
        <aside
          style={{
            background: "#ffffff",
            borderRadius: "18px",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
          }}
        >
          <div
            style={{
              height: "95px",
              background:
                "linear-gradient(135deg, #0d6efd 0%, #2563eb 60%, #38bdf8 100%)",
              position: "relative",
            }}
          />
          <div
            style={{
              textAlign: "center",
              padding: "0 20px 20px",
              marginTop: "-48px",
              position: "relative",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <img
              src={
                doctor?.avatar ||
                "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=300&q=80"
              }
              alt={doctor?.name}
              style={{
                width: "92px",
                height: "92px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "4px solid #ffffff",
                boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
              }}
            />
            <h3
              style={{
                margin: "10px 0 4px",
                fontSize: "17px",
                fontWeight: 800,
                color: "#0f172a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
              }}
            >
              {doctor?.name || "Dr. Santosh Rajab"}
              <BadgeCheck size={17} color="#10b981" />
            </h3>
            <p
              style={{
                margin: "0 0 10px",
                fontSize: "12px",
                color: "#64748b",
              }}
            >
              {doctor?.qualification} • Reg: {doctor?.medical_reg_no}
            </p>
            <span
              style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: "20px",
                border: "1px solid #bfdbfe",
                background: "#eff6ff",
                color: "#1d4ed8",
                fontSize: "11.5px",
                fontWeight: 700,
              }}
            >
              • {doctor?.specialization || "Cardiologist"}
            </span>
          </div>

          <div style={{ padding: "16px 18px", borderBottom: "1px solid #f1f5f9" }}>
            <label
              style={{
                display: "block",
                fontSize: "11.5px",
                fontWeight: 700,
                color: "#475569",
                marginBottom: "6px",
              }}
            >
              Availability{" "}
              <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={availForm.available ? "available" : "unavailable"}
              onChange={async (e) => {
                const isAvail = e.target.value === "available";
                setAvailForm((prev) => ({ ...prev, available: isAvail }));
                try {
                  await updateDoctorAvailabilitySettings({
                    ...availForm,
                    available: isAvail,
                  });
                  showToast("Availability status updated!");
                  await loadDoctorPortal();
                } catch (err) {
                  showToast(err.message);
                }
              }}
              style={{
                width: "100%",
                height: "40px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                padding: "0 10px",
                fontSize: "12.5px",
                fontWeight: 600,
                color: "#0f172a",
              }}
            >
              <option value="available">🟢 I am Available Now</option>
              <option value="unavailable">🔴 Busy / In Surgery (OT)</option>
            </select>
          </div>

          {/* VERTICAL MENU INCLUDING INVOICES, PAYMENTS, REVIEWS, MESSAGES */}
          <nav style={{ padding: "12px" }}>
            {DOC_MENU.map((item) => {
              const Icon = item.icon;
              const isReq = item.id === "requests";
              const isMsg = item.id === "messages";
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "11px",
                    padding: "11px 14px",
                    marginBottom: "4px",
                    border: "none",
                    borderRadius: "10px",
                    background:
                      activeTab === item.id ? "#0d6efd" : "transparent",
                    color: activeTab === item.id ? "#ffffff" : "#475569",
                    fontSize: "13.5px",
                    fontWeight: activeTab === item.id ? 700 : 600,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                  {isReq && stats.pending_requests > 0 && (
                    <span
                      style={{
                        marginLeft: "auto",
                        background: "#f97316",
                        color: "#fff",
                        fontSize: "10.5px",
                        fontWeight: 800,
                        padding: "2px 7px",
                        borderRadius: "20px",
                      }}
                    >
                      {stats.pending_requests}
                    </span>
                  )}
                  {isMsg && (
                    <span
                      style={{
                        marginLeft: "auto",
                        background: activeTab === item.id ? "#ffffff" : "#0d6efd",
                        color: activeTab === item.id ? "#0d6efd" : "#ffffff",
                        fontSize: "10px",
                        fontWeight: 800,
                        padding: "2px 6px",
                        borderRadius: "10px",
                      }}
                    >
                      New
                    </span>
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={handleLogout}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "11px",
                padding: "11px 14px",
                marginTop: "8px",
                border: "none",
                borderRadius: "10px",
                background: "#fef2f2",
                color: "#dc2626",
                fontSize: "13.5px",
                fontWeight: 700,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <LogOut size={17} />
              <span>Logout</span>
            </button>
          </nav>
        </aside>

        {/* RIGHT MAIN CONTENT */}
        <main>
          {/* =================================================
              TAB 1: APPOINTMENTS
          ================================================= */}
          {activeTab === "appointments" && (
            <section
              style={{
                background: "#ffffff",
                borderRadius: "18px",
                border: "1px solid #e2e8f0",
                padding: "24px",
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "14px",
                  paddingBottom: "18px",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>
                  Appointments
                </h2>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "0 12px",
                    height: "40px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    minWidth: "250px",
                  }}
                >
                  <Search size={16} color="#64748b" />
                  <input
                    type="text"
                    placeholder="Search patient or token..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      fontSize: "13px",
                      width: "100%",
                    }}
                  />
                </div>
              </div>

              {/* Status Filter Pills */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                  margin: "18px 0 22px",
                }}
              >
                {[
                  { id: "All", label: "All", count: appointments.length },
                  {
                    id: "Upcoming",
                    label: "Upcoming",
                    count:
                      stats.upcoming_confirmed + stats.pending_requests,
                  },
                  {
                    id: "Pending",
                    label: "Pending Requests",
                    count: stats.pending_requests,
                  },
                  {
                    id: "Completed",
                    label: "Completed",
                    count: stats.completed_visits,
                  },
                  {
                    id: "Cancelled",
                    label: "Cancelled",
                    count: appointments.filter(
                      (a) =>
                        a.status === "Cancelled" || a.status === "Rejected"
                    ).length,
                  },
                ].map((tab) => {
                  const active = statusFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "9px 16px",
                        borderRadius: "10px",
                        border: active
                          ? "none"
                          : "1px solid #e2e8f0",
                        background: active ? "#0d6efd" : "#f8fafc",
                        color: active ? "#ffffff" : "#334155",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <span>{tab.label}</span>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background: active
                            ? "#ffffff"
                            : "#e2e8f0",
                          color: active ? "#0d6efd" : "#334155",
                          fontSize: "11px",
                          fontWeight: 800,
                        }}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {loading ? (
                <p>Loading appointments...</p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "18px",
                  }}
                >
                  {filteredAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      style={{
                        border: "1px solid #e2ecf4",
                        borderRadius: "16px",
                        padding: "18px",
                        background: "#ffffff",
                        boxShadow: "0 4px 14px rgba(15, 23, 42, 0.03)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: "14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          <div
                            style={{
                              width: "44px",
                              height: "44px",
                              borderRadius: "12px",
                              background:
                                "linear-gradient(135deg, #dbeafe, #eff6ff)",
                              color: "#1d4ed8",
                              fontWeight: 800,
                              fontSize: "15px",
                              display: "grid",
                              placeItems: "center",
                            }}
                          >
                            {(appt.patient_name || "P")[0]}
                          </div>
                          <div>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 800,
                                color: "#0d6efd",
                              }}
                            >
                              #{appt.token_number}
                            </span>
                            <strong
                              style={{
                                display: "block",
                                fontSize: "15px",
                                color: "#0f172a",
                              }}
                            >
                              {appt.patient_name}
                            </strong>
                            <span
                              style={{
                                fontSize: "11.5px",
                                color: "#64748b",
                              }}
                            >
                              {appt.patient_age} Yrs • {appt.patient_gender} •
                              Blood: {appt.blood_group}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`sc-status-pill ${appt.status.toLowerCase()}`}
                        >
                          {appt.status}
                        </span>
                      </div>

                      <div
                        style={{
                          background: "#f4f7fb",
                          borderRadius: "12px",
                          padding: "12px 14px",
                          fontSize: "12.5px",
                          color: "#334155",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontWeight: 700,
                            color: "#0f172a",
                            marginBottom: "6px",
                          }}
                        >
                          <span>📅 {appt.appointment_date}</span>
                          <span>🕒 {appt.appointment_time}</span>
                        </div>
                        <div style={{ color: "#475569" }}>
                          <strong>{appt.consultation_mode}</strong> •{" "}
                          {appt.symptoms}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "8px",
                          paddingTop: "4px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setHistoryPatient(appt)}
                          style={{
                            padding: "7px 11px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            background: "#f8fafc",
                            color: "#334155",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          📋 History
                        </button>

                        {appt.status === "Pending" && (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() =>
                                handleDecision(appt.id, "Confirmed")
                              }
                              style={{
                                padding: "7px 12px",
                                borderRadius: "8px",
                                border: "none",
                                background: "#10b981",
                                color: "#fff",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              ✓ Accept
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDecision(appt.id, "Rejected")
                              }
                              style={{
                                padding: "7px 12px",
                                borderRadius: "8px",
                                border: "none",
                                background: "#ef4444",
                                color: "#fff",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              ✕ Reject
                            </button>
                          </div>
                        )}

                        {appt.status !== "Cancelled" &&
                          appt.status !== "Rejected" && (
                            <button
                              type="button"
                              onClick={() => {
                                setConsultModalAppt(appt);
                                setRxForm((prev) => ({
                                  ...prev,
                                  diagnosis: appt.symptoms || "",
                                  consultation_notes:
                                    appt.consultation_notes || "",
                                }));
                              }}
                              style={{
                                padding: "7px 14px",
                                borderRadius: "8px",
                                border: "1px solid #0d6efd",
                                background: "#eff6ff",
                                color: "#0d6efd",
                                fontSize: "12px",
                                fontWeight: 800,
                                cursor: "pointer",
                              }}
                            >
                              Start Now
                            </button>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* =================================================
              TAB 2: PENDING APPOINTMENT REQUESTS
          ================================================= */}
          {activeTab === "requests" && (
            <section
              style={{
                background: "#ffffff",
                borderRadius: "18px",
                border: "1px solid #e2e8f0",
                padding: "24px",
              }}
            >
              <h2 style={{ margin: "0 0 6px", fontSize: "20px" }}>
                Pending Appointment Requests ({pendingAppointments.length})
              </h2>
              <p
                style={{
                  margin: "0 0 20px",
                  fontSize: "13px",
                  color: "#64748b",
                }}
              >
                Accept or reject new patient appointment bookings. Patients
                receive an instant notification.
              </p>

              {pendingAppointments.length === 0 ? (
                <div
                  style={{
                    padding: "32px",
                    textAlign: "center",
                    background: "#f8fafc",
                    borderRadius: "14px",
                    color: "#64748b",
                  }}
                >
                  All appointment requests have been reviewed!
                </div>
              ) : (
                <div style={{ display: "grid", gap: "14px" }}>
                  {pendingAppointments.map((req) => (
                    <div
                      key={req.id}
                      style={{
                        padding: "18px 20px",
                        borderRadius: "14px",
                        border: "1px solid #e2ecf4",
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "16px",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: "11.5px",
                            fontWeight: 800,
                            color: "#0d6efd",
                          }}
                        >
                          #{req.token_number} • {req.consultation_mode}
                        </span>
                        <strong
                          style={{
                            display: "block",
                            fontSize: "16px",
                            margin: "4px 0",
                          }}
                        >
                          {req.patient_name} ({req.patient_age} Yrs,{" "}
                          {req.patient_gender})
                        </strong>
                        <span style={{ fontSize: "13px", color: "#475569" }}>
                          📅 {req.appointment_date} at {req.appointment_time} •
                          Reason: <strong>{req.symptoms}</strong>
                        </span>
                        <span
                          style={{
                            display: "block",
                            fontSize: "12px",
                            color: "#64748b",
                            marginTop: "4px",
                          }}
                        >
                          📞 {req.patient_phone} • ✉ {req.patient_email}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          type="button"
                          onClick={() => handleDecision(req.id, "Confirmed")}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "10px 18px",
                            borderRadius: "10px",
                            border: "none",
                            background: "#10b981",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: "13px",
                            cursor: "pointer",
                          }}
                        >
                          <CheckCircle2 size={16} /> Accept Request
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecision(req.id, "Rejected")}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "10px 18px",
                            borderRadius: "10px",
                            border: "1px solid #fecaca",
                            background: "#fef2f2",
                            color: "#dc2626",
                            fontWeight: 700,
                            fontSize: "13px",
                            cursor: "pointer",
                          }}
                        >
                          <XCircle size={16} /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* =================================================
              TAB 3: DOCTOR DASHBOARD OVERVIEW
          ================================================= */}
          {activeTab === "dashboard" && (
            <div style={{ display: "grid", gap: "20px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "16px",
                }}
              >
                {[
                  {
                    label: "Total Patients",
                    val: stats.total_patients,
                    color: "#0d6efd",
                    bg: "#eff6ff",
                  },
                  {
                    label: "Pending Requests",
                    val: stats.pending_requests,
                    color: "#f97316",
                    bg: "#fff7ed",
                  },
                  {
                    label: "Confirmed Upcoming",
                    val: stats.upcoming_confirmed,
                    color: "#10b981",
                    bg: "#ecfdf5",
                  },
                  {
                    label: "Completed Consultations",
                    val: stats.completed_visits,
                    color: "#6366f1",
                    bg: "#eef2ff",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      background: "#ffffff",
                      padding: "20px",
                      borderRadius: "16px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12.5px",
                        color: "#64748b",
                        fontWeight: 600,
                      }}
                    >
                      {s.label}
                    </span>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "28px",
                        color: s.color,
                        marginTop: "6px",
                      }}
                    >
                      {s.val}
                    </strong>
                  </div>
                ))}
              </div>

              <section
                style={{
                  background: "#ffffff",
                  padding: "22px",
                  borderRadius: "18px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <h3 style={{ margin: "0 0 14px" }}>
                  Recent Patient Consultations
                </h3>
                <div style={{ display: "grid", gap: "12px" }}>
                  {appointments.slice(0, 5).map((a) => (
                    <div
                      key={a.id}
                      style={{
                        padding: "14px 16px",
                        borderRadius: "12px",
                        border: "1px solid #e2ecf4",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong>
                          {a.patient_name} (#{a.token_number})
                        </strong>
                        <span
                          style={{
                            display: "block",
                            fontSize: "12.5px",
                            color: "#64748b",
                          }}
                        >
                          {a.appointment_date} at {a.appointment_time} •{" "}
                          {a.symptoms}
                        </span>
                      </div>
                      <span
                        className={`sc-status-pill ${a.status.toLowerCase()}`}
                      >
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* =================================================
              TAB 4: MY PATIENTS
          ================================================= */}
          {activeTab === "patients" && (
            <section
              style={{
                background: "#ffffff",
                padding: "24px",
                borderRadius: "18px",
                border: "1px solid #e2e8f0",
              }}
            >
              <h2 style={{ margin: "0 0 6px", fontSize: "20px" }}>
                Authorized Patient Directory ({patients.length})
              </h2>
              <p
                style={{
                  margin: "0 0 20px",
                  fontSize: "13px",
                  color: "#64748b",
                }}
              >
                Strict privacy protection: Showing only patients linked to your
                appointments.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: "16px",
                }}
              >
                {patients.map((p, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "18px",
                      borderRadius: "16px",
                      border: "1px solid #e2ecf4",
                      background: "#f8fbff",
                    }}
                  >
                    <strong style={{ fontSize: "16px", display: "block" }}>
                      {p.name}
                    </strong>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#0d6efd",
                        fontWeight: 700,
                      }}
                    >
                      {p.age} Yrs • {p.gender} • Blood Group: {p.blood_group}
                    </span>
                    <div
                      style={{
                        fontSize: "12.5px",
                        color: "#475569",
                        marginTop: "10px",
                        display: "grid",
                        gap: "4px",
                      }}
                    >
                      <div>📞 {p.phone}</div>
                      <div>✉ {p.email}</div>
                      <div>
                        <strong>Allergies:</strong> {p.allergies}
                      </div>
                      <div>
                        <strong>Conditions:</strong> {p.chronic_conditions}
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedChatPatient(p.name);
                            setActiveTab("messages");
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "8px",
                            border: "1px solid #bfdbfe",
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          💬 Send Message
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* =================================================
              NEW TAB: PATIENT INVOICES (SECTION 1)
          ================================================= */}
          {activeTab === "invoices" && (
            <section
              style={{
                background: "#ffffff",
                padding: "24px",
                borderRadius: "18px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: "20px" }}>
                    Patient Invoices & Billing
                  </h2>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "13px",
                      color: "#64748b",
                    }}
                  >
                    View and manage consultation invoices and payment receipts.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  {["All", "Paid", "Pending"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setInvoiceFilter(st)}
                      style={{
                        padding: "7px 14px",
                        borderRadius: "20px",
                        border:
                          invoiceFilter === st
                            ? "1.5px solid #0d6efd"
                            : "1px solid #cbd5e1",
                        background:
                          invoiceFilter === st ? "#eff6ff" : "#ffffff",
                        color: invoiceFilter === st ? "#0d6efd" : "#475569",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1.5px solid #e2e8f0",
                        color: "#64748b",
                        textAlign: "left",
                      }}
                    >
                      <th style={{ padding: "10px" }}>Invoice ID</th>
                      <th style={{ padding: "10px" }}>Patient</th>
                      <th style={{ padding: "10px" }}>Service / Description</th>
                      <th style={{ padding: "10px" }}>Date</th>
                      <th style={{ padding: "10px" }}>Amount</th>
                      <th style={{ padding: "10px" }}>Status</th>
                      <th style={{ padding: "10px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv) => (
                      <tr
                        key={inv.id}
                        style={{ borderBottom: "1px solid #f1f5f9" }}
                      >
                        <td style={{ padding: "12px 10px" }}>
                          <strong style={{ color: "#0d6efd" }}>{inv.id}</strong>
                          <span
                            style={{
                              display: "block",
                              fontSize: "11px",
                              color: "#64748b",
                            }}
                          >
                            Token #{inv.appointment_token}
                          </span>
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          <strong>{inv.patient_name}</strong>
                          <span
                            style={{
                              display: "block",
                              fontSize: "11px",
                              color: "#64748b",
                            }}
                          >
                            {inv.payment_mode}
                          </span>
                        </td>
                        <td style={{ padding: "12px 10px", color: "#334155" }}>
                          {inv.service}
                        </td>
                        <td style={{ padding: "12px 10px", color: "#64748b" }}>
                          {inv.date}
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                            ₹{inv.amount}
                          </strong>
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "11.5px",
                              fontWeight: 700,
                              background:
                                inv.status === "Paid" ? "#dcfce7" : "#fef3c7",
                              color:
                                inv.status === "Paid" ? "#15803d" : "#b45309",
                            }}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() =>
                                showToast(`Invoice ${inv.id} downloaded!`)
                              }
                              style={{
                                padding: "6px 10px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                background: "#f8fafc",
                                fontSize: "11.5px",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Download size={13} /> PDF
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                showToast(`Receipt sent to ${inv.patient_name}!`)
                              }
                              style={{
                                padding: "6px 10px",
                                borderRadius: "8px",
                                border: "none",
                                background: "#eff6ff",
                                color: "#0d6efd",
                                fontSize: "11.5px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Send Receipt
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* =================================================
              NEW TAB: PAYMENTS & EARNINGS (SECTION 2)
          ================================================= */}
          {activeTab === "payments" && (
            <div style={{ display: "grid", gap: "20px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    background: "#ffffff",
                    padding: "20px",
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Total Earnings
                  </span>
                  <strong
                    style={{
                      display: "block",
                      fontSize: "26px",
                      color: "#0f172a",
                      marginTop: "4px",
                    }}
                  >
                    ₹{paymentStats.total_revenue.toLocaleString()}
                  </strong>
                  <small style={{ color: "#16a34a", fontWeight: 700 }}>
                    ↑ +14% this month
                  </small>
                </div>

                <div
                  style={{
                    background: "#ffffff",
                    padding: "20px",
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Available for Payout
                  </span>
                  <strong
                    style={{
                      display: "block",
                      fontSize: "26px",
                      color: "#0d6efd",
                      marginTop: "4px",
                    }}
                  >
                    ₹{paymentStats.available_payout.toLocaleString()}
                  </strong>
                  <button
                    type="button"
                    onClick={() => {
                      setPayoutRequested(true);
                      showToast("Payout request submitted to hospital accounts!");
                    }}
                    disabled={payoutRequested}
                    style={{
                      marginTop: "6px",
                      padding: "5px 12px",
                      borderRadius: "6px",
                      border: "none",
                      background: payoutRequested ? "#e2e8f0" : "#0d6efd",
                      color: payoutRequested ? "#64748b" : "#fff",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: payoutRequested ? "default" : "pointer",
                    }}
                  >
                    {payoutRequested ? "✓ Payout Requested" : "Request Payout"}
                  </button>
                </div>

                <div
                  style={{
                    background: "#ffffff",
                    padding: "20px",
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Today's Consultations
                  </span>
                  <strong
                    style={{
                      display: "block",
                      fontSize: "26px",
                      color: "#16a34a",
                      marginTop: "4px",
                    }}
                  >
                    ₹{paymentStats.today_earnings.toLocaleString()}
                  </strong>
                  <small style={{ color: "#64748b" }}>3 Consultations</small>
                </div>
              </div>

              {/* Transactions List */}
              <section
                style={{
                  background: "#ffffff",
                  padding: "24px",
                  borderRadius: "18px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <h3 style={{ margin: "0 0 16px", fontSize: "18px" }}>
                  Recent Consultation Transactions
                </h3>
                <div style={{ display: "grid", gap: "10px" }}>
                  {[
                    {
                      id: "TXN-9021",
                      patient: "Amit Kumar",
                      mode: "UPI (Google Pay)",
                      time: "Today, 10:45 AM",
                      amt: "₹800",
                      status: "Success",
                    },
                    {
                      id: "TXN-9020",
                      patient: "Riya Gupta",
                      mode: "HDFC Debit Card",
                      time: "Yesterday, 02:15 PM",
                      amt: "₹750",
                      status: "Success",
                    },
                    {
                      id: "TXN-9019",
                      patient: "Pooja Verma",
                      mode: "Net Banking",
                      time: "Nov 2, 04:30 PM",
                      amt: "₹800",
                      status: "Success",
                    },
                    {
                      id: "TXN-9018",
                      patient: "Vikram Joshi",
                      mode: "Paytm UPI",
                      time: "Oct 31, 11:00 AM",
                      amt: "₹700",
                      status: "Success",
                    },
                  ].map((tx) => (
                    <div
                      key={tx.id}
                      style={{
                        padding: "14px 16px",
                        borderRadius: "12px",
                        border: "1px solid #f1f5f9",
                        background: "#f8fafc",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <strong>{tx.patient}</strong>
                        <span
                          style={{
                            display: "block",
                            fontSize: "12px",
                            color: "#64748b",
                          }}
                        >
                          {tx.id} • {tx.mode} • {tx.time}
                        </span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <strong
                          style={{
                            fontSize: "15px",
                            color: "#16a34a",
                            display: "block",
                          }}
                        >
                          +{tx.amt}
                        </strong>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#15803d",
                          }}
                        >
                          ● {tx.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* =================================================
              NEW TAB: PATIENT REVIEWS (SECTION 3)
          ================================================= */}
          {activeTab === "reviews" && (
            <section
              style={{
                background: "#ffffff",
                padding: "24px",
                borderRadius: "18px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: "20px" }}>
                    Patient Reviews & Feedback
                  </h2>
                  <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                    Overall rating: <strong>4.9 / 5.0</strong> (128 patient reviews)
                  </p>
                </div>
                <div
                  style={{
                    padding: "8px 16px",
                    borderRadius: "12px",
                    background: "#fef3c7",
                    color: "#b45309",
                    fontWeight: 800,
                    fontSize: "15px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Star size={18} fill="#f59e0b" color="#f59e0b" />
                  <span>4.9 ★ Rating</span>
                </div>
              </div>

              <div style={{ display: "grid", gap: "16px" }}>
                {reviews.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: "18px 20px",
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
                        marginBottom: "8px",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "15px" }}>
                          {r.patient_name}
                        </strong>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#64748b",
                            marginLeft: "8px",
                          }}
                        >
                          • {r.treatment} ({r.date})
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          color: "#f59e0b",
                          fontSize: "13px",
                        }}
                      >
                        {"★".repeat(r.rating)}
                        {"☆".repeat(5 - r.rating)}
                      </div>
                    </div>

                    <p
                      style={{
                        margin: "0 0 12px",
                        fontSize: "13.5px",
                        color: "#334155",
                        lineHeight: 1.6,
                      }}
                    >
                      &quot;{r.comment}&quot;
                    </p>

                    {r.doctor_reply ? (
                      <div
                        style={{
                          padding: "10px 14px",
                          borderRadius: "10px",
                          background: "#eff6ff",
                          borderLeft: "3px solid #0d6efd",
                          fontSize: "12.5px",
                          color: "#1d4ed8",
                        }}
                      >
                        <strong>Doctor's Reply:</strong> {r.doctor_reply}
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input
                          type="text"
                          placeholder="Write a reply to this patient..."
                          value={replyInputs[r.id] || ""}
                          onChange={(e) =>
                            setReplyInputs({
                              ...replyInputs,
                              [r.id]: e.target.value,
                            })
                          }
                          style={{
                            flex: 1,
                            height: "36px",
                            padding: "0 12px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12.5px",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleReplyReview(r.id)}
                          style={{
                            padding: "0 14px",
                            borderRadius: "8px",
                            border: "none",
                            background: "#0d6efd",
                            color: "#fff",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Reply
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* =================================================
              NEW TAB: PATIENT MESSAGES & CHAT (SECTION 4)
          ================================================= */}
          {activeTab === "messages" && (
            <section
              style={{
                background: "#ffffff",
                borderRadius: "18px",
                border: "1px solid #e2e8f0",
                overflow: "hidden",
                display: "grid",
                gridTemplateColumns: "280px 1fr",
                height: "600px",
              }}
            >
              {/* Left Chat Patient List */}
              <div
                style={{
                  borderRight: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    padding: "16px 18px",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <strong style={{ fontSize: "15px", display: "block" }}>
                    Patient Chats
                  </strong>
                  <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                    Recent Consultation Threads
                  </span>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                  {Object.keys(chatConversations).map((patientName) => {
                    const isSelected = selectedChatPatient === patientName;
                    const msgs = chatConversations[patientName] || [];
                    const lastMsg = msgs[msgs.length - 1];
                    return (
                      <div
                        key={patientName}
                        onClick={() => setSelectedChatPatient(patientName)}
                        style={{
                          padding: "12px",
                          borderRadius: "10px",
                          marginBottom: "4px",
                          cursor: "pointer",
                          background: isSelected ? "#eff6ff" : "transparent",
                          border: isSelected
                            ? "1px solid #bfdbfe"
                            : "1px solid transparent",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <strong
                            style={{
                              fontSize: "13.5px",
                              color: isSelected ? "#0d6efd" : "#0f172a",
                            }}
                          >
                            {patientName}
                          </strong>
                          <small
                            style={{ fontSize: "10.5px", color: "#64748b" }}
                          >
                            {lastMsg?.time}
                          </small>
                        </div>
                        <p
                          style={{
                            margin: "4px 0 0",
                            fontSize: "12px",
                            color: "#64748b",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {lastMsg?.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Chat Conversation Window */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "#ffffff",
                }}
              >
                {/* Chat Top Header */}
                <div
                  style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "#e0f2fe",
                        color: "#0284c7",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 800,
                        fontSize: "14px",
                      }}
                    >
                      {selectedChatPatient.charAt(0)}
                    </div>
                    <div>
                      <strong style={{ fontSize: "15px", display: "block" }}>
                        {selectedChatPatient}
                      </strong>
                      <span style={{ fontSize: "11px", color: "#16a34a" }}>
                        ● Active Patient
                      </span>
                    </div>
                  </div>

                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "12px",
                      background: "#f1f5f9",
                      fontSize: "11.5px",
                      color: "#475569",
                      fontWeight: 600,
                    }}
                  >
                    SmartCare Tele-Consultation
                  </span>
                </div>

                {/* Messages Body */}
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    background: "#f8fafc",
                  }}
                >
                  {(chatConversations[selectedChatPatient] || []).map((m) => {
                    const isDoctor = m.sender === "doctor";
                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: isDoctor ? "flex-end" : "flex-start",
                          maxWidth: "70%",
                          background: isDoctor ? "#0d6efd" : "#ffffff",
                          color: isDoctor ? "#ffffff" : "#0f172a",
                          padding: "12px 16px",
                          borderRadius: isDoctor
                            ? "16px 16px 4px 16px"
                            : "16px 16px 16px 4px",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                          fontSize: "13px",
                          lineHeight: 1.5,
                        }}
                      >
                        <div>{m.text}</div>
                        <div
                          style={{
                            fontSize: "10px",
                            textAlign: "right",
                            marginTop: "4px",
                            color: isDoctor ? "rgba(255,255,255,0.7)" : "#94a3b8",
                          }}
                        >
                          {m.time}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Chat Send Input Box */}
                <form
                  onSubmit={handleSendMessage}
                  style={{
                    padding: "14px 18px",
                    borderTop: "1px solid #e2e8f0",
                    display: "flex",
                    gap: "10px",
                    background: "#ffffff",
                  }}
                >
                  <input
                    type="text"
                    placeholder={`Message ${selectedChatPatient}...`}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    style={{
                      flex: 1,
                      height: "42px",
                      padding: "0 14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: "0 18px",
                      borderRadius: "10px",
                      border: "none",
                      background: "#0d6efd",
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Send size={15} /> Send
                  </button>
                </form>
              </div>
            </section>
          )}

          {/* =================================================
              TAB 5 & 6: AVAILABLE TIMINGS & PROFILE SETTINGS
          ================================================= */}
          {(activeTab === "timings" || activeTab === "profile") && (
            <form
              onSubmit={handleSaveAvailability}
              style={{
                background: "#ffffff",
                padding: "24px",
                borderRadius: "18px",
                border: "1px solid #e2e8f0",
              }}
            >
              <h2 style={{ margin: "0 0 6px", fontSize: "20px" }}>
                Manage Consultation Timings, Fees & Profile
              </h2>
              <p
                style={{
                  margin: "0 0 20px",
                  fontSize: "13px",
                  color: "#64748b",
                }}
              >
                Changes reflect immediately on the Patient Dashboard.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "16px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 700,
                      marginBottom: "6px",
                    }}
                  >
                    Consultation Schedule & Timings
                  </label>
                  <input
                    type="text"
                    value={availForm.schedule}
                    onChange={(e) =>
                      setAvailForm({ ...availForm, schedule: e.target.value })
                    }
                    style={{
                      width: "100%",
                      height: "42px",
                      padding: "0 12px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 700,
                      marginBottom: "6px",
                    }}
                  >
                    Consultation Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={availForm.fee}
                    onChange={(e) =>
                      setAvailForm({
                        ...availForm,
                        fee: Number(e.target.value),
                      })
                    }
                    style={{
                      width: "100%",
                      height: "42px",
                      padding: "0 12px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 700,
                      marginBottom: "6px",
                    }}
                  >
                    Hospital / Clinic Name
                  </label>
                  <input
                    type="text"
                    value={availForm.clinic}
                    onChange={(e) =>
                      setAvailForm({ ...availForm, clinic: e.target.value })
                    }
                    style={{
                      width: "100%",
                      height: "42px",
                      padding: "0 12px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 700,
                      marginBottom: "6px",
                    }}
                  >
                    OPD Wing & Room Number
                  </label>
                  <input
                    type="text"
                    value={availForm.room}
                    onChange={(e) =>
                      setAvailForm({ ...availForm, room: e.target.value })
                    }
                    style={{
                      width: "100%",
                      height: "42px",
                      padding: "0 12px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 700,
                      marginBottom: "6px",
                    }}
                  >
                    Qualification
                  </label>
                  <input
                    type="text"
                    value={availForm.qualification}
                    onChange={(e) =>
                      setAvailForm({
                        ...availForm,
                        qualification: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      height: "42px",
                      padding: "0 12px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 700,
                      marginBottom: "6px",
                    }}
                  >
                    Experience
                  </label>
                  <input
                    type="text"
                    value={availForm.experience}
                    onChange={(e) =>
                      setAvailForm({
                        ...availForm,
                        experience: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      height: "42px",
                      padding: "0 12px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  marginTop: "20px",
                  padding: "12px 24px",
                  borderRadius: "10px",
                  border: "none",
                  background: "#0d6efd",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Save Availability & Profile
              </button>
            </form>
          )}
        </main>
      </div>

      {/* =======================================================
          MODAL 1: ADD CONSULTATION NOTES & PRESCRIPTION
      ======================================================= */}
      {consultModalAppt && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
            padding: "20px",
          }}
        >
          <form
            onSubmit={handlePrescribeSubmit}
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "26px",
              maxWidth: "560px",
              width: "100%",
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "14px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "18px" }}>
                Consultation & Prescription — {consultModalAppt.patient_name} (#
                {consultModalAppt.token_number})
              </h3>
              <button
                type="button"
                onClick={() => setConsultModalAppt(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "18px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              <input
                type="text"
                placeholder="Diagnosis Summary *"
                value={rxForm.diagnosis}
                onChange={(e) =>
                  setRxForm({ ...rxForm, diagnosis: e.target.value })
                }
                required
                style={{
                  height: "42px",
                  padding: "0 12px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                }}
              />

              <textarea
                rows={2}
                placeholder="Clinical Consultation Notes *"
                value={rxForm.consultation_notes}
                onChange={(e) =>
                  setRxForm({ ...rxForm, consultation_notes: e.target.value })
                }
                required
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                }}
              />

              <input
                type="text"
                placeholder="Prescribed Medicine Name (e.g. Atorvastatin 10mg) *"
                value={rxForm.medicine_name}
                onChange={(e) =>
                  setRxForm({ ...rxForm, medicine_name: e.target.value })
                }
                required
                style={{
                  height: "42px",
                  padding: "0 12px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                }}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "10px",
                }}
              >
                <input
                  type="text"
                  placeholder="Dosage"
                  value={rxForm.dosage}
                  onChange={(e) =>
                    setRxForm({ ...rxForm, dosage: e.target.value })
                  }
                  style={{
                    height: "40px",
                    padding: "0 10px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                  }}
                />
                <input
                  type="text"
                  placeholder="Frequency"
                  value={rxForm.frequency}
                  onChange={(e) =>
                    setRxForm({ ...rxForm, frequency: e.target.value })
                  }
                  style={{
                    height: "40px",
                    padding: "0 10px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                  }}
                />
                <input
                  type="text"
                  placeholder="Duration"
                  value={rxForm.duration}
                  onChange={(e) =>
                    setRxForm({ ...rxForm, duration: e.target.value })
                  }
                  style={{
                    height: "40px",
                    padding: "0 10px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                  }}
                />
              </div>

              <input
                type="text"
                placeholder="Special Instructions"
                value={rxForm.instructions}
                onChange={(e) =>
                  setRxForm({ ...rxForm, instructions: e.target.value })
                }
                style={{
                  height: "42px",
                  padding: "0 12px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                }}
              />

              <button
                type="submit"
                style={{
                  height: "44px",
                  borderRadius: "10px",
                  border: "none",
                  background: "#0d6efd",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Complete Consultation & Send Prescription to Patient
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =======================================================
          MODAL 2: VIEW AUTHORIZED PATIENT PROFILE & HISTORY
      ======================================================= */}
      {historyPatient && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "26px",
              maxWidth: "560px",
              width: "100%",
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "14px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "18px" }}>
                Patient Profile & Medical History —{" "}
                {historyPatient.patient_name}
              </h3>
              <button
                type="button"
                onClick={() => setHistoryPatient(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "18px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                background: "#f8fbff",
                padding: "14px",
                borderRadius: "12px",
                fontSize: "13px",
                display: "grid",
                gap: "6px",
                marginBottom: "16px",
              }}
            >
              <div>
                <strong>Age / Gender:</strong> {historyPatient.patient_age} Yrs
                • {historyPatient.patient_gender} •{" "}
                <strong>Blood Group:</strong> {historyPatient.blood_group}
              </div>
              <div>
                <strong>Contact:</strong> {historyPatient.patient_phone} •{" "}
                {historyPatient.patient_email}
              </div>
              <div>
                <strong>Allergies:</strong> {historyPatient.allergies} |{" "}
                <strong>Conditions:</strong> {historyPatient.chronic_conditions}
              </div>
              <div>
                <strong>Reason for Visit:</strong> {historyPatient.symptoms}
              </div>
            </div>

            <h4 style={{ margin: "0 0 10px", fontSize: "14px" }}>
              Authorized Medical History & Reports
            </h4>
            <div style={{ display: "grid", gap: "8px", maxHeight: "220px", overflowY: "auto" }}>
              {(historyPatient.medical_history || []).map((rec) => (
                <div
                  key={rec.id}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12.5px",
                  }}
                >
                  <strong>
                    {rec.record_type}: {rec.title}
                  </strong>{" "}
                  ({rec.record_date})
                  <div style={{ color: "#475569", marginTop: "3px" }}>
                    {rec.diagnosis}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
