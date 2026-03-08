import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

// Updated to use dynamic backend URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

// NEW PROP ADDED: onError
export default function ParentAddStudentModal({ isOpen, onClose, onSuccess, onError }) {
  const [invitationCode, setInvitationCode] = useState(["", "", "", "", "", ""]);
  const [isLinking, setIsLinking] = useState(false);
  const codeInputRefs = useRef([]);

  useEffect(() => {
    if (isOpen) {
      setInvitationCode(["", "", "", "", "", ""]);
      setIsLinking(false);
      setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCodeChange = (e, index) => {
    const val = e.target.value.toUpperCase();
    if (/^[A-Z0-9]*$/.test(val)) {
      const newCode = [...invitationCode];
      newCode[index] = val.slice(-1); 
      setInvitationCode(newCode);
      if (val && index < 5) codeInputRefs.current[index + 1].focus();
    }
  };

  const handleCodeKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !invitationCode[index] && index > 0) {
      codeInputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (pasteData) {
      const newCode = [...invitationCode];
      pasteData.split('').forEach((char, i) => { if (i < 6) newCode[i] = char; });
      setInvitationCode(newCode);
      const nextIndex = pasteData.length < 6 ? pasteData.length : 5;
      codeInputRefs.current[nextIndex].focus();
    }
  };

  const handleSubmitCode = async (e) => {
    e.preventDefault();
    const fullCode = invitationCode.join('');
    if (fullCode.length !== 6) {
      // FIX: Trigger Warning Modal instead of Alert
      onError("Invalid Code Length", "Please enter the complete 6-character code.");
      return;
    }

    setIsLinking(true);
    try {
      const response = await axios.put(`${BACKEND_URL}/api/parent/link-student`, { code: fullCode }, { withCredentials: true });
      if (response.data.success) {
        onSuccess(response.data.student, "Student successfully linked!");
        onClose();
      }
    } catch (err) {
      // FIX: Trigger Warning Modal instead of Alert, and pass the specific backend message
      onError("Linking Failed", err.response?.data?.message || "Failed to link student.");
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
        <div className="relative flex w-[90%] max-w-[480px] flex-col items-center bg-white p-10 pb-8 rounded-[40px] shadow-2xl">
            <button 
                onClick={onClose}
                className="absolute top-6 right-6 text-slate-400 hover:text-red-500 transition-all duration-300 hover:rotate-90 bg-transparent border-none cursor-pointer flex items-center justify-center p-2 z-50"
            >
                <span className="material-symbols-outlined text-[28px]">close</span>
            </button>

            <div className="w-full text-left mb-8">
                <h1 className="text-[32px] font-black text-[#1e293b] leading-tight mb-3">
                    Enter Invitation Code
                </h1>
                <p className="text-[#64748b] text-[16px]! leading-relaxed font-medium">
                    Enter the invitation code provided by your child's teacher to create your account.
                </p>
            </div>

            <div className="flex justify-between gap-3 w-full mb-10">
                {invitationCode.map((data, index) => (
                    <input 
                        key={index} 
                        ref={el => codeInputRefs.current[index] = el} 
                        type="text" 
                        maxLength="1" 
                        value={data} 
                        onChange={e => handleCodeChange(e, index)} 
                        onKeyDown={e => handleCodeKeyDown(e, index)} 
                        onPaste={handlePaste} 
                        onFocus={e => e.target.select()}
                        className="w-full h-[65px] text-center text-[24px] font-bold text-[#1e293b] border-2 border-gray-100 rounded-2xl outline-none transition-all focus:border-[#a855f7] focus:shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                    />
                ))}
            </div>

            <button 
                type="button" 
                className="w-full h-[60px] bg-[#39a8ed] text-white rounded-full font-bold text-[18px] shadow-[0_8px_20px_rgba(57,168,237,0.3)] hover:bg-[#2d91d1] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                onClick={handleSubmitCode}
                disabled={isLinking}
            >
                {isLinking ? "Verifying..." : "Submit"}
            </button>
        </div>
    </div>
  );
}