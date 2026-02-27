import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import * as faceapi from "face-api.js";
import { useAuth } from "../../../context/AuthProvider";
import '../../../styles/auth/registration.css'; 
import FormInputRegistration from '../../../components/FormInputRegistration';
import AvatarEditor from "react-avatar-editor";

// ==========================================
// ANTI-SPOOFING MATH HELPERS
// ==========================================

// 1. Eye Aspect Ratio (For Blinking)
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

// 2. Head Yaw Ratio (For turning head Left/Right)
const calculateYawRatio = (landmarks) => {
  const jaw = landmarks.getJawOutline();
  const nose = landmarks.getNose();
  const imageLeftCheek = jaw[0];   // Physical right
  const imageRightCheek = jaw[16]; // Physical left
  const noseTip = nose[3];         
  const distLeft = noseTip.x - imageLeftCheek.x;
  const distRight = imageRightCheek.x - noseTip.x;
  return distLeft / distRight;
};

export default function GuardianSetup() {
  const navigate = useNavigate();
  const { logout, user } = useAuth(); 

  const [currentStep, setCurrentStep] = useState(0);
  
  const [profilePic, setProfilePic] = useState(null); 
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const editorRef = useRef(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // --- FACIAL RECOGNITION STATES & REFS ---
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
  // Anti-Spoofing UI States
  const [scanStatus, setScanStatus] = useState("Initializing camera...");
  const [ovalClass, setOvalClass] = useState("border-white/50 shadow-[0_0_0_9999px_rgba(15,23,42,0.6)] border-2");
  const [countdownValue, setCountdownValue] = useState(null);
  
  // Capture States
  const [faceDescriptor, setFaceDescriptor] = useState(null); 
  const [capturedImage, setCapturedImage] = useState(null); 
  const [showCaptureModal, setShowCaptureModal] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null); 
  const streamRef = useRef(null);
  const stopDetectionRef = useRef(null); 

  const [formData, setFormData] = useState({
    username: user?.username || "",
    password: "",
    confirmPassword: "",
    firstName: user?.first_name || user?.firstName || "",
    lastName: user?.last_name || user?.lastName || "",
    email: user?.email || "",
    contact: "09", 
    houseUnit: "",
    street: "",
    barangay: "",
    city: "",
    zipCode: "",
  });

  // ==========================================
  // LOAD AI MODELS
  // ==========================================
  useEffect(() => {
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
  // CAMERA LOGIC
  // ==========================================
  useEffect(() => {
    if (isCameraActive && currentStep === 3) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isCameraActive, currentStep]);

  const startCamera = async () => {
    setCameraError(null);
    setIsVideoPlaying(false);
    setScanStatus("Requesting camera access...");
    setOvalClass("border-white/50 shadow-[0_0_0_9999px_rgba(15,23,42,0.6)] border-2");
    setCountdownValue(null);

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

  const takeSnapshot = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  // ==========================================
  // LIVENESS DETECTION STATE MACHINE
  // ==========================================
  const startDetectionSequence = () => {
    let isDetecting = true;
    let phase = 0; 
    let framesHeld = 0;
    
    // Blink Trackers
    let blinkClosed = false;
    let blinkCount = 0; 

    // Countdown Trackers
    let countdownSecs = 3;
    let countdownFrames = 0;
    
    // NEW: Grace Period Tracker (Fixes the stuck countdown!)
    let lostFaceFrames = 0; 

    stopDetectionRef.current = () => { isDetecting = false; };

    const runDetection = async () => {
      if (!isDetecting || !videoRef.current || !canvasRef.current) return;
      if (videoRef.current.videoWidth === 0) {
        setTimeout(runDetection, 100);
        return;
      }

      // Sync Canvas size
      if (canvasRef.current.width !== videoRef.current.videoWidth) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
      }
      const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
      faceapi.matchDimensions(canvasRef.current, displaySize);

      const detection = await faceapi.detectSingleFace(
        videoRef.current,
        new faceapi.SsdMobilenetv1Options({ minConfidence: 0.55 })
      ).withFaceLandmarks().withFaceDescriptor();

      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      // ----------------------------------------------------
      // GRACE PERIOD LOGIC: Don't instantly reset on a dropped frame!
      // ----------------------------------------------------
      if (!detection) {
        lostFaceFrames++;
        if (lostFaceFrames > 8) { // Approx 1.5 seconds of totally lost face = Full Reset
          phase = 0;
          framesHeld = 0;
          blinkClosed = false;
          blinkCount = 0;
          countdownSecs = 3;
          countdownFrames = 0;
          setCountdownValue(null);
          setOvalClass("border-red-500 shadow-[0_0_0_9999px_rgba(15,23,42,0.8)] border-[4px] transition-all duration-300");
          setScanStatus("⚠️ Face lost! Sequence reset. Please center yourself.");
        } else if (phase === 8) {
          // If we are currently counting down, keep the visual numbers ticking so it doesn't "freeze"
          countdownFrames++;
          if (countdownFrames >= 8) {
            countdownFrames = 0;
            if (countdownSecs > 1) { // Never hit 0 if we can't see the face! Just pause at 1.
              countdownSecs--;
              setCountdownValue(countdownSecs);
            }
          }
        }
      } else {
        lostFaceFrames = 0; // Face is back! Reset the grace period

        // Draw Landmarks (Hide them during the final countdown for a clean snap)
        if (phase < 8) {
          const resizedDetections = faceapi.resizeResults(detection, displaySize);
          faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections, { drawLines: true, color: '#00ffff', lineWidth: 1.5 });
        }

        // ----------------------------------------------------
        // THE STATE MACHINE PHASES
        // ----------------------------------------------------
        if (phase === 0) {
          setOvalClass("border-green-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.7)] border-[4px] shadow-[inset_0_0_20px_rgba(74,222,128,0.3)] transition-all duration-300");
          setScanStatus("Face detected! Hold still...");
          phase = 1;
        } 
        else if (phase === 1) {
          framesHeld++;
          if (framesHeld > 10) { 
            phase = 2;
            framesHeld = 0;
            setScanStatus("Task 1: Please blink your eyes 3 times (0/3)");
          }
        } 
        else if (phase === 2) {
          const leftEye = detection.landmarks.getLeftEye();
          const rightEye = detection.landmarks.getRightEye();
          const avgEAR = (calculateEAR(leftEye) + calculateEAR(rightEye)) / 2;

          if (avgEAR < 0.25) {
            blinkClosed = true; 
          } else if (blinkClosed && avgEAR >= 0.25) { 
            blinkCount++;
            blinkClosed = false; 

            if (blinkCount >= 3) {
              phase = 3;
              setScanStatus("✅ Blinks verified! Please hold...");
            } else {
              setScanStatus(`Task 1: Please blink your eyes 3 times (${blinkCount}/3)`);
            }
          }
        } 
        else if (phase === 3) {
          framesHeld++;
          if (framesHeld > 15) { // ~2 seconds transition
            phase = 4;
            framesHeld = 0;
            setScanStatus("Task 2: Slowly turn your head to your LEFT.");
          }
        }
        else if (phase === 4) {
          const yaw = calculateYawRatio(detection.landmarks);
          if (yaw > 1.6) { 
            phase = 5;
            framesHeld = 0;
            setScanStatus("✅ Left turn verified! Please hold...");
          }
        }
        else if (phase === 5) {
          framesHeld++;
          if (framesHeld > 15) {
            phase = 6;
            framesHeld = 0;
            setScanStatus("Task 3: Slowly turn your head to your RIGHT.");
          }
        }
        else if (phase === 6) {
          const yaw = calculateYawRatio(detection.landmarks);
          if (yaw < 0.6) {
            phase = 7;
            framesHeld = 0;
            setScanStatus("✅ Right turn verified! Please hold...");
          }
        }
        else if (phase === 7) {
          framesHeld++;
          if (framesHeld > 15) { 
            phase = 8;
            countdownSecs = 3;
            countdownFrames = 0;
            setScanStatus("Excellent! Look directly at the camera. Capturing...");
            setCountdownValue(3);
          }
        }
        else if (phase === 8) {
          countdownFrames++;
          if (countdownFrames >= 8) { // Approx 1 second
            countdownFrames = 0;
            countdownSecs--;
            if (countdownSecs > 0) {
              setCountdownValue(countdownSecs);
            } else {
              // FIRE CAPTURE!
              setCountdownValue(null);
              setScanStatus("Processing...");
              
              const imgData = takeSnapshot();
              const descriptorArray = Array.from(detection.descriptor);
              
              setCapturedImage(imgData);
              setFaceDescriptor(descriptorArray);
              
              isDetecting = false; 
              stopCamera(); 
              setIsCameraActive(false); 
              setShowCaptureModal(true); 
              return; 
            }
          }
        }
      }

      if (isDetecting) {
        setTimeout(runDetection, 100); 
      }
    };

    runDetection(); 
  };

  // --- STANDARD HANDLERS ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setTempImage(URL.createObjectURL(file));
      setShowCropModal(true); 
      setZoom(1);
    }
    if (fileInputRef.current) fileInputRef.current.value = null; 
  };

  const handleCropSave = () => {
    if (editorRef.current) {
      const canvas = editorRef.current.getImageScaledToCanvas();
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], "guardian_photo.jpg", { type: "image/jpeg" });
          setProfilePic(croppedFile); 
          setPreviewUrl(URL.createObjectURL(croppedFile)); 
          setShowCropModal(false);
          setTempImage(null);
        }
      }, "image/jpeg", 0.95);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === "contact") {
      finalValue = finalValue.replace(/\D/g, ''); 
      if (!finalValue.startsWith("09")) finalValue = "09" + finalValue.replace(/^0+/, ''); 
      if (finalValue.length > 11) finalValue = finalValue.substring(0, 11);
    }
    setFormData({ ...formData, [name]: finalValue });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleTempLogout = async () => {
    try {
      await axios.post("http://localhost:3000/api/auth/logout", {}, { withCredentials: true });
      if (logout) logout();
      navigate("/login", { replace: true });
    } catch (error) {
      if (logout) logout();
      navigate("/login", { replace: true });
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const submitData = new FormData();
      submitData.append('username', formData.username);
      submitData.append('password', formData.password);
      submitData.append('firstName', formData.firstName);
      submitData.append('lastName', formData.lastName);
      submitData.append('email', formData.email); 
      submitData.append('contact', formData.contact);
      submitData.append('houseUnit', formData.houseUnit);
      submitData.append('street', formData.street);
      submitData.append('barangay', formData.barangay);
      submitData.append('city', formData.city);
      submitData.append('zipCode', formData.zipCode);

      // 1. Append the Profile Picture
      if (profilePic) {
        submitData.append('profilePic', profilePic); 
      }

      // 2. Append the Facial Capture Image (Convert Base64 to Blob File)
      if (capturedImage) {
        const res = await fetch(capturedImage);
        const blob = await res.blob();
        const faceFile = new File([blob], "facial_capture.jpg", { type: "image/jpeg" });
        submitData.append('facialCapture', faceFile);
      }

      // 3. Append the Mathematical Face Descriptor
      if (faceDescriptor) {
        submitData.append('facialDescriptor', JSON.stringify(faceDescriptor));
      }

      await axios.put("http://localhost:3000/api/guardian/setup", submitData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true
      });

      window.location.href = "/guardian/dashboard";
    } catch (error) {
      alert(error.response?.data?.message || "Failed to complete setup.");
      setIsSubmitting(false);
    } 
  };
  const handleNext = () => {
    if (currentStep === 0) { 
      if (formData.username.startsWith("TEMP-") || formData.username.trim() === "") {
        setErrors({ username: "Please create a new, permanent username." }); return;
      }
      if (formData.password !== formData.confirmPassword) {
        setErrors({ confirmPassword: "Passwords do not match!" }); return;
      }
      if (formData.password.length > 0 && formData.password.length < 8) {
        setErrors({ password: "Password must be at least 8 characters long." }); return;
      }
    }
    if (currentStep === 1) {
      if (formData.email.startsWith("TEMP-") || formData.email.includes("placeholder.com") || formData.email.trim() === "") {
        setErrors({ email: "Please provide a valid, permanent email address." }); return;
      }
    }
    if (currentStep === 3) {
      if (!faceDescriptor) {
        alert("Please complete the facial scan before proceeding."); return;
      }
    }
    if (currentStep === 4) { 
      if (!hasAgreed) {
        setErrors({ agreement: "You must agree to the Security Policies to finish." }); return;
      }
      handleFinalSubmit(); return;
    }
    
    if (currentStep < 4) setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep === 3) setIsCameraActive(false);
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const ErrorMsg = ({ field }) => {
    return errors[field] ? <span className="text-red-500 text-[11px] mt-1 ml-1 text-left w-full block font-medium">{errors[field]}</span> : null;
  };

  return (
    <div className="wave min-h-screen w-full flex justify-center items-center p-5 bg-fixed font-poppins">
      
      {/* CROPPER MODAL */}
      {showCropModal && (
        <div className="fixed inset-0 z-[999999] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-[360px] flex flex-col items-center animate-[fadeIn_0.2s_ease-out]">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Crop Photo</h3>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-inner">
              <AvatarEditor ref={editorRef} image={tempImage} width={200} height={200} border={20} borderRadius={100} color={[15, 23, 42, 0.5]} scale={zoom} rotate={0} />
            </div>
            <div className="flex items-center w-full gap-3 mt-5 mb-6 px-2">
              <span className="material-symbols-outlined text-slate-400 text-[18px]">zoom_out</span>
              <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="flex-1 accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer" />
              <span className="material-symbols-outlined text-slate-400 text-[18px]">zoom_in</span>
            </div>
            <div className="flex gap-3 w-full">
              <button type="button" className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100" onClick={() => { setShowCropModal(false); setTempImage(null); }}>Cancel</button>
              <button type="button" className="flex-1 py-2.5 rounded-xl font-bold text-white bg-blue-600" onClick={handleCropSave}>Apply Crop</button>
            </div>
          </div>
        </div>
      )}

      {/* CAPTURE REVIEW MODAL */}
      {showCaptureModal && capturedImage && (
        <div className="fixed inset-0 z-[999999] bg-slate-900/80 backdrop-blur-md flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-[360px] flex flex-col items-center animate-[fadeIn_0.3s_ease-out]">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-500 mb-4">
              <span className="material-symbols-outlined text-[32px]">verified_user</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Scan Successful!</h3>
            <p className="text-slate-500 text-[13px] text-center mb-6">Your facial template has been securely mapped and saved.</p>
            
            <div className="w-[180px] h-[240px] rounded-2xl overflow-hidden mb-6 border-4 border-slate-100 shadow-md">
              <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
            </div>

            <div className="flex gap-3 w-full">
              <button 
                type="button" 
                className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors" 
                onClick={() => { setShowCaptureModal(false); setFaceDescriptor(null); setIsCameraActive(true); }}
              >
                Retake
              </button>
              <button 
                type="button" 
                className="flex-1 py-3 rounded-xl font-bold text-white bg-green-500 hover:bg-green-600 shadow-md transition-colors" 
                onClick={() => setShowCaptureModal(false)}
              >
                Looks Good
              </button>
            </div>
          </div>
        </div>
      )}

      <div className='main-container flex flex-col items-start bg-white p-10 rounded-3xl w-[90%] max-w-[550px] mx-auto my-10 relative z-10 sm:p-[30px] shadow-[0_10px_40px_rgba(0,0,0,0.08)]'>
        <button onClick={handleTempLogout} className="absolute top-6 right-6 text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 text-[13px] font-bold cursor-pointer z-10" title="Logout">
          <span className="material-symbols-outlined text-[18px]">logout</span> Logout
        </button>
        <h1 className='text-left w-full mb-2'>Account Setup</h1>
        <p className='w-full mb-6 font-normal text-left text-[14px] text-slate-500'>Let's secure your profile and get you ready for the dashboard.</p>

        <div className="flex justify-center gap-2 mb-8 w-full"> 
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`h-2 rounded-full transition-all duration-500 ease-out ${currentStep === i ? 'w-8 bg-[#39a8ed]' : i < currentStep ? 'w-2 bg-[#bde0fe]' : 'w-2 bg-slate-200'}`} />
          ))}
        </div>

        <form className="flex flex-col w-full" onSubmit={(e) => e.preventDefault()}>

          {currentStep === 0 && (
            <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom'>Secure Your Account</p>
              <p className="text-[13px] text-slate-500 mb-5">Change your temporary assigned username and password to something secure.</p>
              <div className='flex flex-col w-full mb-5'><FormInputRegistration label="New Username" name="username" type='text' placeholder="e.g. john_doe99" className="form-input-modal" value={formData.username} onChange={handleInputChange} error={errors.username} /></div>
              <div className='flex flex-col w-full mb-5 relative'>
                <FormInputRegistration label="New Password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Type new password" className="form-input-modal pr-12" value={formData.password} onChange={handleInputChange} error={errors.password} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-[40px] text-slate-400 hover:text-blue-500 focus:outline-none"><span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span></button>
              </div>
              <div className='flex flex-col w-full mb-5 relative'>
                <FormInputRegistration label="Confirm Password" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Re-type your password" className="form-input-modal pr-12" value={formData.confirmPassword} onChange={handleInputChange} error={errors.confirmPassword} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-[40px] text-slate-400 hover:text-blue-500 focus:outline-none"><span className="material-symbols-outlined text-[20px]">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span></button>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom'>Guardian Information</p>
              <div className='flex flex-col w-full mb-4'>
                <label className='text-cdark text-[13px] font-semibold mb-2'>Profile Photo <span className='text-cbrand-blue ml-1 text-[12px]'>*</span></label>
                <div className="flex flex-col items-center justify-center mb-2 mt-2">
                  <input type="file" ref={fileInputRef} accept="image/*" className='hidden' onChange={handleImageUpload} />
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
                    <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-slate-100 flex items-center justify-center overflow-hidden transition-all duration-300">
                      {previewUrl ? <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[40px] text-slate-300">add_a_photo</span>}
                    </div>
                    <div className="absolute inset-0 bg-slate-900/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="material-symbols-outlined text-white text-[24px]">edit</span></div>
                  </div>
                </div>
              </div>
              <div className='flex w-full h-auto gap-4'>
                <div className='flex flex-col w-full mb-1'><FormInputRegistration label="First Name" name="firstName" type='text' placeholder="John" className="form-input-modal" value={formData.firstName} onChange={handleInputChange} /></div>
                <div className='flex flex-col w-full mb-1'><FormInputRegistration label="Last Name" name="lastName" type='text' placeholder="Doe" className="form-input-modal" value={formData.lastName} onChange={handleInputChange} /></div>
              </div>
              <div className='flex flex-col w-full mb-2'><FormInputRegistration label="Email Address" name="email" type='email' placeholder="Johndoe@gmail.com" className='registration-input' value={formData.email} onChange={handleInputChange} error={errors.email} /></div>
              <div className='flex flex-col w-full mb-2'><FormInputRegistration label="Phone Number" name="contact" type='text' placeholder="09*********" className='registration-input' value={formData.contact} onChange={handleInputChange} /></div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom'>Address Details</p>
              <div className='flex w-full h-auto gap-4'>
                <div className='flex flex-col w-full mb-5'><FormInputRegistration label="House Unit" name="houseUnit" type='text' placeholder="117" className='registration-input' value={formData.houseUnit} onChange={handleInputChange} /></div>
                <div className='flex flex-col w-full mb-5'><FormInputRegistration label="Street" name="street" type='text' placeholder="Hope Street" className='registration-input' value={formData.street} onChange={handleInputChange} /></div>
              </div>
              <div className='flex w-full h-auto gap-4'>
                <div className='flex flex-col w-full mb-5'><FormInputRegistration label="Barangay" name="barangay" type='text' placeholder="Helin Hills" className='registration-input' value={formData.barangay} onChange={handleInputChange} /></div>
                <div className='flex flex-col w-full mb-5'><FormInputRegistration label="City" name="city" type='text' placeholder="Quezon City" className='registration-input' value={formData.city} onChange={handleInputChange} /></div>
              </div>
              <div className='flex flex-col w-full mb-5'><FormInputRegistration label="Zip Code" name="zipCode" type='text' placeholder="1153" className='registration-input' value={formData.zipCode} onChange={handleInputChange} /></div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="text-center py-2 animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom text-left mb-6'>Facial Biometrics</p>
              
              {!isCameraActive && !faceDescriptor ? (
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-500 border border-blue-100"><span className="material-symbols-outlined text-[40px]">face_retouching_natural</span></div>
                  <h2 className="text-[18px] font-bold text-slate-800 mb-2">Biometric Registration</h2>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-left mb-6">
                    <p className="text-[13px] text-slate-600 leading-relaxed mb-2">To ensure the highest level of security, LuMINI uses facial recognition.</p>
                    <ul className="text-[12px] text-slate-500 space-y-1.5 list-disc pl-4 marker:text-blue-400">
                      <li>We will scan your face to create a secure template.</li>
                      <li>You will be asked to <strong>complete a sequence of tasks</strong> to verify liveness.</li>
                    </ul>
                  </div>
                  <button type="button" disabled={!modelsLoaded} onClick={() => setIsCameraActive(true)} className={`w-full text-white font-bold text-[14px] py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all ${modelsLoaded ? 'bg-slate-800 hover:bg-slate-700 cursor-pointer' : 'bg-slate-300 cursor-not-allowed'}`}>
                    <span className="material-symbols-outlined text-[20px]">{modelsLoaded ? 'photo_camera' : 'sync'}</span> 
                    {modelsLoaded ? 'Open Camera & Scan' : 'Loading AI Models...'}
                  </button>
                </div>
              ) : faceDescriptor && !isCameraActive ? (
                <div className="flex flex-col items-center animate-[fadeIn_0.3s_ease-out]">
                   <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4 text-green-500 border border-green-200 shadow-inner">
                     <span className="material-symbols-outlined text-[40px]">verified</span>
                   </div>
                   <h2 className="text-[20px] font-bold text-slate-800 mb-2">Scan Complete!</h2>
                   <p className="text-[13px] text-slate-500 mb-6">Your facial template has been securely captured.</p>
                   <button type="button" onClick={() => { setFaceDescriptor(null); setCapturedImage(null); setIsCameraActive(true); }} className="text-blue-600 font-bold text-[13px] hover:underline cursor-pointer">
                     Retake Scan
                   </button>
                </div>
              ) : (
                <div className="flex flex-col items-center w-full animate-[fadeIn_0.3s_ease-out]">
                   <div className="w-full h-[320px] bg-slate-900 rounded-2xl flex items-center justify-center text-white mb-4 relative overflow-hidden border-2 border-slate-200 shadow-xl">
                      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover scale-x-[-1] z-0" />
                      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1] z-[5]" />

                      {!isVideoPlaying && !cameraError && (
                         <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-[6] bg-slate-900 text-slate-400 animate-pulse"><span className="material-symbols-outlined text-[48px]">videocam</span><span className="text-[12px] font-medium tracking-widest uppercase">Initializing...</span></div>
                      )}
                      
                      {isVideoPlaying && !cameraError && (
                        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                          <div className={`w-[190px] h-[250px] rounded-[100%] ${ovalClass}`} style={{borderRadius: '50% / 50%'}}></div>
                        </div>
                      )}

                      {countdownValue !== null && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px]">
                          <span className="text-white text-[100px] font-black drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] animate-[ping_1s_cubic-bezier(0,0,0.2,1)_infinite]">
                            {countdownValue}
                          </span>
                        </div>
                      )}
                   </div>

                   <p className={`text-[14px] font-bold mb-5 px-4 text-center transition-colors duration-300 ${
                      scanStatus.includes("✅") ? "text-green-600" : 
                      scanStatus.includes("⚠️") ? "text-red-500" : 
                      scanStatus.includes("blink") || scanStatus.includes("LEFT") || scanStatus.includes("RIGHT") ? "text-blue-600 animate-pulse" : "text-slate-600"
                   }`}>
                     {cameraError ? "Check browser settings." : scanStatus}
                   </p>

                   <button type="button" onClick={() => setIsCameraActive(false)} className="text-[13px] font-bold text-slate-500 hover:text-red-500 transition-colors px-4 py-2 cursor-pointer">Cancel Scan</button>
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom'>Terms & Conditions</p>
              <p className="text-[13px] text-slate-500 mb-5">Please read and agree to our policies before finalizing your account.</p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 h-48 overflow-y-auto custom-scrollbar text-[12px] text-slate-600 mb-4 shadow-inner">
                <strong className="text-slate-800 text-[14px] block mb-2">LuMINI Guardian Security & Privacy Agreement</strong>
                <ol className="list-decimal pl-4 space-y-2 mb-2">
                  <li><strong>Accuracy:</strong> You certify that all personal information and documents provided are true and accurate.</li>
                  <li><strong>Security:</strong> You are responsible for maintaining the confidentiality of your login credentials.</li>
                  <li><strong>Biometric Consent:</strong> You consent to the secure storage and processing of facial biometric data for identity verification purposes only.</li>
                </ol>
              </div>
              <div className='flex items-center gap-3 bg-blue-50/30 p-4 rounded-xl border border-blue-100 mb-2'>
                <input type="checkbox" id="userAgreement" className="w-[18px] h-[18px] cursor-pointer accent-blue-600 shrink-0" checked={hasAgreed} onChange={(e) => { setHasAgreed(e.target.checked); if (e.target.checked) setErrors(prev => ({ ...prev, agreement: null })); }} />
                <label htmlFor="userAgreement" className="text-[13px] text-slate-800 font-medium cursor-pointer leading-snug">I confirm that all provided information is accurate and I agree to the Security Policies.</label>
              </div>
              <ErrorMsg field="agreement" />
            </div>
          )}

          <div className="flex flex-row w-full mt-6 gap-[15px]">
            <button type="button" className="btn btn-outline flex-1 h-12 rounded-3xl font-semibold text-[15px] disabled:opacity-50" onClick={handleBack} disabled={currentStep === 0}>Back</button>
            <button type="button" className={`btn btn-primary flex-1 h-12 rounded-3xl font-semibold text-[15px] flex items-center justify-center gap-2 ${currentStep === 4 && !hasAgreed ? 'opacity-70 grayscale-[20%]' : ''}`} onClick={handleNext} disabled={isSubmitting || (currentStep === 3 && (!faceDescriptor || isCameraActive))}>{isSubmitting ? "Saving..." : currentStep === 4 ? 'Finish Setup' : 'Continue'} {currentStep === 4 && !isSubmitting && <span className="material-symbols-outlined text-[18px]">done_all</span>}</button>
          </div>

        </form>
      </div>
    </div>
  );
}