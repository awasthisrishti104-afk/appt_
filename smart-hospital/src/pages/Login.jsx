import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HeartPulse,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Plus,
  Activity,
  UserRound,
  Stethoscope,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

const LOGIN_ROLES = [
  { id: "patient", label: "Patient", icon: UserRound },
  { id: "doctor", label: "Doctor", icon: Stethoscope },
  { id: "admin", label: "Admin", icon: ShieldCheck },
];

export default function Login() {
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState("patient");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRoleSwitch = (roleId) => {
    setSelectedRole(roleId);
    setError("");
    setEmail("");
    setPassword("");
  };

  const performLogin = async (loginEmail, loginPass) => {
    setError("");

    if (!loginEmail.trim() || !loginPass) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPass,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = Array.isArray(data.detail)
          ? data.detail.map((item) => item.msg).join(", ")
          : data.detail || "Invalid email or password.";
        throw new Error(message);
      }

      if (!data.access_token) {
        throw new Error("Login response did not contain an access token.");
      }

      localStorage.setItem("smartcare_token", data.access_token);
      localStorage.setItem("smartcare_token_type", data.token_type || "bearer");
      sessionStorage.setItem("smartcare_token", data.access_token);
      sessionStorage.setItem("smartcare_token_type", data.token_type || "bearer");

      if (data.user) {
        const userJson = JSON.stringify(data.user);
        localStorage.setItem("smartcare_user", userJson);
        sessionStorage.setItem("smartcare_user", userJson);
      }

      const actualRole = (data.user?.role || "").toLowerCase().trim();

      if (actualRole === "admin" || actualRole === "superadmin" || actualRole.includes("admin")) {
        navigate("/admin/dashboard");
      } else if (actualRole === "doctor") {
        navigate("/doctor/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  const activeRoleLabel =
    selectedRole === "admin"
      ? "Super Admin"
      : selectedRole === "doctor"
      ? "Doctor"
      : "Patient";

  return (
    <div className="sc-auth-login">
      {/* LEFT PANEL */}
      <section className="sc-login-visual">
        <Link to="/" className="sc-auth-logo">
          <span className="sc-login-logo-icon">
            <HeartPulse size={28} />
          </span>
          <span>SmartCare</span>
        </Link>

        <div className="sc-login-decoration">
          <div className="sc-decoration-icon">
            <Plus size={28} />
          </div>
          <div className="sc-decoration-icon">
            <Activity size={27} />
          </div>
          <div className="sc-decoration-icon">
            <HeartPulse size={25} />
          </div>
        </div>

        <div className="sc-login-art">
          <div className="sc-art-circle"></div>

          <img
            src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=700&q=85"
            alt="SmartCare healthcare professional"
          />

          <div className="sc-art-badge">
            <ShieldCheck size={19} />
            Trusted Healthcare
          </div>
        </div>

        <div className="sc-login-message">
          <span className="sc-login-small-tag">YOUR HEALTH OUR PRIORITY</span>

          <h2>
            Better Healthcare.
            <br />
            Better Tomorrow.
          </h2>

          <p>
            Your health deserves the best care. Connect with experienced
            doctors, book appointments and manage hospital operations with
            SmartCare.
          </p>

          <div className="sc-slider-dots">
            <span className="active"></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <div className="sc-login-bottom">
          <ShieldCheck size={15} />
          Secure and Patient-Centered Healthcare
        </div>
      </section>

      {/* RIGHT LOGIN SECTION */}
      <section className="sc-login-form-side">
        <div className="sc-login-form">
          <Link to="/" className="sc-mobile-brand">
            <HeartPulse size={29} />
            SmartCare
          </Link>

          {/* 3-ROLE SELECTOR TABS (PATIENT | DOCTOR | ADMIN) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "8px",
              padding: "5px",
              background: "#f1f5f9",
              borderRadius: "14px",
              marginBottom: "22px",
              border: "1px solid #e2e8f0",
            }}
          >
            {LOGIN_ROLES.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedRole === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleRoleSwitch(item.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "none",
                    background: isSelected
                      ? "linear-gradient(135deg, #0284c7, #2563eb)"
                      : "transparent",
                    color: isSelected ? "#ffffff" : "#475569",
                    fontSize: "13px",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: isSelected
                      ? "0 4px 12px rgba(37, 99, 235, 0.25)"
                      : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <span className="sc-form-tag">
            {selectedRole.toUpperCase()} PORTAL ACCESS
          </span>

          <h1>Login as {activeRoleLabel}</h1>

          <p className="sc-form-subtitle">
            {selectedRole === "admin"
              ? "Sign in with Super Admin credentials to manage doctors, approvals, patients, and hospital analytics."
              : selectedRole === "doctor"
              ? "Sign in to manage patient appointments, write consultations, and issue prescriptions."
              : "Sign in to book appointments with verified doctors and view your medical records."}
          </p>

          <form onSubmit={handleLogin}>
            {/* EMAIL */}
            <label htmlFor="login-email">{activeRoleLabel} Email Address</label>

            <div className="sc-input-wrap">
              <Mail size={18} />

              <input
                id="login-email"
                type="email"
                placeholder={
                  selectedRole === "admin"
                    ? "Enter admin email address"
                    : selectedRole === "doctor"
                    ? "Enter doctor email address"
                    : "Enter your email address"
                }
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            {/* PASSWORD */}
            <label htmlFor="login-password">Password</label>

            <div className="sc-input-wrap">
              <Lock size={18} />

              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="sc-eye"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* REMEMBER ME */}
            <div className="sc-login-options">
              <label className="sc-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember Me
              </label>

              <Link to="/signup">Create {activeRoleLabel} Account</Link>
            </div>

            {/* ERROR MESSAGE */}
            {error && (
              <p
                role="alert"
                style={{
                  color: "#dc2626",
                  fontSize: "14px",
                  marginTop: "12px",
                }}
              >
                {error}
              </p>
            )}

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              className="sc-login-submit"
              disabled={loading}
            >
              {loading ? "Logging in..." : `Login as ${activeRoleLabel}`}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <p className="sc-auth-switch">
            Don&apos;t have an account yet?
            <Link to="/signup"> Signup as Patient, Doctor or Admin</Link>
          </p>

          <div className="sc-login-security">
            <ShieldCheck size={16} />
            Your information is protected by SmartCare.
          </div>

          <Link to="/" className="sc-back-home">
            ← Back to Home
          </Link>
        </div>
      </section>
    </div>
  );
}
