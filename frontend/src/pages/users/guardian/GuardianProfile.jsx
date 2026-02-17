// frontend/src/pages/users/guardian/GuardianProfile.jsx

import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../../styles/user/parent/parent-profile.css"; // Reusing parent styles!
import NavBar from "../../../components/navigation/NavBar";
import SuccessModal from "../../../components/SuccessModal";
const BACKEND_URL = "http://localhost:3000";

export default function GuardianProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // States
  const [formData, setFormData] = useState({});
  const [children, setChildren] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Student Modal State
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Get Guardian Profile (Reuses standard user profile route)
        const profileRes = await axios.get(`${BACKEND_URL}/api/user/profile`, {
          withCredentials: true,
        });
        setFormData(profileRes.data);

        // 2. Get Linked Children (GUARDIAN ROUTE)
        const childrenRes = await axios.get(
          `${BACKEND_URL}/api/guardian/children`,
          { withCredentials: true },
        );
        setChildren(childrenRes.data);
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    try {
      await axios.put(
        `${BACKEND_URL}/api/user/profile`,
        {
          phone_number: formData.phone_number,
          address: formData.address,
          email: formData.email,
        },
        { withCredentials: true },
      );
      setShowSuccessModal(true);
      setIsEditing(false);
    } catch (err) {
      alert("Failed to save.");
    }
  };

  // Helper to format image URLs correctly
  const getImageUrl = (path) => {
    if (!path) return "https://via.placeholder.com/150";
    if (path.startsWith("http")) return path;
    const cleanPath = path.replace(/\\/g, "/");
    return `${BACKEND_URL}/${cleanPath}`;
  };

  if (loading)
    return (
      <div className="profile-container" style={{ marginTop: "100px" }}>
        Loading...
      </div>
    );

  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">
      <NavBar />
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message="Profile updated successfully!"
      />

      <main className="main-content">
        <div className="profile-container">
          {/* HEADER */}
          <div className="profile-header-card">
            <div className="profile-cover"></div>
            <div className="profile-details-row">
              <div className="avatar-upload-wrapper">
                <img
                  src={getImageUrl(formData.profile_picture)}
                  className="large-avatar"
                  alt="Profile"
                />
              </div>
              <div className="profile-text">
                <h1>
                  {formData.first_name} {formData.last_name}
                </h1>
                <p>
                  {formData.relationship || "Guardian"} • ID: {formData.user_id}
                </p>
              </div>
              
              {/* Guardian CAN edit their own personal contact info */}
              <div className="profile-actions">
                {!isEditing ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => setIsEditing(true)}
                  >
                    <span className="material-symbols-outlined">edit</span> Edit
                    Information
                  </button>
                ) : (
                  <div className="action-buttons-wrapper">
                    <button className="btn btn-save" onClick={handleSave}>
                      <span className="material-symbols-outlined">check</span>{" "}
                      Save
                    </button>
                    <button
                      className="btn btn-cancel"
                      onClick={() => setIsEditing(false)}
                    >
                      <span className="material-symbols-outlined">close</span>{" "}
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="profile-grid">
            {/* LEFT: PERSONAL INFO */}
            <div className="card form-card">
              <div className="card-header">
                <h3>
                  <span className="material-symbols-outlined header-icon">
                    badge
                  </span>{" "}
                  Personal Information
                </h3>
              </div>
              <form className="profile-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <div className="input-wrapper">
                    <span className="material-symbols-outlined icon">
                      person
                    </span>
                    <input
                      type="text"
                      value={`${formData.first_name} ${formData.last_name}`}
                      readOnly
                      style={{ opacity: 0.7 }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <div className="input-wrapper">
                    <span className="material-symbols-outlined icon">mail</span>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      readOnly={!isEditing}
                      style={
                        !isEditing
                          ? { opacity: 0.8 }
                          : { borderColor: "#39a8ed" }
                      }
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <div className="input-wrapper">
                    <span className="material-symbols-outlined icon">call</span>
                    <input
                      type="text"
                      value={formData.phone_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          phone_number: e.target.value,
                        })
                      }
                      readOnly={!isEditing}
                      style={
                        !isEditing
                          ? { opacity: 0.8 }
                          : { borderColor: "#39a8ed" }
                      }
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <div className="input-wrapper">
                    <span className="material-symbols-outlined icon">home</span>
                    <input
                      type="text"
                      value={formData.address || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      readOnly={!isEditing}
                      style={
                        !isEditing
                          ? { opacity: 0.8 }
                          : { borderColor: "#39a8ed" }
                      }
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* RIGHT: CHILDREN LIST */}
            <div className="right-stack">
              <div className="card form-card">
                <div className="card-header">
                  <h3>
                    <span className="material-symbols-outlined header-icon">
                      face
                    </span>{" "}
                    Assigned Students
                  </h3>
                  <p>Students you are authorized to pick up.</p>
                </div>
                <div className="children-list">
                  {children.length === 0 ? (
                    <p style={{ padding: "10px", color: "#94a3b8" }}>
                      No students linked yet.
                    </p>
                  ) : (
                    children.map((child) => (
                      <div
                        key={child.student_id}
                        className="child-item"
                        onClick={() => setSelectedStudent(child)}
                      >
                        <img
                          src={getImageUrl(child.profile_picture)}
                          className="child-avatar"
                          alt="Child"
                        />
                        <div className="child-info">
                          <span className="child-name">
                            {child.first_name} {child.last_name}
                          </span>
                          <span className="child-grade">
                            {child.section_details?.section_name ||
                              "No Section"}
                          </span>
                        </div>
                        <span
                          className="material-symbols-outlined"
                          style={{ color: "#94a3b8" }}
                        >
                          chevron_right
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* STUDENT DETAILS MODAL (READ-ONLY FOR GUARDIANS) */}
      {selectedStudent && (
        <div
          className="modal-overlay active"
          onClick={() => setSelectedStudent(null)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <h3>View Student Details</h3> {/* Changed title */}
              <button
                className="close-modal-btn"
                onClick={() => setSelectedStudent(null)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {/* 1. Centered Avatar */}
              <div className="avatar-edit-center">
                <div className="avatar-upload-wrapper">
                  <img
                    src={getImageUrl(selectedStudent.profile_picture)}
                    className="modal-avatar"
                    alt="Student"
                  />
                  {/* Removed the Camera button entirely so Guardians can't change it */}
                </div>
              </div>

              {/* 2. Basic Info (Read Only) */}
              <div className="form-group">
                <label>Full Name</label>
                <div className="input-wrapper">
                  <span className="material-symbols-outlined icon">person</span>
                  <input
                    type="text"
                    value={`${selectedStudent.first_name} ${selectedStudent.last_name}`}
                    disabled
                    className="read-only"
                  />
                </div>
              </div>

              <div className="modal-row-2">
                <div className="form-group">
                  <label>Birthday</label>
                  <div className="input-wrapper">
                    <span className="material-symbols-outlined icon">cake</span>
                    <input
                      type="text"
                      value={new Date(
                        selectedStudent.birthday,
                      ).toLocaleDateString()}
                      disabled
                      className="read-only"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Student ID</label>
                  <div className="input-wrapper">
                    <span className="material-symbols-outlined icon">
                      badge
                    </span>
                    <input
                      type="text"
                      value={selectedStudent.student_id}
                      disabled
                      className="read-only"
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Grade / Class</label>
                <div className="input-wrapper">
                  <span className="material-symbols-outlined icon">school</span>
                  <input
                    type="text"
                    value={
                      selectedStudent.section_details?.section_name ||
                      "Not Assigned"
                    }
                    disabled
                    className="read-only"
                  />
                </div>
              </div>

              <div className="modal-separator"></div>

              {/* 3. Class Teacher Info (Read Only) */}
              <div className="modal-section-title">
                <span
                  className="material-symbols-outlined"
                  style={{ color: "var(--primary-blue)" }}
                >
                  school
                </span>
                Class Teacher
              </div>

              <div className="form-group">
                <label>Adviser Name</label>
                <div className="input-wrapper">
                  <span className="material-symbols-outlined icon">person</span>
                  <input
                    type="text"
                    value={
                      selectedStudent.section_details?.user_details
                        ? `${selectedStudent.section_details.user_details.first_name} ${selectedStudent.section_details.user_details.last_name}`
                        : "N/A"
                    }
                    disabled
                    className="read-only"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email</label>
                <div className="input-wrapper">
                  <span className="material-symbols-outlined icon">mail</span>
                  <input
                    type="text"
                    value={
                      selectedStudent.section_details?.user_details?.email ||
                      "N/A"
                    }
                    disabled
                    className="read-only"
                  />
                </div>
              </div>

              <div className="modal-separator"></div>

              {/* 4. Medical / Additional Info (MADE READ-ONLY FOR GUARDIANS) */}
              <div className="modal-section-title">
                <span
                  className="material-symbols-outlined"
                  style={{ color: "#e74c3c" }}
                >
                  medical_services
                </span>
                Additional Information
              </div>

              <div className="form-group">
                <label>Allergies</label>
                <textarea
                  className="modal-textarea read-only"
                  disabled
                  value={selectedStudent.allergies || "None reported"} 
                ></textarea>
              </div>

              <div className="form-group">
                <label>Medical History</label>
                <textarea
                  className="modal-textarea read-only"
                  disabled
                  value={selectedStudent.medical_history || "None reported"} 
                ></textarea>
              </div>
            </div>

            {/* Modal Footer (REMOVED SAVE BUTTON) */}
            <div className="modal-footer" style={{ justifyContent: "center" }}>
              <button
                className="btn btn-cancel"
                onClick={() => setSelectedStudent(null)}
                style={{ width: "100%" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}