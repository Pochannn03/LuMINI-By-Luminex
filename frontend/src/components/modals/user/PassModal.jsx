import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import QRCode from "react-qr-code";
import axios from "axios";

export default function GuardianPassModal({ isOpen, onClose }) {
  const [passData, setPassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [error, setError] = useState(null);

  // 1. GENERATE PASS ON OPEN
  useEffect(() => {
    if (!isOpen) return;

    // Reset states
    setLoading(true);
    setPassData(null);
    setError(null);
    setTimeLeft(300);

    const generatePass = async () => {
      try {
        // Call your backend endpoint
        const res = await axios.post(
          "http://localhost:3000/api/pass/generate", 
          { purpose: 'pickup' }, 
          { withCredentials: true }
        );

        if (res.data.success) {
          setPassData(res.data.token);
        }
      } catch (err) {
        console.error("Pass Gen Error:", err);
        setError("Could not generate pass. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    generatePass();
  }, [isOpen]);

  // 2. COUNTDOWN TIMER LOGIC
  useEffect(() => {
    if (!isOpen || !passData || timeLeft <= 0) return;

    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [isOpen, passData, timeLeft]);

  // Format seconds into MM:SS
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="modal-overlay active" style={{ zIndex: 9999 }}>
        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-[400px] w-full relative overflow-hidden flex flex-col items-center">
          
          {/* Header */}
          <div className="w-full flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
            <h3 className="font-bold text-lg text-gray-800">My Pickup Pass</h3>
            <button 
              onClick={onClose}
              className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              <span className="material-symbols-outlined text-gray-600 text-sm">close</span>
            </button>
          </div>

          {/* CONTENT AREA */}
          {loading ? (
            <div className="py-10 flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 text-sm">Generating secure token...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <span className="material-symbols-outlined text-red-500 text-4xl mb-2">error</span>
              <p className="text-red-500 font-medium">{error}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full animate-[fadeIn_0.3s_ease-out]">
              
              {/* THE QR CODE */}
              <div className="p-4 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50 mb-4">
                {/* value: The secure token from DB
                   size: 200px (standard scan size)
                   level: 'H' (High error correction, easier to scan)
                */}
                <QRCode 
                  value={passData} 
                  size={200} 
                  level="H"
                  bgColor="#eff6ff" // Matches bg-blue-50
                  fgColor="#1e3a8a" // Dark blue for contrast
                />
              </div>

              {/* TIMER & STATUS */}
              {timeLeft > 0 ? (
                <div className="text-center">
                  <p className="text-gray-500 text-sm mb-1">Show this to the teacher</p>
                  <div className="flex items-center gap-2 justify-center text-(--primary-blue) font-bold text-xl font-mono px-4 py-2 rounded-lg">
                    <span className="material-symbols-outlined text-lg">timer</span>
                    {formatTime(timeLeft)}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                   <p className="text-red-500 font-bold mb-2">Pass Expired</p>
                   <button 
                     onClick={() => window.location.reload()} // Or re-trigger generation
                     className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm shadow-md hover:bg-blue-700"
                   >
                     Regenerate
                   </button>
                </div>
              )}

            </div>
          )}

          <p className="mt-4 text-xs! text-center text-gray-400 max-w-[250px]">
            This is a temporary Qr. Do not screenshot or share.
          </p>

        </div>
      </div>
    </>,
    document.body
  );
}