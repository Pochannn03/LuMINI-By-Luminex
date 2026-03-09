import React, { useState, useEffect, useRef } from "react";
import { Link } from 'react-router-dom';
import { io } from "socket.io-client";
import { useAuth } from "../../context/AuthProvider";
import axios from 'axios';
import * as faceapi from "face-api.js"; 
import NavBar from "../../components/navigation/NavBar";
import AdminQueueParentGuardian from "../../components/modals/admin/dashboard/AdminQueueParentGuardian"
import AdminDashboardQrScan from "../../components/modals/admin/dashboard/AdminDashboardQrScan"
import AdminConfirmPickUpAuth from "../../components/modals/admin/dashboard/AdminConfirmPickUpAuth";
import AdminActionFeedbackModal from '../../components/modals/admin/TeacherActionModal';
import AdminEmergencyOverrideModal from "../../components/modals/admin/dashboard/AdminEmergencyOverride";
import AdminEmergencyBroadcastModal from "../../components/modals/admin/dashboard/AdminEmergencyBroadcastModal"; 
import WarningModal from "../../components/WarningModal";
import blingSound from '../../assets/Bling.mp3.m4a';
import blingBeepSound from '../../assets/BlipBleep.mp3.m4a';
import "../../styles/admin-teacher/admin-dashboard.css"

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

export default function AdminDashboard() {
  const { user } = useAuth();

  const teacherSections = useRef([]);
  const isAuthModalOpenRef = useRef(false);
  const transferSuccessDataRef = useRef(null);

  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [isEmergencyBroadcastModalOpen, setIsEmergencyBroadcastModalOpen] = useState(false); 

  const [activeScanMode, setActiveScanMode] = useState(null);
  const [queue, setQueue] = useState([]);
  const [errorTitle, setErrorTitle] = useState("Error");
  const [errorMainMsg, setErrorMainMsg] = useState("An error occurred");
  const [errorMessage, setErrorMessage] = useState("");
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [transferSuccessData, setTransferSuccessData] = useState(null);
  const [posting, setPosting] = useState(false);

  const [announcementData, setAnnouncementData] = useState({ content: '', category: 'notifications_active' });
  const [sections, setSections] = useState([]); 
  const [selectedSection, setSelectedSection] = useState("");

  // --- NEW: Custom Dropdown States ---
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const sectionRef = useRef(null);
  const categoryRef = useRef(null);

  const [scannedData, setScannedData] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loadingScan, setLoadingScan] = useState(false);

  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [scannedStudentData, setScannedStudentData] = useState(null);

  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [systemAnnouncements, setSystemAnnouncements] = useState([]);

  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [warningTitle, setWarningTitle] = useState("");
  const [warningMessage, setWarningMessage] = useState("");

  const [needsBiometricSetup, setNeedsBiometricSetup] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [scanStatus, setScanStatus] = useState("Initializing camera...");
  const [ovalClass, setOvalClass] = useState("border-white/50 shadow-[0_0_0_9999px_rgba(15,23,42,0.6)] border-2");
  const [countdownValue, setCountdownValue] = useState(null);
  const [faceDescriptor, setFaceDescriptor] = useState(null); 
  const [capturedImage, setCapturedImage] = useState(null); 
  const [isSavingBiometrics, setIsSavingBiometrics] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null); 
  const streamRef = useRef(null);
  const stopDetectionRef = useRef(null);

  // Click Outside Listener for Custom Dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (sectionRef.current && !sectionRef.current.contains(event.target)) setIsSectionOpen(false);
      if (categoryRef.current && !categoryRef.current.contains(event.target)) setIsCategoryOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Check if Teacher needs to set up biometrics
  useEffect(() => {
    const checkBiometrics = async () => {
      if (user?.role === 'admin') {
        try {
          const res = await axios.get(`${BACKEND_URL}/api/teacher/check-biometrics`, { withCredentials: true });
          if (res.data.needsBiometrics) {
            setNeedsBiometricSetup(true);
            loadModels(); 
          }
        } catch (err) {
          console.error("Error checking biometrics", err);
        }
      }
    };
    checkBiometrics();
  }, [user]);

  // 2. Load Models
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

  useEffect(() => {
    if (isCameraActive) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [isCameraActive]);

  const startCamera = async () => {
    setCameraError(null); setIsVideoPlaying(false);
    setScanStatus("Requesting camera access..."); setCountdownValue(null);
    setOvalClass("border-white/50 shadow-[0_0_0_9999px_rgba(15,23,42,0.6)] border-2");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
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
    let phase = 0; 
    let framesHeld = 0; 
    let countdownSecs = 3; 
    let countdownFrames = 0; 
    let lostFaceFrames = 0; 
    let mouthPhase = 0; 
    let mouthHoldFrames = 0;
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
          phase = 0; framesHeld = 0; mouthPhase = 0; mouthHoldFrames = 0;
          countdownSecs = 3; countdownFrames = 0; collectedDescriptors = [];
          setCountdownValue(null); setOvalClass("border-red-500 shadow-[0_0_0_9999px_rgba(15,23,42,0.8)] border-[4px] transition-all duration-300");
          setScanStatus("⚠️ Face lost! Sequence reset. Please center yourself.");
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
          setOvalClass("border-green-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.7)] border-[4px] shadow-[inset_0_0_20px_rgba(74,222,128,0.3)] transition-all duration-300");
          setScanStatus("Face detected! Hold still..."); phase = 1;
        } 
        else if (phase === 1) {
          framesHeld++; if (framesHeld > 10) { phase = 2; framesHeld = 0; }
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
          framesHeld++; if (framesHeld > 15) { phase = 4; framesHeld = 0; setScanStatus("Task 2: Slowly turn your head to your LEFT."); }
        } else if (phase === 4) {
          if (calculateYawRatio(detection.landmarks) > 1.6) { phase = 5; framesHeld = 0; setScanStatus("✅ Left turn verified! Please hold..."); }
        } else if (phase === 5) {
          framesHeld++; if (framesHeld > 15) { phase = 6; framesHeld = 0; setScanStatus("Task 3: Slowly turn your head to your RIGHT."); }
        } else if (phase === 6) {
          if (calculateYawRatio(detection.landmarks) < 0.6) { phase = 7; framesHeld = 0; setScanStatus("✅ Right turn verified! Please hold..."); }
        } else if (phase === 7) {
          framesHeld++; if (framesHeld > 15) { phase = 8; countdownSecs = 3; countdownFrames = 0; setScanStatus("Excellent! Look directly at the camera. Capturing..."); setCountdownValue(3); }
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
            isDetecting = false; stopCamera(); setIsCameraActive(false); return; 
          }
        }
      }
      if (isDetecting) { setTimeout(runDetection, 100); }
    };
    runDetection(); 
  };

  const handleSaveBiometrics = async () => {
    setIsSavingBiometrics(true);
    try {
      const data = new FormData();
      if (capturedImage) {
        const res = await fetch(capturedImage);
        const blob = await res.blob();
        data.append('facialCapture', new File([blob], "facial_capture.jpg", { type: "image/jpeg" }));
      }
      if (faceDescriptor) data.append('facialDescriptor', JSON.stringify(faceDescriptor));

      await axios.put(`${BACKEND_URL}/api/teacher/update-biometrics`, data, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setTransferSuccessData({ type: 'success', title: 'Security Updated', message: "Your facial biometrics have been secured successfully!" });
      setNeedsBiometricSetup(false); 
    } catch (err) {
      console.error(err);
      alert("Failed to save biometrics. Please try again.");
      setFaceDescriptor(null); setCapturedImage(null);
    } finally {
      setIsSavingBiometrics(false);
    }
  }

  const handleScanSuccess = async (rawValue) => {
    setActiveScanMode(null);
    setLoadingScan(true);
    const parentTokenRegex = /^[0-9a-f]{32}$/i;
    const studentIdRegex = /^\d{4}-\d{4}$/;

    try {
      if (activeScanMode === 'user') {
        if (!parentTokenRegex.test(rawValue)) {
          throw new Error("Invalid Parent Pass. Please scan a valid Pickup Token.");
        }
        const response = await axios.get(`${BACKEND_URL}/api/scan/pass/${rawValue}`, {
          withCredentials: true
        });

        if (response.data.valid) {
          new Audio(blingSound).play(); // Success Sound
          setScannedData({ ...response.data, token: rawValue });
          setIsAuthModalOpen(true);
        }
      } 
      else if (activeScanMode === 'student') {
        if (!studentIdRegex.test(rawValue)) {
          throw new Error("Invalid Student ID. Please scan a valid Student ID QR.");
        }
        const response = await axios.post(`${BACKEND_URL}/api/attendance`, 
          { studentId: rawValue }, 
          { withCredentials: true }
        );

        new Audio(blingSound).play(); // Success Sound
        setScannedStudentData({
          studentName: response.data.student.full_name,
          studentId: response.data.student.student_id,
          timeIn: response.data.student.time_in,
          status: response.data.student.status,
          displayMsg: response.data.msg
        });
        setIsAttendanceModalOpen(true);
      }
    } catch (error) {
      // === ERROR SOUND TRIGGERED HERE ===
      new Audio(blingBeepSound).play().catch(e => console.error("Audio failed:", e));

      const finalMessage = error.response?.data?.msg || error.response?.data?.error || error.message || "An unexpected error occurred.";
      setErrorTitle("Scan Error");
      setErrorMainMsg("Could not process QR");
      setErrorMessage(finalMessage);
      setIsErrorModalOpen(true);
    } finally {
      setLoadingScan(false);
    }
  };

  const handlePostAnnouncement = async () => {
    if (!announcementData.content.trim()) return;
    if (user?.role !== 'superadmin' && !selectedSection) {
      setErrorTitle("Post Failed");
      setErrorMainMsg("Section Required");
      setErrorMessage("Please select a specific section to post this announcement.");
      setIsErrorModalOpen(true);
      return;
    }

    try {
      setPosting(true);
      const response = await axios.post(`${BACKEND_URL}/api/announcements`, 
        { announcement: announcementData.content,
          category: announcementData.category,
          section_id: selectedSection
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        const newAnn = response.data.announcement; 
        setAnnouncementData({ content: '', category: 'notifications_active' });
        setSelectedSection("");
        setTransferSuccessData({
          type: 'success',
          title: 'Announcement Posted',
          message: 'Your update has been shared with all parents.',
          details: [{ label: 'Author', value: `${newAnn.user.first_name} ${newAnn.user.last_name}` }]
        });
      }
    } catch (err) {
      const backendError = err.response?.data?.error || "Failed to post announcement.";
      setErrorTitle("Post Failed");
      setErrorMainMsg("Announcement Error");
      setErrorMessage(backendError);
      setIsErrorModalOpen(true);
    } finally {
      setPosting(false);
    }
  };

  const handleConfirmPickup = async () => {
    try {
      setLoadingScan(true);
      const response = await axios.post(`${BACKEND_URL}/api/transfer`, {
        studentId: scannedData.student.studentId,
        studentName: scannedData.student.name,
        sectionId: scannedData.student.sectionId,
        sectionName: scannedData.student.sectionName,
        guardianId: scannedData.guardian.userId,
        guardianName: scannedData.guardian.name,
        purpose: scannedData.purpose,
        token: scannedData.token
      }, { withCredentials: true });

      if (response.data.success) {
        setIsAuthModalOpen(false);
        setIsWarningModalOpen(false);
        setTransferSuccessData({
          title: response.data.message.purpose === 'Drop off' ? 'Entry Confirmed' : 'Exit Confirmed',
          message: response.data.message.text, 
          type: 'success',
          details: [
            { label: 'Student', value: response.data.studentName },
            { label: 'Activity', value: response.data.message.purpose },
            { label: 'Guardian', value: response.data.guardianName }
          ]
        });
        setScannedData(null);
      }
    } catch (err) {
      setIsAuthModalOpen(false); 
      setIsErrorModalOpen(false); 
      const backendError = err.response?.data?.error || "An unexpected error occurred.";
      setTransferSuccessData({
          type: 'error',
          title: 'Transfer Failed',
          message: 'Invalid Pass', 
          details: [
              { label: 'Reason', value: backendError },
              { label: 'Status', value: 'Access Denied' }
          ],
          buttonText: 'Try Again'
      });
    } finally {
      setLoadingScan(false);
    }
  };

  useEffect(() => {
    const fetchMySections = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/teacher/sections`, {
          withCredentials: true
        });
        if (response.data.success) {
          setSections(response.data.sections);
        }
      } catch (err) {
        console.error("Failed to load sections:", err);
      }
    };
    if (user?.role === 'admin') fetchMySections();
  }, [user]);

  useEffect(() => {
    const fetchSystemAnnouncements = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/announcement/teacher`, 
          { withCredentials: true });
        setSystemAnnouncements(res.data.announcements);
      } catch (err) {
        console.error("Could not load system updates", err);
      }
    };
    fetchSystemAnnouncements();
  }, []);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/announcement/teacher`, {
          withCredentials: true
        });
        if (response.data.success) setAnnouncements(response.data.announcements);
      } catch (err) {
        console.error("Failed to fetch announcements:", err);
      } finally {
        setLoadingAnnouncements(false);
      }
    };
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    const fetchInitialQueue = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/queue`, { withCredentials: true });
        if (response.data.success) {
          setQueue(response.data.queue);
          teacherSections.current = response.data.authorized_sections || [];
        }
      } catch (err) { console.error("Failed to fetch queue:", err); }
    };
    fetchInitialQueue();

    const socket = io(BACKEND_URL, { withCredentials: true });

    if (user?.user_id) socket.emit("join", user.user_id);
    
    socket.on("new_queue_entry", (newEntry) => {
      setQueue(prevQueue => {
        const isAllowed = teacherSections.current.some(id => Number(id) === Number(newEntry.section_id));
        if (!isAllowed) return prevQueue; 
        const filtered = prevQueue.filter(q => q.user_id !== newEntry.user_id);
        return [newEntry, ...filtered];
      });
    });

    socket.on("remove_queue_entry", (userId) => {
      setQueue(prevQueue => prevQueue.filter(q => Number(q.user_id) !== Number(userId)));
    });

    socket.on('new_announcement', (newAnn) => {
      const incomingRole = newAnn.role || newAnn.user?.role;
      setAnnouncements(prev => {
        const exists = prev.some(ann => ann._id === newAnn._id);
        if (exists) return prev;
        if (incomingRole === 'superadmin' || Number(newAnn.user_id) === Number(user?.user_id)) return [newAnn, ...prev];
        return prev;
      });
    });

    socket.on('new_notification', (notif) => {
      if (
        notif.type === 'Transfer' && 
        !isAuthModalOpenRef.current &&
        Number(notif.recipient_id) !== Number(user?.user_id)
      ) { 
        setWarningTitle(notif.title); 
        setWarningMessage(notif.message); 
        setIsWarningModalOpen(true);
      }
    });

    return () => socket.disconnect();
  }, [user]);

  useEffect(() => {
    isAuthModalOpenRef.current = isAuthModalOpen;
  }, [isAuthModalOpen]);

  const handleCloseScanner = () => setActiveScanMode(null);
  const handleAnnChange = (e) => {
    const { name, value } = e.target;
    setAnnouncementData(prev => ({ ...prev, [name]: value }));
  };

  const handleOverrideSuccess = (msg) => {
    setTransferSuccessData({
      type: 'success',
      title: 'Override Successful',
      message: msg,
      details: [
        { label: 'Method', value: 'Manual Emergency Entry' },
        { label: 'Status', value: 'Waiting For Approval' },
        { label: 'Note', value: 'Please remind the User that this transfer will not be officially recorded in the Transfer History until approved by a SuperAdmin.' }
      ]
    });
  };

  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">
      <NavBar />

      {needsBiometricSetup && (
        <div className="fixed inset-0 z-999999 bg-slate-900/90 backdrop-blur-md flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 w-full max-w-[600px] flex flex-col items-center animate-[fadeIn_0.3s_ease-out_forwards]">
            {!isCameraActive && !faceDescriptor ? (
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-blue-600 shadow-inner">
                  <span className="material-symbols-outlined text-[40px]">security_update_good</span>
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Security Update Required</h2>
                <p className="text-[14px] text-slate-600 mb-8 leading-relaxed max-w-md">
                  To maintain the highest level of security, LuMINI now requires all teachers to register their facial biometrics. Please complete a quick 30-second scan to regain access to your dashboard.
                </p>

                <button 
                  type="button" 
                  disabled={!modelsLoaded} 
                  onClick={() => setIsCameraActive(true)} 
                  className={`w-full md:w-3/4 text-white font-bold text-[15px] py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 ${modelsLoaded ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-blue-500/30' : 'bg-slate-300 cursor-not-allowed'}`}
                >
                  <span className="material-symbols-outlined text-[20px]">{modelsLoaded ? 'photo_camera' : 'sync'}</span> 
                  {modelsLoaded ? 'Start Biometric Scan' : 'Loading AI Security Models...'}
                </button>
              </div>
            ) : faceDescriptor && !isCameraActive ? (
              <div className="flex flex-col items-center animate-[fadeIn_0.3s_ease-out]">
                 <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 text-green-500 border-4 border-green-100 shadow-inner">
                   <span className="material-symbols-outlined text-[40px]">verified</span>
                 </div>
                 <h2 className="text-2xl font-black text-slate-800 mb-2">Verification Complete</h2>
                 <p className="text-[14px] text-slate-500 mb-8 text-center max-w-sm">Your highly accurate facial template has been securely generated.</p>
                 <div className="w-[180px] h-[240px] rounded-2xl overflow-hidden mb-8 border-4 border-slate-100 shadow-md">
                    <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
                 </div>
                 <div className="flex gap-4 w-full">
                   <button type="button" disabled={isSavingBiometrics} onClick={() => { setFaceDescriptor(null); setCapturedImage(null); setIsCameraActive(true); }} className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50">Retake Scan</button>
                   <button type="button" disabled={isSavingBiometrics} onClick={handleSaveBiometrics} className="flex-1 py-3.5 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                     {isSavingBiometrics ? <span className="material-symbols-outlined animate-spin">sync</span> : "Save & Continue"}
                   </button>
                 </div>
              </div>
            ) : (
              <div className="flex flex-col items-center w-full animate-[fadeIn_0.3s_ease-out]">
                 <h2 className="text-xl font-black text-slate-800 mb-4">Liveness Verification</h2>
                 <div className="w-full h-80 md:h-[380px] bg-slate-900 rounded-3xl flex items-center justify-center text-white mb-6 relative overflow-hidden border-4 border-slate-100 shadow-xl">
                    <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover scale-x-[-1] z-0" />
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1] z-[5]" />
                    {!isVideoPlaying && !cameraError && (
                       <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-6 bg-slate-900 text-slate-400 animate-pulse"><span className="material-symbols-outlined text-[48px]">videocam</span><span className="text-[12px] font-medium tracking-widest uppercase">Initializing Camera...</span></div>
                    )}
                    {isVideoPlaying && !cameraError && (
                      <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                        <div className={`w-[200px] h-[280px] rounded-[100%] ${ovalClass}`} style={{borderRadius: '50% / 50%'}}></div>
                      </div>
                    )}
                    {countdownValue !== null && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px]">
                        <span className="text-white text-[120px] font-black drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] animate-[ping_1s_cubic-bezier(0,0,0.2,1)_infinite]">{countdownValue}</span>
                      </div>
                    )}
                 </div>
                 <div className={`w-full py-4 px-6 rounded-xl text-[15px] font-bold text-center transition-colors duration-300 ${scanStatus.includes("✅") ? "bg-green-50 text-green-700 border border-green-200" : scanStatus.includes("⚠️") ? "bg-red-50 text-red-700 border border-red-200" : "bg-blue-50 text-blue-700 border border-blue-200 shadow-[inset_0_0_15px_rgba(59,130,246,0.1)]"}`}>
                   {cameraError ? "Camera blocked. Please enable it in your browser settings." : scanStatus}
                 </div>
                 <button type="button" onClick={() => setIsCameraActive(false)} className="mt-4 text-[13px] font-bold text-slate-400 hover:text-red-500 transition-colors px-4 py-2 cursor-pointer">Cancel Scan</button>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="overflow-y-auto p-6 animate-[fadeIn_0.4s_ease-out_forwards]">
        <section className="admin-banner w-full max-w-[1200px] mx-auto mb-6 rounded-2xl">
          <div>
            <h1 className="text-[28px]! font-bold text-[white]! mb-2 tracking-[-0.5px]">Welcome Back!</h1>
            <p className="text-[white]! opacity-80 text-[15px]! m-0">Ready for your next class?</p>
          </div>
        </section>

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 w-full max-w-[1200px] mx-auto items-start">
        <div className="flex flex-col gap-6">
          <div className="card queue-card">
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb2">
                <span className="material-symbols-outlined blue-icon text-[24px]">schedule</span>
                <h2 className="text-cdark text-[18px] font-bold">Queue</h2>
              </div>
              <p className="text-cgray text-[14px]! leading-normal ml-0">Real-time updates from parents.</p>
            </div>
            <div className="flex flex-col gap-4">
              {queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 opacity-60">
                  <span className="material-symbols-outlined text-[40px] mb-2">inbox</span>
                  <p className="text-[#94a3b8] text-center">No parents in the queue.</p>
                </div>
              ) : (
                queue.map((item) => (
                  <AdminQueueParentGuardian key={item._id} item={item} setQueue={setQueue} />
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card emergency-card !m-0 cursor-pointer hover:shadow-md transition-all" onClick={() => setIsOverrideModalOpen(true)}>
              <div className="emergency-card-wrapper"><span className="material-symbols-outlined shrink-0">e911_emergency</span></div>
              <div>
                <h3 className="text-[#c53030] text-[15px]! font-bold mb-0.5">Transfer Override</h3>
                <p className="text-[#742a2a] text-[11px]! leading-tight">Manual student transfer.</p>
              </div>
              <span className="material-symbols-outlined arrow-icon ml-auto text-[#c53030]! text-[18px]">arrow_forward</span>
            </div>

            <div className="card emergency-card !m-0 cursor-pointer hover:shadow-md transition-all" onClick={() => setIsEmergencyBroadcastModalOpen(true)}>
              <div className="emergency-card-wrapper"><span className="material-symbols-outlined shrink-0">campaign</span></div>
              <div>
                <h3 className="text-[#c53030] text-[15px]! font-bold mb-0.5">Emergency SMS</h3>
                <p className="text-[#742a2a] text-[11px]! leading-tight">Urgent broadcast to parents.</p>
              </div>
              <span className="material-symbols-outlined arrow-icon ml-auto text-[#c53030]! text-[18px]">arrow_forward</span>
            </div>
          </div>

          <div className="card action-card flex flex-col p-6">
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${announcementData.category === 'campaign' ? 'bg-red-50' : announcementData.category === 'calendar_month' ? 'bg-green-50' : 'bg-blue-50'}`}>
                  <span className={`material-symbols-outlined text-[22px] ${announcementData.category === 'campaign' ? 'text-red-600' : announcementData.category === 'calendar_month' ? 'text-green-600' : 'text-blue-600'}`}>{announcementData.category}</span>
                </div>
                <h2 className="text-cdark font-bold text-[18px]! -m-2">Class Announcement</h2>
              </div>
              <p className="text-cgray leading-normal text-[14px]! mb-3">Post updates to parents.</p>
              
              {/* --- NEW CUSTOM DROPDOWNS START HERE --- */}
              <div className="flex gap-2 mb-3">
                
                {/* SECTION SELECT (Custom Dropdown) */}
                <div className="relative flex-1" ref={sectionRef}>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsSectionOpen(!isSectionOpen);
                      setIsCategoryOpen(false);
                    }}
                    className={`flex items-center justify-between w-full h-[38px] pl-4 pr-3 border rounded-xl text-[12px] font-semibold text-slate-700 uppercase transition-all focus:outline-none ${
                      isSectionOpen ? "border-[var(--brand-blue)] ring-2 ring-blue-500/10 bg-white" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <span className="truncate">
                      {selectedSection === "" ? "Select Section" : 
                       selectedSection === "all" ? (user?.role === 'superadmin' ? "All (System-wide)" : "All My Sections") : 
                       sections.find(sec => sec.section_id === selectedSection)?.section_name || "Select Section"}
                    </span>
                    <span className={`material-symbols-outlined text-slate-400 text-[20px] transition-transform duration-300 ${isSectionOpen ? "rotate-180 text-[var(--brand-blue)]" : ""}`}>
                      expand_more
                    </span>
                  </button>

                  {isSectionOpen && (
                    <div className="absolute top-[42px] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-[100] p-1 flex flex-col gap-0.5 animate-[fadeIn_0.2s_ease-out]">
                      <button 
                        type="button"
                        className="w-full text-left px-3 py-2 rounded-lg text-[12px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-[var(--brand-blue)] transition-colors uppercase"
                        onClick={() => { setSelectedSection("all"); setIsSectionOpen(false); }}
                      >
                        {user?.role === 'superadmin' ? "All (System-wide)" : "All My Sections"}
                      </button>
                      {sections.map((sec) => (
                        <button 
                          type="button"
                          key={sec.section_id}
                          className="w-full text-left px-3 py-2 rounded-lg text-[12px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-[var(--brand-blue)] transition-colors uppercase"
                          onClick={() => { setSelectedSection(sec.section_id); setIsSectionOpen(false); }}
                        >
                          {sec.section_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* CATEGORY SELECT (Custom Dropdown) */}
                <div className="relative flex-1" ref={categoryRef}>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsCategoryOpen(!isCategoryOpen);
                      setIsSectionOpen(false); 
                    }}
                    className={`flex items-center justify-between w-full h-[38px] pl-4 pr-3 border rounded-xl text-[12px] font-semibold text-slate-700 uppercase transition-all focus:outline-none ${
                      isCategoryOpen ? "border-[var(--brand-blue)] ring-2 ring-blue-500/10 bg-white" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <span className="truncate">
                      {announcementData.category === "notifications_active" ? "General" :
                       announcementData.category === "campaign" ? "Emergency" :
                       announcementData.category === "calendar_month" ? "Event" : "General"}
                    </span>
                    <span className={`material-symbols-outlined text-slate-400 text-[20px] transition-transform duration-300 ${isCategoryOpen ? "rotate-180 text-[var(--brand-blue)]" : ""}`}>
                      expand_more
                    </span>
                  </button>

                  {isCategoryOpen && (
                    <div className="absolute top-[42px] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-[100] p-1 flex flex-col gap-0.5 animate-[fadeIn_0.2s_ease-out]">
                      <button 
                        type="button"
                        className="w-full text-left px-3 py-2 rounded-lg text-[12px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-[var(--brand-blue)] transition-colors uppercase"
                        onClick={() => { 
                          handleAnnChange({ target: { name: 'category', value: 'notifications_active' } }); 
                          setIsCategoryOpen(false); 
                        }}
                      >
                        General
                      </button>
                      <button 
                        type="button"
                        className="w-full text-left px-3 py-2 rounded-lg text-[12px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-[var(--brand-blue)] transition-colors uppercase"
                        onClick={() => { 
                          handleAnnChange({ target: { name: 'category', value: 'campaign' } }); 
                          setIsCategoryOpen(false); 
                        }}
                      >
                        Emergency
                      </button>
                      <button 
                        type="button"
                        className="w-full text-left px-3 py-2 rounded-lg text-[12px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-[var(--brand-blue)] transition-colors uppercase"
                        onClick={() => { 
                          handleAnnChange({ target: { name: 'category', value: 'calendar_month' } }); 
                          setIsCategoryOpen(false); 
                        }}
                      >
                        Event
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {/* --- NEW CUSTOM DROPDOWNS END HERE --- */}
              
            </div>
            <div className="announcement-box mt-1">
              <textarea name="content" className="text-cdark w-full h-20 border-none bg-transparent resize-none text-[14px] outline-none" placeholder="Write an announcement..." value={announcementData.content} onChange={handleAnnChange} disabled={posting} />
              <div className="flex justify-between items-center mt-2.5 pt-2.5 border-t border-slate-100">
                <div className="text-[12px] text-cgray">{announcementData.content.length} characters</div>
                <button className={`btn-post ${posting ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={handlePostAnnouncement} disabled={posting || !announcementData.content.trim() || (user?.role !== 'superadmin' && !selectedSection)}>
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card action-card flex flex-col gap-5">
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="material-symbols-outlined orange-icon text-[24px]">qr_code_scanner</span>
                <h2 className="text-cdark text-[18px] font-bold">Guardian QR Verification</h2>
              </div>
              <p className="text-cgray text-[14px]! leading-normal ml-0">Scan guardian's QR code for student pickup.</p>
            </div>
            <div className="w-full h-[220px] bg-[#dbeafe] flex items-center justify-center rounded-xl mb-0"><span className="material-symbols-outlined qr-large-icon">qr_code_2</span></div>
            <div className="flex flex-col gap-3">
              <button className="btn btn-primary gap-2 h-[50px] font-semibold rounded-xl text-[14px] border-none w-full" onClick={() => setActiveScanMode('user')}>
                <span className="material-symbols-outlined text-[20px]!">center_focus_weak</span> Scan Parent or Guardian QR Code
              </button>
            </div>
          </div>

          <div className="card action-card flex flex-col gap-5 p-6">
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="material-symbols-outlined orange-icon text-[24px]">qr_code_2</span>
                <h2 className="text-cdark text-[18px]! font-bold">Student QR Attendance</h2>
              </div>
              <p className="text-cgray leading-normal ml-0 text-[14px]!">Initiate scan for daily student attendance.</p>
            </div>
            <div className="w-full h-[220px] bg-[#dbeafe] flex items-center justify-center rounded-xl mb-0"><span className="material-symbols-outlined qr-large-icon">qr_code_2</span></div>
            <div className="flex flex-col gap-3">
              <button className="btn btn-primary gap-2 h-[50px] font-semibold rounded-xl text-[14px] border-none w-full" onClick={() => setActiveScanMode('student')}>
                <span className="material-symbols-outlined">center_focus_weak</span> Scan Student QR Code
              </button>
            </div>
          </div>

          <div className="card queue-card">
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="material-symbols-outlined purple-icon text-[24px]">notifications_active</span>
                <h2 className="text-cdark text-[18px] font-bold">Recent Updates</h2>
              </div>
              <p className="text-cgray text-[14px]! leading-normal">System-wide broadcasts and alerts.</p>
            </div>
            <div className="flex flex-col gap-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar"> 
              {loadingAnnouncements ? (
                <p className="text-center text-cgray py-4">Loading updates...</p>
              ) : announcements.length === 0 ? (
                <div className="text-center py-6 opacity-60"><span className="material-symbols-outlined text-[40px] mb-2 text-slate-300">notifications_off</span><p className="text-cgray text-[14px]">No recent updates.</p></div>
              ) : (
                announcements.map((ann) => (
                  <div key={ann._id} className="bg-[white] flex items-start p-4 rounded-xl border border-[#f1f5f9] gap-4 hover:bg-[#fafafa] transition-colors shrink-0">
                    <div className={`flex items-center justify-center shrink-0 w-10 h-10 rounded-[10px] ${ann.category === 'campaign' ? 'bg-[#fff1f2] text-[#f43f5e]' : ann.category === 'calendar_month' ? 'bg-[#f0fdf4] text-[#22c55e]' : 'bg-[#eff6ff] text-[#3b82f6]'}`}>
                      <span className="material-symbols-outlined">{ann.category || 'notifications_active'}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-cdark text-[15px] font-bold">{ann.role === 'superadmin' ? 'System Update' : (ann.category === 'campaign' ? 'Emergency Alert' : ann.category === 'calendar_month' ? 'Event' : 'General Announcement')}</span>
                      <span className="text-cgray text-[13px] leading-relaxed">{ann.announcement}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[#94a3b8] text-[11px] font-medium">{ann.role === 'superadmin' ? ann.full_name : `By Teacher ${ann.full_name}`}</span>
                        <span className="text-[#cbd5e1]">•</span>
                        <span className="text-[#94a3b8] text-[11px] font-medium">{new Date(ann.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      </main>

      <WarningModal isOpen={isWarningModalOpen} onClose={() => { setIsWarningModalOpen(false); setWarningTitle(""); setWarningMessage(""); }} title={warningTitle} message={warningMessage} />
      <AdminEmergencyOverrideModal isOpen={isOverrideModalOpen} onClose={() => setIsOverrideModalOpen(false)} onSuccess={handleOverrideSuccess} />
      <AdminEmergencyBroadcastModal isOpen={isEmergencyBroadcastModalOpen} onClose={() => setIsEmergencyBroadcastModalOpen(false)} />
      <AdminDashboardQrScan isOpen={!!activeScanMode} onClose={handleCloseScanner} scanMode={activeScanMode} onScan={handleScanSuccess} />
      <AdminConfirmPickUpAuth isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} data={scannedData} onConfirm={handleConfirmPickup} />
      <AdminActionFeedbackModal isOpen={isAttendanceModalOpen} onClose={() => setIsAttendanceModalOpen(false)} type={scannedStudentData?.status === 'Late' ? 'warning' : 'success'} title="Attendance Recorded" message={scannedStudentData?.displayMsg} details={[{ label: 'Student ID', value: scannedStudentData?.studentId }, { label: 'Student', value: scannedStudentData?.studentName}, { label: 'Time In', value: scannedStudentData?.timeIn }, { label: 'Status', value: scannedStudentData?.status }]} />
      <AdminActionFeedbackModal isOpen={!!transferSuccessData} onClose={() => setTransferSuccessData(null)} type={transferSuccessData?.type || 'success'} title={transferSuccessData?.title} message={transferSuccessData?.message} details={transferSuccessData?.details} buttonText={transferSuccessData?.type === 'error' ? 'Try Again' : 'Great'} />
      <AdminActionFeedbackModal isOpen={isErrorModalOpen} onClose={() => setIsErrorModalOpen(false)} type="error" title={errorTitle} message={errorMainMsg} details={[{ label: 'Reason', value: errorMessage }]} buttonText="Try Again" />
      {loadingScan && (<div className="fixed inset-0 bg-black/50 z-9999 flex items-center justify-center"><div className="bg-white p-4 rounded-lg flex items-center gap-3"><span className="material-symbols-outlined animate-spin text-blue-600">sync</span><span>Verifying Pass...</span></div></div>)}
    </div>
  );
}