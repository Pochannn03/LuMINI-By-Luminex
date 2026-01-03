import React from "react";

export default function SideNavBar() {
  return (
    // <div className="dashboard-wrapper">

    <aside className="sidebar">

      <div className="border-bottom flex shrink-0 items-center justify-center h-20 ">
        <img src="../../assets/lumini-logo.png" alt="Lumini" className="sidebar-logo"></img>
      </div>

      <nav className="sidebar-menu">
        <Link to="#">
          <span className="material-symbols-outlined">dashboard</span>
          <span>Dashboard</span>
        </Link>
      </nav>
    </aside>

    // </div>
  );
}