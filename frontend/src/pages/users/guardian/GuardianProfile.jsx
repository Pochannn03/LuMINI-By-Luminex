import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../../context/AuthProvider";
import { useNavigate } from "react-router-dom";
import AvatarEditor from "react-avatar-editor";
import axios from "axios";
import * as faceapi from "face-api.js";
import "../../../styles/user/parent/parent-profile.css"; 
import NavBar from "../../../components/navigation/NavBar";
import Header from "../../../components/navigation/Header";
import SuccessModal from "../../../components/SuccessModal";
import WarningModal from "../../../components/WarningModal"; 

// DYNAMIC BACKEND URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

// ==========================================
// ANTI-SPOOFING MATH HELPERS
// ==========================================
const calculateMAR = (mouth) => {
  const MathSqrt = Math.sqrt;
  const MathPow = Math.pow;
  const euclideanDistance = (point1, point2) => {
    return MathSqrt(MathPow(point1.x - point2.x, 2) + MathPow(point1.y - point2.y, 2));
  };
  const v1 = euclideanDistance(mouth[13], mouth[19]);
  const v2 = euclideanDistance(mouth[14], mouth[18]);
  const v3 = euclideanDistance(mouth[15], mouth[17]);
  const h = euclideanDistance(mouth[12], mouth[16]);
  if (h === 0) return 0;
  return (v1 + v2 + v3) / (2.0 * h);
};

const calculateYawRatio = (landmarks) => {
  const jaw = landmarks.getJawOutline();
  const nose = landmarks.getNose();
  const imageLeftCheek = jaw[0];   
  const imageRightCheek = jaw[16]; 
  const noseTip = nose[3];         
  const distLeft = noseTip.x - imageLeftCheek.x;
  const distRight = imageRightCheek.x - noseTip.x;
  return distLeft / distRight;
};

export default function GuardianProfile() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const [otpInput, setOtpInput] = useState("");
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({});
  const [children, setChildren] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningTitle, setWarningTitle] = useState("");
  const [warningMessage, setWarningMessage] = useState("");

  const [addressParts, setAddressParts] = useState({
    houseUnit: "", street: "", barangay: "", city: "", zipCode: "",
  });

  const [passwordData, setPasswordData] = useState({ password: "", confirmPassword: "" });
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  const editorRef = useRef(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  const [selectedStudent, setSelectedStudent] = useState(null);

  const [showFaceAuthModal, setShowFaceAuthModal] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [scanStatus, setScanStatus] = useState("Initializing camera...");
  const [ovalClass, setOvalClass] = useState("border-white/50 shadow-[0_0_0_9999px_rgba(15,23,42,0.6)] border-2");
  
  const [isRecognizing, setIsRecognizing] = useState(false); 
  const [faceVerified, setFaceVerified] = useState(false); 

  const videoRef = useRef(null);
  const canvasRef = useRef(null); 
  const streamRef = useRef(null);
  const stopDetectionRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await axios.get(`${BACKEND_URL}/api/user/profile`, { withCredentials: true });
        const userData = profileRes.data.user || profileRes.data;
        setFormData(userData || {});

        const childrenRes = await axios.get(`${BACKEND_URL}/api/guardian/children`, { withCredentials: true });
        const childrenArray = childrenRes.data.children || childrenRes.data.students || childrenRes.data;
        setChildren(Array.isArray(childrenArray) ? childrenArray : []);
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const loadModels = async () => {
      const MODEL_URL = "/models"; 
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("❌ Failed to load models:", err);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (isCameraActive && showFaceAuthModal) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [isCameraActive, showFaceAuthModal]);

  const startCamera = async () => {
    setCameraError(null); setIsVideoPlaying(false);
    setScanStatus("Requesting camera access...");
    setOvalClass("border-white/50 shadow-[0_0_0_9999px_rgba(15,23,42,0.6)] border-2");
    setIsRecognizing(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play(); setIsVideoPlaying(true); startDetectionSequence(); 
        };
      }
    } catch (err) { setCameraError("Camera access denied."); }
  };

  const stopCamera = () => {
    if (stopDetectionRef.current) stopDetectionRef.current();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsVideoPlaying(false);
  };

  const startDetectionSequence = () => {
    let isDetecting = true;
    let phase = 0; let framesHeld = 0; let recognitionFrames = 0; let lostFaceFrames = 0; 
    let mouthPhase = 0; let mouthHoldFrames = 0;

    stopDetectionRef.current = () => { isDetecting = false; };

    const runDetection = async () => {
      if (!isDetecting || !videoRef.current || !canvasRef.current) return;
      if (videoRef.current.videoWidth === 0) { setTimeout(runDetection, 100); return; }

      if (canvasRef.current.width !== videoRef.current.videoWidth) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
      }
      const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
      faceapi.matchDimensions(canvasRef.current, displaySize);

      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.55 })).withFaceLandmarks().withFaceDescriptor();
      const ctx = canvasRef.current.getContext('2d'); ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      if (!detection) {
        lostFaceFrames++;
        if (lostFaceFrames > 8) { 
          phase = 0; framesHeld = 0; mouthPhase = 0; mouthHoldFrames = 0; recognitionFrames = 0;
          setIsRecognizing(false); setOvalClass("border-red-500 shadow-[0_0_0_9999px_rgba(15,23,42,0.8)] border-[4px]");
          setScanStatus("⚠️ Face lost! Sequence reset.");
        } else if (phase === 8) recognitionFrames++;
      } else {
        lostFaceFrames = 0; 
        if (phase < 8) {
          const resizedDetections = faceapi.resizeResults(detection, displaySize);
          faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections, { drawLines: true, color: '#00ffff', lineWidth: 1.5 });
        }

        if (phase === 0) {
          setOvalClass("border-green-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.7)] border-[4px] shadow-[inset_0_0_20px_rgba(74,222,128,0.3)]");
          setScanStatus("Face detected! Hold still..."); phase = 1;
        } else if (phase === 1) {
          framesHeld++; if (framesHeld > 10) { phase = 2; framesHeld = 0; }
        } else if (phase === 2) {
          const mouth = detection.landmarks.getMouth();
          const mar = calculateMAR(mouth);
          if (mouthPhase === 0) {
            setScanStatus("Task 1: Please OPEN your mouth.");
            if (mar > 0.4) mouthPhase = 1;
          } else if (mouthPhase === 1) {
            setScanStatus("Task 1: Now CLOSE your mouth.");
            if (mar < 0.15) mouthPhase = 2;
          } else if (mouthPhase === 2) {
            setScanStatus("Loading..."); mouthHoldFrames++;
            if (mouthHoldFrames > 15) { mouthPhase = 3; mouthHoldFrames = 0; } 
          } else if (mouthPhase === 3) {
            setScanStatus("Task 1: Please OPEN your mouth again.");
            if (mar > 0.4) mouthPhase = 4;
          } else if (mouthPhase === 4) {
            setScanStatus("Task 1: Now CLOSE your mouth.");
            if (mar < 0.15) mouthPhase = 5;
          } else if (mouthPhase === 5) {
            setScanStatus("Loading..."); mouthHoldFrames++;
            if (mouthHoldFrames > 15) { phase = 3; setScanStatus("✅ Liveness verified!"); }
          }
        } else if (phase === 3) {
          framesHeld++; if (framesHeld > 15) { phase = 4; framesHeld = 0; setScanStatus("Task 2: Slowly turn your head to your LEFT."); }
        } else if (phase === 4) {
          if (calculateYawRatio(detection.landmarks) > 1.6) { phase = 5; framesHeld = 0; setScanStatus("✅ Left turn verified!"); }
        } else if (phase === 5) {
          framesHeld++; if (framesHeld > 15) { phase = 6; framesHeld = 0; setScanStatus("Task 3: Slowly turn your head to your RIGHT."); }
        } else if (phase === 6) {
          if (calculateYawRatio(detection.landmarks) < 0.6) { phase = 7; framesHeld = 0; setScanStatus("✅ Right turn verified!"); }
        } else if (phase === 7) {
          framesHeld++; if (framesHeld > 15) { phase = 8; recognitionFrames = 0; setScanStatus("Analyzing biometric data..."); setIsRecognizing(true); }
        } else if (phase === 8) {
          recognitionFrames++;
          if (recognitionFrames >= 15) { 
            isDetecting = false; 
            const descriptorArray = Array.from(detection.descriptor);
            axios.post(`${BACKEND_URL}/api/user/verify-face-match`, { facialDescriptor: descriptorArray }, { withCredentials: true })
            .then(() => { stopCamera(); setIsCameraActive(false); setFaceVerified(true); })
            .catch((error) => {
                stopCamera(); setIsCameraActive(false); setShowFaceAuthModal(false);
                setWarningTitle("Security Alert");
                setWarningMessage(error.response?.data?.message || "Verification failed.");
                setShowWarningModal(true);
            });
            return; 
          }
        }
      }
      if (isDetecting) setTimeout(runDetection, 100);
    };
    runDetection(); 
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddressParts((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditClick = (e) => {
    e.preventDefault();
    const parts = (formData.address || "").split(",").map((s) => s.trim());
    setAddressParts({
      houseUnit: parts[0] || "", street: parts[1] || "", barangay: parts[2] || "", city: parts[3] || "", zipCode: parts[4] || "",
    });
    setIsEditing(true);
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditCredentialsClick = (e) => { e.preventDefault(); setIsEditingCredentials(true); };
  const handleCancelCredentials = (e) => {
    e.preventDefault(); setIsEditingCredentials(false);
    setPasswordData({ password: "", confirmPassword: "" }); setShowPassword(false); setShowConfirmPassword(false);
  };

  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    if (passwordData.password !== passwordData.confirmPassword) { alert("Passwords do not match!"); return; }
    if (passwordData.password.length < 8) { alert("Password must be at least 8 characters."); return; }
    setFaceVerified(false); setOtpSent(false); setShowFaceAuthModal(true); 
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setTempImage(URL.createObjectURL(file)); setShowCropModal(true); setZoom(1);
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
          setShowCropModal(false); setTempImage(null);
        }
      }, "image/jpeg", 0.95);
    }
  };

  const handleAvatarClick = () => { if (!isEditing) setIsLightboxOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const mergedAddress = [addressParts.houseUnit, addressParts.street, addressParts.barangay, addressParts.city, addressParts.zipCode].filter(Boolean).join(", ");
      let response;
      if (selectedImageFile) {
        const payload = new FormData();
        payload.append("phone_number", formData.phone_number || "");
        payload.append("address", mergedAddress || formData.address || ""); 
        payload.append("email", formData.email || "");
        payload.append("profile_picture", selectedImageFile); 
        response = await axios.put(`${BACKEND_URL}/api/user/profile`, payload, { withCredentials: true });
      } else {
        const payload = { phone_number: formData.phone_number || "", address: mergedAddress || formData.address || "", email: formData.email || "" };
        response = await axios.put(`${BACKEND_URL}/api/user/profile`, payload, { withCredentials: true });
      }
      if (response.data.user?.profile_picture) updateUser({ profile_picture: response.data.user.profile_picture });
      setFormData((prev) => ({ ...prev, address: mergedAddress, profile_picture: response.data?.user?.profile_picture || prev.profile_picture }));
      setSuccessMessage("Profile updated successfully!"); setShowSuccessModal(true); setIsEditing(false);
      setSelectedImageFile(null); setPreviewImage(null);
    } catch (err) { alert(`Save Failed: ${err.response?.data?.message || "Unknown Error"}`); }
  };

  const getImageUrl = (path) => {
    if (!path) return "https://via.placeholder.com/150";
    if (path.startsWith("http")) return path;
    const cleanPath = path.replace(/\\/g, "/").replace(/^\/+/, "");
    return `${BACKEND_URL}/${cleanPath}`;
  };

  if (loading) return <div className="profile-container flex justify-center items-center h-screen"><h2 className="animate-pulse">Loading Profile...</h2></div>;

  return (
    <div className="dashboard-wrapper hero-bg">
      <Header />
      <NavBar />
      <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} message={successMessage} />
      <WarningModal isOpen={showWarningModal} onClose={() => setShowWarningModal(false)} title={warningTitle} message={warningMessage} />

      {isLightboxOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'zoom-out' }} onClick={() => setIsLightboxOpen(false)}>
          <img src={previewImage || getImageUrl(formData.profile_picture)} alt="Fullscreen" style={{ width: '400px', height: '400px', objectFit: 'cover', borderRadius: '50%', border: '6px solid white' }} />
          <button style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: '50%', cursor: 'pointer' }} onClick={() => setIsLightboxOpen(false)}><span className="material-symbols-outlined">close</span></button>
        </div>
      )}

      {showCropModal && (
        <div className="modal-overlay active" style={{ zIndex: 999999 }}>
          <div className="modal-card" style={{ padding: '24px', alignItems: 'center', maxWidth: '350px' }}>
            <h3 style={{ marginBottom: '16px', fontWeight: 'bold' }}>Adjust Profile Picture</h3>
            <AvatarEditor ref={editorRef} image={tempImage} width={220} height={220} border={20} borderRadius={110} color={[15, 23, 42, 0.6]} scale={zoom} rotate={0} />
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px', margin: '20px 0' }}><span className="material-symbols-outlined">zoom_out</span><input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} style={{ flex: 1 }} /><span className="material-symbols-outlined">zoom_in</span></div>
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}><button className="btn btn-cancel" style={{ flex: 1 }} onClick={() => { setShowCropModal(false); setTempImage(null); }}>Cancel</button><button className="btn btn-save" style={{ flex: 1 }} onClick={handleCropSave}>Apply</button></div>
          </div>
        </div>
      )}

      {showFaceAuthModal && (
        <div className="modal-overlay active" style={{ zIndex: 999999 }}>
          <div className="modal-card" style={{ padding: '30px 24px', alignItems: 'center', width: '90%', maxWidth: '420px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>Security Verification</h3>
            {!faceVerified ? (
              <>
                <p style={{ fontSize: '13px', textAlign: 'center', marginBottom: '24px' }}>Verify your identity using facial biometrics to change password.</p>
                {!isCameraActive ? (
                  <div className="flex flex-col items-center w-full"><div style={{ width: '80px', height: '80px', background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', marginBottom: '20px' }}><span className="material-symbols-outlined text-[40px]">face_retouching_natural</span></div><button disabled={!modelsLoaded} onClick={() => setIsCameraActive(true)} className="btn btn-primary w-full h-12 rounded-xl font-bold">{modelsLoaded ? 'Start Verification' : 'Loading...'}</button></div>
                ) : (
                  <div className="flex flex-col items-center w-full">
                    <div style={{ width: '100%', height: '320px', background: '#0f172a', borderRadius: '16px', position: 'relative', overflow: 'hidden', border: '2px solid #e2e8f0' }}>
                      <video ref={videoRef} autoPlay playsInline muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', zIndex: 5 }} />
                      {isVideoPlaying && !cameraError && (<div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className={ovalClass} style={{ width: '190px', height: '250px', borderRadius: '50%' }}></div></div>)}
                      {isRecognizing && (<div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.85)' }}><span className="material-symbols-outlined animate-spin text-blue-500 text-[50px]">autorenew</span><span className="text-white font-bold mt-4">Recognizing Face...</span></div>)}
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '20px 0' }}>{scanStatus}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center w-full">
                <div style={{ width: '60px', height: '60px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', marginBottom: '16px' }}><span className="material-symbols-outlined text-[32px]">verified</span></div>
                <h4 className="font-bold">Identity Verified!</h4>
                {!otpSent ? (
                  <>
                    <p className="text-[13px] text-center my-6">Request a 6-digit security code to your registered email to finalize.</p>
                    <button disabled={isOtpSending} onClick={async () => { try { setIsOtpSending(true); await axios.post(`${BACKEND_URL}/api/user/request-password-otp`, {}, { withCredentials: true }); setOtpSent(true); } catch (err) { alert("Failed to send OTP."); } finally { setIsOtpSending(false); } }} className="btn btn-primary w-full h-12 rounded-xl font-bold">{isOtpSending ? "Sending..." : "Send OTP"}</button>
                  </>
                ) : (
                  <>
                    <p className="text-[13px] text-center my-4">Enter the code sent to your email.</p>
                    <div className="input-wrapper mb-4"><span className="material-symbols-outlined icon">pin</span><input type="text" placeholder="6-digit OTP" value={otpInput} onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))} style={{ letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }} /></div>
                    <button disabled={isOtpSending || otpInput.length < 6} onClick={async () => { try { setIsOtpSending(true); await axios.put(`${BACKEND_URL}/api/user/verify-password-otp`, { otp: otpInput, newPassword: passwordData.password }, { withCredentials: true }); setShowFaceAuthModal(false); setSuccessMessage("Password changed!"); setShowSuccessModal(true); handleCancelCredentials({ preventDefault: () => {} }); } catch (error) { setOtpError("Invalid OTP."); } finally { setIsOtpSending(false); } }} className="btn btn-primary w-full h-12 rounded-xl font-bold">Confirm Reset</button>
                  </>
                )}
              </div>
            )}
            <button onClick={() => { setShowFaceAuthModal(false); stopCamera(); }} style={{ background: 'none', border: 'none', color: '#94a3b8', fontWeight: 'bold', cursor: 'pointer', marginTop: '16px' }}>Cancel Update</button>
          </div>
        </div>
      )}

      <main className="main-content">
        <div className="profile-container">
          <div className="profile-header-card">
            <div className="profile-cover"></div>
            <div className="profile-details-row">
              <div className="avatar-upload-wrapper">
                <img src={previewImage || getImageUrl(formData.profile_picture)} className="large-avatar" alt="Profile" onClick={handleAvatarClick} style={{ cursor: isEditing ? 'default' : 'zoom-in' }} />
                {isEditing && (<><label htmlFor="profile-upload" className="camera-btn" style={{ position: 'absolute', bottom: '5px', right: '5px', cursor: 'pointer', background: '#1e293b', color: 'white', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid white' }}><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>photo_camera</span></label><input id="profile-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSelect} /></>)}
              </div>
              <div className="profile-text"><h1>{formData.first_name} {formData.last_name}</h1><p>{formData.relationship || "Guardian"} • ID: {formData.user_id}</p></div>
              <div className="profile-actions">{!isEditing ? (<button className="btn btn-primary h-[42px] w-[190px] rounded-[10px]" onClick={handleEditClick}><span className="material-symbols-outlined mr-2">edit</span>Edit Info</button>) : (<div className="action-buttons-wrapper"><button className="btn btn-save h-[42px] w-[190px] rounded-[10px]" onClick={handleSave}><span className="material-symbols-outlined mr-2">check</span>Save</button><button className="btn btn-cancel h-[42px] w-[190px] rounded-[10px]" onClick={() => setIsEditing(false)}><span className="material-symbols-outlined mr-2">close</span>Cancel</button></div>)}</div>
            </div>
          </div>
          <div className="profile-grid">
            <div className="card form-card">
              <div className="card-header"><h3><span className="material-symbols-outlined header-icon">badge</span> Personal Info</h3></div>
              <form className="profile-form">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}><div className="form-group"><label>First Name</label><input type="text" value={formData.first_name || ""} readOnly className="read-only" /></div><div className="form-group"><label>Last Name</label><input type="text" value={formData.last_name || ""} readOnly className="read-only" /></div></div>
                <div className="form-group"><label>Email</label><input type="email" name="email" value={formData.email || ""} onChange={handleChange} readOnly={!isEditing} /></div>
                <div className="form-group"><label>Phone</label><input type="text" name="phone_number" value={formData.phone_number || ""} onChange={handleChange} readOnly={!isEditing} /></div>
                {!isEditing ? (<div className="form-group"><label>Address</label><input type="text" value={formData.address || ""} readOnly /></div>) : (<div className="address-edit-grid"><div className="form-group"><label>Unit</label><input type="text" name="houseUnit" value={addressParts.houseUnit} onChange={handleAddressChange} /></div><div className="form-group"><label>Street</label><input type="text" name="street" value={addressParts.street} onChange={handleAddressChange} /></div><div className="form-group"><label>Barangay</label><input type="text" name="barangay" value={addressParts.barangay} onChange={handleAddressChange} /></div><div className="form-group"><label>City</label><input type="text" name="city" value={addressParts.city} onChange={handleAddressChange} /></div><div className="form-group full-width"><label>Zip</label><input type="text" name="zipCode" value={addressParts.zipCode} onChange={handleAddressChange} /></div></div>)}
              </form>
            </div>
            <div className="right-stack">
              <div className="card form-card">
                <div className="card-header"><h3><span className="material-symbols-outlined header-icon">face</span> Students</h3></div>
                <div className="children-list">
                  {children.length === 0 ? (<p className="p-4 text-slate-400">No students linked.</p>) : (children.map((child) => (<div key={child.student_id} className="child-item" onClick={() => setSelectedStudent(child)}><img src={getImageUrl(child.profile_picture)} className="child-avatar" alt="Child" /><div className="child-info"><span className="child-name">{child.first_name} {child.last_name}</span><span className="child-grade">{child.section_details?.section_name}</span></div><span className="material-symbols-outlined text-slate-300">chevron_right</span></div>)))}
                </div>
              </div>
              <div className="card form-card">
                <div className="card-header"><h3><span className="material-symbols-outlined header-icon">lock</span> Credentials</h3></div>
                <div className="profile-form">
                  <div className="form-group"><label>Username</label><input type="text" value={formData.username || ""} readOnly className="read-only" /></div>
                  <div className="form-group"><label>Password</label><div className="input-wrapper"><span className="material-symbols-outlined icon">key</span><input type={showPassword ? "text" : "password"} name="password" placeholder="••••••••" value={passwordData.password} onChange={handlePasswordChange} readOnly={!isEditingCredentials} />{isEditingCredentials && (<button className="eye-btn" onClick={() => setShowPassword(!showPassword)}><span className="material-symbols-outlined">{showPassword ? "visibility_off" : "visibility"}</span></button>)}</div></div>
                  {isEditingCredentials && (<div className="form-group"><label>Confirm</label><div className="input-wrapper"><span className="material-symbols-outlined icon">lock_reset</span><input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" placeholder="••••••••" value={passwordData.confirmPassword} onChange={handlePasswordChange} /><button className="eye-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}><span className="material-symbols-outlined">{showConfirmPassword ? "visibility_off" : "visibility"}</span></button></div></div>)}
                  <div className="mt-6">{!isEditingCredentials ? (<button className="btn btn-primary w-full h-11 rounded-xl" onClick={handleEditCredentialsClick}>Change Password</button>) : (<div className="flex gap-3"><button className="btn btn-save flex-1 h-11 rounded-xl" onClick={handleSaveCredentials}>Update</button><button className="btn btn-cancel flex-1 h-11 rounded-xl" onClick={handleCancelCredentials}>Cancel</button></div>)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {selectedStudent && (
        <div className="modal-overlay active" onClick={() => setSelectedStudent(null)} style={{ zIndex: 99999 }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Student Details</h3><button className="close-modal-btn" onClick={() => setSelectedStudent(null)}><span className="material-symbols-outlined">close</span></button></div>
            <div className="modal-body">
              <div className="avatar-edit-center"><div className="avatar-upload-wrapper"><img src={getImageUrl(selectedStudent.profile_picture)} className="modal-avatar" alt="Student" /></div></div>
              <div className="form-group"><label>Name</label><input type="text" value={`${selectedStudent.first_name} ${selectedStudent.last_name}`} disabled /></div>
              <div className="form-group"><label>ID</label><input type="text" value={selectedStudent.student_id} disabled /></div>
              <div className="form-group"><label>Grade</label><input type="text" value={selectedStudent.section_details?.section_name} disabled /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-cancel w-full" onClick={() => setSelectedStudent(null)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}