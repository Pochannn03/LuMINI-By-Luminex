import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import logo from '../../assets/lumini-logo.png'
import Header from "./Header";
import '../../styles/sidebar.css';

export default function NavBar() {

  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
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
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 lg:pt-20">
      
    <Header onToggle={toggleMenu} />

    <div 
        className={`nav-overlay ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(false)}
      >
    </div>

    <aside className={`sidebar ${isOpen ? 'expanded active' : ''}`}
        id="sideNavBar"
    >

      <div className="border-bottom flex shrink-0 items-center justify-center h-20 ">
        <img src={logo} alt="Lumini" className="sidebar-logo"></img>
      </div>

      <nav className="sidebar-menu">

        <Link to="#" className="nav-item active">
          <span className="material-symbols-outlined">dashboard</span>
          <span>Dashboard</span>
        </Link>

        <Link to="#" className="nav-item">
          <span className="material-symbols-outlined">school</span>
          <span>Manage Classes</span>
        </Link>

        <Link to="#" className="nav-item">
          <span className="material-symbols-outlined">analytics</span>
          <span>Analytics</span>
        </Link>

        <Link to="#" className="nav-item">
          <span className="material-symbols-outlined">manage_accounts</span>
          <span>Accounts</span>
        </Link>

        <Link to="#" className="nav-item">
          <span className="material-symbols-outlined">person</span>
          <span>Profile</span>
        </Link>

      </nav>

      <div className="sidebar-footer">
        <Link to="#" className="nav-item logout-btn">
          <span className="material-symbols-outlined">logout</span>
          <span>Sign Out</span>
        </Link>
      </div>

    </aside>

    </div>
  );
}