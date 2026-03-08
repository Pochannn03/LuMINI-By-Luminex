import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import NavBar from "../../components/navigation/NavBar";
import SuccessModal from "../../components/SuccessModal";
import WarningModal from "../../components/WarningModal";
import { useAuth } from "../../context/AuthProvider";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function SuperAdminSettings() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Modal State (2FA Flow)
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [otpStep, setOtpStep] = useState(false); 
  const [modalPassword, setModalPassword] = useState("");
  const [otpCode, setOtpCode] = useState(""); 
  const [targetEmail, setTargetEmail] = useState(""); // NEW: Stores the masked email
  const [unlockError, setUnlockError] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showModalPassword, setShowModalPassword] = useState(false); 

  // Form State
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState(""); // NEW: Email form field
  const [newPassword, setNewPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false); 

  // Feedback Modals
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningTitle, setWarningTitle] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [requireRelogin, setRequireRelogin] = useState(false);

  // --- 1. VERIFY PASSWORD AND SEND OTP ---
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!modalPassword.trim()) return;

    setIsUnlocking(true);
    setUnlockError("");

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/superadmin/request-settings-otp`,
        { currentPassword: modalPassword },
        { withCredentials: true }
      );
      setTargetEmail(response.data.maskedEmail); // Save the masked email from backend
      setOtpStep(true); 
    } catch (error) {
      setUnlockError(error.response?.data?.message || "Failed to verify password.");
    } finally {
      setIsUnlocking(false);
    }
  };

  // --- 2. VERIFY OTP AND UNLOCK ---
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim()) return;

    setIsUnlocking(true);
    setUnlockError("");

    try {
      await axios.post(
        `${BACKEND_URL}/api/superadmin/verify-settings-otp`,
        { otp: otpCode },
        { withCredentials: true }
      );
      setIsUnlocked(true); 
    } catch (error) {
      setUnlockError(error.response?.data?.message || "Invalid verification code.");
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleCancelUnlock = () => {
    if (otpStep) {
      setOtpStep(false); 
      setUnlockError("");
      setOtpCode("");
    } else {
      navigate("/superadmin/dashboard");
    }
  };

  // --- 3. UPDATE CREDENTIALS ---
  const handleUpdateCredentials = async (e) => {
    e.preventDefault();
    if (!newUsername && !newPassword && !newEmail) return;

    if (newPassword && newPassword.length < 8) {
      setWarningTitle("Invalid Password");
      setWarningMessage("New password must be at least 8 characters long.");
      setShowWarningModal(true);
      return;
    }

    setIsUpdating(true);

    try {
      const response = await axios.put(
        `${BACKEND_URL}/api/superadmin/credentials`,
        {
          currentPassword: modalPassword, 
          newUsername: newUsername,
          newEmail: newEmail, // NEW: Include email in payload
          newPassword: newPassword
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        setSuccessMessage(response.data.message);
        setRequireRelogin(response.data.requireRelogin);
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error("Update Error:", error);
      setWarningTitle("Update Failed");
      setWarningMessage(error.response?.data?.message || "Failed to update credentials. Please try again.");
      setShowWarningModal(true);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    if (requireRelogin) {
      logout();
      navigate("/login", { replace: true });
    } else {
      setNewUsername("");
      setNewEmail(""); // NEW: clear email
      setNewPassword("");
    }
  };

  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20 bg-slate-50 font-poppins">
      <NavBar />
      
      <SuccessModal isOpen={showSuccessModal} onClose={handleSuccessClose} message={successMessage} />
      <WarningModal isOpen={showWarningModal} onClose={() => setShowWarningModal(false)} title={warningTitle} message={warningMessage} />

      {/* --- SECURITY GATE MODAL --- */}
      {!isUnlocked && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-[400px] animate-[fadeIn_0.2s_ease-out]">
            
            {!otpStep ? (
              /* STEP 1: PASSWORD INPUT */
              <>
                <div className="flex flex-col items-center mb-6">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 border border-red-100 text-red-500">
                    <span className="material-symbols-outlined text-[32px]">lock</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-800">Security Verification</h2>
                  <p className="text-sm text-slate-500 text-center mt-2">
                    You are accessing a highly sensitive area. Please verify your identity.
                  </p>
                </div>

                <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-1 block">Type your password:</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">key</span>
                      <input 
                        type={showModalPassword ? "text" : "password"}
                        value={modalPassword}
                        onChange={(e) => {
                          setModalPassword(e.target.value);
                          setUnlockError("");
                        }}
                        className={`w-full h-[48px] pl-10 pr-12 bg-slate-50 border ${unlockError ? 'border-red-400 bg-red-50' : 'border-slate-200'} rounded-xl focus:outline-none focus:border-blue-500 transition-colors`}
                        placeholder="Enter current password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowModalPassword(!showModalPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none flex items-center justify-center"
                        tabIndex="-1"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showModalPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                    {unlockError && <p className="text-red-500 text-xs font-semibold mt-2">{unlockError}</p>}
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button 
                      type="button" 
                      onClick={handleCancelUnlock}
                      disabled={isUnlocking}
                      className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={isUnlocking || !modalPassword}
                      className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                      {isUnlocking ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        "Next"
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* STEP 2: OTP INPUT */
              <div className="animate-[fadeIn_0.3s_ease-out]">
                <div className="flex flex-col items-center mb-6">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 border border-blue-100 text-blue-500">
                    <span className="material-symbols-outlined text-[32px]">mark_email_read</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-800">Two-Factor Auth</h2>
                  <p className="text-sm text-slate-500 text-center mt-2">
                    A verification code has been sent to <strong>{targetEmail}</strong>.
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-1 block">Enter 6-digit code:</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">pin</span>
                      <input 
                        type="text"
                        maxLength="6"
                        value={otpCode}
                        onChange={(e) => {
                          setOtpCode(e.target.value.replace(/\D/g, '')); 
                          setUnlockError("");
                        }}
                        className={`w-full h-[48px] pl-10 pr-4 bg-slate-50 border ${unlockError ? 'border-red-400 bg-red-50' : 'border-slate-200'} rounded-xl focus:outline-none focus:border-blue-500 transition-colors tracking-[0.2em] font-bold text-center`}
                        placeholder="••••••"
                        required
                      />
                    </div>
                    {unlockError && <p className="text-red-500 text-xs font-semibold mt-2 text-center">{unlockError}</p>}
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button 
                      type="button" 
                      onClick={handleCancelUnlock}
                      disabled={isUnlocking}
                      className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button 
                      type="submit" 
                      disabled={isUnlocking || otpCode.length < 6}
                      className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                      {isUnlocking ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        "Verify"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MAIN PAGE CONTENT (Hidden until unlocked) --- */}
      {isUnlocked && (
        <main className="flex-1 p-6 animate-[fadeIn_0.4s_ease-out_forwards] overflow-y-auto">
          <div className="w-full max-w-[800px] mx-auto">
            
            {/* Warning Banner */}
            <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 p-4 rounded-xl shadow-sm mb-8 flex items-start gap-4">
              <span className="material-symbols-outlined text-red-500 mt-0.5">warning</span>
              <div>
                <h3 className="text-red-800 font-bold text-sm uppercase tracking-wide">Danger Zone</h3>
                <p className="text-red-600 text-sm mt-1 leading-relaxed">
                  Changing your credentials will log you out of all active sessions. Ensure you remember your new credentials!
                </p>
              </div>
            </div>

            {/* Credential Settings Form */}
            <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-extrabold text-slate-800">Update Credentials</h2>
                <p className="text-sm text-slate-500">Modify your master login details below. Leave fields blank to keep them unchanged.</p>
              </div>

              <form onSubmit={handleUpdateCredentials} className="p-6 flex flex-col gap-6">
                
                {/* Field 1: New Username */}
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 block">New Username</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">person</span>
                    <input 
                      type="text" 
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full h-[52px] pl-12 pr-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-700"
                      placeholder="Enter new username "
                    />
                  </div>
                </div>

                {/* NEW Field 2: New Email */}
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 block">New Recovery Email</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
                    <input 
                      type="email" 
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full h-[52px] pl-12 pr-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-700"
                      placeholder="Enter new email address"
                    />
                  </div>
                </div>

                {/* Field 3: New Password */}
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 block">New Password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">lock_reset</span>
                    <input 
                      type={showNewPassword ? "text" : "password"} 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full h-[52px] pl-12 pr-12 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-700"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none flex items-center justify-center"
                      tabIndex="-1"
                    >
                      <span className="material-symbols-outlined text-[22px]">
                        {showNewPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-6 border-t border-slate-100 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={(!newUsername && !newPassword && !newEmail) || isUpdating}
                    className="h-[48px] px-8 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUpdating ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        Save Changes
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>

          </div>
        </main>
      )}
    </div>
  );
}