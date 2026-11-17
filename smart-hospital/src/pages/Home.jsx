import { Link } from "react-router-dom";
import {
  HeartPulse,
  Search,
  CalendarDays,
  Clock,
  Users,
  ShieldCheck,
  Stethoscope,
  ArrowRight,
  ChevronDown,
  Phone,
  Activity,
  Heart,
  Brain,
  Eye,
  Bone,
  Wind,
  Droplets,
  Sparkles,
  Ambulance,
  Microscope,
  Syringe,
  Plus,
  Cross,
  BadgeCheck,
  MoveUpRight,
} from "lucide-react";

const departments = [
  { name: "Cardiology", desc: "Advanced heart and cardiac care.", icon: Heart },
  { name: "Neurology", desc: "Expert brain and nerve treatment.", icon: Brain },
  { name: "Ophthalmology", desc: "Complete vision and eye care.", icon: Eye },
  { name: "Orthopedics", desc: "Bone, muscle and joint care.", icon: Bone },
  {
    name: "Pulmonology",
    desc: "Respiratory and lung specialists.",
    icon: Wind,
  },
  {
    name: "Hematology",
    desc: "Expert blood disorder treatment.",
    icon: Droplets,
  },
];

const services = [
  {
    icon: Clock,
    title: "24/7 Emergency Care",
    desc: "Emergency healthcare support whenever you need it.",
  },
  {
    icon: Users,
    title: "Experienced Medical Team",
    desc: "Qualified doctors and healthcare professionals.",
  },
  {
    icon: ShieldCheck,
    title: "Patient Focused Care",
    desc: "Your comfort, safety and well-being come first.",
  },
];

export default function Home() {
  return (
    <div className="hospital-home vfx-home">
      {/* TOP CONTACT BAR */}
      <div className="hospital-topbar">
        <div className="topbar-left">
          <span>
            <Phone size={13} /> +91 98765 43210
          </span>
          <span>✉ support@smartcare.com</span>
          <span>Mon - Sat: 09:00 AM - 07:00 PM</span>
        </div>
        <div className="topbar-right">
          <Link to="/login">♙ Login</Link>
          <span>|</span>
          <span>English⌄</span>
        </div>
      </div>

      {/* NAVBAR */}
      <nav className="hospital-navbar vfx-navbar">
        <Link to="/" className="hospital-logo">
          <span className="hospital-logo-icon">
            <HeartPulse size={30} />
          </span>
          <span>
            <strong>SmartCare</strong>
            <small>SMART HEALTHCARE</small>
          </span>
        </Link>

        <div className="hospital-nav-links">
          <a href="#home" className="active">
            Home
          </a>
          <a href="#about">
            About <ChevronDown size={13} />
          </a>
          <a href="#services">
            Services <ChevronDown size={13} />
          </a>
          <a href="#departments">Departments</a>
          <a href="#doctors">Doctors</a>
          <a href="#contact">Contact</a>
        </div>

        <div className="hospital-nav-actions">
          <button
            className="search-button"
            aria-label="Search departments"
            onClick={() =>
              document
                .getElementById("departments")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <Search size={19} />
          </button>
          <Link to="/signup" className="appointment-button">
            <CalendarDays size={16} />
            Book Appointment
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="vfx-hero" id="home">
        <div className="vfx-glow glow-one"></div>
        <div className="vfx-glow glow-two"></div>
        <div className="vfx-grid"></div>

        {/* Floating icons */}
        <div className="floating-medical-icon float-one">
          <HeartPulse />
        </div>
        <div className="floating-medical-icon float-two">
          <Plus />
        </div>
        <div className="floating-medical-icon float-three">
          <Cross />
        </div>
        <div className="floating-medical-icon float-four">
          <Activity />
        </div>
        <div className="floating-medical-icon float-five">
          <Microscope />
        </div>

        <div className="vfx-hero-content">
          <div className="vfx-badge">
            <span className="live-dot"></span>
            <Sparkles size={14} />
            NEXT GENERATION HEALTHCARE
          </div>

          <h1>
            Your Health.
            <br />
            <span className="gradient-heading">Our Priority.</span>
          </h1>

          <p className="vfx-description">
            Experience smarter healthcare with expert doctors, seamless
            appointments and secure digital medical records — all designed
            around you.
          </p>

          <div className="vfx-hero-buttons">
            <Link to="/signup" className="vfx-primary-btn">
              <CalendarDays size={18} />
              Book Appointment
              <ArrowRight size={17} />
            </Link>

            <Link to="/login" className="vfx-secondary-btn">
              Patient Login
              <MoveUpRight size={16} />
            </Link>
          </div>

          <div className="vfx-trust-row">
            <div className="trust-icon">
              <ShieldCheck size={18} />
            </div>
            <div>
              <strong>Secure & Reliable</strong>
              <span>Your healthcare data stays protected</span>
            </div>
          </div>
        </div>

        {/* HERO IMAGE */}
        <div className="vfx-hero-visual">
          <div className="visual-orbit orbit-one"></div>
          <div className="visual-orbit orbit-two"></div>

          <div className="doctor-image-frame">
            <img
              src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1200&q=90"
              alt="Healthcare doctor"
            />
            <div className="doctor-image-shade"></div>

            <div className="doctor-caption">
              <div className="caption-icon">
                <Stethoscope size={22} />
              </div>
              <div>
                <strong>Expert Medical Care</strong>
                <span>Care that puts you first</span>
              </div>
              <BadgeCheck size={21} className="verified-icon" />
            </div>
          </div>

          {/* Floating cards */}
          <div className="vfx-float-card appointment-float">
            <div className="float-card-icon">
              <CalendarDays size={21} />
            </div>
            <div>
              <strong>Easy Booking</strong>
              <span>Appointments made simple</span>
            </div>
          </div>

          <div className="vfx-float-card care-float">
            <div className="float-card-icon">
              <HeartPulse size={22} />
            </div>
            <div>
              <strong>Patient First</strong>
              <span>Care at every step</span>
            </div>
          </div>

          <div className="vfx-circle-label">
            <HeartPulse size={18} />
            <span>
              SMART
              <br />
              HEALTHCARE
            </span>
          </div>
        </div>
      </section>

      {/* QUICK SERVICES */}
      <section className="vfx-services-strip" id="services">
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <div className="vfx-service-item" key={service.title}>
              <div className="vfx-service-icon">
                <Icon size={25} />
              </div>
              <div>
                <h3>{service.title}</h3>
                <p>{service.desc}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* DEPARTMENTS */}
      <section className="vfx-departments" id="departments">
        <div className="vfx-section-heading">
          <span className="vfx-section-tag">
            <Activity size={14} /> OUR SPECIALTIES
          </span>
          <h2>
            Explore Our Medical <span>Departments</span>
          </h2>
          <p>
            Find specialized care and connect with the right medical
            professionals.
          </p>
        </div>

        <div className="vfx-department-grid">
          {departments.map((department) => {
            const Icon = department.icon;
            return (
              <Link
                to="/signup"
                className="vfx-department-card"
                key={department.name}
              >
                <div className="vfx-department-icon">
                  <Icon size={28} />
                </div>
                <h3>{department.name}</h3>
                <p>{department.desc}</p>
                <span className="vfx-explore">
                  Explore Department <ArrowRight size={15} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ABOUT */}
      <section className="vfx-about" id="about">
        <div className="vfx-about-visual">
          <div className="about-glow"></div>
          <div className="about-main-icon">
            <HeartPulse size={85} />
          </div>
          <div className="about-floating-icon">
            <ShieldCheck size={26} />
          </div>
          <div className="about-floating-text">
            <BadgeCheck size={19} />
            Patient First Approach
          </div>
        </div>

        <div className="vfx-about-content">
          <span className="vfx-section-tag">ABOUT SMARTCARE</span>
          <h2>
            Technology Meets <span>Better Healthcare.</span>
          </h2>
          <p>
            SmartCare brings hospitals, doctors and patients together through
            one convenient digital platform. Manage appointments, access medical
            records and discover specialized healthcare services with ease.
          </p>

          <div className="about-benefits">
            <span>
              <ShieldCheck size={18} /> Secure Medical Records
            </span>
            <span>
              <CalendarDays size={18} /> Simple Appointment Booking
            </span>
            <span>
              <Stethoscope size={18} /> Doctor Directory
            </span>
          </div>

          <Link to="/signup" className="vfx-primary-btn about-cta">
            Get Started <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      {/* DOCTOR CTA */}
      <section className="vfx-doctor-cta" id="doctors">
        <div className="cta-decoration"></div>
        <div>
          <span>YOUR HEALTH MATTERS</span>
          <h2>Ready to take care of your health?</h2>
          <p>Find the right doctor and book your appointment today.</p>
        </div>
        <Link to="/signup" className="vfx-cta-button">
          Find a Doctor <ArrowRight size={17} />
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="hospital-footer vfx-footer" id="contact">
        <div className="hospital-logo footer-logo">
          <HeartPulse size={28} />
          <strong>SmartCare</strong>
        </div>
        <p>Smarter technology. Better healthcare. Healthier lives.</p>
        <div className="vfx-footer-links">
          <Link to="/login">Login</Link>
          <Link to="/signup">Register</Link>
          <a href="#departments">Departments</a>
          <a href="#about">About Us</a>
        </div>
        <small>© 2026 SmartCare. All rights reserved.</small>
      </footer>
    </div>
  );
}
