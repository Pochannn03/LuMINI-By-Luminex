import React, { useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as faceapi from "face-api.js";
import '../../styles/auth/registration.css';
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

export default function TeacherRegistration() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [profileImage, setProfileImage] = useState(null); 
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const [schoolIdFile, setSchoolIdFile] = useState(null);
  const [schoolIdPreview, setSchoolIdPreview] = useState(null);
  const [validIdFile, setValidIdFile] = useState(null);
  const [validIdPreview, setValidIdPreview] = useState(null);
  const [viewImage, setViewImage] = useState(null); 
  const [hasAgreed, setHasAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const editorRef = useRef(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const [zoom, setZoom] = useState(1);
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
    username: '', password: '', confirmPassword: '', firstName: '', lastName: '', email: '',
    phoneNumber: '09', relationship: 'Teacher', houseUnit: '', street: '', barangay: '', city: '', zipCode: '',
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
    if (isCameraActive && currentStep === 4) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [isCameraActive, currentStep]);

  const startCamera = async () => {
    setCameraError(null); setIsVideoPlaying(false);
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
          videoRef.current.play(); setIsVideoPlaying(true); startDetectionSequence(); 
        };
      }
    } catch (err) { setCameraError("Camera access denied."); }
  };

  const stopCamera = () => {
    if (stopDetectionRef.current) stopDetectionRef.current();
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    setIsVideoPlaying(false);
  };

  const takeSnapshot = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0); ctx.scale(-1, 1); ctx.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const startDetectionSequence = () => {
    let isDetecting = true;
    let phase = 0; let framesHeld = 0; 
    let countdownSecs = 3; let countdownFrames = 0; let lostFaceFrames = 0; 
    let mouthPhase = 0; let mouthHoldFrames = 0;
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
          setCountdownValue(null); setOvalClass("border-red-500 shadow-[0_0_0_9999px_rgba(15,23,42,0.8)] border-[4px] transition-all duration-300");
          setScanStatus("⚠️ Face lost! Sequence reset.");
        } else if (phase === 8) { countdownFrames++; }
      } else {
        lostFaceFrames = 0; 
        if (phase < 8) {
          const resizedDetections = faceapi.resizeResults(detection, displaySize);
          faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections, { drawLines: true, color: '#00ffff', lineWidth: 1.5 });
        }
        if (phase === 0) {
          setOvalClass("border-green-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.7)] border-[4px] transition-all duration-300");
          setScanStatus("Face detected! Hold still..."); phase = 1;
        } else if (phase === 1) {
          framesHeld++; if (framesHeld > 10) { phase = 2; framesHeld = 0; }
        } else if (phase === 2) {
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
        } else if (phase === 3) {
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

  const validateStep = (step) => {
    if (step >= 3) return true; 
    const newErrors = validateRegistrationStep(step, formData, profileImage, 'admin');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
          const croppedFile = new File([blob], "teacher_photo.jpg", { type: "image/jpeg" });
          setProfileImage(croppedFile); 
          setPreviewUrl(URL.createObjectURL(croppedFile)); 
          setShowCropModal(false); setTempImage(null);
        }
      }, "image/jpeg", 0.95);
    }
  };

  const handleIdUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      if (type === 'school') { setSchoolIdFile(file); setSchoolIdPreview(previewUrl); } 
      else if (type === 'valid') { setValidIdFile(file); setValidIdPreview(previewUrl); }
    }
    e.target.value = null; 
  };

  const handleDeleteId = (type) => {
    if (type === 'school') { setSchoolIdFile(null); setSchoolIdPreview(null); } 
    else if (type === 'valid') { setValidIdFile(null); setValidIdPreview(null); }
    setViewImage(null); 
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };
  
  const handleSubmitForm = async () => {
    const data = new FormData();
    data.append('username', formData.username);
    data.append('password', formData.password);
    data.append('email', formData.email);
    data.append('first_name', formData.firstName);
    data.append('last_name', formData.lastName);
    data.append('phone_number', formData.phoneNumber);
    data.append('relationship', formData.relationship);
    data.append('address', `${formData.houseUnit}, ${formData.street}, ${formData.barangay}, ${formData.city}, ${formData.zipCode}`);
      
    if (profileImage) data.append('profile_photo', profileImage); 
    if (schoolIdFile) data.append('school_id_photo', schoolIdFile);
    if (validIdFile) data.append('valid_id_photo', validIdFile);
    if (capturedImage) {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      data.append('facialCapture', new File([blob], "facial_capture.jpg", { type: "image/jpeg" }));
    }
    if (faceDescriptor) data.append('facialDescriptor', JSON.stringify(faceDescriptor));

    try {
      // Updated to use BACKEND_URL
      await axios.post(`${BACKEND_URL}/api/teachers`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccessMessage("Your registration has been submitted for review!");
      setIsSuccessModalOpen(true);
    } catch (error) {
      console.error('Registration Error:', error);
      alert(error.response?.data?.msg || "Registration failed. Please try again.");
    }
  };

  const handleCloseSuccess = () => { setIsSuccessModalOpen(false); navigate('/login'); };
  
  const handleNext = () => {
    const isValid = validateStep(currentStep);
    if (isValid) {
      if (currentStep < 3) { setCurrentStep((prev) => prev + 1); } 
      else if (currentStep === 3) {
        if (!schoolIdFile || !validIdFile) {
          setErrors(prev => ({ ...prev, schoolId: !schoolIdFile ? "Required" : null, validId: !validIdFile ? "Required" : null }));
          return; 
        }
        setCurrentStep((prev) => prev + 1); 
      } else if (currentStep === 4) {
        if (!faceDescriptor) { alert("Please complete the facial scan."); return; }
        setCurrentStep((prev) => prev + 1); 
      } else if (currentStep === 5) {
        if (!hasAgreed) { setErrors(prev => ({ ...prev, agreement: "Agreement required." })); return; }
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
      {showCaptureModal && capturedImage && (
        <div className="fixed inset-0 z-[999999] bg-slate-900/80 backdrop-blur-md flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-[360px] flex flex-col items-center animate-[fadeIn_0.3s_ease-out]">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-500 mb-4"><span className="material-symbols-outlined text-[32px]">verified_user</span></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Scan Successful!</h3>
            <div className="w-[180px] h-[240px] rounded-2xl overflow-hidden mb-6 border-4 border-slate-100 shadow-md"><img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" /></div>
            <div className="flex gap-3 w-full">
              <button type="button" className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100" onClick={() => { setShowCaptureModal(false); setFaceDescriptor(null); setIsCameraActive(true); }}>Retake</button>
              <button type="button" className="flex-1 py-3 rounded-xl font-bold text-white bg-green-500" onClick={() => setShowCaptureModal(false)}>Looks Good</button>
            </div>
          </div>
        </div>
      )}

      {viewImage && (
        <div className="fixed inset-0 z-[999999] bg-slate-900/90 backdrop-blur-sm flex flex-col justify-center items-center p-6">
          <button className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/10 text-white rounded-full" onClick={() => setViewImage(null)}><span className="material-symbols-outlined text-[28px]">close</span></button>
          <img src={viewImage.url} alt="ID" className="max-w-[90vw] max-h-[75vh] rounded-xl border-[4px] border-white/20 object-contain mb-8"/>
          <div className="flex gap-4">
            <button onClick={() => handleDeleteId(viewImage.type)} className="bg-red-500 text-white px-6 py-3 rounded-full font-bold shadow-lg">Delete Photo</button>
            <button onClick={() => setViewImage(null)} className="bg-emerald-500 text-white px-6 py-3 rounded-full font-bold shadow-lg">Looks Good</button>
          </div>
        </div>
      )}

      <SuccessModal isOpen={isSuccessModalOpen} onClose={handleCloseSuccess} message={successMessage} />

      {showCropModal && (
        <div className="fixed inset-0 z-[999999] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-[360px] flex flex-col items-center animate-[fadeIn_0.2s_ease-out]">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Crop Photo</h3>
            <AvatarEditor ref={editorRef} image={tempImage} width={200} height={200} border={20} borderRadius={100} color={[15, 23, 42, 0.5]} scale={zoom} rotate={0} />
            <div className="flex items-center w-full gap-3 mt-5 mb-6 px-2">
              <span className="material-symbols-outlined text-slate-400">zoom_out</span>
              <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="flex-1 accent-blue-600 h-1.5 bg-slate-200 rounded-lg" />
              <span className="material-symbols-outlined text-slate-400">zoom_in</span>
            </div>
            <div className="flex gap-3 w-full">
              <button type="button" className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100" onClick={() => { setShowCropModal(false); setTempImage(null); }}>Cancel</button>
              <button type="button" className="flex-1 py-2.5 rounded-xl font-bold text-white bg-blue-600" onClick={handleCropSave}>Apply Crop</button>
            </div>
          </div>
        </div>
      )}

      <div className='main-container flex flex-col items-start bg-white p-10 rounded-3xl w-[90%] max-w-[500px] mx-auto my-10 relative z-10 sm:p-[25px]'>
        <h1 className='text-left w-full mb-2'>Create Account</h1>
        <p className='w-full mb-4 text-[14px] text-slate-500'>Fill out the form to create your teacher account.</p>

        <div className="flex justify-center gap-2 mb-6 w-full"> 
          {[...Array(6)].map((_, i) => ( 
            <div key={i} className={`h-2 rounded-full transition-all duration-500 ${currentStep === i ? 'w-8 bg-[#39a8ed]' : i < currentStep ? 'w-2 bg-[#bde0fe]' : 'w-2 bg-slate-200'}`} />
          ))}
        </div>

        <form className="flex flex-col w-full" onSubmit={(e) => e.preventDefault()}>
          {currentStep === 0 && (
            <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom'>Account Setup</p>
              <FormInputRegistration label="Username" name="username" placeholder="e.g. Teacher_Juan" value={formData.username} onChange={handleChange} error={errors.username} required={true} />
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
              <p className='border-bottom-custom'>Teacher Information</p>
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
              <p className='border-bottom-custom'>Address Details</p>
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

          {currentStep === 3 && (
            <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom'>Verification Documents</p>
              <div className="flex gap-4 mb-4">
                <div className='flex-1'>
                  <label className='text-[12px] font-semibold mb-2 block'>School ID *</label>
                  {schoolIdPreview ? (
                    <div onClick={() => setViewImage({ url: schoolIdPreview, type: 'school' })} className="w-full h-32 border-2 border-emerald-400 bg-emerald-50 rounded-xl flex items-center justify-center cursor-pointer shadow-sm"><span className="material-symbols-outlined text-emerald-500">check_circle</span></div>
                  ) : (
                    <label className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center cursor-pointer"><span className="material-symbols-outlined text-slate-300">add_photo_alternate</span><input type="file" accept="image/*" className="hidden" onChange={(e) => handleIdUpload(e, 'school')} /></label>
                  )}
                  <ErrorMsg field="schoolId" />
                </div>
                <div className='flex-1'>
                  <label className='text-[12px] font-semibold mb-2 block'>Valid ID *</label>
                  {validIdPreview ? (
                    <div onClick={() => setViewImage({ url: validIdPreview, type: 'valid' })} className="w-full h-32 border-2 border-emerald-400 bg-emerald-50 rounded-xl flex items-center justify-center cursor-pointer shadow-sm"><span className="material-symbols-outlined text-emerald-500">check_circle</span></div>
                  ) : (
                    <label className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center cursor-pointer"><span className="material-symbols-outlined text-slate-300">add_photo_alternate</span><input type="file" accept="image/*" className="hidden" onChange={(e) => handleIdUpload(e, 'valid')} /></label>
                  )}
                  <ErrorMsg field="validId" />
                </div>
              </div>
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
                  <p className="text-[14px] font-bold my-4 px-4 text-center">{scanStatus}</p>
                  <button type="button" onClick={() => setIsCameraActive(false)} className="text-slate-500">Cancel</button>
                </div>
              )}
            </div>
          )}

          {currentStep === 5 && (
            <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom'>Terms and Conditions</p>
              <div className='bg-slate-50 border p-4 h-[200px] overflow-y-auto text-[12px] text-slate-600 leading-relaxed'>
                <strong>LuMINI Teacher User Agreement</strong>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Your registration requires approval by a Super Admin.</li>
                  <li>You agree to keep student data confidential.</li>
                  <li>You consent to biometric verification for system access.</li>
                </ol>
              </div>
              <div className='flex items-center gap-2 mt-4 bg-blue-50 p-3 rounded-lg border border-blue-100'>
                <input type="checkbox" id="userAgreement" className="w-[18px] h-[18px] cursor-pointer" checked={hasAgreed} onChange={(e) => setHasAgreed(e.target.checked)} />
                <label htmlFor="userAgreement" className="text-[13px] font-medium cursor-pointer">I have read and agree to the Terms</label>
              </div>
              <ErrorMsg field="agreement" />
            </div>
          )}

          <div className="flex flex-row w-full mt-4 gap-[15px]">
            <button type="button" className="btn btn-outline flex-1 h-12 rounded-3xl font-semibold" onClick={handleBack} disabled={currentStep === 0}>Back</button>
            <button type="button" className={`btn btn-primary flex-1 h-12 rounded-3xl font-semibold transition-all ${currentStep === 5 && !hasAgreed ? 'opacity-70' : ''}`} onClick={handleNext} disabled={currentStep === 4 && isCameraActive}>
              {currentStep === 5 ? 'Complete' : 'Next'} 
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}