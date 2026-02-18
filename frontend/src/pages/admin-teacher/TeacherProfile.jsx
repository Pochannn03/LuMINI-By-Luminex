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

  // --- NEW: Profile Picture States ---
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

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

  // --- NEW: Handle Image Selection ---
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImageFile(file);
      setPreviewImage(URL.createObjectURL(file)); // Create local temporary URL to show instantly
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
        
        // REMOVED the manual headers! Let Axios handle the boundary automatically.
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
      // UPDATED: Now shows the actual backend error message so we aren't guessing!
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
    <div className="dashboard-wrapper">
      <Header />
      <NavBar />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message="Profile information updated successfully!"
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
                  {formData.role?.toUpperCase()} • ID: {formData.user_id}
                </p>
              </div>

              <div className="profile-actions">
                {!isEditing ? (
                  <button
                    className="btn btn-primary h-12 w-45 rounded-xl"
                    onClick={handleEditClick} 
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>edit</span>
                    Edit Information
                  </button>
                ) : (
                  <div className="action-buttons-wrapper">
                    <button className="btn btn-save h-12 w-30 rounded-xl" onClick={handleSave}>
                      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>check</span>
                      Save
                    </button>
                    <button className="btn btn-cancel h-12 w-30 rounded-xl" onClick={handleCancel}>
                      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span>
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
                  {[
                    { id: 1, name: "Sampaguita", time: "8:00 AM - 12:00 PM", color: "blue" },
                    { id: 2, name: "Rizal", time: "1:00 PM - 5:00 PM", color: "orange" },
                  ].map((section) => (
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
                        onClick={() => alert(`Navigating to ${section.name} module...`)}
                      >
                        <span className="material-symbols-outlined">visibility</span>
                      </button>

                    </div>
                  ))}
                </div>
                {/* --- END CLASSROOM LIST --- */}

              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}