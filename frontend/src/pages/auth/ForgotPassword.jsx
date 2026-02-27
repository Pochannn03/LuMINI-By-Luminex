import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react'; 
import axios from "axios";
import * as faceapi from "face-api.js";
import secureBgImage from '../../assets/Secure.jpg'; 
import fastBgImage from '../../assets/CheckIns.jpg';  
import updatesBgImage from '../../assets/Updates.jpg';
import '../../styles/auth/login.css'; 

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

export default function ForgotPassword() {
  const navigate = useNavigate(); 
  
  const [currentStep, setCurrentStep] = useState(0); 
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  
  const [foundUserId, setFoundUserId] = useState(null);

  // --- FACIAL RECOGNITION STATES ---
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

  // --- SLIDER STATE ---
  const [featureIndex, setFeatureIndex] = useState(0);
  const features = [
    { title: "Secure Identity", text: "Ensure only authorized guardians can pick up students.", bgImage: secureBgImage },
    { title: "Fast Check-in", text: "QR code integration allows for instant attendance logging.", bgImage: fastBgImage },
    { title: "Real-time Updates", text: "Parents get notified instantly via SMS or App notification.", bgImage: updatesBgImage }
  ];

  useEffect(() => {
    const interval = setInterval(() => { setFeatureIndex((prev) => (prev + 1) % features.length); }, 5000); 
    return () => clearInterval(interval);
  }, [features.length]);

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

  // --- CAMERA LOGIC ---
  useEffect(() => {
    if (isCameraActive && currentStep === 1) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [isCameraActive, currentStep]);

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
          videoRef.current.play();
          setIsVideoPlaying(true);
          startDetectionSequence(); 
        };
      }
    } catch (err) {
      setCameraError("Camera access denied. Please check your browser settings.");
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
    let phase = 0; let framesHeld = 0; let blinkClosed = false; let blinkCount = 0; 
    let recognitionFrames = 0; let lostFaceFrames = 0; 

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
            phase = 8; recognitionFrames = 0; 
            setScanStatus("Authenticating against database... Please hold still."); setIsRecognizing(true); 
          }
        } else if (phase === 8) {
          recognitionFrames++;
          if (recognitionFrames >= 15) { 
            isDetecting = false; stopCamera(); setIsCameraActive(false); 
            handleBiometricMatch(Array.from(detection.descriptor));
            return; 
          }
        }
      }
      if (isDetecting) { setTimeout(runDetection, 100); }
    };
    runDetection(); 
  };

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
    if(error) setError('');
  };

  // STEP 0: Find the User Account 
  const handleSearchAccount = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.firstName || !formData.lastName || !formData.email) {
      setError("Please fill in all fields."); return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/forgot-password/search`, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email
      });
      setFoundUserId(response.data.userId);
      setCurrentStep(1); 
    } catch (err) {
      setError(err.response?.data?.message || "Account not found. Please check your details.");
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 1: Verify Face Mathematically against Database
  const handleBiometricMatch = async (descriptorArray) => {
    try {
        await axios.post(`${BACKEND_URL}/api/auth/forgot-password/verify-face`, {
            userId: foundUserId,
            facialDescriptor: descriptorArray
        });
        // Success!
        setFaceVerified(true);
        setCurrentStep(2); 
    } catch (err) {
        alert(err.response?.data?.message || "Biometric verification failed. Face does not match.");
        setFaceVerified(false);
        setIsCameraActive(false); 
    }
  };

  // STEP 2: Request OTP manually
  const requestOTP = async () => {
      try {
          setIsLoading(true);
          await axios.post(`${BACKEND_URL}/api/auth/forgot-password/send-otp`, { userId: foundUserId });
          setOtpSent(true);
      } catch (err) {
          setError("Failed to send OTP. Please try again.");
      } finally {
          setIsLoading(false);
      }
  };

  // STEP 2.5: Move to Password Input
  const handleProceedToReset = (e) => {
    e.preventDefault();
    if (otpInput.length !== 6) {
        setError("OTP must be exactly 6 digits."); return;
    }
    setCurrentStep(3); // Let them type the password before verifying the final payload
  };

  // STEP 3: Final Submission (Verify OTP + Reset Password)
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
        setError("Passwords do not match!"); return;
    }
    if (formData.newPassword.length < 8) {
        setError("Password must be at least 8 characters."); return;
    }

    setIsLoading(true);
    try {
        await axios.post(`${BACKEND_URL}/api/auth/forgot-password/reset`, {
            userId: foundUserId,
            otp: otpInput,
            newPassword: formData.newPassword
        });
        
        alert("Password Successfully Reset! Redirecting to login...");
        navigate('/login');
    } catch (err) {
        setError(err.response?.data?.message || "Failed to reset password. OTP might be invalid.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-white font-poppins overflow-hidden">
      
      {/* ---------------- TOP/LEFT SECTION: SLIDER ---------------- */}
      <div className="w-full h-[30vh] relative flex items-center overflow-hidden transition-all duration-1000 ease-in-out justify-start lg:h-full lg:w-1/2 lg:justify-center bg-size-[180%] lg:bg-cover" style={{ backgroundImage: `url(${features[featureIndex].bgImage})`, backgroundPosition: 'center' }}>
        <div className="relative z-10 w-full max-w-xl pb-12 pl-10 pr-8 text-left lg:px-16 lg:text-center lg:pb-0">
            <h3 className="text-3xl lg:text-5xl font-extrabold text-[#2c3e50] mb-3 lg:mb-6 transition-all duration-500 tracking-tight">{features[featureIndex].title}</h3>
            <p className="text-[#2c3e50] text-sm lg:text-xl leading-relaxed font-semibold transition-all duration-500 max-w-sm mx-0 lg:mx-auto">{features[featureIndex].text}</p>
            <div className="flex gap-2.5 mt-6 justify-start lg:mt-12 lg:justify-center">
              {features.map((_, idx) => (
                <button key={idx} onClick={() => setFeatureIndex(idx)} className={`h-2 lg:h-2.5 rounded-full transition-all duration-500 ease-in-out shadow-sm ${idx === featureIndex ? `w-8 lg:w-12 bg-[var(--brand-blue)]` : 'w-2 lg:w-2.5 bg-gray-400 hover:bg-gray-600'}`}/>
              ))}
            </div>
        </div>
      </div>

      {/* ---------------- BOTTOM/RIGHT SECTION: FORM WIZARD ---------------- */}
      <div className="w-full flex-1 bg-white rounded-t-[30px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] -mt-8 relative z-20 lg:w-1/2 lg:h-full lg:rounded-none lg:shadow-none lg:mt-0 lg:flex lg:flex-col lg:justify-center overflow-y-auto lg:overflow-hidden">
        
        <div className="w-full max-w-md lg:max-w-xl mx-auto px-8 pt-8 pb-12 lg:p-16 lg:flex lg:flex-col lg:justify-center min-h-full">
            
            {/* Header */}
            <div className="mb-6 text-left">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-[#2c3e50] mb-2 tracking-tight">Account Recovery</h2>
              <p className="text-gray-500 text-sm lg:text-base">
                {currentStep === 0 && "Enter your details to locate your account."}
                {currentStep === 1 && "Complete the security scan to verify your identity."}
                {currentStep === 2 && "Request and enter your verification code."}
                {currentStep === 3 && "Create a strong new password."}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2 animate-shake">
                <span className="font-bold">!</span> {error}
              </div>
            )}

            {/* --- STEP 0: SEARCH ACCOUNT --- */}
            {currentStep === 0 && (
                <form onSubmit={handleSearchAccount} className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex gap-4 w-full">
                        <div className="space-y-1 flex-1">
                            <label className="text-sm font-semibold text-gray-700 ml-1">First Name</label>
                            <div className="relative group flex items-center">
                                <div className="absolute left-4 text-gray-400 group-focus-within:text-[var(--brand-blue)] transition-colors"><User size={20} /></div>
                                <input type="text" id="firstName" className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--brand-blue)] transition-all text-sm text-gray-700 placeholder-gray-400" placeholder="John" value={formData.firstName} onChange={handleChange} />
                            </div>
                        </div>
                        <div className="space-y-1 flex-1">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Last Name</label>
                            <div className="relative group flex items-center">
                                <div className="absolute left-4 text-gray-400 group-focus-within:text-[var(--brand-blue)] transition-colors"><User size={20} /></div>
                                <input type="text" id="lastName" className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--brand-blue)] transition-all text-sm text-gray-700 placeholder-gray-400" placeholder="Doe" value={formData.lastName} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-700 ml-1">Email Address</label>
                        <div className="relative group flex items-center">
                            <div className="absolute left-4 text-gray-400 group-focus-within:text-[var(--brand-blue)] transition-colors"><Mail size={20} /></div>
                            <input type="email" id="email" className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--brand-blue)] transition-all text-sm text-gray-700 placeholder-gray-400" placeholder="johndoe@email.com" value={formData.email} onChange={handleChange} />
                        </div>
                    </div>

                    <button type="submit" disabled={isLoading} className="w-full h-12 mt-6 bg-[var(--brand-blue)] hover:bg-[#2c8ac4] text-white rounded-xl font-bold text-lg shadow-md transform active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer">
                        {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Find My Account"}
                    </button>
                </form>
            )}

            {/* --- STEP 1: FACIAL BIOMETRICS --- */}
            {currentStep === 1 && (
                <div className="flex flex-col items-center w-full animate-[fadeIn_0.3s_ease-out]">
                    {!isCameraActive ? (
                        <>
                            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-6">
                                <span className="material-symbols-outlined text-[40px]">face_retouching_natural</span>
                            </div>
                            <button type="button" disabled={!modelsLoaded} onClick={() => setIsCameraActive(true)} className={`w-full h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 ${modelsLoaded ? 'bg-slate-800 hover:bg-slate-700 cursor-pointer' : 'bg-slate-300 cursor-not-allowed'}`}>
                                <span className="material-symbols-outlined text-[20px]">{modelsLoaded ? 'photo_camera' : 'sync'}</span> 
                                {modelsLoaded ? 'Open Camera' : 'Loading AI Models...'}
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="w-full h-[300px] lg:h-[350px] bg-slate-900 rounded-2xl flex items-center justify-center text-white relative overflow-hidden border-2 border-slate-200 shadow-xl">
                                <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover scale-x-[-1] z-0" />
                                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1] z-[5]" />

                                {!isVideoPlaying && !cameraError && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-[6] bg-slate-900 text-slate-400 animate-pulse">
                                        <span className="material-symbols-outlined text-[48px]">videocam</span><span className="text-[12px] font-medium tracking-widest uppercase">Initializing...</span>
                                    </div>
                                )}
                                
                                {isVideoPlaying && !cameraError && (
                                    <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                                        <div className={ovalClass} style={{ width: '190px', height: '250px', borderRadius: '50% / 50%' }}></div>
                                    </div>
                                )}

                                {isRecognizing && (
                                    <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(4px)' }}>
                                        <span className="material-symbols-outlined text-blue-500 text-[50px] animate-spin mb-4">autorenew</span>
                                        <span className="text-white text-[16px] font-bold tracking-wider animate-pulse mb-2">Analyzing Data...</span>
                                        <span className="text-slate-400 text-[12px] font-medium">Please keep the camera still</span>
                                    </div>
                                )}
                            </div>

                            <p className={`text-[14px] font-bold mt-4 mb-2 text-center transition-colors duration-300 ${scanStatus.includes("✅") ? "text-green-600" : scanStatus.includes("⚠️") ? "text-red-500" : scanStatus.includes("blink") || scanStatus.includes("LEFT") || scanStatus.includes("RIGHT") ? "text-blue-600 animate-pulse" : "text-slate-600"}`}>
                                {cameraError ? "Check browser settings." : scanStatus}
                            </p>
                            <button type="button" onClick={() => setIsCameraActive(false)} className="text-[13px] font-bold text-slate-400 hover:text-red-500 transition-colors cursor-pointer">Cancel Scan</button>
                        </>
                    )}
                </div>
            )}

            {/* --- STEP 2: EMAIL OTP --- */}
            {currentStep === 2 && (
                 <div className="animate-[fadeIn_0.3s_ease-out] flex flex-col items-center">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-2">
                        <span className="material-symbols-outlined text-[32px]">verified</span>
                    </div>
                    <h4 className="text-[18px] text-[#1e293b] font-bold mb-2">Biometrics Verified</h4>
                    
                    {!otpSent ? (
                        <>
                            <p className="text-[13px] text-[#64748b] text-center mb-6">
                                Please send the OTP to your registered email to continue.
                            </p>
                            <button type="button" disabled={isLoading} onClick={requestOTP} className="w-full h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center cursor-pointer transition-colors">
                                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Send OTP To Me Dawg"}
                            </button>
                        </>
                    ) : (
                        <form onSubmit={handleProceedToReset} className="w-full flex flex-col items-center">
                            <p className="text-[13px] text-[#64748b] text-center mb-4">
                                We've sent a 6-digit security code to your email.
                            </p>
                            <div className="w-full space-y-1">
                                <div className="relative group">
                                    <input type="text" className="w-full h-14 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--brand-blue)] transition-all text-center font-bold text-2xl tracking-[0.5em] text-gray-700" placeholder="------" maxLength="6" value={otpInput} onChange={(e) => {setOtpInput(e.target.value.replace(/\D/g, '')); setError('');}} />
                                </div>
                            </div>
                            <button type="submit" disabled={otpInput.length < 6} className="w-full h-12 mt-4 bg-[var(--brand-blue)] hover:bg-[#2c8ac4] text-white rounded-xl font-bold text-lg shadow-md transform active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50">
                                Verify Code
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* --- STEP 3: RESET PASSWORD --- */}
            {currentStep === 3 && (
                <form onSubmit={handleResetPassword} className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-700 ml-1">New Password</label>
                        <div className="relative flex items-center">
                            <div className="absolute left-4 text-gray-400"><Lock size={20} /></div>
                            <input type={showPassword ? "text" : "password"} id="newPassword" className="w-full h-12 pl-12 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--brand-blue)] transition-all text-sm text-gray-700" placeholder="••••••••" value={formData.newPassword} onChange={handleChange} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer outline-none">
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-700 ml-1">Confirm Password</label>
                        <div className="relative flex items-center">
                            <div className="absolute left-4 text-gray-400"><Lock size={20} /></div>
                            <input type={showConfirmPassword ? "text" : "password"} id="confirmPassword" className="w-full h-12 pl-12 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--brand-blue)] transition-all text-sm text-gray-700" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer outline-none">
                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={isLoading} className="w-full h-12 mt-6 bg-[var(--brand-blue)] hover:bg-[#2c8ac4] text-white rounded-xl font-bold text-lg shadow-md transform active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer">
                        {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Reset Password"}
                    </button>
                </form>
            )}

            {/* Back to Login Link */}
            <div className="mt-8 text-center">
              <Link to="/login" className="text-sm font-semibold text-slate-400 hover:text-[var(--brand-blue)] transition-colors flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to Login
              </Link>
            </div>

        </div>
      </div>
    </div>
  );
}