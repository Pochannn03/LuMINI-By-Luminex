import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import * as faceapi from "face-api.js";
import { useAuth } from "../../../context/AuthProvider";
import '../../../styles/auth/registration.css'; 
import FormInputRegistration from '../../../components/FormInputRegistration';
import AvatarEditor from "react-avatar-editor";

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

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [scanStatus, setScanStatus] = useState("Initializing camera...");
  const [ovalClass, setOvalClass] = useState("border-white/50 shadow-[0_0_0_9999px_rgba(15,23,42,0.6)] border-2");
  const [countdownValue, setCountdownValue] = useState(null);
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
      } catch (err) { console.error("❌ Failed to load models:", err); }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (isCameraActive && currentStep === 3) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [isCameraActive, currentStep]);

  const startCamera = async () => {
    setCameraError(null); setIsVideoPlaying(false);
    setScanStatus("Requesting camera access...");
    setOvalClass("border-white/50 shadow-[0_0_0_9999px_rgba(15,23,42,0.6)] border-2");
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

  const takeSnapshot = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const startDetectionSequence = () => {
    let isDetecting = true;
    let phase = 0; let framesHeld = 0; let countdownSecs = 3; let countdownFrames = 0; 
    let lostFaceFrames = 0; let mouthPhase = 0; let mouthHoldFrames = 0;
    let collectedDescriptors = []; 

    stopDetectionRef.current = () => { isDetecting = false; };

    const runDetection = async () => {
      if (!isDetecting || !videoRef.current || !canvasRef.current) return;
      if (videoRef.current.videoWidth === 0) { setTimeout(runDetection, 100); return; }
      if (canvasRef.current.width !== videoRef.current.videoWidth) {
        canvasRef.current.width = videoRef.current.videoWidth; canvasRef.current.height = videoRef.current.videoHeight;
      }
      const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
      faceapi.matchDimensions(canvasRef.current, displaySize);
      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.55 })).withFaceLandmarks().withFaceDescriptor();
      const ctx = canvasRef.current.getContext('2d'); ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      if (!detection) {
        lostFaceFrames++;
        if (lostFaceFrames > 8) { 
          phase = 0; framesHeld = 0; mouthPhase = 0; mouthHoldFrames = 0; countdownSecs = 3; collectedDescriptors = [];
          setCountdownValue(null); setOvalClass("border-red-500 shadow-[0_0_0_9999px_rgba(15,23,42,0.8)] border-[4px] transition-all");
          setScanStatus("⚠️ Face lost! Sequence reset.");
        } else if (phase === 8) {
          countdownFrames++;
          if (countdownFrames >= 8) { countdownFrames = 0; if (countdownSecs > 1) { countdownSecs--; setCountdownValue(countdownSecs); } }
        }
      } else {
        lostFaceFrames = 0; 
        if (phase < 8) {
          const resizedDetections = faceapi.resizeResults(detection, displaySize);
          faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections, { drawLines: true, color: '#00ffff', lineWidth: 1.5 });
        }
        if (phase === 0) {
          setOvalClass("border-green-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.7)] border-[4px] transition-all");
          setScanStatus("Face detected! Hold still..."); phase = 1;
        } 
        else if (phase === 1) {
          framesHeld++; if (framesHeld > 10) { phase = 2; framesHeld = 0; }
        } 
        else if (phase === 2) {
          const mouth = detection.landmarks.getMouth();
          const mar = calculateMAR(mouth);
          if (mouthPhase === 0) {
            setScanStatus("Task 1: Please OPEN your mouth.");
            if (mar > 0.4) { mouthPhase = 1; }
          } else if (mouthPhase === 1) {
            setScanStatus("Task 1: Now CLOSE your mouth.");
            if (mar < 0.15) { mouthPhase = 2; }
          } else if (mouthPhase === 2) {
            setScanStatus("Loading..."); mouthHoldFrames++;
            if (mouthHoldFrames > 15) { mouthPhase = 3; mouthHoldFrames = 0; } 
          } else if (mouthPhase === 3) {
            setScanStatus("Task 1: Please OPEN your mouth again.");
            if (mar > 0.4) { mouthPhase = 4; }
          } else if (mouthPhase === 4) {
            setScanStatus("Task 1: Now CLOSE your mouth.");
            if (mar < 0.15) { mouthPhase = 5; }
          } else if (mouthPhase === 5) {
            setScanStatus("Loading..."); mouthHoldFrames++;
            if (mouthHoldFrames > 15) { phase = 3; setScanStatus("✅ Liveness verified!"); }
          }
        } 
        else if (phase === 3) {
          framesHeld++; if (framesHeld > 15) { phase = 4; framesHeld = 0; setScanStatus("Task 2: Slowly turn your head to your LEFT."); }
        } else if (phase === 4) {
          if (calculateYawRatio(detection.landmarks) > 1.6) { phase = 5; framesHeld = 0; setScanStatus("✅ Left turn verified!"); }
        } else if (phase === 5) {
          framesHeld++; if (framesHeld > 15) { phase = 6; framesHeld = 0; setScanStatus("Task 3: Slowly turn your head to your RIGHT."); }
        } else if (phase === 6) {
          if (calculateYawRatio(detection.landmarks) < 0.6) { phase = 7; framesHeld = 0; setScanStatus("✅ Right turn verified!"); }
        } else if (phase === 7) {
          framesHeld++; if (framesHeld > 15) { phase = 8; countdownSecs = 3; setScanStatus("Excellent! Look at the camera."); setCountdownValue(3); }
        } else if (phase === 8) {
          countdownFrames++;
          if (countdownFrames >= 8) { 
            countdownFrames = 0; countdownSecs--;
            if (countdownSecs > 0) { setCountdownValue(countdownSecs); } 
            else { setCountdownValue(null); setScanStatus("Scanning facial geometry..."); phase = 9; }
          }
        } else if (phase === 9) {
          collectedDescriptors.push(Array.from(detection.descriptor));
          if (collectedDescriptors.length >= 5) { 
            setScanStatus("Processing Master Template...");
            let averagedDescriptor = new Array(128).fill(0);
            for (let i = 0; i < collectedDescriptors.length; i++) {
              for (let j = 0; j < 128; j++) { averagedDescriptor[j] += collectedDescriptors[i][j]; }
            }
            averagedDescriptor = averagedDescriptor.map(val => val / collectedDescriptors.length);
            setCapturedImage(takeSnapshot());
            setFaceDescriptor(averagedDescriptor);
            isDetecting = false; stopCamera(); setIsCameraActive(false); setShowCaptureModal(true); return; 
          }
        }
      }
      if (isDetecting) { setTimeout(runDetection, 100); }
    };
    runDetection(); 
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setTempImage(URL.createObjectURL(file));
      setShowCropModal(true); setZoom(1);
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
          setShowCropModal(false); setTempImage(null);
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
      // Updated to use BACKEND_URL
      await axios.post(`${BACKEND_URL}/api/auth/logout`, {}, { withCredentials: true });
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
      Object.keys(formData).forEach(key => submitData.append(key, formData[key]));

      if (profilePic) submitData.append('profilePic', profilePic); 
      if (capturedImage) {
        const res = await fetch(capturedImage);
        const blob = await res.blob();
        submitData.append('facialCapture', new File([blob], "facial_capture.jpg", { type: "image/jpeg" }));
      }
      if (faceDescriptor) submitData.append('facialDescriptor', JSON.stringify(faceDescriptor));
      // Updated to use BACKEND_URL
      await axios.put(`${BACKEND_URL}/api/guardian/setup`, submitData, {
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
      if (!faceDescriptor) { alert("Please complete the facial scan."); return; }
    }
    if (currentStep === 4) { 
      if (!hasAgreed) { setErrors({ agreement: "Agreement required." }); return; }
      handleFinalSubmit(); return;
    }
    if (currentStep < 4) setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep === 3) setIsCameraActive(false);
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const ErrorMsg = ({ field }) => errors[field] ? <span className="text-red-500 text-[11px] mt-1 ml-1 text-left w-full block font-medium">{errors[field]}</span> : null;

  return (
    <div className="wave min-h-screen w-full flex justify-center items-center p-5 bg-fixed font-poppins">
      {showCropModal && (
        <div className="fixed inset-0 z-[999999] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-[360px] flex flex-col items-center animate-[fadeIn_0.2s_ease-out]">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Crop Photo</h3>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200"><AvatarEditor ref={editorRef} image={tempImage} width={200} height={200} border={20} borderRadius={100} color={[15, 23, 42, 0.5]} scale={zoom} rotate={0} /></div>
            <div className="flex items-center w-full gap-3 mt-5 mb-6 px-2"><span className="material-symbols-outlined text-slate-400">zoom_out</span><input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="flex-1 accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer" /><span className="material-symbols-outlined text-slate-400">zoom_in</span></div>
            <div className="flex gap-3 w-full"><button type="button" className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100" onClick={() => { setShowCropModal(false); setTempImage(null); }}>Cancel</button><button type="button" className="flex-1 py-2.5 rounded-xl font-bold text-white bg-blue-600" onClick={handleCropSave}>Apply</button></div>
          </div>
        </div>
      )}

      {showCaptureModal && capturedImage && (
        <div className="fixed inset-0 z-[999999] bg-slate-900/80 backdrop-blur-md flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-[360px] flex flex-col items-center animate-[fadeIn_0.3s_ease-out]">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-500 mb-4"><span className="material-symbols-outlined text-[32px]">verified_user</span></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Scan Successful!</h3>
            <div className="w-[180px] h-[240px] rounded-2xl overflow-hidden mb-6 border-4 border-slate-100 shadow-md"><img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" /></div>
            <div className="flex gap-3 w-full"><button type="button" className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100" onClick={() => { setShowCaptureModal(false); setFaceDescriptor(null); setIsCameraActive(true); }}>Retake</button><button type="button" className="flex-1 py-3 rounded-xl font-bold text-white bg-green-500" onClick={() => setShowCaptureModal(false)}>Looks Good</button></div>
          </div>
        </div>
      )}

      <div className='main-container flex flex-col items-start bg-white p-10 rounded-3xl w-[90%] max-w-[550px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] relative'>
        <button onClick={handleTempLogout} className="absolute top-6 right-6 text-slate-400 hover:text-red-500 flex items-center gap-1 text-[13px] font-bold"><span className="material-symbols-outlined text-[18px]">logout</span> Logout</button>
        <h1 className='text-left w-full mb-2'>Account Setup</h1>
        <p className='w-full mb-6 font-normal text-left text-[14px] text-slate-500'>Secure your profile for the dashboard.</p>
        <div className="flex justify-center gap-2 mb-8 w-full"> 
          {[...Array(5)].map((_, i) => (<div key={i} className={`h-2 rounded-full transition-all duration-500 ${currentStep === i ? 'w-8 bg-[#39a8ed]' : i < currentStep ? 'w-2 bg-[#bde0fe]' : 'w-2 bg-slate-200'}`} />))}
        </div>
        <form className="flex flex-col w-full" onSubmit={(e) => e.preventDefault()}>
          {currentStep === 0 && (
            <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom'>Secure Your Account</p>
              <div className='mb-5'><FormInputRegistration label="New Username" name="username" placeholder="john_doe99" value={formData.username} onChange={handleInputChange} error={errors.username} /></div>
              <div className='mb-5 relative'><FormInputRegistration label="New Password" name="password" type={showPassword ? 'text' : 'password'} placeholder="New password" value={formData.password} onChange={handleInputChange} error={errors.password} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-[40px] text-slate-400"><span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span></button></div>
              <div className='mb-5 relative'><FormInputRegistration label="Confirm Password" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm password" value={formData.confirmPassword} onChange={handleInputChange} error={errors.confirmPassword} /><button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-[40px] text-slate-400"><span className="material-symbols-outlined text-[20px]">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span></button></div>
            </div>
          )}
          {currentStep === 1 && (
            <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom'>Information</p>
              <div className='mb-4'><div className="flex flex-col items-center justify-center"><input type="file" ref={fileInputRef} className='hidden' onChange={handleImageUpload} /><div className="relative cursor-pointer" onClick={() => fileInputRef.current.click()}><div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-slate-100 flex items-center justify-center overflow-hidden">{previewUrl ? <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[40px] text-slate-300">add_a_photo</span>}</div></div></div></div>
              <div className='flex gap-4'><FormInputRegistration label="First Name" name="firstName" value={formData.firstName} onChange={handleInputChange} /><FormInputRegistration label="Last Name" name="lastName" value={formData.lastName} onChange={handleInputChange} /></div>
              <FormInputRegistration label="Email" name="email" value={formData.email} onChange={handleInputChange} error={errors.email} />
              <FormInputRegistration label="Phone" name="contact" value={formData.contact} onChange={handleInputChange} />
            </div>
          )}
          {currentStep === 2 && (
            <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom'>Address Details</p>
              <div className='flex gap-4'><FormInputRegistration label="House Unit" name="houseUnit" value={formData.houseUnit} onChange={handleInputChange} /><FormInputRegistration label="Street" name="street" value={formData.street} onChange={handleInputChange} /></div>
              <div className='flex gap-4'><FormInputRegistration label="Barangay" name="barangay" value={formData.barangay} onChange={handleInputChange} /><FormInputRegistration label="City" name="city" value={formData.city} onChange={handleInputChange} /></div>
              <FormInputRegistration label="Zip Code" name="zipCode" value={formData.zipCode} onChange={handleInputChange} />
            </div>
          )}
          {currentStep === 3 && (
            <div className="text-center py-2 animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom text-left mb-6'>Facial Biometrics</p>
              {!isCameraActive && !faceDescriptor ? (
                <div className="flex flex-col items-center"><div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-500"><span className="material-symbols-outlined text-[40px]">face_retouching_natural</span></div><button disabled={!modelsLoaded} onClick={() => setIsCameraActive(true)} className={`w-full text-white font-bold py-3.5 rounded-xl ${modelsLoaded ? 'bg-slate-800' : 'bg-slate-300'}`}>{modelsLoaded ? 'Open Camera & Scan' : 'Loading AI Models...'}</button></div>
              ) : faceDescriptor && !isCameraActive ? (
                <div className="flex flex-col items-center"><div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4 text-green-500"><span className="material-symbols-outlined text-[40px]">verified</span></div><button onClick={() => { setFaceDescriptor(null); setIsCameraActive(true); }} className="text-blue-600 font-bold">Retake Scan</button></div>
              ) : (
                <div className="flex flex-col items-center w-full">
                  <div className="w-full h-[320px] bg-slate-900 rounded-2xl relative overflow-hidden border-2 border-slate-200">
                    <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" /><canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1] z-[5]" />
                    {isVideoPlaying && (<div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className={ovalClass} style={{width: '190px', height: '250px', borderRadius: '50%'}}></div></div>)}
                    {countdownValue !== null && (<div className="absolute inset-0 flex items-center justify-center bg-slate-900/50"><span className="text-white text-[100px] font-black">{countdownValue}</span></div>)}
                  </div>
                  <p className="text-[14px] font-bold my-4 px-4 text-center">{scanStatus}</p><button onClick={() => setIsCameraActive(false)} className="text-slate-500">Cancel</button>
                </div>
              )}
            </div>
          )}
          {currentStep === 4 && (
            <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom'>Terms & Conditions</p>
              <div className="bg-slate-50 border p-5 h-48 overflow-y-auto text-[12px] text-slate-600 mb-4 shadow-inner">
                <strong className="text-slate-800 text-[14px] block mb-2">LuMINI Guardian Security Agreement</strong>
                <ol className="list-decimal pl-4 space-y-2"><li>Accuracy: Information provided is accurate.</li><li>Security: Confidentiality of credentials.</li><li>Biometric Consent: Processing of facial data for verification.</li></ol>
              </div>
              <div className='flex items-center gap-3 bg-blue-50/30 p-4 rounded-xl border border-blue-100'><input type="checkbox" id="userAgreement" className="w-[18px] h-[18px]" checked={hasAgreed} onChange={(e) => setHasAgreed(e.target.checked)} /><label htmlFor="userAgreement" className="text-[13px]">I confirm information accuracy and agree to policies.</label></div>
              <ErrorMsg field="agreement" />
            </div>
          )}
          <div className="flex flex-row w-full mt-6 gap-[15px]">
            <button type="button" className="btn btn-outline flex-1 h-12 rounded-3xl font-semibold" onClick={handleBack} disabled={currentStep === 0}>Back</button>
            <button type="button" className={`btn btn-primary flex-1 h-12 rounded-3xl font-semibold flex items-center justify-center gap-2 ${currentStep === 4 && !hasAgreed ? 'opacity-70 grayscale' : ''}`} onClick={handleNext} disabled={isSubmitting || (currentStep === 3 && (!faceDescriptor || isCameraActive))}>{isSubmitting ? "Saving..." : currentStep === 4 ? 'Finish Setup' : 'Continue'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}