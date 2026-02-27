import { useEffect, useState, useRef } from "react";
import AvatarEditor from "react-avatar-editor";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import * as faceapi from "face-api.js";
import "../../../styles/user/parent/parent-profile.css"; 
import NavBar from "../../../components/navigation/NavBar";
import Header from "../../../components/navigation/Header";
import SuccessModal from "../../../components/SuccessModal";
import { useAuth } from "../../../context/AuthProvider";

const BACKEND_URL = "http://localhost:3000";

// ==========================================
// ANTI-SPOOFING MATH HELPERS
// ==========================================
const calculateEAR = (eye) => {
  const MathSqrt = Math.sqrt;
  const MathPow = Math.pow;
  const euclideanDistance = (point1, point2) => {
    return MathSqrt(MathPow(point1.x - point2.x, 2) + MathPow(point1.y - point2.y, 2));
  };
  const v1 = euclideanDistance(eye[1], eye[5]);
  const v2 = euclideanDistance(eye[2], eye[4]);
  const h = euclideanDistance(eye[0], eye[3]);
  return (v1 + v2) / (2.0 * h);
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
  const [otpSent, setOtpSent] = useState(false); // <-- NEW STATE

  const [loading, setLoading] = useState(true);

  // States
  const [formData, setFormData] = useState({});
  const [children, setChildren] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // --- Address Splicing States ---
  const [addressParts, setAddressParts] = useState({
    houseUnit: "", street: "", barangay: "", city: "", zipCode: "",
  });

  // --- ACCOUNT CREDENTIALS STATES ---
  const [passwordData, setPasswordData] = useState({ password: "", confirmPassword: "" });
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // --- GUARDIAN Cropper States ---
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  const editorRef = useRef(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  // --- STUDENT Modal States ---
  const [selectedStudent, setSelectedStudent] = useState(null);

  // ==========================================
  // FACIAL VERIFICATION STATES & REFS
  // ==========================================
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

  // ==========================================
  // Fetch Data & Load Models
  // ==========================================
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

  // ==========================================
  // CAMERA & LIVENESS LOGIC
  // ==========================================
  useEffect(() => {
    if (isCameraActive && showFaceAuthModal) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isCameraActive, showFaceAuthModal]);

  const startCamera = async () => {
    setCameraError(null);
    setIsVideoPlaying(false);
    setScanStatus("Requesting camera access...");
    setOvalClass("border-white/50 shadow-[0_0_0_9999px_rgba(15,23,42,0.6)] border-2");
    setIsRecognizing(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setIsVideoPlaying(true);
          startDetectionSequence(); 
        };
      }
    } catch (err) {
      setCameraError("Camera access denied.");
    }
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
    let phase = 0; 
    let framesHeld = 0;
    let blinkClosed = false;
    let blinkCount = 0; 
    let recognitionFrames = 0;
    let lostFaceFrames = 0; 

    stopDetectionRef.current = () => { isDetecting = false; };

    const runDetection = async () => {
      if (!isDetecting || !videoRef.current || !canvasRef.current) return;
      if (videoRef.current.videoWidth === 0) {
        setTimeout(runDetection, 100); return;
      }

      if (canvasRef.current.width !== videoRef.current.videoWidth) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
      }
      const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
      faceapi.matchDimensions(canvasRef.current, displaySize);

      const detection = await faceapi.detectSingleFace(
        videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.55 })
      ).withFaceLandmarks().withFaceDescriptor();

      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      if (!detection) {
        lostFaceFrames++;
        if (lostFaceFrames > 8) { 
          phase = 0; framesHeld = 0; blinkClosed = false; blinkCount = 0; recognitionFrames = 0;
          setIsRecognizing(false);
          setOvalClass("border-red-500 shadow-[0_0_0_9999px_rgba(15,23,42,0.8)] border-[4px] transition-all duration-300");
          setScanStatus("⚠️ Face lost! Sequence reset. Please center yourself.");
        } else if (phase === 8) {
          recognitionFrames++;
        }
      } else {
        lostFaceFrames = 0; 

        if (phase < 8) {
          const resizedDetections = faceapi.resizeResults(detection, displaySize);
          faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections, { drawLines: true, color: '#00ffff', lineWidth: 1.5 });
        }

        if (phase === 0) {
          setOvalClass("border-green-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.7)] border-[4px] shadow-[inset_0_0_20px_rgba(74,222,128,0.3)] transition-all duration-300");
          setScanStatus("Face detected! Hold still..."); phase = 1;
        } else if (phase === 1) {
          framesHeld++;
          if (framesHeld > 10) { phase = 2; framesHeld = 0; setScanStatus("Task 1: Please blink your eyes 3 times (0/3)"); }
        } else if (phase === 2) {
          const leftEye = detection.landmarks.getLeftEye();
          const rightEye = detection.landmarks.getRightEye();
          const avgEAR = (calculateEAR(leftEye) + calculateEAR(rightEye)) / 2;
          if (avgEAR < 0.25) { blinkClosed = true; } 
          else if (blinkClosed && avgEAR >= 0.25) { 
            blinkCount++; blinkClosed = false; 
            if (blinkCount >= 3) { phase = 3; setScanStatus("✅ Blinks verified! Please hold..."); } 
            else { setScanStatus(`Task 1: Please blink your eyes 3 times (${blinkCount}/3)`); }
          }
        } else if (phase === 3) {
          framesHeld++;
          if (framesHeld > 15) { phase = 4; framesHeld = 0; setScanStatus("Task 2: Slowly turn your head to your LEFT."); }
        } else if (phase === 4) {
          const yaw = calculateYawRatio(detection.landmarks);
          if (yaw > 1.6) { phase = 5; framesHeld = 0; setScanStatus("✅ Left turn verified! Please hold..."); }
        } else if (phase === 5) {
          framesHeld++;
          if (framesHeld > 15) { phase = 6; framesHeld = 0; setScanStatus("Task 3: Slowly turn your head to your RIGHT."); }
        } else if (phase === 6) {
          const yaw = calculateYawRatio(detection.landmarks);
          if (yaw < 0.6) { phase = 7; framesHeld = 0; setScanStatus("✅ Right turn verified! Please hold..."); }
        } else if (phase === 7) {
          framesHeld++;
          if (framesHeld > 15) { 
            phase = 8; 
            recognitionFrames = 0; 
            setScanStatus("Analyzing biometric data... Please hold still."); 
            setIsRecognizing(true); 
          }
        } else if (phase === 8) {
          recognitionFrames++;
          if (recognitionFrames >= 15) { 
            // SUCCESS: INSTANTLY TRANSITION UI 
            isDetecting = false; 
            stopCamera(); 
            setIsCameraActive(false); 
            setFaceVerified(true); 
            return; 
          }
        }
      }

      if (isDetecting) { setTimeout(runDetection, 100); }
    };
    runDetection(); 
  };


  // ==========================================
  // HANDLERS
  // ==========================================
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

  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    if (passwordData.password !== passwordData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    if (passwordData.password.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }
    setFaceVerified(false);
    setOtpSent(false); // Reset OTP state
    setShowFaceAuthModal(true); 
  };

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
    if (!isEditing) setIsLightboxOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const mergedAddress = [
        addressParts.houseUnit, addressParts.street, addressParts.barangay, addressParts.city, addressParts.zipCode,
      ].filter(Boolean).join(", ");

      let response;
      if (selectedImageFile) {
        const payload = new FormData();
        payload.append("phone_number", formData.phone_number || "");
        payload.append("address", mergedAddress || formData.address || ""); 
        payload.append("email", formData.email || "");
        payload.append("profile_picture", selectedImageFile); 
        response = await axios.put(`${BACKEND_URL}/api/user/profile`, payload, { withCredentials: true });
      } else {
        const payload = {
          phone_number: formData.phone_number || "", address: mergedAddress || formData.address || "", email: formData.email || "",
        };
        response = await axios.put(`${BACKEND_URL}/api/user/profile`, payload, { withCredentials: true, headers: { 'Content-Type': 'application/json' } });
      }

      if (response.data.user?.profile_picture) {
        updateUser({ profile_picture: response.data.user.profile_picture });
      }
      
      setFormData((prev) => ({ 
        ...prev, address: mergedAddress, profile_picture: response.data?.user?.profile_picture || prev.profile_picture 
      }));

      setSuccessMessage("Profile updated successfully!");
      setShowSuccessModal(true);
      setIsEditing(false);
      setSelectedImageFile(null);
      setPreviewImage(null);
    } catch (err) {
      alert(`Save Failed: ${err.response?.data?.message || err.message || "Unknown Error"}`);
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
      <div className="profile-container flex justify-center items-center h-screen">
        <h2 className="text-slate-500 font-semibold animate-pulse">Loading Profile...</h2>
      </div>
    );

  return (
    <div className="dashboard-wrapper hero-bg">
      <Header />
      <NavBar />
      
      <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} message={successMessage} />

      {/* --- GUARDIAN Lightbox --- */}
      {isLightboxOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', cursor: 'zoom-out' }}
          onClick={() => setIsLightboxOpen(false)}
        >
          <img src={previewImage || getImageUrl(formData.profile_picture)} alt="Fullscreen Profile" style={{ width: '400px', height: '400px', objectFit: 'cover', borderRadius: '50%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '6px solid white' }} />
          <button style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setIsLightboxOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* --- GUARDIAN Cropper Modal --- */}
      {showCropModal && (
        <div className="modal-overlay active" style={{ zIndex: 999999 }}>
          <div className="modal-card" style={{ padding: '24px', alignItems: 'center', maxWidth: '350px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', color: '#1e293b', fontWeight: 'bold' }}>Adjust Profile Picture</h3>
            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '12px' }}>
              <AvatarEditor ref={editorRef} image={tempImage} width={220} height={220} border={20} borderRadius={110} color={[15, 23, 42, 0.6]} scale={zoom} rotate={0} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px', margin: '20px 0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748b' }}>zoom_out</span>
              <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} style={{ flex: 1, accentColor: '#39a8ed', cursor: 'pointer' }} />
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748b' }}>zoom_in</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button type="button" className="btn btn-cancel" style={{ flex: 1, height: '44px', borderRadius: '10px', cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); setShowCropModal(false); setTempImage(null); }}>Cancel</button>
              <button type="button" className="btn btn-save" style={{ flex: 1, height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); handleCropSave(); }}>Apply Crop</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* --- FACIAL AUTHENTICATION & OTP MODAL FOR PASSWORD CHANGE --- */}
      {/* ========================================================= */}
      {showFaceAuthModal && (
        <div className="modal-overlay active" style={{ zIndex: 999999 }}>
          <div className="modal-card" style={{ padding: '30px 24px', alignItems: 'center', width: '90%', maxWidth: '420px' }}>
            <h3 style={{ fontSize: '20px', color: '#1e293b', fontWeight: 'bold', marginBottom: '8px' }}>Security Verification</h3>
            
            {!faceVerified ? (
              <>
                <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', marginBottom: '24px' }}>
                  To change your password, we must first verify your identity using facial biometrics.
                </p>

                {!isCameraActive ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    <div style={{ width: '80px', height: '80px', background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', marginBottom: '20px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>face_retouching_natural</span>
                    </div>
                    
                    <button 
                      type="button" 
                      disabled={!modelsLoaded} 
                      onClick={() => setIsCameraActive(true)}
                      style={{
                        width: '100%', height: '48px', borderRadius: '12px', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none', cursor: modelsLoaded ? 'pointer' : 'not-allowed',
                        background: modelsLoaded ? '#1e293b' : '#cbd5e1', transition: 'background 0.2s'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{modelsLoaded ? 'photo_camera' : 'sync'}</span> 
                      {modelsLoaded ? 'Start Verification' : 'Loading AI Models...'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    <div style={{ width: '100%', height: '320px', background: '#0f172a', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', position: 'relative', overflow: 'hidden', border: '2px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                      <video ref={videoRef} autoPlay playsInline muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', zIndex: 0 }} />
                      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', zIndex: 5 }} />

                      {!isVideoPlaying && !cameraError && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', zIndex: 6, background: '#0f172a', color: '#94a3b8' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '48px', animation: 'pulse 2s infinite' }}>videocam</span>
                          <span style={{ fontSize: '12px', fontWeight: '500', letterSpacing: '0.1em' }}>INITIALIZING...</span>
                        </div>
                      )}
                      
                      {isVideoPlaying && !cameraError && (
                        <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div className={ovalClass} style={{ width: '190px', height: '250px', borderRadius: '50% / 50%' }}></div>
                        </div>
                      )}

                      {isRecognizing && (
                        <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(4px)' }}>
                          <span className="material-symbols-outlined" style={{ color: '#3b82f6', fontSize: '50px', animation: 'spin 1.5s linear infinite', marginBottom: '16px' }}>
                            autorenew
                          </span>
                          <span style={{ color: 'white', fontSize: '16px', fontWeight: 'bold', letterSpacing: '0.05em', animation: 'pulse 1.5s infinite', marginBottom: '8px' }}>
                            Recognizing Face...
                          </span>
                          <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '500' }}>
                            Please keep the camera still
                          </span>
                        </div>
                      )}
                    </div>

                    <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '20px 0', padding: '0 16px', textAlign: 'center', color: scanStatus.includes("✅") ? '#16a34a' : scanStatus.includes("⚠️") ? '#ef4444' : scanStatus.includes("blink") || scanStatus.includes("LEFT") || scanStatus.includes("RIGHT") ? '#2563eb' : '#475569' }}>
                      {cameraError ? "Check browser settings." : scanStatus}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '10px 0' }} className="animate-[fadeIn_0.3s_ease-out]">
                <div style={{ width: '60px', height: '60px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', marginBottom: '16px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>verified</span>
                </div>
                <h4 style={{ fontSize: '18px', color: '#1e293b', fontWeight: 'bold', marginBottom: '8px' }}>Identity Verified!</h4>
                
                {!otpSent ? (
                  <>
                    <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', marginBottom: '24px' }}>
                      To finalize the password change, we will send a 6-digit security code to your registered email.
                    </p>
                    <button 
                        type="button" 
                        disabled={isOtpSending}
                        onClick={async () => {
                          try {
                            setIsOtpSending(true);
                            await axios.post(`${BACKEND_URL}/api/user/request-password-otp`, {}, { withCredentials: true });
                            setOtpSent(true);
                          } catch (err) {
                            alert("Failed to send email. Please try again.");
                          } finally {
                            setIsOtpSending(false);
                          }
                        }}
                        className="btn btn-primary"
                        style={{ width: '100%', height: '48px', borderRadius: '12px', fontWeight: 'bold' }}
                      >
                        {isOtpSending ? "Sending OTP..." : "Send me the OTP"}
                    </button>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', marginBottom: '24px' }}>
                      We've sent a 6-digit security code to your email. Please enter it below.
                    </p>

                    <div className="input-wrapper" style={{ width: '100%', marginBottom: '16px' }}>
                        <span className="material-symbols-outlined icon">pin</span>
                        <input 
                          type="text" 
                          placeholder="Enter 6-digit OTP" 
                          value={otpInput}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val.length <= 6) setOtpInput(val);
                            setOtpError("");
                          }}
                          style={{ letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold', fontSize: '16px', borderColor: otpError ? '#ef4444' : '' }}
                        />
                    </div>
                    
                    {otpError && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '-10px', marginBottom: '16px', fontWeight: '500' }}>{otpError}</p>}

                    <button 
                        type="button" 
                        onClick={async () => {
                          if (otpInput.length !== 6) {
                            setOtpError("OTP must be exactly 6 digits.");
                            return;
                          }
                          try {
                            setIsOtpSending(true);
                            await axios.put(`${BACKEND_URL}/api/user/verify-password-otp`, 
                              { otp: otpInput, newPassword: passwordData.password }, 
                              { withCredentials: true }
                            );
                            setShowFaceAuthModal(false);
                            setSuccessMessage("Password successfully changed!");
                            setShowSuccessModal(true);
                            handleCancelCredentials({ preventDefault: () => {} });
                          } catch (error) {
                            setOtpError(error.response?.data?.message || "Invalid OTP.");
                          } finally {
                            setIsOtpSending(false);
                          }
                        }}
                        disabled={isOtpSending || otpInput.length < 6}
                        className="btn btn-primary"
                        style={{ width: '100%', height: '48px', borderRadius: '12px', fontWeight: 'bold' }}
                      >
                        {isOtpSending ? "Verifying..." : "Confirm Password Change"}
                    </button>
                  </>
                )}
              </div>
            )}

            <button 
              type="button" 
              onClick={() => { setShowFaceAuthModal(false); stopCamera(); setFaceVerified(false); setOtpSent(false); setOtpInput(""); setOtpError(""); }}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', marginTop: '16px' }}
            >
              Cancel Update
            </button>

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
                <img src={previewImage || getImageUrl(formData.profile_picture)} className="large-avatar" alt="Profile" onClick={handleAvatarClick} style={{ cursor: isEditing ? 'default' : 'zoom-in', transition: 'transform 0.2s' }} />
                
                {isEditing && (
                  <>
                    <label htmlFor="profile-upload" className="camera-btn" style={{ position: 'absolute', bottom: '5px', right: '5px', cursor: 'pointer', background: '#1e293b', color: 'white', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.15)', transition: 'transform 0.2s' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>photo_camera</span>
                    </label>
                    <input id="profile-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSelect} />
                  </>
                )}
              </div>

              <div className="profile-text">
                <h1>{formData.first_name} {formData.last_name}</h1>
                <p>{formData.relationship || "Guardian"} • ID: {formData.user_id}</p>
              </div>
              
              <div className="profile-actions">
                {!isEditing ? (
                  <button type="button" className="btn btn-primary h-[42px] w-[190px] rounded-[10px]" onClick={handleEditClick}>
                    <span className="material-symbols-outlined" style={{ marginRight: '8px', fontSize: '18px' }}>edit</span>
                    Edit Information
                  </button>
                ) : (
                  <div className="action-buttons-wrapper">
                    <button type="button" className="btn btn-save h-[42px] w-[190px] rounded-[10px]" onClick={handleSave}>
                      <span className="material-symbols-outlined" style={{ marginRight: '8px', fontSize: '18px' }}>check</span> Save
                    </button>
                    <button type="button" className="btn btn-cancel h-[42px] w-[190px] rounded-[10px]" onClick={handleCancel}>
                      <span className="material-symbols-outlined" style={{ marginRight: '8px', fontSize: '18px' }}>close</span> Cancel
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
                <h3><span className="material-symbols-outlined header-icon">badge</span> Personal Information</h3>
              </div>
              <form className="profile-form">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div className="form-group">
                    <label>First Name</label>
                    <div className="input-wrapper">
                      <span className="material-symbols-outlined icon">person</span>
                      <input type="text" name="first_name" value={formData.first_name || ""} readOnly style={{ opacity: 0.7, cursor: "not-allowed", backgroundColor: "#f1f5f9" }} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <div className="input-wrapper">
                      <span className="material-symbols-outlined icon">person</span>
                      <input type="text" name="last_name" value={formData.last_name || ""} readOnly style={{ opacity: 0.7, cursor: "not-allowed", backgroundColor: "#f1f5f9" }} />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <div className="input-wrapper">
                    <span className="material-symbols-outlined icon">mail</span>
                    <input type="email" name="email" value={formData.email || ""} onChange={handleChange} readOnly={!isEditing} style={!isEditing ? { opacity: 0.8 } : { borderColor: "#39a8ed" }} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <div className="input-wrapper">
                    <span className="material-symbols-outlined icon">call</span>
                    <input type="text" name="phone_number" value={formData.phone_number || ""} onChange={handleChange} readOnly={!isEditing} style={!isEditing ? { opacity: 0.8 } : { borderColor: "#39a8ed" }} />
                  </div>
                </div>

                <div className="address-container">
                  {!isEditing ? (
                    <div className="form-group animate-poof">
                      <label>Address</label>
                      <div className="input-wrapper">
                        <span className="material-symbols-outlined icon">home</span>
                        <input type="text" name="address" value={formData.address || "No address provided"} readOnly style={{ opacity: 0.8 }} />
                      </div>
                    </div>
                  ) : (
                    <div className="address-edit-grid animate-poof">
                      <div className="form-group">
                        <label>House/Unit No.</label>
                        <div className="input-wrapper"><input type="text" name="houseUnit" placeholder="e.g. 123" value={addressParts.houseUnit} onChange={handleAddressChange} style={{ paddingLeft: '16px', borderColor: "#39a8ed" }} /></div>
                      </div>
                      <div className="form-group">
                        <label>Street</label>
                        <div className="input-wrapper"><input type="text" name="street" placeholder="e.g. Nissan St." value={addressParts.street} onChange={handleAddressChange} style={{ paddingLeft: '16px', borderColor: "#39a8ed" }} /></div>
                      </div>
                      <div className="form-group">
                        <label>Barangay</label>
                        <div className="input-wrapper"><input type="text" name="barangay" placeholder="e.g. Rotonda" value={addressParts.barangay} onChange={handleAddressChange} style={{ paddingLeft: '16px', borderColor: "#39a8ed" }} /></div>
                      </div>
                      <div className="form-group">
                        <label>City</label>
                        <div className="input-wrapper"><input type="text" name="city" placeholder="e.g. Mandaluyong" value={addressParts.city} onChange={handleAddressChange} style={{ paddingLeft: '16px', borderColor: "#39a8ed" }} /></div>
                      </div>
                      <div className="form-group full-width">
                        <label>Zip Code</label>
                        <div className="input-wrapper"><input type="text" name="zipCode" placeholder="e.g. 1700" value={addressParts.zipCode} onChange={handleAddressChange} style={{ paddingLeft: '16px', borderColor: "#39a8ed" }} /></div>
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
                  <h3><span className="material-symbols-outlined header-icon">face</span> Assigned Students</h3>
                  <p>Students you are authorized to pick up.</p>
                </div>
                <div className="children-list">
                  {(!children || children.length === 0) ? (
                    <p style={{ padding: "10px", color: "#94a3b8" }}>No students linked yet.</p>
                  ) : (
                    children.map((child) => (
                      <div key={child.student_id || Math.random()} className="child-item" onClick={() => setSelectedStudent(child)}>
                        <img src={getImageUrl(child.profile_picture)} className="child-avatar" alt="Child" />
                        <div className="child-info">
                          <span className="child-name">{child.first_name} {child.last_name}</span>
                          <span className="child-grade">{child.section_details?.section_name || "No Section"}</span>
                        </div>
                        <span className="material-symbols-outlined" style={{ color: "#94a3b8" }}>chevron_right</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* --- ACCOUNT CREDENTIALS CARD --- */}
              <div className="card form-card">
                <div className="card-header">
                  <h3><span className="material-symbols-outlined header-icon">lock</span> Account Credentials</h3>
                  <p>Manage your account security and password.</p>
                </div>
                
                <div className="profile-form">
                  <div className="form-group">
                    <label>Username</label>
                    <div className="input-wrapper">
                      <span className="material-symbols-outlined icon">account_circle</span>
                      <input type="text" name="username" value={formData.username || "guardian_user"} readOnly style={{ opacity: 0.7, cursor: "not-allowed", backgroundColor: "#f1f5f9" }} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>{isEditingCredentials ? "New Password" : "Password"}</label>
                    <div className="input-wrapper">
                      <span className="material-symbols-outlined icon">key</span>
                      <input type={showPassword ? "text" : "password"} name="password" placeholder="••••••••" value={passwordData.password} onChange={handlePasswordChange} readOnly={!isEditingCredentials} style={!isEditingCredentials ? { opacity: 0.8 } : { borderColor: "#39a8ed", paddingRight: '40px' }} />
                      {isEditingCredentials && (
                        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{showPassword ? "visibility_off" : "visibility"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditingCredentials && (
                    <div className="form-group animate-poof">
                      <label>Confirm New Password</label>
                      <div className="input-wrapper">
                        <span className="material-symbols-outlined icon">lock_reset</span>
                        <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" placeholder="••••••••" value={passwordData.confirmPassword} onChange={handlePasswordChange} style={{ borderColor: "#39a8ed", paddingRight: '40px' }} />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{showConfirmPassword ? "visibility_off" : "visibility"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '24px' }}>
                    {!isEditingCredentials ? (
                      <button type="button" className="btn btn-primary profile-action-btn" style={{ width: '100%', height: '44px', borderRadius: '10px' }} onClick={handleEditCredentialsClick}>
                        <span className="material-symbols-outlined" style={{ marginRight: '8px', fontSize: '18px' }}>edit</span>
                        Change Password
                      </button>
                    ) : (
                      <div className="action-buttons-wrapper">
                        <button type="button" className="btn btn-save profile-action-btn" style={{ flex: 1, height: '44px', borderRadius: '10px' }} onClick={handleSaveCredentials}>
                          <span className="material-symbols-outlined" style={{ marginRight: '8px', fontSize: '18px' }}>check</span> Update
                        </button>
                        <button type="button" className="btn btn-cancel profile-action-btn" style={{ flex: 1, height: '44px', borderRadius: '10px' }} onClick={handleCancelCredentials}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* STUDENT DETAILS MODAL (READ-ONLY FOR GUARDIANS) */}
      {selectedStudent && (
        <div className="modal-overlay active" onClick={() => setSelectedStudent(null)} style={{ zIndex: 99999 }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>View Student Details</h3>
              <button className="close-modal-btn" onClick={() => setSelectedStudent(null)}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="modal-body">
              <div className="avatar-edit-center">
                <div className="avatar-upload-wrapper"><img src={getImageUrl(selectedStudent.profile_picture)} className="modal-avatar" alt="Student" /></div>
              </div>
              <div className="form-group">
                <label>Full Name</label>
                <div className="input-wrapper"><span className="material-symbols-outlined icon">person</span><input type="text" value={`${selectedStudent.first_name || ''} ${selectedStudent.last_name || ''}`.trim()} disabled className="read-only" /></div>
              </div>
              <div className="form-group">
                <label>Gender</label>
                <div className="input-wrapper"><span className="material-symbols-outlined icon">person</span><input type="text" value={selectedStudent.gender || "N/A"} disabled className="read-only" /></div>
              </div>
              <div className="modal-row-2">
                <div className="form-group">
                  <label>Birthday</label>
                  <div className="input-wrapper"><span className="material-symbols-outlined icon">cake</span><input type="text" value={selectedStudent.birthday ? new Date(selectedStudent.birthday).toLocaleDateString() : "N/A"} disabled className="read-only" /></div>
                </div>
                <div className="form-group">
                  <label>Student ID</label>
                  <div className="input-wrapper"><span className="material-symbols-outlined icon">badge</span><input type="text" value={selectedStudent.student_id || "N/A"} disabled className="read-only" /></div>
                </div>
              </div>
              <div className="form-group">
                <label>Grade / Class</label>
                <div className="input-wrapper"><span className="material-symbols-outlined icon">school</span><input type="text" value={selectedStudent.section_details?.section_name || "Not Assigned"} disabled className="read-only" /></div>
              </div>
              <div className="modal-separator"></div>
              <div className="modal-section-title"><span className="material-symbols-outlined" style={{ color: "var(--primary-blue)" }}>school</span> Class Teacher</div>
              <div className="form-group">
                <label>Adviser Name</label>
                <div className="input-wrapper"><span className="material-symbols-outlined icon">person</span><input type="text" value={selectedStudent.section_details?.user_details ? `${selectedStudent.section_details.user_details.first_name} ${selectedStudent.section_details.user_details.last_name}` : "N/A"} disabled className="read-only" /></div>
              </div>
              <div className="form-group">
                <label>Email</label>
                <div className="input-wrapper"><span className="material-symbols-outlined icon">mail</span><input type="text" value={selectedStudent.section_details?.user_details?.email || "N/A"} disabled className="read-only" /></div>
              </div>
              <div className="modal-separator"></div>
              <div className="modal-section-title"><span className="material-symbols-outlined" style={{ color: "#e74c3c" }}>medical_services</span> Additional Information</div>
              <div className="form-group"><label>Allergies</label><textarea className="modal-textarea read-only" disabled value={selectedStudent.allergies || "None reported"}></textarea></div>
              <div className="form-group"><label>Medical History</label><textarea className="modal-textarea read-only" disabled value={selectedStudent.medical_history || "None reported"}></textarea></div>
            </div>
            <div className="modal-footer" style={{ justifyContent: "center" }}>
              <button className="btn btn-cancel" onClick={() => setSelectedStudent(null)} style={{ width: "100%" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}