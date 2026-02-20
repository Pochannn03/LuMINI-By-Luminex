// frontend/src/pages/users/parent/ParentProfile.jsx

import { useEffect, useState, useRef } from "react";
import AvatarEditor from "react-avatar-editor";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../../styles/user/parent/parent-profile.css";
import NavBar from "../../../components/navigation/NavBar";
import SuccessModal from "../../../components/SuccessModal";
import { useAuth } from "../../../context/AuthProvider";

const BACKEND_URL = "http://localhost:3000";

export default function ParentProfile() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const [loading, setLoading] = useState(true);

  // States
  const [formData, setFormData] = useState({});
  const [children, setChildren] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // --- Address Splicing States ---
  const [addressParts, setAddressParts] = useState({
    houseUnit: "",
    street: "",
    barangay: "",
    city: "",
    zipCode: "",
  });

  // --- ACCOUNT CREDENTIALS STATES ---
  const [passwordData, setPasswordData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // --- PARENT Cropper States ---
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  const editorRef = useRef(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  // --- STUDENT Cropper States ---
  const studentEditorRef = useRef(null);
  const [showStudentCropModal, setShowStudentCropModal] = useState(false);
  const [tempStudentImage, setTempStudentImage] = useState(null);
  const [studentZoom, setStudentZoom] = useState(1);
  const [selectedStudentImageFile, setSelectedStudentImageFile] = useState(null);

  // --- STUDENT Modal & Medical States ---
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentMedicalData, setStudentMedicalData] = useState({
    allergies: "",
    medical_history: ""
  });

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await axios.get(`${BACKEND_URL}/api/user/profile`, {
          withCredentials: true,
        });
        setFormData(profileRes.data);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Address Handlers
  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddressParts((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditClick = (e) => {
    e.preventDefault();
    const parts = (formData.address || "").split(",").map((s) => s.trim());
    setAddressParts({
      houseUnit: parts[0] || "",
      street: parts[1] || "",
      barangay: parts[2] || "",
      city: parts[3] || "",
      zipCode: parts[4] || "",
    });
    setIsEditing(true);
  };

  // --- Password Handlers ---
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditCredentialsClick = (e) => {
    e.preventDefault();
    setIsEditingCredentials(true);
  };

  const handleCancelCredentials = (e) => {
    e.preventDefault();
    setIsEditingCredentials(false);
    setPasswordData({ password: "", confirmPassword: "" });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSaveCredentials = (e) => {
    e.preventDefault();
    if (passwordData.password !== passwordData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    alert("Password logic ready to be wired to backend!");
    setIsEditingCredentials(false);
    setPasswordData({ password: "", confirmPassword: "" });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // --- PARENT Image Handlers ---
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

  // --- STUDENT Image Handlers ---
  const handleStudentImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setTempStudentImage(imageUrl);
      setShowStudentCropModal(true);
      setStudentZoom(1);
    }
    e.target.value = null;
  };

  const handleStudentCropSave = async () => {
    if (studentEditorRef.current && selectedStudent) {
      const canvas = studentEditorRef.current.getImageScaledToCanvas();
      canvas.toBlob(async (blob) => {
        if (blob) {
          const croppedFile = new File([blob], "student_profile.jpg", { type: "image/jpeg" });
          
          const payload = new FormData();
          payload.append("profile_picture", croppedFile);

          try {
            const response = await axios.put(
              `${BACKEND_URL}/api/student/${selectedStudent._id}/profile-picture`,
              payload,
              { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
            );

            // --- THE FIX: Merge updated fields so we don't lose the populated section_details! ---
            const updatedStudent = { ...selectedStudent, ...response.data.student };
            
            setSelectedStudent(updatedStudent); // Update the modal
            setChildren((prevChildren) =>
              prevChildren.map((child) =>
                child._id === updatedStudent._id ? updatedStudent : child
              )
            );

            setShowStudentCropModal(false);
            setTempStudentImage(null);
            setSuccessMessage("Student profile picture updated!");
            setShowSuccessModal(true);

          } catch (error) {
            console.error("Error updating student profile picture:", error);
            alert("Failed to update student profile picture.");
          }
        }
      }, "image/jpeg", 0.95);
    }
  };

  // --- STUDENT Medical Data Save Handler ---
  const handleSaveStudentDetails = async () => {
    try {
      const response = await axios.put(
        `${BACKEND_URL}/api/student/${selectedStudent._id}/medical`,
        studentMedicalData,
        { withCredentials: true }
      );

      // --- THE FIX: Merge updated fields so we don't lose the populated section_details! ---
      const updatedChild = { ...selectedStudent, ...response.data.student };
      
      setChildren((prev) => 
        prev.map(c => c._id === updatedChild._id ? updatedChild : c)
      );
      
      setSelectedStudent(null);
      setSuccessMessage("Student medical details saved!");
      setShowSuccessModal(true);

    } catch (err) {
      console.error("Failed to save student details:", err);
      alert("Failed to save student details.");
    }
  };

  // Save Handler with Merged Address
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const mergedAddress = [
        addressParts.houseUnit,
        addressParts.street,
        addressParts.barangay,
        addressParts.city,
        addressParts.zipCode,
      ].filter(Boolean).join(", ");

      let payload;
      let axiosConfig = { withCredentials: true };

      if (selectedImageFile) {
        payload = new FormData();
        payload.append("phone_number", formData.phone_number || "");
        payload.append("address", mergedAddress || ""); 
        payload.append("email", formData.email || "");
        payload.append("profile_picture", selectedImageFile); 
      } else {
        payload = {
          phone_number: formData.phone_number || "",
          address: mergedAddress || "", 
          email: formData.email || "",
        };
      }

      const response = await axios.put(
        `${BACKEND_URL}/api/user/profile`,
        payload,
        axiosConfig
      );

      if (response.data.user?.profile_picture) {
        updateUser({ profile_picture: response.data.user.profile_picture });
      }
      
      setFormData((prev) => ({ 
        ...prev, 
        address: mergedAddress, 
        profile_picture: response.data?.user?.profile_picture || prev.profile_picture 
      }));

      setSuccessMessage("Profile updated successfully!");
      setShowSuccessModal(true);
      setIsEditing(false);
      setSelectedImageFile(null);
      setPreviewImage(null);
    } catch (err) {
      console.error("Save error:", err);
      alert(err.response?.data?.message || "Failed to save changes.");
    }
  };

  const handleCancel = (e) => {
    e.preventDefault();
    setIsEditing(false);
    setSelectedImageFile(null);
    setPreviewImage(null); 
  };

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
        message={successMessage}
      />

      {/* --- PARENT Lightbox --- */}
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

      {/* --- PARENT Cropper Modal --- */}
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

      {/* --- STUDENT CROPPER MODAL --- */}
      {showStudentCropModal && (
        <div className="modal-overlay active" style={{ zIndex: 9999999 }}>
          <div className="modal-card" style={{ padding: '24px', alignItems: 'center', maxWidth: '350px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', color: '#1e293b', fontWeight: 'bold' }}>
              Adjust Student Picture
            </h3>
            
            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '12px' }}>
              <AvatarEditor
                ref={studentEditorRef}
                image={tempStudentImage}
                width={220}
                height={220}
                border={20}
                borderRadius={110}
                color={[15, 23, 42, 0.6]}
                scale={studentZoom}
                rotate={0}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px', margin: '20px 0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748b' }}>zoom_out</span>
              <input 
                type="range" 
                min="1" max="3" step="0.01" 
                value={studentZoom} 
                onChange={(e) => setStudentZoom(parseFloat(e.target.value))}
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
                  setShowStudentCropModal(false);
                  setTempStudentImage(null);
                  if (document.getElementById('student-profile-upload')) {
                    document.getElementById('student-profile-upload').value = '';
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
                  handleStudentCropSave();
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
                    type="button"
                    className="btn btn-primary"
                    onClick={handleEditClick}
                  >
                    <span className="material-symbols-outlined">edit</span> Edit
                    Information
                  </button>
                ) : (
                  <div className="action-buttons-wrapper">
                    <button type="button" className="btn btn-save" onClick={handleSave}>
                      <span className="material-symbols-outlined">check</span>{" "}
                      Save
                    </button>
                    <button
                      type="button"
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
                      name="email"
                      value={formData.email || ""}
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
                  <label>Phone</label>
                  <div className="input-wrapper">
                    <span className="material-symbols-outlined icon">call</span>
                    <input
                      type="text"
                      name="phone_number"
                      value={formData.phone_number || ""}
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

                <div className="address-container">
                  {!isEditing ? (
                    <div className="form-group animate-poof">
                      <label>Address</label>
                      <div className="input-wrapper">
                        <span className="material-symbols-outlined icon">home</span>
                        <input
                          type="text"
                          name="address"
                          value={formData.address || "No address provided"}
                          readOnly
                          style={{ opacity: 0.8 }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="address-edit-grid animate-poof">
                      <div className="form-group">
                        <label>House/Unit No.</label>
                        <div className="input-wrapper">
                          <input
                            type="text"
                            name="houseUnit"
                            placeholder="e.g. 123"
                            value={addressParts.houseUnit}
                            onChange={handleAddressChange}
                            style={{ paddingLeft: '16px', borderColor: "#39a8ed" }} 
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Street</label>
                        <div className="input-wrapper">
                          <input
                            type="text"
                            name="street"
                            placeholder="e.g. Nissan St."
                            value={addressParts.street}
                            onChange={handleAddressChange}
                            style={{ paddingLeft: '16px', borderColor: "#39a8ed" }}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Barangay</label>
                        <div className="input-wrapper">
                          <input
                            type="text"
                            name="barangay"
                            placeholder="e.g. Rotonda"
                            value={addressParts.barangay}
                            onChange={handleAddressChange}
                            style={{ paddingLeft: '16px', borderColor: "#39a8ed" }}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>City</label>
                        <div className="input-wrapper">
                          <input
                            type="text"
                            name="city"
                            placeholder="e.g. Mandaluyong"
                            value={addressParts.city}
                            onChange={handleAddressChange}
                            style={{ paddingLeft: '16px', borderColor: "#39a8ed" }}
                          />
                        </div>
                      </div>
                      <div className="form-group full-width">
                        <label>Zip Code</label>
                        <div className="input-wrapper">
                          <input
                            type="text"
                            name="zipCode"
                            placeholder="e.g. 1700"
                            value={addressParts.zipCode}
                            onChange={handleAddressChange}
                            style={{ paddingLeft: '16px', borderColor: "#39a8ed" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* RIGHT: CHILDREN LIST & ACCOUNT CREDENTIALS */}
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
                        onClick={() => {
                          setSelectedStudent(child);
                          setStudentMedicalData({
                            allergies: child.allergies || "",
                            medical_history: child.medical_history || ""
                          });
                        }}
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

              {/* --- ACCOUNT CREDENTIALS CARD --- */}
              <div className="card form-card">
                <div className="card-header">
                  <h3>
                    <span className="material-symbols-outlined header-icon">lock</span> Account Credentials
                  </h3>
                  <p>Manage your account security and password.</p>
                </div>
                
                <div className="profile-form">
                  
                  {/* Username (Typically Read-Only) */}
                  <div className="form-group">
                    <label>Username</label>
                    <div className="input-wrapper">
                      <span className="material-symbols-outlined icon">account_circle</span>
                      <input
                        type="text"
                        name="username"
                        value={formData.username || "parent_user"} 
                        readOnly
                        style={{ opacity: 0.7, cursor: "not-allowed", backgroundColor: "#f1f5f9" }}
                      />
                    </div>
                  </div>

                  {/* Password Field with Hide/View Toggle */}
                  <div className="form-group">
                    <label>{isEditingCredentials ? "New Password" : "Password"}</label>
                    <div className="input-wrapper">
                      <span className="material-symbols-outlined icon">key</span>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="••••••••"
                        value={passwordData.password}
                        onChange={handlePasswordChange}
                        readOnly={!isEditingCredentials}
                        style={!isEditingCredentials 
                          ? { opacity: 0.8 } 
                          : { borderColor: "#39a8ed", paddingRight: '40px' }}
                      />
                      {isEditingCredentials && (
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                            display: 'flex', padding: 0
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                            {showPassword ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Confirm Password with Hide/View Toggle */}
                  {isEditingCredentials && (
                    <div className="form-group animate-poof">
                      <label>Confirm New Password</label>
                      <div className="input-wrapper">
                        <span className="material-symbols-outlined icon">lock_reset</span>
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          placeholder="••••••••"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          style={{ borderColor: "#39a8ed", paddingRight: '40px' }} 
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          style={{
                            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                            display: 'flex', padding: 0
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                            {showConfirmPassword ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* --- CARD ACTION BUTTONS --- */}
                  <div style={{ marginTop: '24px' }}>
                    {!isEditingCredentials ? (
                      <button 
                        type="button"
                        className="btn btn-primary profile-action-btn"
                        style={{ width: '100%', height: '44px', borderRadius: '10px' }}
                        onClick={handleEditCredentialsClick}
                      >
                        <span className="material-symbols-outlined" style={{ marginRight: '8px', fontSize: '18px' }}>edit</span>
                        Change Password
                      </button>
                    ) : (
                      <div className="action-buttons-wrapper">
                        <button 
                          type="button"
                          className="btn btn-save profile-action-btn"
                          style={{ flex: 1, height: '44px', borderRadius: '10px' }}
                          onClick={handleSaveCredentials}
                        >
                          <span className="material-symbols-outlined" style={{ marginRight: '8px', fontSize: '18px' }}>check</span>
                          Update
                        </button>
                        <button 
                          type="button"
                          className="btn btn-cancel profile-action-btn"
                          style={{ flex: 1, height: '44px', borderRadius: '10px' }}
                          onClick={handleCancelCredentials}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
              {/* --- END ACCOUNT CREDENTIALS --- */}
            </div>
          </div>
        </div>
      </main>

      {/* STUDENT DETAILS MODAL */}
      {selectedStudent && (
        <div
          className="modal-overlay active"
          onClick={() => setSelectedStudent(null)}
          style={{ zIndex: 99999 }} 
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Student Details</h3>
              <button
                className="close-modal-btn"
                onClick={() => setSelectedStudent(null)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="modal-body">
              {/* 1. Centered Avatar with Camera Button */}
              <div className="avatar-edit-center">
                <div className="avatar-upload-wrapper">
                  <img
                    src={getImageUrl(selectedStudent.profile_picture)}
                    className="modal-avatar"
                    alt="Student"
                  />
                  <label htmlFor="student-profile-upload" className="camera-btn modal-cam-btn" style={{ cursor: 'pointer' }}>
                    <span className="material-symbols-outlined">
                      photo_camera
                    </span>
                  </label>
                  <input
                      id="student-profile-upload"
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleStudentImageSelect}
                    />
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

              <div className="form-group">
                <label>Gender</label>
                <div className="input-wrapper">
                  <span className="material-symbols-outlined icon">person</span>
                  <input
                    type="text"
                    value={selectedStudent.gender || "N/A"}
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
                      value={selectedStudent.birthday ? new Date(selectedStudent.birthday).toLocaleDateString() : "N/A"}
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
                      value={selectedStudent.student_id || "N/A"}
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

              {/* FIXED: Removed modal-row-2 so Email takes up full width! */}
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
                  name="allergies"
                  placeholder="e.g. Peanuts, Shellfish..."
                  value={studentMedicalData.allergies}
                  onChange={(e) => setStudentMedicalData({ ...studentMedicalData, allergies: e.target.value })}
                ></textarea>
              </div>

              <div className="form-group">
                <label>Medical History</label>
                <textarea
                  className="modal-textarea"
                  name="medical_history"
                  placeholder="e.g. Asthma..."
                  value={studentMedicalData.medical_history}
                  onChange={(e) => setStudentMedicalData({ ...studentMedicalData, medical_history: e.target.value })}
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
              <button
                className="btn btn-save"
                onClick={handleSaveStudentDetails}
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