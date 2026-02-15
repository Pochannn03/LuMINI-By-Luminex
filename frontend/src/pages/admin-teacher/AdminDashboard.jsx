import React, { useState } from "react";
import { Link } from 'react-router-dom';
import axios from 'axios';
import NavBar from "../../components/navigation/NavBar";
import AdminDashboardQrScan from "../../components/modals/admin/dashboard/AdminDashboardQrScan"
import AdminConfirmPickUpAuth from "../../components/modals/admin/dashboard/AdminConfirmPickUpAuth";
import AdminDashboardAttendanceSuccessModal from "../../components/modals/admin/dashboard/AdminDashboardAttendanceSuccessModal";
import "../../styles/admin-teacher/admin-dashboard.css"

export default function SuperAdminDashboard() {
  // MODAL STATES
  const [activeScanMode, setActiveScanMode] = useState(null);

  // STATES FOR QR SCANNING AUTHENTICATION
  const [scannedData, setScannedData] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loadingScan, setLoadingScan] = useState(false);

  // STUDENT QR AUTHENTICATION (ATTENDANCE)
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [scannedStudentData, setScannedStudentData] = useState(null);

  // GETTING INFORMATION
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

        const response = await axios.get(`http://localhost:3000/api/scan/pass/${rawValue}`, {
          withCredentials: true
        });

        if (response.data.valid) {
          setScannedData(response.data);
          setIsAuthModalOpen(true);
        }
      } 

      else if (activeScanMode === 'student') {
        if (!studentIdRegex.test(rawValue)) {
          throw new Error("Invalid Student ID. Please scan a valid Student ID QR.");
        }

        const response = await axios.post(`http://localhost:3000/api/attendance`, 
          { studentId: rawValue }, 
          { withCredentials: true }
        );

        setScannedStudentData(response.data.student);
        setIsAttendanceModalOpen(true);
      }

    } catch (error) {
      console.error("Scan Process Failed:", error);
      alert(error.message || error.response?.data?.message || "Scan Error");
    } finally {
      setLoadingScan(false);
    }
  };

  // CONFIRM DROP OFF/PICK UP AUTHORIZATION
  const handleConfirmPickup = async () => {
    try {
      setLoadingScan(true);
      
      const response = await axios.post(`http://localhost:3000/api/transfer`, {
        studentId: scannedData.student.studentId,
        studentName: scannedData.student.name,
        sectionId: scannedData.student.sectionId,
        sectionName: scannedData.student.sectionName,
        guardianId: scannedData.guardian.userId,
        guardianName: scannedData.guardian.name,
        type: scannedData.purpose, 
      }, { withCredentials: true });

      if (response.data.success) {
        alert(response.data.message);
        setIsAuthModalOpen(false);
        setScannedData(null);
      }
    } catch (err) {
      // Improved error logging to see exactly what the server says
      const serverMessage = err.response?.data?.error || err.message;
      console.error("Authorization Error:", serverMessage);
      alert("Authorization Failed: " + serverMessage);
    } finally {
      setLoadingScan(false);
    }
  };

  const handleCloseScanner = () => {
    setActiveScanMode(null);
  };

  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">
      <NavBar />

      <main className="overflow-y-auto p-6 animate-[fadeIn_0.4s_ease-out_forwards]">
        <section className="admin-banner">
          <div>
            <h1 className="text-[28px]! font-bold text-[white]! mb-2 tracking-[-0.5px]">Welcome Back!</h1>
            <p className="text-[white]! opacity-80 text-[15px]! m-0">Ready for your next class?</p>
          </div>
        </section>


      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 w-full max-w-[1200px] mx-auto items-start">
        {/* Left Part of Content */}
        <div className="flex flex-col gap-6">
          <div className="card queue-card">
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb2">
                <span className="material-symbols-outlined blue-icon text-[24px]">schedule</span>
                <h2 className="text-cdark text-[18px] font-bold" id="queueTitle">Drop-off Queue</h2>
              </div>
              <p className="text-cgray text-[14px]! leading-normal ml-0">Real-time updates from parents.</p>
            </div>

            <div className="flex flex-col gap-4" id="queueContainer">
              <p className="text-[#94a3b8] p-5 text-center">Loading queue...</p>
            </div>
          </div>

          <div className="card emergency-card">
            <div className="emergency-card-wrapper">
              <span className="material-symbols-outlined shrink-0">e911_emergency</span>
            </div>
            <div>
              <h3 className="text-[#c53030] text-[16px]! font-bold mb-0.5">Emergency Override</h3>
              <p className="text-[#742a2a] text-[12px]!">Alert staff and override dismissal process.</p>
            </div>
            <span className="material-symbols-outlined arrow-icon ml-auto text-[#c53030]!">arrow_forward</span>
          </div>
        </div>

        {/* Right Part of the Content */}
        <div className="flex flex-col gap-6">
          <div className="card action-card flex flex-col gap-5">
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="material-symbols-outlined orange-icon text-[24px]">qr_code_scanner</span>
                <h2 className="text-cdark text-[18px] font-bold">Guardian QR Verification</h2>
              </div>
              <p className="text-cgray text-[14px]! leading-normal ml-0">Scan guardian's QR code for student pickup.</p>
            </div>

            <div className="w-full h-[220px] bg-[#dbeafe] flex items-center justify-center rounded-xl mb-0">
              <span className="material-symbols-outlined qr-large-icon">qr_code_2</span>
            </div>

            <div className="flex flex-col gap-3">
              <button className="btn btn-primary gap-2 h-[50px] font-semibold rounded-xl text-[14px] border-none w-full" id="scanGuardianBtn" onClick={() => setActiveScanMode('user')}>
                <span className="material-symbols-outlined text-[20px]!">center_focus_weak</span>
                  Scan Parent or Guardian QR Code
              </button>
              <button className="btn btn-outline gap-2 h-[50px] font-semibold rounded-xl text-[14px]! border-none w-full">Verify Manually</button>
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

            <div className="w-full h-[220px] bg-[#dbeafe] flex items-center justify-center rounded-xl mb-0">
              <span className="material-symbols-outlined qr-large-icon">qr_code_2</span>
            </div>

            <div className="flex flex-col gap-3">
              <button className="btn btn-primary gap-2 h-[50px] font-semibold rounded-xl text-[14px] border-none w-full" id="startScanBtn" onClick={() => setActiveScanMode('student')}>
                <span className="material-symbols-outlined">center_focus_weak</span>
                Scan Student QR Code
              </button>
            </div>
          </div>

          <div className="card action-card flex flex-col gap-5 p-6">
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="material-symbols-outlined purple-icon text-[24px]">campaign</span>
                <h2 className="text-cdark font-bold text-[18px]!">Class Announcement</h2>
              </div>
              <p className="text-cgray leading-normal ml-0 text-[14px]!">Post updates to parents.</p>
            </div>

            <div className="announcement-box">
              <textarea className="text-cdark w-full h-20 border-none bg-transparent resize-none text-[14px] outline-none" placeholder="Write an announcement..."></textarea>
              <div className="flex justify-between items-center mt-2.5 pt-2.5 ">
                <div className="flex gap-[5px]">
                  <button className="text-cgray bg-none border-none p-1.5 rounded-lg cursor-pointer flex items-center justify-center transition-colors duration-200" title="Add Image">
                    <span className="material-symbols-outlined">image</span>
                  </button>
                  <button className="text-cgray bg-none border-none p-1.5 rounded-lg cursor-pointer flex items-center justify-center transition-colors duration-200" title="Add Link">
                    <span className="material-symbols-outlined">link</span>
                  </button>
                </div>
                <button className="btn-post">Post</button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>

      <AdminDashboardQrScan 
        isOpen={!!activeScanMode}
        onClose={handleCloseScanner}
        scanMode={activeScanMode}
        onScan={handleScanSuccess}
      />

      <AdminConfirmPickUpAuth 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        data={scannedData}
        onConfirm={handleConfirmPickup}
      />

      <AdminDashboardAttendanceSuccessModal 
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        studentData={scannedStudentData}
      />

      {loadingScan && (
        <div className="fixed inset-0 bg-black/50 z-9999 flex items-center justify-center">
            <div className="bg-white p-4 rounded-lg flex items-center gap-3">
                <span className="material-symbols-outlined animate-spin text-blue-600">sync</span>
                <span>Verifying Pass...</span>
            </div>
        </div>
      )}

    </div>
  );
}