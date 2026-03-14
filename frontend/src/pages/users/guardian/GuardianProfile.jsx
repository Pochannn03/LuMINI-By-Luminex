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
import FormInputRegistration from "../../../components/FormInputRegistration";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

// ==========================================
// ANTI-SPOOFING MATH HELPERS
// ==========================================
// NEW: Mouth Aspect Ratio for Open/Close detection
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

// ==========================================
// NEW: PASSWORD STRENGTH EVALUATOR
// ==========================================
const evaluatePassword = (password) => {
  let score = 0;
  let hints = [];

  if (!password) return { score: 0, label: '', color: 'bg-slate-200', textColor: 'text-slate-500', hint: '' };

  if (password.length >= 8) score += 1; else hints.push('make it at least 8 characters');
  if (/[A-Z]/.test(password)) score += 1; else hints.push('add an uppercase letter');
  if (/[0-9]/.test(password)) score += 1; else hints.push('add a number');
  if (/[^A-Za-z0-9]/.test(password)) score += 1; else hints.push('add a special symbol');

  let label = 'Weak';
  let color = 'bg-red-500';
  let textColor = 'text-red-500';

  if (score === 3) {
    label = 'Fair';
    color = 'bg-yellow-500';
    textColor = 'text-yellow-500';
  } else if (score === 4) {
    label = 'Strong';
    color = 'bg-green-500';
    textColor = 'text-green-500';
  }

  const hintText = hints.length > 0 ? `Tip: ${hints[0]}` : 'Ready to go!';

  return { score, label, color, textColor, hint: hintText };
};

export default function GuardianProfile() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const [otpInput, setOtpInput] = useState("");
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [loading, setLoading] = useState(true);
  const [emailError, setEmailError] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // States
  const [formData, setFormData] = useState({});
  const [children, setChildren] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Warning Modal State
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningTitle, setWarningTitle] = useState("");
  const [warningMessage, setWarningMessage] = useState("");

  // --- Address Splicing States ---
  const [addressParts, setAddressParts] = useState({
    houseUnit: "", street: "", barangay: "", city: "", zipCode: "",
  });

  // --- ACCOUNT CREDENTIALS STATES ---
  const [passwordData, setPasswordData] = useState({ password: "", confirmPassword: "" });
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // --- NEW: Password Strength State ---
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '', color: 'bg-slate-200', textColor: 'text-slate-500', hint: '' });

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
        setFormData({ ...(userData || {}), _originalEmail: userData?.email });

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
    let recognitionFrames = 0;
    let lostFaceFrames = 0; 

    // NEW: Mouth State Tracking
    let mouthPhase = 0; 
    let mouthHoldFrames = 0;

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
          phase = 0; framesHeld = 0; mouthPhase = 0; mouthHoldFrames = 0; recognitionFrames = 0;
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
          if (framesHeld > 10) { phase = 2; framesHeld = 0; }
        } else if (phase === 2) {
          // --- UPDATED: THE 2-CYCLE MOUTH LIVENESS TEST ---
          const mouth = detection.landmarks.getMouth();
          const mar = calculateMAR(mouth);
          
          const OPEN_THRESHOLD = 0.4;
          const CLOSE_THRESHOLD = 0.15; 

          if (mouthPhase === 0) {
            setScanStatus("Task 1: Please OPEN your mouth.");
            if (mar > OPEN_THRESHOLD) { mouthPhase = 1; mouthHoldFrames = 0; }
          } else if (mouthPhase === 1) {
            setScanStatus("Task 1: Now CLOSE your mouth.");
            if (mar < CLOSE_THRESHOLD) { mouthPhase = 2; mouthHoldFrames = 0; }
          } else if (mouthPhase === 2) {
            setScanStatus("Loading...");
            mouthHoldFrames++;
            if (mouthHoldFrames > 15) { mouthPhase = 3; mouthHoldFrames = 0; } 
          } else if (mouthPhase === 3) {
            setScanStatus("Task 1: Please OPEN your mouth again.");
            if (mar > OPEN_THRESHOLD) { mouthPhase = 4; mouthHoldFrames = 0; }
          } else if (mouthPhase === 4) {
            setScanStatus("Task 1: Now CLOSE your mouth.");
            if (mar < CLOSE_THRESHOLD) { mouthPhase = 5; mouthHoldFrames = 0; }
          } else if (mouthPhase === 5) {
            setScanStatus("Loading...");
            mouthHoldFrames++;
            if (mouthHoldFrames > 15) {
              phase = 3; 
              setScanStatus("✅ Liveness verified! Please hold...");
            }
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
            phase = 8; recognitionFrames = 0; 
            setScanStatus("Analyzing biometric data... Please hold still."); setIsRecognizing(true); 
          }
        } else if (phase === 8) {
          recognitionFrames++;
          if (recognitionFrames >= 15) { 
            isDetecting = false; 
            
            // --- THE REJECTION PROTOCOL ENFORCEMENT ---
            const descriptorArray = Array.from(detection.descriptor);
            
            axios.post(`${BACKEND_URL}/api/user/verify-face-match`, 
              { facialDescriptor: descriptorArray }, 
              { withCredentials: true }
            )
            .then(() => {
                // MATCH SUCCESS!
                stopCamera(); 
                setIsCameraActive(false); 
                setFaceVerified(true);
            })
            .catch((error) => {
                // IMPOSTER CAUGHT!
                stopCamera(); 
                setIsCameraActive(false); 
                setShowFaceAuthModal(false);
                setWarningTitle("Security Alert");
                setWarningMessage(error.response?.data?.message || "Facial verification failed.");
                setShowWarningModal(true);
            });
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

  const handleEmailBlur = async () => {
    const email = formData.email;

    if (!email.includes('@') || email === formData._originalEmail) return true;

    setIsCheckingEmail(true);
    setEmailError("");

    try {
      await axios.get(`${BACKEND_URL}/api/users/check-email`, {
        params: { email }
      });
      return true;
    } catch (error) {
      if (error.response?.status === 409) {
        setEmailError("This email is already registered. Please use a different one.");
      }
      return false;
    } finally {
      setIsCheckingEmail(false);
    }
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

  // --- UPDATED HANDLER TO CHECK PASSWORD STRENGTH ---
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));

    if (name === "password") {
      setPasswordStrength(evaluatePassword(value));
    }
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
    setPasswordStrength({ score: 0, label: '', color: 'bg-slate-200', textColor: 'text-slate-500', hint: '' }); // Reset strength
  };

  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    if (passwordData.password !== passwordData.confirmPassword) {
      alert("Passwords do not match!"); return;
    }
    if (passwordData.password.length < 8) {
      alert("Password must be at least 8 characters."); return;
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

      if (formData.email !== formData._originalEmail) {
        const isAvailable = await handleEmailBlur();
        if (!isAvailable) return;
      }

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

      <WarningModal 
        isOpen={showWarningModal} 
        onClose={() => setShowWarningModal(false)} 
        title={warningTitle} 
        message={warningMessage} 
      />

      {/* --- GUARDIAN Lightbox --- */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-sm flex justify-center items-center p-5 cursor-zoom-out"
          onClick={() => setIsLightboxOpen(false)}
        >
          <img src={previewImage || getImageUrl(formData.profile_picture)} alt="Fullscreen Profile" className="w-[400px] h-[400px] object-cover rounded-full shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border-[6px] border-white" />
          <button className="absolute top-6 right-6 bg-white/20 border-none text-white w-10 h-10 rounded-full cursor-pointer flex items-center justify-center" onClick={() => setIsLightboxOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* --- GUARDIAN Cropper Modal --- */}
      {showCropModal && (
        <div className="modal-overlay active z-[999999]">
          <div className="modal-card p-6 items-center max-w-[350px]">
            <h3 className="mb-4 text-lg text-slate-800 font-bold">Adjust Profile Picture</h3>
            <div className="bg-slate-50 p-2.5 rounded-xl">
              <AvatarEditor ref={editorRef} image={tempImage} width={220} height={220} border={20} borderRadius={110} color={[15, 23, 42, 0.6]} scale={zoom} rotate={0} />
            </div>
            <div className="flex items-center w-full gap-3 my-5">
              <span className="material-symbols-outlined text-lg text-slate-500">zoom_out</span>
              <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="flex-1 accent-[#39a8ed] cursor-pointer" />
              <span className="material-symbols-outlined text-lg text-slate-500">zoom_in</span>
            </div>
            <div className="flex gap-3 w-full">
              <button type="button" className="btn btn-cancel flex-1 h-[44px] rounded-[10px] cursor-pointer" onClick={(e) => { e.preventDefault(); setShowCropModal(false); setTempImage(null); }}>Cancel</button>
              <button type="button" className="btn btn-save flex-1 h-[44px] rounded-[10px] flex items-center justify-center cursor-pointer" onClick={(e) => { e.preventDefault(); handleCropSave(); }}>Apply Crop</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* --- FACIAL AUTHENTICATION & OTP MODAL FOR PASSWORD CHANGE --- */}
      {/* ========================================================= */}
      {showFaceAuthModal && (
        <div className="modal-overlay active z-[999999]">
          <div className="modal-card px-6 py-[30px] items-center w-[90%] max-w-[420px]">
            <h3 className="text-[20px] text-slate-800 font-bold mb-2">Security Verification</h3>
            
            {!faceVerified ? (
              <>
                <p className="text-[13px] text-slate-500 text-center mb-6">
                  To change your password, we must first verify your identity using facial biometrics.
                </p>

                {!isCameraActive ? (
                  <div className="flex flex-col items-center w-full">
                    <div className="w-[80px] h-[80px] bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-5">
                      <span className="material-symbols-outlined text-[40px]">face_retouching_natural</span>
                    </div>
                    
                    <button type="button" disabled={!modelsLoaded} onClick={() => setIsCameraActive(true)} className={`w-full h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 border-none transition-colors duration-200 ${modelsLoaded ? 'cursor-pointer bg-slate-800' : 'cursor-not-allowed bg-slate-300'}`}>
                      <span className="material-symbols-outlined text-[20px]">{modelsLoaded ? 'photo_camera' : 'sync'}</span> 
                      {modelsLoaded ? 'Start Verification' : 'Loading AI Models...'}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center w-full">
                    <div className="w-full h-[320px] bg-slate-900 rounded-2xl flex items-center justify-center text-white relative overflow-hidden border-2 border-slate-200 shadow-[0_10px_25px_rgba(0,0,0,0.1)]">
                      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover -scale-x-100 z-0" />
                      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover -scale-x-100 z-5" />

                      {!isVideoPlaying && !cameraError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-[6] bg-slate-900 text-slate-400">
                          <span className="material-symbols-outlined text-[48px] animate-pulse">videocam</span>
                          <span className="text-xs font-medium tracking-[0.1em]">INITIALIZING...</span>
                        </div>
                      )}
                      
                      {isVideoPlaying && !cameraError && (
                        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                          <div className={`${ovalClass} w-[190px] h-[250px] rounded-[50%]`}></div>
                        </div>
                      )}

                      {isRecognizing && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/85 backdrop-blur-sm">
                          <span className="material-symbols-outlined text-blue-500 text-[50px] animate-spin mb-4">autorenew</span>
                          <span className="text-white text-base font-bold tracking-widest animate-pulse mb-2">Recognizing Face...</span>
                          <span className="text-slate-400 text-xs font-medium">Please keep the camera still</span>
                        </div>
                      )}
                    </div>
                    <p className={`text-sm font-bold my-5 px-4 text-center ${scanStatus.includes("✅") ? 'text-green-600' : scanStatus.includes("⚠️") ? 'text-red-500' : scanStatus.includes("blink") || scanStatus.includes("LEFT") || scanStatus.includes("RIGHT") ? 'text-blue-600' : 'text-slate-600'}`}>
                      {cameraError ? "Check browser settings." : scanStatus}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center w-full py-2.5 animate-[fadeIn_0.3s_ease-out]">
                <div className="w-[60px] h-[60px] bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                  <span className="material-symbols-outlined text-[32px]">verified</span>
                </div>
                <h4 className="text-lg text-slate-800 font-bold mb-2">Identity Verified!</h4>
                
                {!otpSent ? (
                  <>
                    <p className="text-[13px] text-slate-500 text-center mb-6">
                      To finalize the password change, we will send a 6-digit security code to your registered email.
                    </p>
                    <button type="button" disabled={isOtpSending} onClick={async () => {
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
                        className="btn btn-primary w-full h-12 rounded-xl font-bold">
                        {isOtpSending ? "Sending OTP..." : "Send me the OTP"}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[13px] text-slate-500 text-center mb-6">
                      We've sent a 6-digit security code to your email. Please enter it below.
                    </p>
                    <div className="input-wrapper w-full mb-4">
                        <span className="material-symbols-outlined icon">pin</span>
                        <input type="text" placeholder="Enter 6-digit OTP" value={otpInput} onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); if (val.length <= 6) setOtpInput(val); setOtpError(""); }} className={`tracking-[4px] text-center font-bold text-base ${otpError ? 'border-red-500' : ''}`} />
                    </div>
                    {otpError && <p className="text-red-500 text-xs -mt-2.5 mb-4 font-medium">{otpError}</p>}
                    <button type="button" disabled={isOtpSending || otpInput.length < 6} onClick={async () => {
                          if (otpInput.length !== 6) { setOtpError("OTP must be exactly 6 digits."); return; }
                          try {
                            setIsOtpSending(true);
                            await axios.put(`${BACKEND_URL}/api/user/verify-password-otp`, { otp: otpInput, newPassword: passwordData.password }, { withCredentials: true });
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
                        className="btn btn-primary w-full h-12 rounded-xl font-bold">
                        {isOtpSending ? "Verifying..." : "Confirm Password Change"}
                    </button>
                  </>
                )}
              </div>
            )}
            <button type="button" onClick={() => { setShowFaceAuthModal(false); stopCamera(); setFaceVerified(false); setOtpSent(false); setOtpInput(""); setOtpError(""); }} className="bg-transparent border-none text-slate-400 text-[13px] font-bold cursor-pointer mt-4">Cancel Update</button>
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
                <img src={previewImage || getImageUrl(formData.profile_picture)} className={`large-avatar transition-transform duration-200 ${isEditing ? 'cursor-default' : 'cursor-zoom-in'}`} alt="Profile" onClick={handleAvatarClick} />
                
                {isEditing && (
                  <>
                    <label htmlFor="profile-upload" className="camera-btn absolute bottom-1 right-1 cursor-pointer bg-slate-800 text-white rounded-full w-9 h-9 flex items-center justify-center border-[3px] border-white shadow-[0_4px_10px_rgba(0,0,0,0.15)] transition-transform duration-200">
                      <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                    </label>
                    <input id="profile-upload" type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
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
                    <span className="material-symbols-outlined mr-2 text-[18px]">edit</span>
                    Edit Information
                  </button>
                ) : (
                  <div className="action-buttons-wrapper">
                    <button type="button" className="btn btn-save h-[42px] w-[190px] rounded-[10px]" onClick={handleSave}>
                      <span className="material-symbols-outlined mr-2 text-[18px]">check</span> Save
                    </button>
                    <button type="button" className="btn btn-cancel h-[42px] w-[190px] rounded-[10px]" onClick={handleCancel}>
                      <span className="material-symbols-outlined mr-2 text-[18px]">close</span> Cancel
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
                <div className="grid grid-cols-2 gap-5">
                  <div className="form-group">
                    <label>First Name</label>
                    <div className="input-wrapper">
                      <span className="material-symbols-outlined icon">person</span>
                      <input type="text" name="first_name" value={formData.first_name || ""} readOnly className="opacity-70 cursor-not-allowed bg-slate-100" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <div className="input-wrapper">
                      <span className="material-symbols-outlined icon">person</span>
                      <input type="text" name="last_name" value={formData.last_name || ""} readOnly className="opacity-70 cursor-not-allowed bg-slate-100" />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <div className="input-wrapper" style={{ position: 'relative' }}>
                    <span className="material-symbols-outlined icon">mail</span>
                    <input 
                      type="email" 
                      name="email" 
                      value={formData.email || ""} 
                      onChange={(e) => {
                        handleChange(e);
                        setEmailError("");
                      }}
                      onBlur={isEditing ? handleEmailBlur : undefined}
                      readOnly={!isEditing} 
                      className={!isEditing ? "opacity-80" : "border-[#39a8ed]"} 
                    />
                    {isCheckingEmail && (
                      <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
                        Checking...
                      </span>
                    )}
                  </div>
                  {emailError && (
                    <p className="text-red-500! text-[13px]! flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-red-500! text-[16px]">error</span>
                      {emailError}
                    </p>
                  )}
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <div className="input-wrapper">
                    <span className="material-symbols-outlined icon">call</span>
                    <input type="text" name="phone_number" value={formData.phone_number || ""} onChange={handleChange} readOnly={!isEditing} className={!isEditing ? "opacity-80" : "border-[#39a8ed]"} />
                  </div>
                </div>

                <div className="address-container">
                  {!isEditing ? (
                    <div className="form-group animate-poof">
                      <label>Address</label>
                      <div className="input-wrapper">
                        <span className="material-symbols-outlined icon">home</span>
                        <input type="text" name="address" value={formData.address || "No address provided"} readOnly className="opacity-80" />
                      </div>
                    </div>
                  ) : (
                    <div className="address-edit-grid animate-poof">
                      <div className="form-group">
                        <label>House/Unit No.</label>
                        <div className="input-wrapper"><input type="text" name="houseUnit" placeholder="e.g. 123" value={addressParts.houseUnit} onChange={handleAddressChange} className="pl-4 border-[#39a8ed]" /></div>
                      </div>
                      <div className="form-group">
                        <label>Street</label>
                        <div className="input-wrapper"><input type="text" name="street" placeholder="e.g. Nissan St." value={addressParts.street} onChange={handleAddressChange} className="pl-4 border-[#39a8ed]" /></div>
                      </div>
                      <div className="form-group">
                        <label>Barangay</label>
                        <div className="input-wrapper"><input type="text" name="barangay" placeholder="e.g. Rotonda" value={addressParts.barangay} onChange={handleAddressChange} className="pl-4 border-[#39a8ed]" /></div>
                      </div>
                      <div className="form-group">
                        <label>City</label>
                        <div className="input-wrapper"><input type="text" name="city" placeholder="e.g. Mandaluyong" value={addressParts.city} onChange={handleAddressChange} className="pl-4 border-[#39a8ed]" /></div>
                      </div>
                      <div className="form-group full-width">
                        <label>Zip Code</label>
                        <div className="input-wrapper"><input type="text" name="zipCode" placeholder="e.g. 1700" value={addressParts.zipCode} onChange={handleAddressChange} className="pl-4 border-[#39a8ed]" /></div>
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
                    <p className="p-2.5 text-slate-400">No students linked yet.</p>
                  ) : (
                    children.map((child) => (
                      <div key={child.student_id || Math.random()} className="child-item" onClick={() => setSelectedStudent(child)}>
                        <img src={getImageUrl(child.profile_picture)} className="child-avatar" alt="Child" />
                        <div className="child-info">
                          <span className="child-name">{child.first_name} {child.last_name}</span>
                          <span className="child-grade">{child.section_details?.section_name || "No Section"}</span>
                        </div>
                        <span className="material-symbols-outlined text-slate-400">chevron_right</span>
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
                      <input type="text" name="username" value={formData.username || "guardian_user"} readOnly className="opacity-70 cursor-not-allowed bg-slate-100" />
                    </div>
                  </div>

                  <div className="form-group mb-2">
                    <label>{isEditingCredentials ? "New Password" : "Password"}</label>
                    <div className="input-wrapper relative">
                      <span className="material-symbols-outlined icon">key</span>
                      <input type={showPassword ? "text" : "password"} name="password" placeholder="••••••••" value={passwordData.password} onChange={handlePasswordChange} readOnly={!isEditingCredentials} className={!isEditingCredentials ? "opacity-80" : "border-[#39a8ed] pr-10"} />
                      {isEditingCredentials && (
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-slate-400 flex p-0">
                          <span className="material-symbols-outlined text-[20px]">{showPassword ? "visibility_off" : "visibility"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* --- NEW: PASSWORD STRENGTH UI --- */}
                  {isEditingCredentials && passwordData.password && (
                    <div className="flex flex-col mb-4 pl-1 pr-1 animate-[fadeIn_0.3s_ease-out]">
                      <div className="flex gap-1 h-1.5 w-full mb-1.5 rounded-full overflow-hidden bg-slate-100">
                        <div className={`h-full transition-all duration-300 ${passwordStrength.score >= 1 ? passwordStrength.color : 'bg-transparent'}`} style={{ width: '25%' }}></div>
                        <div className={`h-full transition-all duration-300 ${passwordStrength.score >= 2 ? passwordStrength.color : 'bg-transparent'}`} style={{ width: '25%' }}></div>
                        <div className={`h-full transition-all duration-300 ${passwordStrength.score >= 3 ? passwordStrength.color : 'bg-transparent'}`} style={{ width: '25%' }}></div>
                        <div className={`h-full transition-all duration-300 ${passwordStrength.score >= 4 ? passwordStrength.color : 'bg-transparent'}`} style={{ width: '25%' }}></div>
                      </div>
                      <div className="flex justify-between items-center text-[11px] font-bold">
                        <span className={`${passwordStrength.textColor}`}>{passwordStrength.label}</span>
                        <span className="text-slate-400">{passwordStrength.hint}</span>
                      </div>
                    </div>
                  )}

                  {isEditingCredentials && (
                    <div className="form-group animate-poof mt-2">
                      <label>Confirm New Password</label>
                      <div className="input-wrapper relative">
                        <span className="material-symbols-outlined icon">lock_reset</span>
                        <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" placeholder="••••••••" value={passwordData.confirmPassword} onChange={handlePasswordChange} className="border-[#39a8ed] pr-10" />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-slate-400 flex p-0">
                          <span className="material-symbols-outlined text-[20px]">{showConfirmPassword ? "visibility_off" : "visibility"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-6">
                    {!isEditingCredentials ? (
                      <button type="button" className="btn btn-primary profile-action-btn w-full h-[44px] rounded-[10px]" onClick={handleEditCredentialsClick}>
                        <span className="material-symbols-outlined mr-2 text-[18px]">edit</span>
                        Change Password
                      </button>
                    ) : (
                      <div className="flex gap-3 w-full">
                        <button type="button" className="btn btn-cancel flex-1 h-[44px] rounded-[10px] flex items-center justify-center font-bold" onClick={handleCancelCredentials}>
                          Cancel
                        </button>
                        <button type="button" className="btn btn-save flex-1 h-[44px] rounded-[10px] flex items-center justify-center font-bold" onClick={handleSaveCredentials}>
                          <span className="material-symbols-outlined mr-2 text-[18px]">check</span> Update
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
        <div className="modal-overlay active z-[99999]" onClick={() => setSelectedStudent(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-header">
              <h3>View Student Details</h3>
              <button className="text-slate-400 hover:text-red-500 transition-all duration-300 hover:rotate-90 bg-transparent border-none cursor-pointer flex items-center justify-center p-2 z-50" onClick={() => setSelectedStudent(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="modal-body flex flex-col gap-3">
              <div className="avatar-edit-center mb-2">
                <div className="avatar-upload-wrapper">
                  <img src={getImageUrl(selectedStudent.profile_picture)} className="modal-avatar" alt="Student" />
                </div>
              </div>

              <FormInputRegistration 
                label="Full Name" 
                value={`${selectedStudent.first_name || ''} ${selectedStudent.last_name || ''}`.trim()} 
                readOnly 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700"
              />

              <FormInputRegistration 
                label="Gender" 
                value={selectedStudent.gender || "N/A"} 
                readOnly 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700"
              />

              <div className="modal-row-2 flex gap-4">
                <FormInputRegistration 
                  label="Birthday" 
                  value={selectedStudent.birthday ? new Date(selectedStudent.birthday).toLocaleDateString() : "N/A"} 
                  readOnly 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700"
                />
                <FormInputRegistration 
                  label="Student ID" 
                  value={selectedStudent.student_id || "N/A"} 
                  readOnly 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700"
                />
              </div>

              <FormInputRegistration 
                label="Grade / Class" 
                value={selectedStudent.section_details?.section_name || "Not Assigned"} 
                readOnly 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700"
              />

              <div className="modal-separator my-2"></div>
              
              <div className="modal-section-title flex items-center gap-2 font-bold text-slate-700 mb-2">
                <span className="material-symbols-outlined text-[var(--primary-blue)]">school</span> 
                Class Teacher
              </div>
              
              <FormInputRegistration 
                label="Adviser Name" 
                value={selectedStudent.section_details?.user_details ? `${selectedStudent.section_details.user_details.first_name} ${selectedStudent.section_details.user_details.last_name}` : "N/A"} 
                readOnly 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700"
              />
              <FormInputRegistration 
                label="Email" 
                value={selectedStudent.section_details?.user_details?.email || "N/A"} 
                readOnly 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700"
              />

              <div className="modal-separator my-2"></div>
              
              <div className="modal-section-title flex items-center gap-2 font-bold text-slate-700 mb-2">
                <span className="material-symbols-outlined text-[#e74c3c]">medical_services</span> 
                Additional Information
              </div>
              
              <FormInputRegistration 
                label="Allergies" 
                type="textarea"
                value={selectedStudent.allergies || "None reported"} 
                readOnly 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700"
              />
              <FormInputRegistration 
                label="Medical History" 
                type="textarea"
                value={selectedStudent.medical_history || "None reported"} 
                readOnly 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700"
              />
            </div>

            <div className="modal-footer justify-center mt-4">
              <button className="btn btn-cancel w-full" onClick={() => setSelectedStudent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}