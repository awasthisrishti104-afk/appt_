import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HeartPulse,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Plus,
  CalendarDays,
  Award,
  Briefcase,
  Building2,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

const roles = [
  { name: "Patient", icon: UserRound },
  { name: "Doctor", icon: Stethoscope },
  { name: "Admin", icon: ShieldCheck },
];

export default function Signup() {
  const navigate = useNavigate();

  const [role, setRole] = useState("Patient");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const form = e.currentTarget;

    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and Confirm Password do not match.");
      return;
    }

    const formData = {
      role: role.toLowerCase(),
      first_name: form.firstName.value.trim(),
      last_name: form.lastName.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      password: password,
      date_of_birth: form.dob.value,
      gender: form.gender.value,
      ...(role === "Doctor" && {
        specialization: form.specialization.value,
        qualification: form.qualification.value.trim(),
        experience: form.experience.value.trim(),
        medical_registration_number: form.medicalRegNo.value.trim(),
      }),
      ...(role === "Admin" && {
        employee_id: form.adminCode?.value?.trim() || "ADM-SMARTCARE",
      }),
    };

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = Array.isArray(data.detail)
          ? data.detail.map((item) => item.msg).join(", ")
          : data.detail || "Registration failed.";

        throw new Error(message);
      }

      setSuccess(
        data.message ||
          (role === "Doctor"
            ? "Doctor registration submitted! Awaiting Super Admin approval."
            : role === "Admin"
            ? "Super Admin account registered successfully! Redirecting to login..."
            : "Registration successful! Please login.")
      );

      form.reset();

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setError(err.message || "Unable to connect to SmartCare server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sc-signup-page">
      {/* HEADER */}
      <header className="sc-signup-header">
        <Link to="/" className="sc-signup-brand">
          <span className="sc-brand-icon">
            <HeartPulse size={27} />
          </span>
          <span>SmartCare</span>
        </Link>

        <nav>
          <Link to="/">HOME</Link>
          <Link to="/login">LOGIN</Link>
        </nav>
      </header>

      {/* MAIN SECTION */}
      <main className="sc-signup-main">
        {/* LEFT WELCOME PANEL */}
        <section className="sc-signup-welcome">
          <div className="sc-hospital-symbol">
            <div className="sc-symbol-glow"></div>

            <div className="sc-hospital-cross">
              <Plus size={90} strokeWidth={3} />
              <HeartPulse size={42} />
            </div>
          </div>

          <h1>
            Welcome to
            <br />
            <span>SmartCare</span>
          </h1>

          <p>
            Your health journey starts here. Connect with verified doctors,
            manage hospital operations, and experience smarter healthcare with
            seamless appointment booking and digital medical records.
          </p>

          <div className="sc-welcome-points">
            <span>
              <ShieldCheck size={17} />
              Patient, Doctor & Super Admin Portals
            </span>

            <span>
              <HeartPulse size={17} />
              Admin-Verified Doctors
            </span>

            <span>
              <CalendarDays size={17} />
              Instant Appointment Tracking
            </span>
          </div>
        </section>

        {/* RIGHT REGISTRATION CARD */}
        <section className="sc-signup-card" id="signup-form">
          {/* ROLE SELECTOR (PATIENT | DOCTOR | ADMIN) */}
          <div className="sc-role-tabs">
            {roles.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  type="button"
                  key={item.name}
                  className={role === item.name ? "selected" : ""}
                  onClick={() => {
                    setRole(item.name);
                    setError("");
                    setSuccess("");
                  }}
                >
                  <Icon size={14} />
                  {item.name}
                </button>
              );
            })}
          </div>

          <div className="sc-signup-heading">
            <span className="sc-form-tag">JOIN SMARTCARE</span>

            <h2>Register as {role}</h2>

            <p className="sc-signup-subtitle">
              {role === "Doctor"
                ? "Doctor accounts are verified and approved by Super Admin before activation."
                : role === "Admin"
                ? "Create a Super Admin account with full hospital management and approval permissions."
                : "Create your patient account to book appointments with verified doctors."}
            </p>
          </div>

          {/* REGISTRATION FORM */}
          <form onSubmit={handleSubmit}>
            <div className="sc-signup-grid">
              {/* FIRST NAME */}
              <div className="sc-signup-field">
                <User size={16} />

                <input
                  name="firstName"
                  type="text"
                  placeholder="First Name *"
                  autoComplete="given-name"
                  required
                />
              </div>

              {/* LAST NAME */}
              <div className="sc-signup-field">
                <User size={16} />

                <input
                  name="lastName"
                  type="text"
                  placeholder="Last Name *"
                  autoComplete="family-name"
                  required
                />
              </div>

              {/* EMAIL */}
              <div className="sc-signup-field">
                <Mail size={16} />

                <input
                  name="email"
                  type="email"
                  placeholder={
                    role === "Admin"
                      ? "Admin Email (e.g. admin@smartcare.com) *"
                      : "Your Email *"
                  }
                  autoComplete="email"
                  required
                />
              </div>

              {/* PHONE */}
              <div className="sc-signup-field">
                <Phone size={16} />

                <input
                  name="phone"
                  type="tel"
                  placeholder="Your 10-Digit Phone *"
                  autoComplete="tel"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  title="Enter a valid 10-digit mobile number"
                  required
                />
              </div>

              {/* PASSWORD */}
              <div className="sc-signup-field">
                <Lock size={16} />

                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password (min 8 chars) *"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />

                <button
                  type="button"
                  className="sc-eye"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="sc-signup-field">
                <Lock size={16} />

                <input
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm Password *"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />

                <button
                  type="button"
                  className="sc-eye"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* DATE OF BIRTH */}
              <div className="sc-signup-field">
                <CalendarDays size={16} />

                <input
                  name="dob"
                  type="date"
                  aria-label="Date of birth"
                  max={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>

              {/* GENDER */}
              <div className="sc-signup-field">
                <UserRound size={16} />

                <select name="gender" defaultValue="" required>
                  <option value="" disabled>
                    Select Gender *
                  </option>

                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* DOCTOR SPECIFIC CREDENTIALS */}
              {role === "Doctor" && (
                <>
                  <div className="sc-signup-field">
                    <Stethoscope size={16} />
                    <select name="specialization" defaultValue="" required>
                      <option value="" disabled>
                        Select Specialization *
                      </option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Orthopedics">Orthopedics</option>
                      <option value="Ophthalmology">Ophthalmology</option>
                      <option value="Pulmonology">Pulmonology</option>
                      <option value="Hematology">Hematology</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="General Medicine">General Medicine</option>
                    </select>
                  </div>

                  <div className="sc-signup-field">
                    <Award size={16} />
                    <input
                      name="qualification"
                      type="text"
                      placeholder="Qualification (e.g. MBBS, MD) *"
                      required
                    />
                  </div>

                  <div className="sc-signup-field">
                    <Briefcase size={16} />
                    <input
                      name="experience"
                      type="text"
                      placeholder="Experience (e.g. 8 Years) *"
                      required
                    />
                  </div>

                  <div className="sc-signup-field">
                    <ShieldCheck size={16} />
                    <input
                      name="medicalRegNo"
                      type="text"
                      placeholder="Medical Registration Number *"
                      required
                    />
                  </div>
                </>
              )}

              {/* ADMIN SPECIFIC CREDENTIALS */}
              {role === "Admin" && (
                <>
                  <div className="sc-signup-field">
                    <ShieldCheck size={16} />
                    <input
                      name="adminCode"
                      type="text"
                      placeholder="Admin Employee ID (e.g. ADM-001) *"
                      defaultValue="ADM-001"
                      required
                    />
                  </div>

                  <div className="sc-signup-field">
                    <Building2 size={16} />
                    <select name="adminDept" defaultValue="Hospital Operations">
                      <option value="Hospital Operations">
                        Super Admin • Hospital Operations
                      </option>
                      <option value="Medical Board & Approvals">
                        Super Admin • Medical Approvals
                      </option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* TERMS */}
            <div className="sc-signup-terms">
              <label>
                <input type="checkbox" required />

                <span>
                  I agree to the Terms & Conditions and Privacy Policy.
                </span>
              </label>
            </div>

            {/* API RESPONSE MESSAGES */}
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

            {success && (
              <p
                role="status"
                style={{
                  color: "#15803d",
                  fontSize: "14px",
                  marginTop: "12px",
                }}
              >
                {success}
              </p>
            )}

            {/* REGISTER BUTTON */}
            <div className="sc-signup-bottom">
              <div className="sc-gender-note">
                <ShieldCheck size={16} />
                {role === "Doctor"
                  ? "Requires Super Admin verification."
                  : role === "Admin"
                  ? "Full Super Admin access enabled."
                  : "Your information is secure."}
              </div>

              <button
                type="submit"
                className="sc-register-btn"
                disabled={loading}
              >
                {loading ? "Registering..." : `Register as ${role}`}

                {!loading && <ArrowRight size={16} />}
              </button>
            </div>
          </form>

          {/* LOGIN LINK */}
          <div className="sc-signup-login">
            Already have an account?
            <Link to="/login"> Login here</Link>
          </div>

          {/* SECURITY FOOTER */}
          <div className="sc-signup-security">
            <ShieldCheck size={14} />
            SmartCare Secure Healthcare Platform
          </div>
        </section>
      </main>
    </div>
  );
}
