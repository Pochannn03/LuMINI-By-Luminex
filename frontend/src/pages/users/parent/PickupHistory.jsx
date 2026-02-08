// frontend/src/pages/users/parent/PickupHistory.jsx

import React, { useState } from "react";
import "../../../styles/user/parent/pickup-history.css";
import NavBar from "../../../components/navigation/NavBar";
import Header from "../../../components/navigation/Header";

export default function PickupHistory() {
  // --- HARDCODED DUMMY DATA ---
  const [history] = useState([
    {
      id: "TRX-8821",
      date: "Oct 24, 2025",
      time: "3:45 PM",
      child_name: "Deonilo Caballes",
      child_img: null, // use placeholder
      type: "pickup",
      approver: "Teacher Denver",
      comment: "Picked up by Guardian (Grandma)",
      status: "Completed",
    },
    {
      id: "TRX-8820",
      date: "Oct 24, 2025",
      time: "7:15 AM",
      child_name: "Deonilo Caballes",
      child_img: null,
      type: "dropoff",
      approver: "Guard Entrance",
      comment: "Safe arrival",
      status: "Completed",
    },
    {
      id: "TRX-8815",
      date: "Oct 23, 2025",
      time: "4:00 PM",
      child_name: "Carlanee Camoro",
      child_img: null,
      type: "pickup",
      approver: "Teacher Mark",
      comment: "Authorized pickup",
      status: "Completed",
    },
  ]);

  return (
    <div className="dashboard-wrapper">
      <Header />
      <NavBar />

      <main className="main-content">
        <div className="history-container">
          {/* 1. HEADER BANNER */}
          <div className="header-banner">
            <div className="header-title">
              <h1>Pickup History</h1>
              <p>View past pickup and drop-off records.</p>
            </div>
            {/* Decoration Icon */}
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "48px", opacity: 0.8 }}
            >
              history
            </span>
          </div>

          {/* 2. FILTER BAR */}
          <div className="filter-bar">
            <div className="filter-group">
              <select className="custom-select">
                <option>October 2025</option>
                <option>September 2025</option>
              </select>

              <select className="custom-select">
                <option>All Children</option>
                <option>Deonilo Caballes</option>
                <option>Carlanee Camoro</option>
              </select>
            </div>

            <button
              className="btn btn-outline"
              style={{
                border: "1px solid #cbd5e1",
                padding: "8px 16px",
                borderRadius: "12px",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px" }}
              >
                download
              </span>
              Export
            </button>
          </div>

          {/* 3. TABLE CARD */}
          <div className="table-card">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Date & Time</th>
                  <th>Student</th>
                  <th>Type</th>
                  <th>Approved By</th>
                  <th>Comments</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id}>
                    {/* TRX ID */}
                    <td>
                      <span className="trx-id">{row.id}</span>
                    </td>

                    {/* Date Stack */}
                    <td>
                      <div className="date-stack">
                        <span>{row.date}</span>
                        <span className="time-sub">{row.time}</span>
                      </div>
                    </td>

                    {/* Child */}
                    <td>
                      <div className="child-cell">
                        <img
                          src="https://via.placeholder.com/150"
                          className="child-mini-avatar"
                          alt="child"
                        />
                        <span>{row.child_name}</span>
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td>
                      <span
                        className={`type-badge ${row.type === "pickup" ? "type-pickup" : "type-dropoff"}`}
                      >
                        {row.type === "pickup" ? "Pickup" : "Drop-off"}
                      </span>
                    </td>

                    {/* Approver */}
                    <td>{row.approver}</td>

                    {/* Comment */}
                    <td>
                      <div className="comment-text" title={row.comment}>
                        {row.comment}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
