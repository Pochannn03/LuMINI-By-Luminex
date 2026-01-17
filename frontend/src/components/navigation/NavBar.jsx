import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../../assets/lumini-logo.png'
import Header from "./Header";
import { useAuth } from "../../context/AuthProvider"; 
import '../../styles/sidebar.css';

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // 1. Get 'logout' from context too
  const { user, logout } = useAuth(); 

  const NAV_ITEMS = [
    /* Super Admin */
    {
      label: "Dashboard",
      path: "/superadmin/dashboard",
      icon: "dashboard",
      allowedRoles: ["superadmin"]
    },
    {
      label: "Manage Classes",
      path: "/superadmin/manage-class",
      icon: "school",
      allowedRoles: ["superadmin"]
    },
        {
      label: "Analytics",
      path: "/superadmin/analytics",
      icon: "analytics",
      allowedRoles: ["superadmin"]
    },
        {
      label: "Accounts",
      path: "/superadmin/accounts",
      icon: "manage_accounts",
      allowedRoles: ["superadmin"]
    },
    /* Admin (Teacher) */
    {
      label: "Dashboard",
      path: "/admin/dashboard",
      icon: "dashboard",
      allowedRoles: ["admin"]
    },
    {
      label: "Attendance",
      path: "/admin/attendance",
      icon: "punch_clock",
      allowedRoles: ["admin"]
    },
    /* User (Parent/Guardian) */
        {
      label: "Dashboard",
      path: "/dashboard",
      icon: "dashboard",
      allowedRoles: ["user"]
    },
    /* All Access */
    {
      label: "Profile",
      path: "/profile",
      icon: "person",
      allowedRoles: ["superadmin", "admin", "user"] 
    },
  ];

  console.log("1. Raw User Object:", user);
  const currentRole = user ? user.role : 'guest';
  console.log("2. Detected Role:", currentRole);

  const visibleNavItems = NAV_ITEMS.filter(item => 
    item.allowedRoles.includes(currentRole)
  );

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

  return (
    <>
      <Header onToggle={toggleMenu} />

      <div 
        className={`nav-overlay ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(false)}
      >
      </div>

      <aside className={`sidebar ${isOpen ? 'expanded active' : ''}`} id="sideNavBar">

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
          <button onClick={() => { logout(); navigate('/login'); }} className="nav-item logout-btn">
            <span className="material-symbols-outlined">logout</span>
            <span>Sign Out</span>
          </button>
        </div>

      </aside>
    </>
  );
}