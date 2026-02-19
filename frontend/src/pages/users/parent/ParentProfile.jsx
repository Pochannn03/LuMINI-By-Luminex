// frontend/src/pages/users/parent/ParentProfile.jsx

import { useEffect, useState, useRef } from "react";
import AvatarEditor from "react-avatar-editor";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../../styles/user/parent/parent-profile.css";
import NavBar from "../../../components/navigation/NavBar";
import SuccessModal from "../../../components/SuccessModal";
// --- NEW: Import the Auth Context ---
import { useAuth } from "../../../context/AuthProvider"; 

const BACKEND_URL = "http://localhost:3000";

export default function ParentProfile() {
  const navigate = useNavigate();
  // --- NEW: Grab the global update function ---
  const { updateUser } = useAuth(); 

  const [loading, setLoading] = useState(true);

  // States
  const [formData, setFormData] = useState({});
  const [children, setChildren] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // --- NEW: Profile Picture & Cropper States ---
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  // Cropper specific states
  const editorRef = useRef(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  // Student Modal State
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Get Parent Profile
        const profileRes = await axios.get(`${BACKEND_URL}/api/user/profile`, {
          withCredentials: true,
        });
        setFormData(profileRes.data);

        // 2. Get Linked Children
        const childrenRes = await axios.get(
          `${BACKEND_URL}/api/parent/children`,
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

  // --- NEW: Image Handlers ---
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file); 
      setTempImage(imageUrl);
      setShowCropModal(true); 
      setZoom(1); 
    }
    e.target.value = null; 
  };

  const handleCropSave = () => {
    if (editorRef.current) {
      const canvas = editorRef.current.getImageScaledToCanvas();
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], "profile_photo.jpg", { type: "image/jpeg" });
          setSelectedImageFile(croppedFile);
          setPreviewImage(URL.createObjectURL(croppedFile));
          setShowCropModal(false);
          setTempImage(null);
        }
      }, "image/jpeg", 0.95);
    }
  };

  const handleAvatarClick = () => {
    if (!isEditing) {
      setIsLightboxOpen(true);
    }
  };

  // --- UPDATED: Save Handler to support FormData (Images) ---
  const handleSave = async () => {
    try {
      let payload;
      let axiosConfig = { withCredentials: true };

      if (selectedImageFile) {
        payload = new FormData();
        payload.append("phone_number", formData.phone_number);
        payload.append("address", formData.address);
        payload.append("email", formData.email);
        payload.append("profile_picture", selectedImageFile); 
      } else {
        payload = {
          phone_number: formData.phone_number,
          address: formData.address,
          email: formData.email,
        };
      }

      const response = await axios.put(
        `${BACKEND_URL}/api/user/profile`,
        payload,
        axiosConfig
      );

      // --- THE MAGIC FIX: Instantly update the Header without refreshing! ---
      if (response.data.user?.profile_picture) {
        updateUser({ profile_picture: response.data.user.profile_picture });
      }
      
      // Update form data with the new picture path from backend if it exists
      setFormData((prev) => ({ 
        ...prev, 
        profile_picture: response.data?.user?.profile_picture || prev.profile_picture 
      }));

      setShowSuccessModal(true);
      setIsEditing(false);
      setSelectedImageFile(null);
      setPreviewImage(null);
    } catch (err) {
      console.error("Save error:", err);
      alert(err.response?.data?.message || "Failed to save changes.");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedImageFile(null);
    setPreviewImage(null); // Revert image to original
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
    <div className="dashboard-wrapper hero-bg">
      <NavBar />
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message="Profile updated successfully!"
      />

      {/* --- NEW: FULLSCREEN LIGHTBOX --- */}
      {isLightboxOpen && (
        <div 
          style={{
            position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(4px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', cursor: 'zoom-out'
          }}
          onClick={() => setIsLightboxOpen(false)}
        >
          <img 
            src={previewImage || getImageUrl(formData.profile_picture)} 
            alt="Fullscreen Profile" 
            style={{ width: '400px', height: '400px', objectFit: 'cover', borderRadius: '50%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '6px solid white' }} 
          />
          <button 
            style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setIsLightboxOpen(false)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* --- NEW: CROPPER MODAL --- */}
      {showCropModal && (
        <div className="modal-overlay active" style={{ zIndex: 999999 }}>
          <div className="modal-card" style={{ padding: '24px', alignItems: 'center', maxWidth: '350px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', color: '#1e293b', fontWeight: 'bold' }}>
              Adjust Profile Picture
            </h3>
            
            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '12px' }}>
              <AvatarEditor
                ref={editorRef}
                image={tempImage}
                width={220}
                height={220}
                border={20}
                borderRadius={110}
                color={[15, 23, 42, 0.6]}
                scale={zoom}
                rotate={0}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px', margin: '20px 0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748b' }}>zoom_out</span>
              <input 
                type="range" 
                min="1" max="3" step="0.01" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: '#39a8ed', cursor: 'pointer' }}
              />
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748b' }}>zoom_in</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button 
                type="button"
                className="btn btn-cancel" 
                style={{ flex: 1, height: '44px', borderRadius: '10px', cursor: 'pointer' }} 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowCropModal(false);
                  setTempImage(null);
                  if (document.getElementById('profile-upload')) {
                    document.getElementById('profile-upload').value = '';
                  }
                }}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="btn btn-save" 
                style={{ flex: 1, height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCropSave();
                }}
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="main-content">
        <div className="profile-container">
          {/* HEADER */}
          <div className="profile-header-card">
            <div className="profile-cover"></div>
            <div className="profile-details-row">
              
              {/* --- UPDATED: AVATAR WITH CAMERA OVERLAY --- */}
              <div className="avatar-upload-wrapper">
                <img
                  src={previewImage || getImageUrl(formData.profile_picture)}
                  className="large-avatar"
                  alt="Profile"
                  onClick={handleAvatarClick}
                  style={{ cursor: isEditing ? 'default' : 'zoom-in', transition: 'transform 0.2s' }}
                  onMouseOver={(e) => { if(!isEditing) e.currentTarget.style.transform = 'scale(1.02)' }}
                  onMouseOut={(e) => { if(!isEditing) e.currentTarget.style.transform = 'scale(1)' }}
                />
                
                {/* Show Camera Button ONLY when Edit is clicked */}
                {isEditing && (
                  <>
                    <label htmlFor="profile-upload" className="camera-btn" style={{ position: 'absolute', bottom: '5px', right: '5px', cursor: 'pointer', background: '#1e293b', color: 'white', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.15)', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>photo_camera</span>
                    </label>
                    <input
                      id="profile-upload"
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleImageSelect}
                    />
                  </>
                )}
              </div>

              <div className="profile-text">
                <h1>
                  {formData.first_name} {formData.last_name}
                </h1>
                <p>
                  {formData.relationship || "Parent"} • ID: {formData.user_id}
                </p>
              </div>
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
                      onClick={handleCancel}
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div className="form-group">
                    <label>First Name</label>
                    <div className="input-wrapper">
                      <span className="material-symbols-outlined icon">person</span>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name || ""}
                        readOnly
                        style={{ opacity: 0.7, cursor: "not-allowed", backgroundColor: "#f1f5f9" }}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <div className="input-wrapper">
                      <span className="material-symbols-outlined icon">person</span>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name || ""}
                        readOnly
                        style={{ opacity: 0.7, cursor: "not-allowed", backgroundColor: "#f1f5f9" }}
                      />
                    </div>
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
                    Linked Students
                  </h3>
                  <p>Children linked to this account.</p>
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

      {/* STUDENT DETAILS MODAL */}
      {selectedStudent && (
        <div
          className="modal-overlay active"
          onClick={() => setSelectedStudent(null)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <h3>Edit Student Details</h3>
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
                  {/* Camera button can be wired up later for uploading child photos */}
                  <button className="camera-btn modal-cam-btn">
                    <span className="material-symbols-outlined">
                      photo_camera
                    </span>
                  </button>
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

              {/* 3. Class Teacher Info */}
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

              {/* Optional: Show Teacher Contact if available */}
              <div className="modal-row-2">
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
              </div>

              <div className="modal-separator"></div>

              {/* 4. Medical / Additional Info (Editable) */}
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
                  className="modal-textarea"
                  placeholder="e.g. Peanuts, Shellfish..."
                  defaultValue={selectedStudent.description || ""} // Using description as placeholder for now
                ></textarea>
              </div>

              <div className="form-group">
                <label>Medical History</label>
                <textarea
                  className="modal-textarea"
                  placeholder="e.g. Asthma..."
                ></textarea>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button
                className="btn btn-cancel"
                onClick={() => setSelectedStudent(null)}
              >
                Cancel
              </button>
              {/* Green Save Button */}
              <button
                className="btn btn-save"
                onClick={() => alert("Save functionality coming soon!")}
              >
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}