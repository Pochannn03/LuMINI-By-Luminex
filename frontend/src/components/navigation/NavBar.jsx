import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../../assets/lumini-logo.png";
import Header from "./Header";
import { useAuth } from "../../context/AuthProvider";
import "../../styles/sidebar.css";

const NAV_ITEMS = [
  /* Super Admin */
  {
    label: "Dashboard",
    path: "/superadmin/dashboard",
    icon: "dashboard",
    allowedRoles: ["superadmin"],
  },
  {
    label: "Manage Classes",
    path: "/superadmin/manage-class",
    icon: "school",
    allowedRoles: ["superadmin"],
  },
  {
    label: "Analytics",
    path: "/superadmin/analytics",
    icon: "analytics",
    allowedRoles: ["superadmin"],
  },
  {
    label: "Settings",
    path: "/superadmin/settings",
    icon: "settings",
    allowedRoles: ["superadmin"],
  },
  {
    label: "Accounts",
    path: "/superadmin/accounts",
    icon: "manage_accounts",
    allowedRoles: ["superadmin"],
  },

  /* Admin (Teacher) */
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: "dashboard",
    allowedRoles: ["admin"],
  },
  {
    label: "Attendance",
    path: "/admin/attendance",
    icon: "punch_clock",
    allowedRoles: ["admin"],
  },
  {
    label: "Dismissal History",
    path: "/admin/history",
    icon: "archive",
    allowedRoles: ["admin"],
  },
  {
    label: "Enrollments",
    path: "/admin/enrollments",
    icon: "assignment_ind", // A nice icon for student registration
    allowedRoles: ["admin"],
  },
  {
    label: "Approvals",
    path: "/admin/approvals",
    icon: "verified_user",
    allowedRoles: ["admin"],
  },
  {
    label: "Profile",
    path: "/admin/profile",
    icon: "person",
    allowedRoles: ["admin"],
  },
  /* Parent (User + Parent) */
  {
    label: "Dashboard",
    path: "/parent/dashboard",
    icon: "dashboard",
    allowedRoles: ["user"],
    allowedTypes: ["Parent"],
  },
  {
    label: "Manage Guardians",
    path: "/parent/guardians",
    icon: "manage_accounts",
    allowedRoles: ["user"],
    allowedTypes: ["Parent"],
  },
  {
    label: "Pickup History",
    path: "/parent/history",
    icon: "history",
    allowedRoles: ["user"],
    allowedTypes: ["Parent"],
  },
  {
    label: "Profile",
    path: "/parent/profile",
    icon: "person",
    allowedRoles: ["user"],
    allowedTypes: ["Parent"],
  },
  /* Guardian (User + Guardian) */
  {
    label: "Dashboard",
    path: "/guardian/dashboard",
    icon: "dashboard",
    allowedRoles: ["user"],
    allowedTypes: ["Guardian"],
  },
  {
    label: "Pickup History",  // <-- ADDED THIS FOR GUARDIAN
    path: "/guardian/history",
    icon: "history",
    allowedRoles: ["user"],
    allowedTypes: ["Guardian"],
  },
  {
    label: "Profile",
    path: "/guardian/profile",
    icon: "person",
    allowedRoles: ["user"],
    allowedTypes: ["Guardian"],
  },
];

export default function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const currentRole = user ? user.role : "guest";
  const currentType = user ? user.relationship : null;

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    const hasRole = item.allowedRoles.includes(currentRole);
    const hasType = item.allowedTypes
      ? item.allowedTypes.includes(currentType)
      : true;

    return hasRole && hasType;
  });

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const isActive = (path) => {
    return location.pathname === path ? "nav-item active" : "nav-item";
  };

  useEffect(() => {
    document.body.classList.add("dashboard-mode");

    const isDesktop = window.innerWidth >= 1024;
    if (isDesktop && isOpen) {
      document.body.classList.add("sidebar-open");
    } else {
      document.body.classList.remove("sidebar-open");
    }

    return () => {
      document.body.classList.remove("dashboard-mode");
      document.body.classList.remove("sidebar-open");
    };
  }, [isOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("lumini_pickup_pass");
    logout();
    navigate("/login");
  };

  return (
    <>
      <Header onToggle={toggleMenu} />

      <div
        className={`nav-overlay ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(false)}
      ></div>

      <aside
        className={`sidebar ${isOpen ? "expanded active" : ""}`}
        id="sideNavBar"
      >
        <div className="border-bottom flex shrink-0 items-center justify-center h-20 ">
          <img src={logo} alt="Lumini" className="sidebar-logo"></img>
        </div>

        <nav className="sidebar-menu">
          {visibleNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={isActive(item.path)}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="nav-item logout-btn">
            <span className="material-symbols-outlined">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}