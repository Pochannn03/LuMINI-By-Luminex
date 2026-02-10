// frontend/src/pages/users/parent/ManageGuardians.jsx

import { useEffect, useState } from "react";
import axios from "axios";
import "../../../styles/user/parent/manage-guardian.css";
import NavBar from "../../../components/navigation/NavBar";
import AddGuardianModal from "../../../components/modals/user/parent/manage-guardian/AddGuardianModal";

const BACKEND_URL = "http://localhost:3000";

export default function ManageGuardians() {
  const [guardians, setGuardians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Helper for Images
  const getImageUrl = (path) => {
    if (!path) return "https://via.placeholder.com/150";
    if (path.startsWith("http")) return path;
    return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
  };

  useEffect(() => {
    const fetchGuardians = async () => {
      try {
        const response = await axios.get(
          `${BACKEND_URL}/api/parent/guardians`,
          {
            withCredentials: true,
          },
        );
        setGuardians(response.data);
      } catch (err) {
        console.error("Error fetching guardians:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGuardians();
  }, []);

  return (
    <div className="dashboard-wrapper">
      <NavBar />

      {/* 3. RENDER MODAL */}
      <AddGuardianModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <main className="main-content">
        <div className="guardians-container">
          {/* 1. BLUE HEADER BANNER */}
          <div className="header-banner">
            <div className="header-title">
              <h1>Manage Guardians</h1>
              <p>Authorize others to pick up your children.</p>
            </div>
            <button
              className="btn-add-circle"
              title="Add Guardian"
              onClick={() => setIsAddModalOpen(true)}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "24px", fontWeight: "bold" }}
              >
                add
              </span>
            </button>
          </div>

          {/* 2. FILTER BAR */}
          <div className="filter-bar">
            <div className="search-wrapper">
              <span className="material-symbols-outlined">search</span>
              <input type="text" placeholder="Search by name..." />
            </div>

            <button className="filter-btn">
              Status: Active
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px" }}
              >
                expand_more
              </span>
            </button>
          </div>

          {/* 3. TABLE CARD */}
          <div className="table-card">
            {loading ? (
              <div
                style={{
                  padding: "60px",
                  textAlign: "center",
                  color: "#64748b",
                }}
              >
                Loading guardians...
              </div>
            ) : guardians.length === 0 ? (
              // --- FIXED EMPTY STATE ---
              <div className="empty-state">
                <span className="material-symbols-outlined empty-icon">
                  diversity_3
                </span>
                <h3 className="empty-text">No Guardians Found</h3>
                <p className="empty-subtext">
                  You haven't authorized anyone yet. Click the{" "}
                  <strong>+</strong> button above to add a guardian.
                </p>
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Email / Phone</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {guardians.map((guardian) => (
                    <tr key={guardian._id}>
                      {/* User Cell */}
                      <td>
                        <div className="user-info-cell">
                          <img
                            src={getImageUrl(guardian.profile_picture)}
                            className="table-avatar-circle"
                            alt="Avatar"
                          />
                          <div className="user-text">
                            <span className="user-name">
                              {guardian.first_name} {guardian.last_name}
                            </span>
                            <span className="user-id">
                              ID: {guardian.user_id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td>
                        <span className="role-badge">
                          {guardian.relationship || "Guardian"}
                        </span>
                      </td>

                      {/* Contact */}
                      <td>
                        <div style={{ fontSize: "13px", color: "#64748b" }}>
                          <div>{guardian.email}</div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#94a3b8",
                              marginTop: "4px",
                            }}
                          >
                            {guardian.phone_number || "No Phone"}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <div className="status-indicator status-active">
                          <span className="status-dot"></span>
                          Active
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="icon-btn"
                          style={{ color: "#94a3b8", cursor: "pointer" }}
                        >
                          <span className="material-symbols-outlined">
                            more_horiz
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
