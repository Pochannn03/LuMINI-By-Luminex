import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../styles/teacher/teacher-profile.css";
import NavBar from "../../components/navigation/NavBar";
import Header from "../../components/navigation/Header";
import SuccessModal from "../../components/SuccessModal";

export default function TeacherProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [stats, setStats] = useState({
    totalStudents: 0,
    totalSections: 0,
  });

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    address: "",
    role: "",
    user_id: "",
    profile_picture: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get("http://localhost:3000/api/user/profile", {
          withCredentials: true,
        });
        setFormData(response.data);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile. Please log in again.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3000/api/students/teacher/totalStudents",
          { withCredentials: true }
        );
        
        if (response.data.success) {
          setStats({
            totalStudents: response.data.totalStudents || 0,
            totalSections: response.data.totalSections || 0,
          });
        }
      } catch (err) {
        console.error("Error fetching teacher stats:", err);
      }
    };

    fetchStats(); // <--- 1. CALL THE FUNCTION
  }, []);

  const handleSave = async () => {
    try {
      await axios.put(
        "http://localhost:3000/api/user/profile",
        {
          phone_number: formData.phone_number,
          address: formData.address,
          email: formData.email,
        },
        { withCredentials: true },
      );

      // 3. Instead of alert(), show the modal!
      setShowSuccessModal(true);

      setIsEditing(false);
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save changes."); // We can keep alert for errors or make an ErrorModal later
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    window.location.reload();
  };

  const getImageUrl = (path) => {
    if (!path) return "https://via.placeholder.com/150";
    if (path.startsWith("http")) return path;
    return "http://localhost:3000/${path}";
  };

  if (loading)
    return (
      <div className="profile-container" style={{ marginTop: "100px" }}>
        Loading Profile...
      </div>
    );
  if (error)
    return (
      <div
        className="profile-container"
        style={{ marginTop: "100px", color: "red" }}
      >
        {error}
      </div>
    );

  return (
    <div className="dashboard-wrapper">
      <Header />
      <NavBar />

      {/* 4. Render the Modal Component Here */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message="Profile information updated successfully!"
      />

      <main className="main-content">
        <div className="profile-container">
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
                  {formData.role?.toUpperCase()} • ID: {formData.user_id}
                </p>
              </div>

              <div className="profile-actions">
                {!isEditing ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => setIsEditing(true)}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px" }}
                    >
                      edit
                    </span>
                    Edit Information
                  </button>
                ) : (
                  <div className="action-buttons-wrapper">
                    {/* 5. Rename "Save Changes" to "Save" */}
                    <button className="btn btn-save" onClick={handleSave}>
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "18px" }}
                      >
                        check
                      </span>
                      Save
                    </button>

                    <button className="btn btn-cancel" onClick={handleCancel}>
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "18px" }}
                      >
                        close
                      </span>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="profile-grid">
            <div className="card form-card">
              <div className="card-header">
                <h3>
                  <span className="material-symbols-outlined header-icon">
                    badge
                  </span>{" "}
                  Personal Information
                </h3>
                <p>Update your contact details.</p>
              </div>

              <form
                className="profile-form"
                onSubmit={(e) => e.preventDefault()}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px",
                  }}
                >
                  <div className="form-group">
                    <label>First Name</label>
                    <div className="input-wrapper">
                      <span className="material-symbols-outlined icon">
                        person
                      </span>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        readOnly
                        style={{
                          opacity: 0.7,
                          cursor: "not-allowed",
                          backgroundColor: "#f1f5f9",
                        }}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <div className="input-wrapper">
                      <span className="material-symbols-outlined icon">
                        person
                      </span>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        readOnly
                        style={{
                          opacity: 0.7,
                          cursor: "not-allowed",
                          backgroundColor: "#f1f5f9",
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <div className="input-wrapper">
                    <span className="material-symbols-outlined icon">mail</span>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
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
                  <label>Phone Number</label>
                  <div className="input-wrapper">
                    <span className="material-symbols-outlined icon">call</span>
                    <input
                      type="text"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleChange}
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
                      name="address"
                      value={formData.address || ""}
                      onChange={handleChange}
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

            <div className="right-stack">
              <div className="card form-card">
                <div className="card-header">
                  <h3>
                    <span className="material-symbols-outlined header-icon">
                      analytics
                    </span>{" "}
                    My Classroom
                  </h3>
                  <p>Quick overview of your active classes.</p>
                </div>
                <div className="stats-grid">
                  <div className="mini-stat-box">
                    <div className="stat-icon-bg blue">
                      <span className="material-symbols-outlined">groups</span>
                    </div>
                    <div className="stat-text">
                      <span className="stat-value">{stats.totalStudents}</span>
                      <span className="stat-label">Total Students</span>
                    </div>
                  </div>
                  <div className="mini-stat-box">
                    <div className="stat-icon-bg orange">
                      <span className="material-symbols-outlined">school</span>
                    </div>
                    <div className="stat-text">
                      <span className="stat-value">{stats.totalSections}</span>
                      <span className="stat-label">Sections</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
