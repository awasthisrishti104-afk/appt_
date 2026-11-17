import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HeartPulse,
  LayoutDashboard,
  Clock,
  Stethoscope,
  Users,
  CalendarDays,
  Building2,
  BarChart3,
  Settings,
  LogOut,
  Search,
  Bell,
  CheckCircle2,
  ChevronDown,
  UserPlus,
  Shield,
  UserCheck,
  X,
  Plus,
} from "lucide-react";
import {
  getAuthToken,
  getSavedUser,
  clearAuthStorage,
  fetchAdminDashboard,
  approveDoctorRegistration,
  rejectDoctorRegistration,
  toggleDoctorAvailabilityAdmin,
  toggleUserAccountStatus,
  createHospitalDepartment,
  deleteHospitalDepartment,
  adminCreateUser,
} from "../services/api";

const ADMIN_MENU = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "approvals", label: "Pending Approvals", icon: Clock },
  { id: "doctors", label: "Doctors", icon: Stethoscope },
  { id: "patients", label: "Users & Patients", icon: Users },
  { id: "appointments", label: "Appointments", icon: CalendarDays },
  { id: "departments", label: "Departments", icon: Building2 },
  { id: "reports", label: "Reports", icon: BarChart3, hasChevron: true },
  { id: "settings", label: "System Settings", icon: Settings },
];

const SPEC_BADGE_STYLES = {
  Cardiology: { bg: "#dbeafe", color: "#1d4ed8" },
  Orthopedics: { bg: "#dcfce7", color: "#15803d" },
  Neurology: { bg: "#ede9fe", color: "#6d28d9" },
  Pediatrics: { bg: "#fef3c7", color: "#b45309" },
  Ophthalmology: { bg: "#e0f2fe", color: "#0369a1" },
  Pulmonology: { bg: "#fce7f3", color: "#be185d" },
  "General Medicine": { bg: "#f1f5f9", color: "#334155" },
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const currentUser = getSavedUser();
  const adminDisplayName = currentUser?.full_name || "Super Admin";
  const adminDisplayEmail = currentUser?.email || "admin@smartcare.com";

  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [toast, setToast] = useState("");

  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createFormError, setCreateFormError] = useState("");
  const [newUserForm, setNewUserForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    role: "patient",
    specialization: "General Medicine",
    qualification: "MBBS",
    experience: "5 Years",
    medical_reg_no: "",
    fee: 700,
  });

  const [data, setData] = useState({
    stats: {
      total_users: 0,
      total_doctors: 0,
      pending_approvals: 0,
      total_patients: 0,
      total_appointments: 0,
      total_departments: 0,
    },
    users: [],
    pending_doctors: [],
    doctors: [],
    patients: [],
    appointments: [],
    departments: [],
    weekly_overview: [
      { day: "Mon", count: 120 },
      { day: "Tue", count: 150 },
      { day: "Wed", count: 135 },
      { day: "Thu", count: 195 },
      { day: "Fri", count: 220 },
      { day: "Sat", count: 185 },
      { day: "Sun", count: 275 },
    ],
    department_breakdown: [
      { name: "Cardiology", percent: 28, color: "#2563eb" },
      { name: "Orthopedics", percent: 18, color: "#22c55e" },
      { name: "Neurology", percent: 16, color: "#14b8a6" },
      { name: "Pediatrics", percent: 12, color: "#f59e0b" },
      { name: "General Medicine", percent: 26, color: "#38bdf8" },
    ],
  });

  const [deptForm, setDeptForm] = useState({
    name: "",
    description: "",
    head_doctor: "",
    room_wing: "",
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const loadAdminData = async () => {
    const token = getAuthToken();
    if (!token) {
      navigate("/login");
      return;
    }

    const savedUser = getSavedUser();
    const role = (savedUser?.role || "").toLowerCase().trim();
    if (role && !role.includes("admin")) {
      if (role === "doctor") {
        navigate("/doctor/dashboard");
      } else {
        navigate("/dashboard");
      }
      return;
    }

    try {
      const res = await fetchAdminDashboard();
      setData({
        ...res,
        stats: {
          total_users: res.stats?.total_users ?? (res.users?.length || 0),
          total_doctors: res.stats?.total_doctors ?? (res.doctors?.filter((d) => d.is_approved)?.length || 0),
          pending_approvals: res.pending_doctors?.length ?? (res.stats?.pending_approvals || 0),
          total_patients: res.stats?.total_patients ?? (res.patients?.length || 0),
          total_appointments: res.stats?.total_appointments ?? (res.appointments?.length || 0),
          total_departments: res.stats?.total_departments ?? (res.departments?.length || 0),
        },
        users: res.users || [],
        pending_doctors: res.pending_doctors || [],
        doctors: res.doctors || [],
        patients: res.patients || [],
        appointments: res.appointments || [],
        departments: res.departments || [],
        weekly_overview: res.weekly_overview || [],
        department_breakdown: res.department_breakdown || [],
      });
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
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateFormError("");

    if (!newUserForm.full_name.trim()) {
      setCreateFormError("Please enter full name.");
      return;
    }
    if (!newUserForm.email.trim()) {
      setCreateFormError("Please enter email address.");
      return;
    }
    if (!newUserForm.phone.trim() || newUserForm.phone.trim().length !== 10) {
      setCreateFormError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!newUserForm.password || newUserForm.password.length < 8) {
      setCreateFormError("Password must be at least 8 characters long.");
      return;
    }

    try {
      setCreatingUser(true);
      const res = await adminCreateUser(newUserForm);
      showToast(res.message || `User ${newUserForm.full_name} created successfully!`);
      setShowCreateUserModal(false);
      setNewUserForm({
        full_name: "",
        email: "",
        phone: "",
        password: "",
        role: "patient",
        specialization: "General Medicine",
        qualification: "MBBS",
        experience: "5 Years",
        medical_reg_no: "",
        fee: 700,
      });
      await loadAdminData();
    } catch (err) {
      setCreateFormError(err.message || "Failed to create user.");
    } finally {
      setCreatingUser(false);
    }
  };

  useEffect(() => {
    loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    clearAuthStorage();
    navigate("/login");
  };

  const handleApproveDoctor = async (docId) => {
    try {
      const res = await approveDoctorRegistration(docId);
      showToast(res.message);
      await loadAdminData();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleRejectDoctor = async (docId) => {
    try {
      const res = await rejectDoctorRegistration(docId);
      showToast(res.message);
      await loadAdminData();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleToggleDoctorAvailable = async (docId) => {
    try {
      const res = await toggleDoctorAvailabilityAdmin(docId);
      showToast(res.message);
      await loadAdminData();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      const res = await toggleUserAccountStatus(userId);
      showToast(res.message);
      await loadAdminData();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    try {
      const res = await createHospitalDepartment(deptForm);
      showToast(res.message);
      setDeptForm({
        name: "",
        description: "",
        head_doctor: "",
        room_wing: "",
      });
      await loadAdminData();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleRemoveDepartment = async (deptId) => {
    try {
      const res = await deleteHospitalDepartment(deptId);
      showToast(res.message);
      await loadAdminData();
    } catch (err) {
      showToast(err.message);
    }
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredDoctors = data.doctors.filter(
    (d) =>
      !q ||
      d.name?.toLowerCase().includes(q) ||
      d.specialization?.toLowerCase().includes(q) ||
      d.medical_reg_no?.toLowerCase().includes(q)
  );
  const allUsersList =
    data.users && data.users.length > 0
      ? data.users
      : data.patients && data.patients.length > 0
      ? data.patients
      : [];

  const filteredUsers = allUsersList.filter((u) => {
    const matchesQuery =
      !q ||
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q);
    const matchesRole =
      userRoleFilter === "all" ||
      u.role?.toLowerCase() === userRoleFilter.toLowerCase();
    return matchesQuery && matchesRole;
  });

  const filteredPatients = (data.patients || []).filter(
    (p) =>
      !q ||
      p.full_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q)
  );

  const filteredAppointments = (data.appointments || []).filter(
    (a) =>
      !q ||
      a.patient_name?.toLowerCase().includes(q) ||
      a.doctor_name?.toLowerCase().includes(q) ||
      a.token_number?.toLowerCase().includes(q)
  );

  const recentAppointmentsRows = (data.appointments || []).slice(0, 5);
  const recentUsersRows = (
    data.users && data.users.length > 0 ? data.users : data.patients || []
  ).slice(0, 5);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f4f7fb",
        fontFamily: "'Inter', system-ui, sans-serif",
        color: "#0f172a",
        textAlign: "left",
      }}
    >
      {/* =======================================================
          LEFT DARK-NAVY SIDEBAR (EXACT MATCH TO ADMIN SCREENSHOT)
      ======================================================= */}
      <aside
        style={{
          width: "252px",
          background: "linear-gradient(180deg, #091b35 0%, #0d2649 100%)",
          color: "#cbd5e1",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "22px 20px 18px",
            textDecoration: "none",
            color: "#ffffff",
          }}
        >
          <span
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "11px",
              background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 4px 14px rgba(14, 165, 233, 0.35)",
            }}
          >
            <HeartPulse size={22} color="#fff" />
          </span>
          <div>
            <strong
              style={{
                fontSize: "20px",
                fontWeight: 800,
                display: "block",
                letterSpacing: "-0.3px",
              }}
            >
              SmartCare
            </strong>
            <small
              style={{
                fontSize: "11px",
                color: "#93c5fd",
                display: "block",
                marginTop: "1px",
              }}
            >
              Hospital Management
            </small>
          </div>
        </Link>

        <nav style={{ padding: "12px 14px", flex: 1 }}>
          {ADMIN_MENU.map((item) => {
            const Icon = item.icon;
            const isPending = item.id === "approvals";
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "11px 14px",
                  marginBottom: "4px",
                  border: "none",
                  borderRadius: "10px",
                  background: active
                    ? "linear-gradient(90deg, #1d63dc 0%, #2563eb 100%)"
                    : "transparent",
                  color: active ? "#ffffff" : "#cbd5e1",
                  fontSize: "13.5px",
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  boxShadow: active
                    ? "0 4px 12px rgba(29, 99, 220, 0.35)"
                    : "none",
                }}
              >
                <Icon size={18} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {isPending && data.stats.pending_approvals > 0 && (
                  <span
                    style={{
                      background: "#ef4444",
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: 800,
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {data.stats.pending_approvals}
                  </span>
                )}
                {item.hasChevron && (
                  <ChevronDown size={15} style={{ opacity: 0.7 }} />
                )}
              </button>
            );
          })}
        </nav>

        <div
          style={{
            padding: "16px 18px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 12px",
              border: "none",
              borderRadius: "10px",
              background: "transparent",
              color: "#cbd5e1",
              fontSize: "13.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* =======================================================
          MAIN CONTENT AREA
      ======================================================= */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* TOP HEADER BAR */}
        <header
          style={{
            background: "#ffffff",
            borderBottom: "1px solid #e5eaf2",
            padding: "12px 30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            position: "sticky",
            top: 0,
            zIndex: 25,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "0 14px",
              height: "40px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              width: "410px",
              maxWidth: "100%",
            }}
          >
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search doctors, patients, appointments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                width: "100%",
                fontSize: "13px",
                color: "#334155",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <button
              type="button"
              onClick={() => setActiveTab("approvals")}
              style={{
                position: "relative",
                border: "none",
                background: "transparent",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              <Bell size={20} color="#475569" />
              {data.stats.pending_approvals > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "1px",
                    right: "2px",
                    width: "8px",
                    height: "8px",
                    background: "#ef4444",
                    borderRadius: "50%",
                    border: "1.5px solid #fff",
                  }}
                />
              )}
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=160&q=80"
                alt="Admin"
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid #e2e8f0",
                }}
              />
              <div>
                <strong
                  style={{
                    display: "block",
                    fontSize: "13.5px",
                    color: "#0f172a",
                    lineHeight: 1.2,
                  }}
                >
                  {adminDisplayName}
                </strong>
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  Super Admin • {adminDisplayEmail}
                </span>
              </div>
              <ChevronDown size={15} color="#64748b" />
            </div>
          </div>
        </header>

        {/* TOAST BANNER */}
        {toast && (
          <div
            style={{
              margin: "16px 30px 0",
              padding: "12px 18px",
              borderRadius: "12px",
              background: "#ecfdf5",
              border: "1px solid #6ee7b7",
              color: "#065f46",
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

        <main style={{ padding: "22px 30px 44px", maxWidth: "1380px" }}>
          {/* =================================================
              TAB 1: ADMIN DASHBOARD OVERVIEW (EXACT SCREENSHOT)
          ================================================= */}
          {activeTab === "dashboard" && (
            <>
              <div style={{ marginBottom: "18px" }}>
                <h1
                  style={{
                    margin: "0 0 4px",
                    fontSize: "24px",
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  Admin Dashboard
                </h1>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                  Manage doctors, approvals, appointments and overall hospital
                  operations.
                </p>
              </div>

              {/* 4 KPI CARDS ROW */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "16px",
                  marginBottom: "20px",
                }}
              >
                {/* Card 1: Total Doctors */}
                <div
                  onClick={() => setActiveTab("doctors")}
                  style={{
                    background: "#ffffff",
                    padding: "18px 20px",
                    borderRadius: "14px",
                    border: "1px solid #e5eaf2",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.02)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                    }}
                  >
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "12px",
                        background: "#eef2ff",
                        color: "#4f46e5",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Stethoscope size={21} />
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#64748b",
                          fontWeight: 600,
                        }}
                      >
                        Total Doctors
                      </span>
                      <strong
                        style={{
                          display: "block",
                          fontSize: "26px",
                          fontWeight: 800,
                          color: "#0f172a",
                          lineHeight: 1.2,
                          marginTop: "2px",
                        }}
                      >
                        {data.stats.total_doctors}
                      </strong>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: "6px",
                      background: "#dcfce7",
                      color: "#15803d",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    ↑ +12%
                  </span>
                </div>

                {/* Card 2: Total Patients */}
                <div
                  onClick={() => setActiveTab("patients")}
                  style={{
                    background: "#ffffff",
                    padding: "18px 20px",
                    borderRadius: "14px",
                    border: "1px solid #e5eaf2",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.02)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                    }}
                  >
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "12px",
                        background: "#ecfdf5",
                        color: "#10b981",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Users size={21} />
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#64748b",
                          fontWeight: 600,
                        }}
                      >
                        Total Patients
                      </span>
                      <strong
                        style={{
                          display: "block",
                          fontSize: "26px",
                          fontWeight: 800,
                          color: "#0f172a",
                          lineHeight: 1.2,
                          marginTop: "2px",
                        }}
                      >
                        {Number(data.stats.total_patients).toLocaleString()}
                      </strong>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: "6px",
                      background: "#dcfce7",
                      color: "#15803d",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    ↑ +18%
                  </span>
                </div>

                {/* Card 3: Total Appointments */}
                <div
                  onClick={() => setActiveTab("appointments")}
                  style={{
                    background: "#ffffff",
                    padding: "18px 20px",
                    borderRadius: "14px",
                    border: "1px solid #e5eaf2",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.02)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                    }}
                  >
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "12px",
                        background: "#eff6ff",
                        color: "#2563eb",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <CalendarDays size={21} />
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#64748b",
                          fontWeight: 600,
                        }}
                      >
                        Total Appointments
                      </span>
                      <strong
                        style={{
                          display: "block",
                          fontSize: "26px",
                          fontWeight: 800,
                          color: "#0f172a",
                          lineHeight: 1.2,
                          marginTop: "2px",
                        }}
                      >
                        {Number(data.stats.total_appointments).toLocaleString()}
                      </strong>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: "6px",
                      background: "#dcfce7",
                      color: "#15803d",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    ↑ +24%
                  </span>
                </div>

                {/* Card 4: Pending Approvals */}
                <div
                  onClick={() => setActiveTab("approvals")}
                  style={{
                    background: "#fff5f5",
                    padding: "18px 20px",
                    borderRadius: "14px",
                    border: "1px solid #fecaca",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: "#fee2e2",
                      color: "#dc2626",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Clock size={21} />
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#475569",
                        fontWeight: 600,
                      }}
                    >
                      Pending Approvals
                    </span>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "26px",
                        fontWeight: 800,
                        color: "#dc2626",
                        lineHeight: 1.2,
                        marginTop: "2px",
                      }}
                    >
                      {data.stats.pending_approvals}
                    </strong>
                  </div>
                </div>
              </div>

              {/* CHARTS ROW: APPOINTMENTS OVERVIEW + APPOINTMENTS BY DEPARTMENT */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.52fr 1fr",
                  gap: "18px",
                  marginBottom: "20px",
                }}
              >
                {/* Left: 7-Day Bar Chart with Y-Axis Scale */}
                <section
                  style={{
                    background: "#ffffff",
                    padding: "20px 22px",
                    borderRadius: "16px",
                    border: "1px solid #e5eaf2",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "14px",
                    }}
                  >
                    <div>
                      <strong
                        style={{
                          fontSize: "15.5px",
                          display: "block",
                          color: "#0f172a",
                        }}
                      >
                        Appointments Overview
                      </strong>
                      <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                        Last 7 Days
                      </span>
                    </div>
                    <span
                      style={{
                        padding: "5px 12px",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        color: "#334155",
                      }}
                    >
                      This Week ▾
                    </span>
                  </div>

                  {/* Chart with Y-axis labels */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "32px 1fr",
                      gap: "8px",
                      alignItems: "stretch",
                      height: "188px",
                    }}
                  >
                    {/* Y-Axis Scale */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        fontSize: "10.5px",
                        color: "#94a3b8",
                        textAlign: "right",
                        paddingBottom: "24px",
                      }}
                    >
                      <span>350</span>
                      <span>300</span>
                      <span>250</span>
                      <span>200</span>
                      <span>150</span>
                      <span>100</span>
                      <span>50</span>
                      <span>0</span>
                    </div>

                    {/* Bars Container */}
                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "space-around",
                        padding: "0 8px",
                        borderBottom: "1px solid #e2e8f0",
                        backgroundImage:
                          "linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)",
                        backgroundSize: "100% 23px",
                      }}
                    >
                      {data.weekly_overview.map((item) => {
                        const heightPct = Math.round((item.count / 330) * 100);
                        return (
                          <div
                            key={item.day}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              height: "100%",
                              flex: 1,
                            }}
                          >
                            <div
                              title={`${item.day}: ${item.count} appointments`}
                              style={{
                                width: "38px",
                                height: `${heightPct}%`,
                                borderRadius: "6px 6px 0 0",
                                background:
                                  "linear-gradient(180deg, #38bdf8 0%, #2563eb 100%)",
                                boxShadow:
                                  "0 4px 10px rgba(37, 99, 235, 0.18)",
                              }}
                            />
                            <span
                              style={{
                                fontSize: "11.5px",
                                color: "#475569",
                                fontWeight: 600,
                                marginTop: "7px",
                                marginBottom: "-22px",
                              }}
                            >
                              {item.day}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                {/* Right: Appointments by Department Donut & Legend */}
                <section
                  style={{
                    background: "#ffffff",
                    padding: "20px 22px",
                    borderRadius: "16px",
                    border: "1px solid #e5eaf2",
                  }}
                >
                  <strong
                    style={{
                      fontSize: "15.5px",
                      display: "block",
                      marginBottom: "22px",
                      color: "#0f172a",
                    }}
                  >
                    Appointments by Department
                  </strong>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "22px",
                    }}
                  >
                    <div
                      style={{
                        width: "142px",
                        height: "142px",
                        borderRadius: "50%",
                        background:
                          "conic-gradient(#2563eb 0% 28%, #22c55e 28% 46%, #14b8a6 46% 62%, #f59e0b 62% 74%, #38bdf8 74% 100%)",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: "92px",
                          height: "92px",
                          borderRadius: "50%",
                          background: "#ffffff",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <strong style={{ fontSize: "19px", color: "#0f172a" }}>
                          {Number(
                            data.stats.total_appointments
                          ).toLocaleString()}
                        </strong>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          Total
                        </span>
                      </div>
                    </div>

                    <div style={{ flex: 1, display: "grid", gap: "11px" }}>
                      {data.department_breakdown.map((d) => (
                        <div
                          key={d.name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: "12.5px",
                          }}
                        >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              color: "#334155",
                              fontWeight: 500,
                            }}
                          >
                            <span
                              style={{
                                width: "9px",
                                height: "9px",
                                borderRadius: "50%",
                                background: d.color,
                              }}
                            />
                            {d.name}
                          </span>
                          <strong style={{ color: "#0f172a" }}>
                            {d.percent}%
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              {/* BOTTOM ROW: PENDING DOCTOR APPROVALS + RECENT APPOINTMENTS */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.18fr 1fr",
                  gap: "18px",
                }}
              >
                {/* Left Table: Pending Doctor Approvals */}
                <section
                  style={{
                    background: "#ffffff",
                    padding: "20px 22px",
                    borderRadius: "16px",
                    border: "1px solid #e5eaf2",
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
                    <strong style={{ fontSize: "15.5px", color: "#0f172a" }}>
                      Pending Doctor Approvals
                    </strong>
                    <button
                      type="button"
                      onClick={() => setActiveTab("approvals")}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#2563eb",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      View All
                    </button>
                  </div>

                  {data.pending_doctors.length === 0 ? (
                    <p style={{ fontSize: "13px", color: "#64748b" }}>
                      All doctor registrations have been verified!
                    </p>
                  ) : (
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "12.5px",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            color: "#64748b",
                            textAlign: "left",
                            fontSize: "11.5px",
                          }}
                        >
                          <th style={{ padding: "8px 4px" }}>Doctor</th>
                          <th style={{ padding: "8px 4px" }}>Specialization</th>
                          <th style={{ padding: "8px 4px" }}>Applied On</th>
                          <th style={{ padding: "8px 4px" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.pending_doctors.map((doc) => {
                          const badgeStyle = SPEC_BADGE_STYLES[
                            doc.specialization
                          ] || {
                            bg: "#eff6ff",
                            color: "#2563eb",
                          };
                          return (
                            <tr
                              key={doc.id}
                              style={{ borderBottom: "1px solid #f8fafc" }}
                            >
                              <td style={{ padding: "10px 4px" }}>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                  }}
                                >
                                  <img
                                    src={
                                      doc.avatar ||
                                      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=160&q=80"
                                    }
                                    alt={doc.name}
                                    style={{
                                      width: "34px",
                                      height: "34px",
                                      borderRadius: "50%",
                                      objectFit: "cover",
                                    }}
                                  />
                                  <div>
                                    <strong
                                      style={{
                                        display: "block",
                                        color: "#0f172a",
                                        fontSize: "12.5px",
                                      }}
                                    >
                                      {doc.name}
                                    </strong>
                                    <span
                                      style={{
                                        fontSize: "11px",
                                        color: "#64748b",
                                      }}
                                    >
                                      {doc.qualification}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: "10px 4px" }}>
                                <span
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                    background: badgeStyle.bg,
                                    color: badgeStyle.color,
                                    fontWeight: 700,
                                    fontSize: "11px",
                                  }}
                                >
                                  {doc.specialization}
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: "10px 4px",
                                  color: "#475569",
                                  fontSize: "12px",
                                }}
                              >
                                {doc.applied_date}
                              </td>
                              <td style={{ padding: "10px 4px" }}>
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveDoctor(doc.id)}
                                    style={{
                                      padding: "5px 10px",
                                      borderRadius: "6px",
                                      border: "none",
                                      background: "#22c55e",
                                      color: "#fff",
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectDoctor(doc.id)}
                                    style={{
                                      padding: "5px 10px",
                                      borderRadius: "6px",
                                      border: "1px solid #fecaca",
                                      background: "#fef2f2",
                                      color: "#ef4444",
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    ✕ Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </section>

                {/* Right Table: Recent Appointments */}
                <section
                  style={{
                    background: "#ffffff",
                    padding: "20px 22px",
                    borderRadius: "16px",
                    border: "1px solid #e5eaf2",
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
                    <strong style={{ fontSize: "15.5px", color: "#0f172a" }}>
                      Recent Appointments
                    </strong>
                    <button
                      type="button"
                      onClick={() => setActiveTab("appointments")}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#2563eb",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      View All
                    </button>
                  </div>

                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "12.5px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          color: "#64748b",
                          textAlign: "left",
                          fontSize: "11.5px",
                        }}
                      >
                        <th style={{ padding: "8px 4px" }}>Patient</th>
                        <th style={{ padding: "8px 4px" }}>Doctor</th>
                        <th style={{ padding: "8px 4px" }}>Date & Time</th>
                        <th style={{ padding: "8px 4px" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAppointmentsRows.map((a) => {
                        const initial = (a.patient_name || "P")
                          .charAt(0)
                          .toUpperCase();
                        const isConfirmed =
                          a.status?.toLowerCase() === "confirmed" ||
                          a.status?.toLowerCase() === "completed";
                        return (
                          <tr
                            key={a.id}
                            style={{ borderBottom: "1px solid #f8fafc" }}
                          >
                            <td style={{ padding: "11px 4px" }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                <span
                                  style={{
                                    width: "26px",
                                    height: "26px",
                                    borderRadius: "50%",
                                    background: "#e0f2fe",
                                    color: "#0284c7",
                                    fontSize: "11px",
                                    fontWeight: 800,
                                    display: "grid",
                                    placeItems: "center",
                                  }}
                                >
                                  {initial}
                                </span>
                                <strong style={{ color: "#0f172a" }}>
                                  {a.patient_name}
                                </strong>
                              </div>
                            </td>
                            <td
                              style={{ padding: "11px 4px", color: "#334155" }}
                            >
                              {a.doctor_name}
                            </td>
                            <td
                              style={{
                                padding: "11px 4px",
                                color: "#475569",
                                fontSize: "12px",
                              }}
                            >
                              {a.appointment_date}, {a.appointment_time}
                            </td>
                            <td style={{ padding: "11px 4px" }}>
                              <span
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: "6px",
                                  background: isConfirmed
                                    ? "#dcfce7"
                                    : "#fef3c7",
                                  color: isConfirmed ? "#15803d" : "#b45309",
                                  fontWeight: 700,
                                  fontSize: "11px",
                                }}
                              >
                                {a.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </section>
              </div>

              {/* Recently Created & Registered Users Section */}
              <section
                style={{
                  background: "#ffffff",
                  padding: "20px 22px",
                  borderRadius: "16px",
                  border: "1px solid #e5eaf2",
                  marginTop: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "16px", color: "#0f172a" }}>
                      Recently Created & Registered Users
                    </strong>
                    <span
                      style={{
                        display: "block",
                        fontSize: "12px",
                        color: "#64748b",
                        marginTop: "2px",
                      }}
                    >
                      Real-time database records of all users created via Admin or Signup
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => setShowCreateUserModal(true)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 14px",
                        borderRadius: "8px",
                        border: "none",
                        background: "linear-gradient(135deg, #0284c7, #2563eb)",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <UserPlus size={15} />
                      + Create New User
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("patients")}
                      style={{
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                        color: "#334155",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      View All Users ({allUsersList.length})
                    </button>
                  </div>
                </div>

                {recentUsersRows.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "28px",
                      color: "#64748b",
                    }}
                  >
                    No users created yet. Click &quot;+ Create New User&quot; to add one.
                  </div>
                ) : (
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
                          borderBottom: "1px solid #f1f5f9",
                          color: "#64748b",
                          textAlign: "left",
                          fontSize: "11.5px",
                        }}
                      >
                        <th style={{ padding: "10px 6px" }}>User</th>
                        <th style={{ padding: "10px 6px" }}>Role</th>
                        <th style={{ padding: "10px 6px" }}>Email</th>
                        <th style={{ padding: "10px 6px" }}>Phone</th>
                        <th style={{ padding: "10px 6px" }}>Joined Date</th>
                        <th style={{ padding: "10px 6px" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentUsersRows.map((u) => {
                        const initial = (u.full_name || "U")
                          .charAt(0)
                          .toUpperCase();
                        const isAdm = (u.role || "")
                          .toLowerCase()
                          .includes("admin");
                        const isDoc = (u.role || "")
                          .toLowerCase()
                          .includes("doctor");
                        const roleBadge = isAdm
                          ? {
                              bg: "#f5f3ff",
                              color: "#6d28d9",
                              label: "Super Admin",
                            }
                          : isDoc
                          ? {
                              bg: "#ecfdf5",
                              color: "#047857",
                              label: "Doctor",
                            }
                          : {
                              bg: "#eff6ff",
                              color: "#1d4ed8",
                              label: "Patient",
                            };

                        return (
                          <tr
                            key={u.id}
                            style={{ borderBottom: "1px solid #f8fafc" }}
                          >
                            <td style={{ padding: "12px 6px" }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                <span
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "50%",
                                    background: isAdm
                                      ? "#ede9fe"
                                      : isDoc
                                      ? "#d1fae5"
                                      : "#e0f2fe",
                                    color: roleBadge.color,
                                    fontWeight: 800,
                                    fontSize: "12px",
                                    display: "grid",
                                    placeItems: "center",
                                  }}
                                >
                                  {initial}
                                </span>
                                <strong style={{ color: "#0f172a" }}>
                                  {u.full_name}
                                </strong>
                              </div>
                            </td>
                            <td style={{ padding: "12px 6px" }}>
                              <span
                                style={{
                                  padding: "3px 10px",
                                  borderRadius: "6px",
                                  background: roleBadge.bg,
                                  color: roleBadge.color,
                                  fontWeight: 700,
                                  fontSize: "11px",
                                }}
                              >
                                {roleBadge.label}
                              </span>
                            </td>
                            <td
                              style={{ padding: "12px 6px", color: "#475569" }}
                            >
                              {u.email}
                            </td>
                            <td
                              style={{ padding: "12px 6px", color: "#475569" }}
                            >
                              {u.phone}
                            </td>
                            <td
                              style={{
                                padding: "12px 6px",
                                color: "#64748b",
                                fontSize: "12px",
                              }}
                            >
                              {u.created_at}
                            </td>
                            <td style={{ padding: "12px 6px" }}>
                              <span
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  background: u.is_active
                                    ? "#dcfce7"
                                    : "#fee2e2",
                                  color: u.is_active ? "#15803d" : "#dc2626",
                                  fontWeight: 700,
                                  fontSize: "11px",
                                }}
                              >
                                {u.is_active ? "Active" : "Deactivated"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </section>
            </>
          )}

          {/* =================================================
              TAB 2: PENDING DOCTOR APPROVALS
          ================================================= */}
          {activeTab === "approvals" && (
            <section
              style={{
                background: "#ffffff",
                padding: "24px",
                borderRadius: "18px",
                border: "1px solid #e2e8f0",
              }}
            >
              <h2 style={{ margin: "0 0 6px", fontSize: "20px" }}>
                Pending Doctor Registrations ({data.pending_doctors.length})
              </h2>
              <p
                style={{
                  margin: "0 0 20px",
                  fontSize: "13px",
                  color: "#64748b",
                }}
              >
                Verify medical registration numbers and approve doctors so they
                can login and appear on the Patient Dashboard.
              </p>

              <div style={{ display: "grid", gap: "14px" }}>
                {data.pending_doctors.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      padding: "18px 20px",
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                      }}
                    >
                      <img
                        src={
                          doc.avatar ||
                          "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=160&q=80"
                        }
                        alt={doc.name}
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                      <div>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            color: "#2563eb",
                          }}
                        >
                          {doc.specialization} • Reg No: {doc.medical_reg_no}
                        </span>
                        <strong
                          style={{
                            display: "block",
                            fontSize: "16px",
                            margin: "4px 0",
                          }}
                        >
                          {doc.name} ({doc.qualification})
                        </strong>
                        <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                          Experience: {doc.experience} • Email: {doc.email} •
                          Applied: {doc.applied_date}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        type="button"
                        onClick={() => handleApproveDoctor(doc.id)}
                        style={{
                          padding: "9px 18px",
                          borderRadius: "8px",
                          border: "none",
                          background: "#16a34a",
                          color: "#fff",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        ✓ Approve Doctor
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectDoctor(doc.id)}
                        style={{
                          padding: "9px 18px",
                          borderRadius: "8px",
                          border: "1px solid #fecaca",
                          background: "#fef2f2",
                          color: "#dc2626",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* =================================================
              TAB 3: MANAGE ALL DOCTORS
          ================================================= */}
          {activeTab === "doctors" && (
            <section
              style={{
                background: "#ffffff",
                padding: "24px",
                borderRadius: "18px",
                border: "1px solid #e2e8f0",
              }}
            >
              <h2 style={{ margin: "0 0 18px", fontSize: "20px" }}>
                Hospital Doctors Directory ({filteredDoctors.length})
              </h2>

              <div style={{ display: "grid", gap: "12px" }}>
                {filteredDoctors.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      padding: "16px 20px",
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "14px",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "15.5px" }}>
                        {doc.name} ({doc.specialization})
                      </strong>
                      <span
                        style={{
                          display: "block",
                          fontSize: "12.5px",
                          color: "#64748b",
                          marginTop: "3px",
                        }}
                      >
                        {doc.qualification} • {doc.experience} • Reg:{" "}
                        {doc.medical_reg_no} • Fee: ₹{doc.fee}
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
                        className={`sc-status-pill ${
                          doc.is_approved ? "confirmed" : "pending"
                        }`}
                      >
                        {doc.approval_status?.toUpperCase()}
                      </span>

                      {!doc.is_approved && (
                        <button
                          type="button"
                          onClick={() => handleApproveDoctor(doc.id)}
                          style={{
                            padding: "7px 14px",
                            borderRadius: "8px",
                            border: "none",
                            background: "#16a34a",
                            color: "#fff",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Approve
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleDoctorAvailable(doc.id)}
                        style={{
                          padding: "7px 14px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          background: "#f8fafc",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {doc.available ? "Set Inactive" : "Set Active"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* =================================================
              TAB 4: MANAGE ALL USERS & PATIENTS
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "20px",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: "20px" }}>
                    Hospital Users & Patients ({filteredUsers.length})
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      color: "#64748b",
                    }}
                  >
                    Manage all registered patient profiles, doctor accounts, and hospital administrators.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 18px",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg, #0284c7, #2563eb)",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
                  }}
                >
                  <UserPlus size={16} />
                  <span>+ Create New User</span>
                </button>
              </div>

              {/* ROLE FILTER TABS */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginBottom: "20px",
                  borderBottom: "1px solid #e2e8f0",
                  paddingBottom: "12px",
                  flexWrap: "wrap",
                }}
              >
                {[
                  { id: "all", label: `All Users (${allUsersList.length})` },
                  {
                    id: "patient",
                    label: `Patients (${
                      allUsersList.filter(
                        (u) => (u.role || "").toLowerCase() === "patient"
                      ).length
                    })`,
                  },
                  {
                    id: "doctor",
                    label: `Doctors (${
                      allUsersList.filter(
                        (u) => (u.role || "").toLowerCase() === "doctor"
                      ).length
                    })`,
                  },
                  {
                    id: "admin",
                    label: `Admins (${
                      allUsersList.filter((u) =>
                        (u.role || "").toLowerCase().includes("admin")
                      ).length
                    })`,
                  },
                ].map((tab) => {
                  const active = userRoleFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setUserRoleFilter(tab.id)}
                      style={{
                        padding: "7px 14px",
                        borderRadius: "8px",
                        border: active
                          ? "1px solid #2563eb"
                          : "1px solid #e2e8f0",
                        background: active ? "#eff6ff" : "#ffffff",
                        color: active ? "#1d4ed8" : "#475569",
                        fontWeight: active ? 700 : 500,
                        fontSize: "12.5px",
                        cursor: "pointer",
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {filteredUsers.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    color: "#64748b",
                  }}
                >
                  <p style={{ margin: "0 0 12px", fontSize: "14px" }}>
                    No users match the selected role or search query.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCreateUserModal(true)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#2563eb",
                      color: "#fff",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    + Create User Now
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {filteredUsers.map((p) => {
                    const isAdm = (p.role || "")
                      .toLowerCase()
                      .includes("admin");
                    const isDoc = (p.role || "")
                      .toLowerCase()
                      .includes("doctor");
                    const roleBadge = isAdm
                      ? {
                          bg: "#f5f3ff",
                          color: "#6d28d9",
                          label: "Super Admin",
                        }
                      : isDoc
                      ? { bg: "#ecfdf5", color: "#047857", label: "Doctor" }
                      : { bg: "#eff6ff", color: "#1d4ed8", label: "Patient" };

                    const initial = (p.full_name || "U")
                      .charAt(0)
                      .toUpperCase();

                    return (
                      <div
                        key={p.id}
                        style={{
                          padding: "16px 20px",
                          borderRadius: "14px",
                          border: "1px solid #e2e8f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          background: "#ffffff",
                          flexWrap: "wrap",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "14px",
                          }}
                        >
                          <span
                            style={{
                              width: "42px",
                              height: "42px",
                              borderRadius: "12px",
                              background: isAdm
                                ? "#ede9fe"
                                : isDoc
                                ? "#d1fae5"
                                : "#e0f2fe",
                              color: roleBadge.color,
                              fontSize: "15px",
                              fontWeight: 800,
                              display: "grid",
                              placeItems: "center",
                            }}
                          >
                            {initial}
                          </span>
                          <div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                marginBottom: "4px",
                              }}
                            >
                              <strong
                                style={{ fontSize: "15px", color: "#0f172a" }}
                              >
                                {p.full_name}
                              </strong>
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  background: roleBadge.bg,
                                  color: roleBadge.color,
                                  fontSize: "10.5px",
                                  fontWeight: 700,
                                }}
                              >
                                {roleBadge.label}
                              </span>
                            </div>
                            <span
                              style={{
                                display: "block",
                                fontSize: "12.5px",
                                color: "#64748b",
                              }}
                            >
                              Email: <strong>{p.email}</strong> • Phone:{" "}
                              {p.phone} • Registered: {p.created_at}
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "6px",
                              background: p.is_active ? "#dcfce7" : "#fee2e2",
                              color: p.is_active ? "#15803d" : "#dc2626",
                              fontSize: "11.5px",
                              fontWeight: 700,
                            }}
                          >
                            {p.is_active ? "Active Account" : "Deactivated"}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(p.id)}
                            style={{
                              padding: "7px 14px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              background: p.is_active ? "#fef2f2" : "#ecfdf5",
                              color: p.is_active ? "#dc2626" : "#15803d",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            {p.is_active
                              ? "Deactivate Account"
                              : "Activate Account"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* =================================================
              TAB 5: MONITOR ALL APPOINTMENTS
          ================================================= */}
          {activeTab === "appointments" && (
            <section
              style={{
                background: "#ffffff",
                padding: "24px",
                borderRadius: "18px",
                border: "1px solid #e2e8f0",
              }}
            >
              <h2 style={{ margin: "0 0 18px", fontSize: "20px" }}>
                Hospital Appointments Monitor ({filteredAppointments.length})
              </h2>

              <div style={{ display: "grid", gap: "12px" }}>
                {filteredAppointments.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      padding: "16px 20px",
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          color: "#2563eb",
                        }}
                      >
                        {a.token_number} • {a.consultation_mode}
                      </span>
                      <strong
                        style={{
                          display: "block",
                          fontSize: "15px",
                          margin: "3px 0",
                        }}
                      >
                        Patient: {a.patient_name} → {a.doctor_name} (
                        {a.specialization})
                      </strong>
                      <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                        Scheduled: {a.appointment_date} at {a.appointment_time}{" "}
                        • Fee: ₹{a.fee}
                      </span>
                    </div>

                    <span
                      className={`sc-status-pill ${a.status?.toLowerCase()}`}
                    >
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* =================================================
              TAB 6: MANAGE HOSPITAL DEPARTMENTS
          ================================================= */}
          {activeTab === "departments" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr",
                gap: "20px",
              }}
            >
              <section
                style={{
                  background: "#ffffff",
                  padding: "24px",
                  borderRadius: "18px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <h2 style={{ margin: "0 0 16px", fontSize: "19px" }}>
                  Active Hospital Departments ({data.departments.length})
                </h2>
                <div style={{ display: "grid", gap: "12px" }}>
                  {data.departments.map((dp) => (
                    <div
                      key={dp.id}
                      style={{
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "15px" }}>{dp.name}</strong>
                        <p
                          style={{
                            margin: "4px 0",
                            fontSize: "12.5px",
                            color: "#64748b",
                          }}
                        >
                          {dp.description}
                        </p>
                        <span
                          style={{
                            fontSize: "11.5px",
                            color: "#2563eb",
                            fontWeight: 700,
                          }}
                        >
                          Head: {dp.head_doctor} • {dp.room_wing}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDepartment(dp.id)}
                        style={{
                          border: "1px solid #fecaca",
                          background: "#fef2f2",
                          color: "#dc2626",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: 700,
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section
                style={{
                  background: "#ffffff",
                  padding: "24px",
                  borderRadius: "18px",
                  border: "1px solid #e2e8f0",
                  alignSelf: "start",
                }}
              >
                <h3 style={{ margin: "0 0 14px", fontSize: "17px" }}>
                  Add New Department
                </h3>
                <form
                  onSubmit={handleAddDepartment}
                  style={{ display: "grid", gap: "12px" }}
                >
                  <input
                    type="text"
                    placeholder="Department Name (e.g. Pediatrics) *"
                    value={deptForm.name}
                    onChange={(e) =>
                      setDeptForm({ ...deptForm, name: e.target.value })
                    }
                    required
                    style={{
                      padding: "11px 14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Head Doctor Name *"
                    value={deptForm.head_doctor}
                    onChange={(e) =>
                      setDeptForm({ ...deptForm, head_doctor: e.target.value })
                    }
                    required
                    style={{
                      padding: "11px 14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Wing / Floor (e.g. Wing C • 2nd Floor)"
                    value={deptForm.room_wing}
                    onChange={(e) =>
                      setDeptForm({ ...deptForm, room_wing: e.target.value })
                    }
                    style={{
                      padding: "11px 14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                    }}
                  />
                  <textarea
                    rows={3}
                    placeholder="Department Description *"
                    value={deptForm.description}
                    onChange={(e) =>
                      setDeptForm({ ...deptForm, description: e.target.value })
                    }
                    required
                    style={{
                      padding: "11px 14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: "12px",
                      borderRadius: "10px",
                      border: "none",
                      background: "#2563eb",
                      color: "#fff",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    + Create Department
                  </button>
                </form>
              </section>
            </div>
          )}

          {/* =================================================
              TAB 7 & 8: REPORTS & SYSTEM SETTINGS
          ================================================= */}
          {(activeTab === "reports" || activeTab === "settings") && (
            <section
              style={{
                background: "#ffffff",
                padding: "24px",
                borderRadius: "18px",
                border: "1px solid #e2e8f0",
              }}
            >
              <h2 style={{ margin: "0 0 10px", fontSize: "20px" }}>
                {activeTab === "reports"
                  ? "Hospital Analytics & Reports"
                  : "SmartCare Super Admin Security Settings"}
              </h2>
              <p style={{ color: "#64748b", fontSize: "13.5px" }}>
                Role-Based Access Control (RBAC), Doctor Registration Approval
                Gate, and Patient Medical Record Authorization are active and
                enforced across PostgreSQL.
              </p>
            </section>
          )}

          {/* CREATE USER MODAL */}
          {showCreateUserModal && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(15, 23, 42, 0.6)",
                backdropFilter: "blur(4px)",
                display: "grid",
                placeItems: "center",
                zIndex: 9999,
                padding: "20px",
              }}
            >
              <div
                style={{
                  background: "#ffffff",
                  width: "100%",
                  maxWidth: "520px",
                  borderRadius: "20px",
                  padding: "28px",
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
                  maxHeight: "90vh",
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "19px",
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      Create New Hospital User
                    </h3>
                    <small style={{ color: "#64748b", fontSize: "12px" }}>
                      Registered directly into database by Super Admin
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateUserModal(false);
                      setCreateFormError("");
                    }}
                    style={{
                      border: "none",
                      background: "#f1f5f9",
                      borderRadius: "50%",
                      width: "32px",
                      height: "32px",
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                      color: "#64748b",
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {createFormError && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      color: "#dc2626",
                      fontSize: "12.5px",
                      marginBottom: "16px",
                    }}
                  >
                    {createFormError}
                  </div>
                )}

                <form onSubmit={handleCreateUser}>
                  {/* ROLE SELECTION */}
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#475569",
                      marginBottom: "8px",
                    }}
                  >
                    Select User Account Type
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "8px",
                      marginBottom: "16px",
                    }}
                  >
                    {[
                      { id: "patient", label: "Patient", icon: "👤" },
                      { id: "doctor", label: "Doctor", icon: "👨‍⚕️" },
                      { id: "admin", label: "Super Admin", icon: "🛡️" },
                    ].map((r) => {
                      const isSel = newUserForm.role === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() =>
                            setNewUserForm({ ...newUserForm, role: r.id })
                          }
                          style={{
                            padding: "10px",
                            borderRadius: "10px",
                            border: isSel
                              ? "2px solid #2563eb"
                              : "1px solid #e2e8f0",
                            background: isSel ? "#eff6ff" : "#f8fafc",
                            color: isSel ? "#1d4ed8" : "#334155",
                            fontWeight: 700,
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          {r.icon} {r.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* FULL NAME */}
                  <div style={{ marginBottom: "14px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#475569",
                        marginBottom: "6px",
                      }}
                    >
                      Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={newUserForm.full_name}
                      onChange={(e) =>
                        setNewUserForm({
                          ...newUserForm,
                          full_name: e.target.value,
                        })
                      }
                      required
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* EMAIL */}
                  <div style={{ marginBottom: "14px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#475569",
                        marginBottom: "6px",
                      }}
                    >
                      Email Address *
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. rahul@example.com"
                      value={newUserForm.email}
                      onChange={(e) =>
                        setNewUserForm({
                          ...newUserForm,
                          email: e.target.value,
                        })
                      }
                      required
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* PHONE */}
                  <div style={{ marginBottom: "14px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#475569",
                        marginBottom: "6px",
                      }}
                    >
                      Phone Number (10 Digits) *
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      value={newUserForm.phone}
                      onChange={(e) =>
                        setNewUserForm({
                          ...newUserForm,
                          phone: e.target.value,
                        })
                      }
                      required
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* PASSWORD */}
                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#475569",
                        marginBottom: "6px",
                      }}
                    >
                      Password (min 8 characters) *
                    </label>
                    <input
                      type="password"
                      placeholder="Set account password"
                      minLength={8}
                      value={newUserForm.password}
                      onChange={(e) =>
                        setNewUserForm({
                          ...newUserForm,
                          password: e.target.value,
                        })
                      }
                      required
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* DOCTOR FIELDS IF DOCTOR */}
                  {newUserForm.role === "doctor" && (
                    <div
                      style={{
                        background: "#f8fafc",
                        padding: "14px",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        marginBottom: "16px",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#0284c7",
                          marginBottom: "10px",
                        }}
                      >
                        Doctor Profile Details
                      </span>

                      <div style={{ marginBottom: "10px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#64748b",
                            marginBottom: "4px",
                          }}
                        >
                          Specialization
                        </label>
                        <select
                          value={newUserForm.specialization}
                          onChange={(e) =>
                            setNewUserForm({
                              ...newUserForm,
                              specialization: e.target.value,
                            })
                          }
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12.5px",
                            boxSizing: "border-box",
                          }}
                        >
                          <option value="Cardiology">Cardiology</option>
                          <option value="Neurology">Neurology</option>
                          <option value="Orthopedics">Orthopedics</option>
                          <option value="Ophthalmology">Ophthalmology</option>
                          <option value="Pulmonology">Pulmonology</option>
                          <option value="Hematology">Hematology</option>
                          <option value="Pediatrics">Pediatrics</option>
                          <option value="General Medicine">
                            General Medicine
                          </option>
                        </select>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "8px",
                          marginBottom: "10px",
                        }}
                      >
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "#64748b",
                              marginBottom: "4px",
                            }}
                          >
                            Qualification
                          </label>
                          <input
                            type="text"
                            placeholder="MBBS, MD"
                            value={newUserForm.qualification}
                            onChange={(e) =>
                              setNewUserForm({
                                ...newUserForm,
                                qualification: e.target.value,
                              })
                            }
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              fontSize: "12px",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "#64748b",
                              marginBottom: "4px",
                            }}
                          >
                            Experience
                          </label>
                          <input
                            type="text"
                            placeholder="8 Years"
                            value={newUserForm.experience}
                            onChange={(e) =>
                              setNewUserForm({
                                ...newUserForm,
                                experience: e.target.value,
                              })
                            }
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              fontSize: "12px",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#64748b",
                            marginBottom: "4px",
                          }}
                        >
                          Medical Reg. Number
                        </label>
                        <input
                          type="text"
                          placeholder="MCI-2026-XXXX"
                          value={newUserForm.medical_reg_no}
                          onChange={(e) =>
                            setNewUserForm({
                              ...newUserForm,
                              medical_reg_no: e.target.value,
                            })
                          }
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12px",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "10px",
                      marginTop: "20px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateUserModal(false);
                        setCreateFormError("");
                      }}
                      style={{
                        padding: "10px 18px",
                        borderRadius: "10px",
                        border: "1px solid #cbd5e1",
                        background: "#fff",
                        color: "#475569",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingUser}
                      style={{
                        padding: "10px 22px",
                        borderRadius: "10px",
                        border: "none",
                        background:
                          "linear-gradient(135deg, #0284c7, #2563eb)",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {creatingUser ? "Creating User..." : "Create User"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
