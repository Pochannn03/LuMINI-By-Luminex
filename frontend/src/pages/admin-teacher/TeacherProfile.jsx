import { useEffect, useState, useRef } from "react";
import AvatarEditor from "react-avatar-editor";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../styles/teacher/teacher-profile.css";
import "../../styles/teacher/class-list-modal.css";
import NavBar from "../../components/navigation/NavBar";
import Header from "../../components/navigation/Header";
import SuccessModal from "../../components/SuccessModal";
import ClassListModal from "../../components/modals/admin/ClassListModal";

export default function TeacherProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  // --- ACCOUNT CREDENTIALS STATES ---
  const [passwordData, setPasswordData] = useState({
    password: "",
    confirmPassword: "",
  });
  
  // Dedicated state for the credentials card
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);

  // --- NEW: Password Visibility States ---
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    setPasswordData({ password: "", confirmPassword: "" }); // Clear fields on cancel
    setShowPassword(false); // Reset eyes to hidden
    setShowConfirmPassword(false);
  };

  const handleSaveCredentials = (e) => {
    e.preventDefault();
    // Temporary check until we wire the backend
    if (passwordData.password !== passwordData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    alert("Password logic ready to be wired to backend!");
    setIsEditingCredentials(false);
    setPasswordData({ password: "", confirmPassword: "" });
    setShowPassword(false); // Reset eyes to hidden
    setShowConfirmPassword(false);
  };

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);

  const [stats, setStats] = useState({
    totalStudents: 0,
    totalSections: 0,
  });

  const [sections, setSections] = useState([]);

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

  const [addressParts, setAddressParts] = useState({
    houseUnit: "",
    street: "",
    barangay: "",
    city: "",
    zipCode: "",
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
          setSections(response.data.sections || []);
        }
      } catch (err) {
        console.error("Error fetching teacher stats:", err);
      }
    };
    fetchStats();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddressParts((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditClick = () => {
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

  // Opens the Cropper when a file is selected
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Safely convert the raw file into a local browser URL
      const imageUrl = URL.createObjectURL(file); 
      setTempImage(imageUrl);
      setShowCropModal(true); 
      setZoom(1); 
    }
    // Clear the input so they can click the same file again if needed
    e.target.value = null; 
  };

  // Handles grabbing the dragged/zoomed image and converting it to a file
  const handleCropSave = () => {
    if (editorRef.current) {
      // Get the cropped area as an HTML canvas
      const canvas = editorRef.current.getImageScaledToCanvas();
      
      // Convert it to an actual image file for the backend
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], "profile_photo.jpg", { type: "image/jpeg" });
          setSelectedImageFile(croppedFile);
          setPreviewImage(URL.createObjectURL(croppedFile)); // Show the cropped preview
          setShowCropModal(false);
          setTempImage(null);
        }
      }, "image/jpeg", 0.95);
    }
  };
  
  // --- NEW: Open Lightbox (only if not editing) ---
  const handleAvatarClick = () => {
    if (!isEditing) {
      setIsLightboxOpen(true);
    }
  };

  const handleSave = async () => {
    try {
      const mergedAddress = [
        addressParts.houseUnit,
        addressParts.street,
        addressParts.barangay,
        addressParts.city,
        addressParts.zipCode,
      ].filter(Boolean).join(", ");

      let payload;
      let axiosConfig = { 
        withCredentials: true 
      };

      if (selectedImageFile) {
        payload = new FormData();
        payload.append("phone_number", formData.phone_number);
        payload.append("address", mergedAddress);
        payload.append("email", formData.email);
        payload.append("profile_picture", selectedImageFile); 
        
      } else {
        payload = {
          phone_number: formData.phone_number,
          address: mergedAddress,
          email: formData.email,
        };
      }

      const response = await axios.put(
        "http://localhost:3000/api/user/profile",
        payload,
        axiosConfig 
      );

      setFormData((prev) => ({ 
        ...prev, 
        address: mergedAddress,
        profile_picture: response.data.user.profile_picture 
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

  const getImageUrl = (path) => {
    if (!path) return "https://via.placeholder.com/150";
    if (path.startsWith("http")) return path;
    const cleanPath = path.replace(/\\/g, "/");
    return `http://localhost:3000/${cleanPath}`;
  };

  if (loading) return <div className="profile-container" style={{ marginTop: "100px" }}>Loading Profile...</div>;
  if (error) return <div className="profile-container" style={{ marginTop: "100px", color: "red" }}>{error}</div>;

  return (
    <div className="dashboard-wrapper hero-bg">
      <Header />
      <NavBar />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message="Profile information updated successfully!"
      />

      <ClassListModal 
        isOpen={isClassModalOpen} 
        onClose={() => setIsClassModalOpen(false)} 
        section={selectedClass} 
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
        <div className="class-modal-overlay" style={{ zIndex: 999999 }}>
          <div className="class-modal-card" style={{ padding: '24px', alignItems: 'center', maxWidth: '350px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', color: '#1e293b', fontWeight: 'bold' }}>
              Adjust Profile Picture
            </h3>
            
            {/* The Editor Area */}
            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '12px' }}>
              <AvatarEditor
                ref={editorRef}
                image={tempImage}
                width={220}
                height={220}
                border={20}
                borderRadius={110} /* Creates the circle cutout effect */
                color={[15, 23, 42, 0.6]} /* Dark overlay outside crop */
                scale={zoom}
                rotate={0}
              />
            </div>

            {/* Zoom Slider */}
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

            {/* Buttons */}
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
                className="btn btn-primary" 
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
                  {formData.relationship} • ID: {formData.user_id}
                </p>
              </div>

              <div className="profile-actions">
                {!isEditing ? (
                  <button
                    type="button"
                    className="btn btn-primary profile-action-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      handleEditClick();
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ marginRight: '8px', fontSize: '18px' }}>
                      edit
                    </span>
                    Edit Information
                  </button>
                ) : (
                  <div className="action-buttons-wrapper">
                    
                    {/* --- SAVE BUTTON --- */}
                    <button 
                      type="button"
                      className="btn btn-save profile-action-btn" 
                      onClick={(e) => {
                        e.preventDefault();
                        handleSave();
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ marginRight: '8px', fontSize: '18px' }}>
                        check
                      </span>
                      Save
                    </button>

                    {/* --- CANCEL BUTTON --- */}
                    <button 
                      type="button"
                      className="btn btn-cancel profile-action-btn" 
                      onClick={(e) => {
                        e.preventDefault();
                        handleCancel();
                      }}
                    >
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
                  <span className="material-symbols-outlined header-icon">badge</span>{" "}
                  Personal Information
                </h3>
                <p>Update your contact details.</p>
              </div>

              <form className="profile-form" onSubmit={(e) => e.preventDefault()}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div className="form-group">
                    <label>First Name</label>
                    <div className="input-wrapper">
                      <span className="material-symbols-outlined icon">person</span>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
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
                        value={formData.last_name}
                        readOnly
                        style={{ opacity: 0.7, cursor: "not-allowed", backgroundColor: "#f1f5f9" }}
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
                      style={!isEditing ? { opacity: 0.8 } : { borderColor: "#39a8ed" }}
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
                      style={!isEditing ? { opacity: 0.8 } : { borderColor: "#39a8ed" }}
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

            <div className="right-stack">
              <div className="card form-card">
                <div className="card-header">
                  <h3>
                    <span className="material-symbols-outlined header-icon">analytics</span> My Classroom
                  </h3>
                  <p>Quick overview of your active classes.</p>
                </div>
                
                {/* --- NEW SIMPLIFIED CLASSROOM LIST UI --- */}
                <div className="classroom-list">
                  {sections.map((section) => (
                    <div key={section.id} className="classroom-list-item">
                      
                      {/* LEFT SIDE: Icon and Info */}
                      <div className="classroom-info-wrapper">
                        <div className={`classroom-icon ${section.color}`}>
                          <span className="material-symbols-outlined">meeting_room</span>
                        </div>
                        
                        <div className="classroom-details">
                          <h4>{section.name}</h4>
                          <p>
                            {/* Changed icon back to a clock since we are showing time! */}
                            <span className="material-symbols-outlined inline-icon">schedule</span> 
                            {section.time}
                          </p>
                        </div>
                      </div>

                      {/* RIGHT SIDE: Eye Icon Button */}
                      <button 
                        className="btn-view-class" 
                        title="View Section"
                        onClick={() => {
                          setSelectedClass(section); // Save the clicked section data
                          setIsClassModalOpen(true); // Open the modal
                        }}
                      >
                        <span className="material-symbols-outlined">visibility</span>
                      </button>

                    </div>
                  ))}
                </div>
                {/* --- END CLASSROOM LIST --- */}
              </div>

              {/* --- NEW: ACCOUNT CREDENTIALS CARD --- */}
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
                        value={formData.username || "maria_lanee"} /* Dummy fallback until wired */
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
                          : { borderColor: "#39a8ed", paddingRight: '40px' } /* Make room for the eye icon! */}
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

                  {/* Confirm Password with Hide/View Toggle (ONLY SHOWS WHEN EDITING) */}
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
                          style={{ borderColor: "#39a8ed", paddingRight: '40px' }} /* Make room for the eye icon! */
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
    </div>
  );
}