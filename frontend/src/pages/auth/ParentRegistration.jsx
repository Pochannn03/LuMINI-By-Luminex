import React, { useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as faceapi from "face-api.js";
import '../../styles/auth/registration.css'
import FormInputRegistration from '../../components/FormInputRegistration';
import { validateRegistrationStep } from '../../utils/validation';
import AvatarEditor from "react-avatar-editor";
import SuccessModal from '../../components/SuccessModal'; 

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

export default function ParentRegistration() {
  const navigate = useNavigate();

  // Phase & Steps States //
  const [phase, setPhase] = useState('invitation');
  const [currentStep, setCurrentStep] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [code, setCode] = useState(Array(6).fill(""));
  
  // Refs & State for Errors //
  const inputRefs = useRef([]); 
  const [errors, setErrors] = useState({});
  
  // Profile Image State //
  const [profileImage, setProfileImage] = useState(null); 
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Student Name //
  const [studentInfo, setStudentInfo] = useState(null);

  // User Agreement State //
  const [hasAgreed, setHasAgreed] = useState(false);

  // Password Visibility States //
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Success Modal State //
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Cropper States //
  const editorRef = useRef(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  // ==========================================
  // FACIAL VERIFICATION STATES & REFS 
  // ==========================================
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

  // Form Inputs Placeholder //
  const [formData, setFormData] = useState({
    username: '', password: '', confirmPassword: '', firstName: '', lastName: '', email: '',
    phoneNumber: '09', relationship: 'Parent', houseUnit: '', street: '', barangay: '', city: '', zipCode: '',
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
  // CAMERA & LIVENESS LOGIC 
  // ==========================================
  useEffect(() => {
    if (isCameraActive && currentStep === 4) {
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

  const startDetectionSequence = () => {
    let isDetecting = true;
    let phase = 0; let framesHeld = 0; 
    let countdownSecs = 3; let countdownFrames = 0; let lostFaceFrames = 0; 
    let mouthPhase = 0; 
    let mouthHoldFrames = 0;
    let collectedDescriptors = []; 

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
          phase = 0; framesHeld = 0; mouthPhase = 0; mouthHoldFrames = 0;
          countdownSecs = 3; countdownFrames = 0; collectedDescriptors = [];
          setCountdownValue(null);
          setOvalClass("border-red-500 shadow-[0_0_0_9999px_rgba(15,23,42,0.8)] border-[4px] transition-all duration-300");
          setScanStatus("⚠️ Face lost! Sequence reset. Please center yourself.");
        } else if (phase === 8) {
          countdownFrames++;
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
        } 
        else if (phase === 1) {
          framesHeld++;
          if (framesHeld > 10) { phase = 2; framesHeld = 0; }
        } 
        else if (phase === 2) {
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
        } 
        else if (phase === 3) {
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
            phase = 8; countdownSecs = 3; countdownFrames = 0; 
            setScanStatus("Excellent! Look directly at the camera. Capturing..."); 
            setCountdownValue(3); 
          }
        } else if (phase === 8) {
          countdownFrames++;
          if (countdownFrames >= 8) { 
            countdownFrames = 0; countdownSecs--;
            if (countdownSecs > 0) { 
              setCountdownValue(countdownSecs); 
            } else {
              setCountdownValue(null); 
              setScanStatus("Scanning facial geometry...");
              phase = 9; 
            }
          }
        } else if (phase === 9) {
          collectedDescriptors.push(Array.from(detection.descriptor));
          if (collectedDescriptors.length >= 5) { 
            setScanStatus("Processing Master Template...");
            let averagedDescriptor = new Array(128).fill(0);
            for (let i = 0; i < collectedDescriptors.length; i++) {
              for (let j = 0; j < 128; j++) {
                averagedDescriptor[j] += collectedDescriptors[i][j];
              }
            }
            averagedDescriptor = averagedDescriptor.map(val => val / collectedDescriptors.length);
            const imgData = takeSnapshot();
            setCapturedImage(imgData);
            setFaceDescriptor(averagedDescriptor);
            isDetecting = false; stopCamera(); setIsCameraActive(false); setShowCaptureModal(true); return; 
          }
        }
      }
      if (isDetecting) { setTimeout(runDetection, 100); }
    };
    runDetection(); 
  };

  const validateStep = (step) => {
    if (step === 4 || step === 5) return true; 
    const newErrors = validateRegistrationStep(step, formData, profileImage, 'user');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setTempImage(imageUrl);
      setShowCropModal(true); 
      setZoom(1);
    }
    if (fileInputRef.current) fileInputRef.current.value = null; 
    if (errors.profileImage) setErrors(prev => ({ ...prev, profileImage: null }));
  };

  const handleCropSave = () => {
    if (editorRef.current) {
      const canvas = editorRef.current.getImageScaledToCanvas();
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], "parent_photo.jpg", { type: "image/jpeg" });
          setProfileImage(croppedFile); 
          setPreviewUrl(URL.createObjectURL(croppedFile)); 
          setShowCropModal(false);
          setTempImage(null);
        }
      }, "image/jpeg", 0.95);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'phoneNumber') {
      finalValue = finalValue.replace(/\D/g, '');
      if (finalValue.startsWith('639')) finalValue = '0' + finalValue.substring(2);
      if (!finalValue.startsWith('09')) finalValue = '09';
      finalValue = finalValue.slice(0, 11);
    }
    setFormData(prev => ({ ...prev, [name]: finalValue }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };
  
  const handleCodeChange = (e, index) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode); 
    if (value && index < 5) inputRefs.current[index + 1].focus();
  };

  const handleCodeKeyDown = (e, index) => {
    if (e.key === "Backspace" && !code[index] && index > 0) inputRefs.current[index - 1].focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!pastedData) return;
    const newCode = [...code];
    for (let i = 0; i < 6; i++) { if (pastedData[i]) newCode[i] = pastedData[i]; }
    setCode(newCode);
    const nextEmptyIndex = newCode.findIndex(val => val === "");
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
    if (inputRefs.current[focusIndex]) inputRefs.current[focusIndex].focus();
  };

  const handleSubmitCode = async () => {
    const invitationCode = code.join("");
    if (invitationCode.length === 6) {
      try {
        // Updated to BACKEND_URL
        const response = await axios.post(`${BACKEND_URL}/api/invitations/validate`, { 
          code: invitationCode 
        });
        setStudentInfo(response.data.fullName);
        setOpacity(0); 
        setTimeout(() => {
          setPhase('registration');
          setTimeout(() => setOpacity(1), 50);
        }, 300);
      } catch (error) {
        alert(error.response?.data?.msg || "Invalid or expired code.");
      }
    } else {
      alert("Please enter a valid 6-character code.");
    }
  };

  const handleSubmitForm = async () => {
    const data = new FormData();
    data.append('username', formData.username);
    data.append('password', formData.password);
    data.append('invitation_code', code.join(""));
    data.append('email', formData.email);
    data.append('first_name', formData.firstName);
    data.append('last_name', formData.lastName);
    data.append('phone_number', formData.phoneNumber);
    data.append('relationship', formData.relationship);
    data.append('address', `${formData.houseUnit}, ${formData.street}, ${formData.barangay}, ${formData.city}, ${formData.zipCode}`);
    
    if (profileImage) data.append('profile_photo', profileImage); 
    if (capturedImage) {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      data.append('facialCapture', new File([blob], "facial_capture.jpg", { type: "image/jpeg" }));
    }
    if (faceDescriptor) data.append('facialDescriptor', JSON.stringify(faceDescriptor));

    try {
      // Updated to BACKEND_URL
      await axios.post(`${BACKEND_URL}/api/parents`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccessMessage("Your account has been successfully created!");
      setIsSuccessModalOpen(true);
    } catch (error) {
      console.error('Error registering:', error);
      alert(error.response?.data?.errors?.[0]?.msg || "Registration failed.");
    }
  };

  const handleCloseSuccess = () => { setIsSuccessModalOpen(false); navigate('/login'); };
  
  const handleNext = () => {
    const isValid = validateStep(currentStep);
    if (isValid) {
      if (currentStep === 4 && !faceDescriptor) {
        alert("Please complete the facial scan before proceeding.");
        return;
      }
      if (currentStep < 5) { setCurrentStep((prev) => prev + 1); } 
      else if (currentStep === 5) { 
        if (!hasAgreed) {
          setErrors(prev => ({ ...prev, agreement: "You must agree to the Terms to register." }));
          return;
        }
        handleSubmitForm();
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 4) setIsCameraActive(false); 
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const ErrorMsg = ({ field }) => errors[field] ? (
    <span className="text-red-500 text-[11px] mt-1 ml-1 text-left w-full block font-medium">{errors[field]}</span>
  ) : null;

  return (
    <div className="wave min-h-screen w-full flex justify-center items-center p-5">
      <SuccessModal isOpen={isSuccessModalOpen} onClose={handleCloseSuccess} message={successMessage} />

      {showCaptureModal && capturedImage && (
        <div className="fixed inset-0 z-[999999] bg-slate-900/80 backdrop-blur-md flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-[360px] flex flex-col items-center animate-[fadeIn_0.3s_ease-out]">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-500 mb-4"><span className="material-symbols-outlined text-[32px]">verified_user</span></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Scan Successful!</h3>
            <div className="w-[180px] h-[240px] rounded-2xl overflow-hidden mb-6 border-4 border-slate-100 shadow-md"><img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" /></div>
            <div className="flex gap-3 w-full">
              <button type="button" className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200" onClick={() => { setShowCaptureModal(false); setFaceDescriptor(null); setIsCameraActive(true); }}>Retake</button>
              <button type="button" className="flex-1 py-3 rounded-xl font-bold text-white bg-green-500 hover:bg-green-600" onClick={() => setShowCaptureModal(false)}>Looks Good</button>
            </div>
          </div>
        </div>
      )}

      {showCropModal && (
        <div className="fixed inset-0 z-[999999] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-[360px] flex flex-col items-center animate-[fadeIn_0.2s_ease-out]">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Crop Photo</h3>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200"><AvatarEditor ref={editorRef} image={tempImage} width={200} height={200} border={20} borderRadius={100} color={[15, 23, 42, 0.5]} scale={zoom} rotate={0} /></div>
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
      
      {phase === 'invitation' && (
        <div className='main-container flex flex-col items-start bg-white p-10 rounded-3xl w-[90%] max-w-[500px] mx-auto my-10 relative z-10 opacity-0 sm:p-[25px]' style={{ opacity: opacity }}>
          <h1>Enter Invitation Code</h1>
          <p className='text-clight text-[14px]'>Enter the invitation code provided by your child's teacher.</p>
          <div className='code-inputs-wrapper flex justify-between gap-2 w-full my-[30px] mb-0 sm:gap-[5px]'>
            {code.map((data, index) => (
              <input key={index} ref={el => inputRefs.current[index] = el} type="text" maxLength="1" className="code-box" value={data} onChange={e => handleCodeChange(e, index)} onKeyDown={e => handleCodeKeyDown(e, index)} onPaste={handlePaste} onFocus={e => e.target.select()} />
            ))}
          </div>
          <button type='button' className='btn btn-primary w-full h-12 mt-7 rounded-[30px]' onClick={handleSubmitCode}>Submit</button>
          <div className='flex flex-row justify-center items-center mt-[15px] gap-1.5 w-full'>
            <span className='text-clight text-[14px]'>Already have an account?</span>
            <Link to='/login' className='login-link'>Sign In</Link>
          </div>
        </div>
      )}

      {phase === 'registration' && (
        <div className='main-container flex flex-col items-start bg-white p-10 rounded-3xl w-[90%] max-w-[500px] mx-auto my-10 relative z-10 opacity-0 sm:p-[25px]' style={{ opacity: opacity }}>
          <h1 className='text-left w-full mb-2'>Create Account</h1>
          <p className='w-full mb-4 text-left'>Please fill out the form to create your parent account.</p>
          <div className="flex justify-center gap-2 mb-6 w-full"> 
            {[...Array(6)].map((_, i) => ( 
              <div key={i} className={`h-2 rounded-full transition-all duration-500 ${currentStep === i ? 'w-8 bg-[#39a8ed]' : i < currentStep ? 'w-2 bg-[#bde0fe]' : 'w-2 bg-slate-200'}`} />
            ))}
          </div>
          <form className="flex flex-col w-full" onSubmit={(e) => e.preventDefault()}>
            {currentStep === 0 && (
              <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
                <p className='border-bottom-custom'>Account Setup</p>
                <FormInputRegistration label="Username" name="username" placeholder="e.g Parent_Juan" value={formData.username} onChange={handleChange} error={errors.username} required={true} />
                <div className='relative'>
                  <FormInputRegistration label="Password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Password" value={formData.password} onChange={handleChange} error={errors.password} required={true} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-[40px] text-slate-400"><span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span></button>
                </div>
                <div className='relative'>
                  <FormInputRegistration label="Confirm Password" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} error={errors.confirmPassword} required={true} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-[40px] text-slate-400"><span className="material-symbols-outlined text-[20px]">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span></button>
                </div>
              </div>
            )}
            {currentStep === 1 && (
              <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
                <p className='border-bottom-custom'>Parent Information</p>
                <div className='flex flex-col items-center mb-4'>
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
                    <div className={`w-24 h-24 rounded-full border-4 border-white shadow-lg bg-slate-100 flex items-center justify-center overflow-hidden`}>
                      {previewUrl ? <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[40px] text-slate-300">add_a_photo</span>}
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} accept="image/*" className='hidden' onChange={handleImageUpload} />
                  <ErrorMsg field="profileImage" />
                </div>
                <div className='flex gap-4'>
                  <FormInputRegistration label="First Name" name="firstName" placeholder="John" value={formData.firstName} onChange={handleChange} error={errors.firstName} required={true} />
                  <FormInputRegistration label="Last Name" name="lastName" placeholder="Doe" value={formData.lastName} onChange={handleChange} error={errors.lastName} required={true} />
                </div>
                <FormInputRegistration label="Email Address" name="email" placeholder="johndoe@email.com" value={formData.email} onChange={handleChange} error={errors.email} required={true} />
                <FormInputRegistration label="Phone Number" name="phoneNumber" placeholder="09*********" value={formData.phoneNumber} onChange={handleChange} error={errors.phoneNumber} required={true} />
              </div>
            )}
            {currentStep === 2 && (
              <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
                <p className='border-bottom-custom'>Relationship</p>
                <FormInputRegistration label="Relationship" name="relationship" value={formData.relationship} readOnly={true} />
                <FormInputRegistration label="Child's name" name="childName" value={studentInfo || "Loading..."} readOnly={true} />
              </div>
            )}
            {currentStep === 3 && (
              <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
                <p className='border-bottom-custom'>Address</p>
                <div className='flex gap-4'>
                  <FormInputRegistration label="Unit" name="houseUnit" placeholder="117" value={formData.houseUnit} onChange={handleChange} error={errors.houseUnit} required={true} />
                  <FormInputRegistration label="Street" name="street" placeholder="Street" value={formData.street} onChange={handleChange} error={errors.street} required={true} />
                </div>
                <div className='flex gap-4'>
                  <FormInputRegistration label="Barangay" name="barangay" value={formData.barangay} onChange={handleChange} error={errors.barangay} required={true} />
                  <FormInputRegistration label="City" name="city" value={formData.city} onChange={handleChange} error={errors.city} required={true} />
                </div>
                <FormInputRegistration label="Zip Code" name="zipCode" value={formData.zipCode} onChange={handleChange} error={errors.zipCode} required={true} />
              </div>
            )}
            {currentStep === 4 && (
              <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
                <p className='border-bottom-custom'>Facial Biometrics</p>
                {!isCameraActive && !faceDescriptor ? (
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-500"><span className="material-symbols-outlined text-[40px]">face_retouching_natural</span></div>
                    <button type="button" disabled={!modelsLoaded} onClick={() => setIsCameraActive(true)} className={`w-full text-white font-bold py-3.5 rounded-xl shadow-md ${modelsLoaded ? 'bg-slate-800' : 'bg-slate-300'}`}>
                      {modelsLoaded ? 'Open Camera & Scan' : 'Loading AI...'}
                    </button>
                  </div>
                ) : faceDescriptor && !isCameraActive ? (
                  <div className="flex flex-col items-center"><div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4 text-green-500"><span className="material-symbols-outlined text-[40px]">verified</span></div><button type="button" onClick={() => { setFaceDescriptor(null); setIsCameraActive(true); }} className="text-blue-600 font-bold">Retake Scan</button></div>
                ) : (
                  <div className="flex flex-col items-center w-full">
                    <div className="w-full h-[320px] bg-slate-900 rounded-2xl relative overflow-hidden border-2 border-slate-200">
                      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />
                      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1] z-[5]" />
                      {isVideoPlaying && (<div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className={ovalClass} style={{width: '190px', height: '250px', borderRadius: '50%'}}></div></div>)}
                      {countdownValue !== null && (<div className="absolute inset-0 flex items-center justify-center bg-slate-900/50"><span className="text-white text-[100px] font-black">{countdownValue}</span></div>)}
                    </div>
                    <p className="text-[14px] font-bold my-4">{scanStatus}</p>
                    <button type="button" onClick={() => setIsCameraActive(false)} className="text-slate-500">Cancel</button>
                  </div>
                )}
              </div>
            )}
            {currentStep === 5 && (
              <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
                <p className='border-bottom-custom'>Agreement</p>
                <div className='bg-slate-50 border p-4 h-[200px] overflow-y-auto text-[12px]'>
                  <strong>LuMINI User Agreement</strong>
                  <p>By registering, you consent to the secure capture of biometric data for pickup verification.</p>
                </div>
                <div className='flex items-center gap-2 mt-4 bg-blue-50 p-3 rounded-lg border border-blue-100'>
                  <input type="checkbox" id="userAgreement" className="w-[18px] h-[18px]" checked={hasAgreed} onChange={(e) => setHasAgreed(e.target.checked)} />
                  <label htmlFor="userAgreement" className="text-[13px] font-medium">I agree to the Terms and Conditions</label>
                </div>
                <ErrorMsg field="agreement" />
              </div>
            )}
            <div className="flex flex-row w-full mt-4 gap-[15px]">
              <button type="button" className="btn btn-outline flex-1 h-12 rounded-3xl font-semibold" onClick={handleBack} disabled={currentStep === 0}>Back</button>
              <button type="button" className="btn btn-primary flex-1 h-12 rounded-3xl font-semibold" onClick={handleNext} disabled={currentStep === 4 && isCameraActive}>
                {currentStep === 5 ? 'Complete Registration' : 'Next'} 
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}