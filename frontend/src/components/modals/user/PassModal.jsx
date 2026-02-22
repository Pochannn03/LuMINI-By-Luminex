import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import QRCode from "react-qr-code";
import axios from "axios";

export default function GuardianPassModal({ isOpen, onClose }) {
  const [passData, setPassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(300); 
  const [error, setError] = useState(null);
  const STORAGE_KEY = "lumini_pickup_pass";

  useEffect(() => {
    if (!isOpen) return;

    const initPass = async () => {
      setLoading(true);
      setError(null);

      // A. CHECK LOCAL STORAGE FIRST
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const { token, expiry } = JSON.parse(saved);
          const now = Date.now();
          const secondsRemaining = Math.floor((expiry - now) / 1000);

          if (secondsRemaining > 0) {
            setPassData(token);
            setTimeLeft(secondsRemaining);
            setLoading(false);
            return;
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch (err) {
          console.log(err)
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      // B. GENERATE NEW PASS IF NOT IN STORAGE
      try {
        const res = await axios.post(
          "http://localhost:3000/api/pass/generate",
          { purpose: 'pickup' },
          { withCredentials: true }
        );

        if (res.data.success) {
          const { token, createdAt } = res.data;
          const createdTime = new Date(createdAt).getTime();
          const expiryTime = createdTime + (600 * 1000); // 10 mins in ms
          const now = Date.now();
          const secondsLeft = Math.floor((expiryTime - now) / 1000);

          if (secondsLeft <= 0) {
             setError("Pass expired. Please try again.");
             return;
          }

          // 3. SAVE TO STORAGE & STATE
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            token: token,
            expiry: expiryTime
          }));

          setPassData(token);
          setTimeLeft(secondsLeft);
        }
      } catch (err) {
        console.error("Pass Gen Error:", err);
        setError("Could not generate pass. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    initPass();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return;

    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up: clear storage
          localStorage.removeItem(STORAGE_KEY);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [isOpen, timeLeft]);


  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="modal-overlay active">
        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-[400px] w-full relative overflow-hidden flex flex-col items-center">
          
          {/* Header */}
          <div className="w-full flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
            <h3 className="font-bold text-lg text-gray-800">My Pickup Pass</h3>
            <button 
              onClick={onClose}
              className="close-modal-ur transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* CONTENT AREA */}
          {loading ? (
            <div className="py-10 flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 text-sm">Retrieving secure token...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <span className="material-symbols-outlined text-red-500 text-4xl mb-2">error</span>
              <p className="text-red-500 font-medium">{error}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full animate-[fadeIn_0.3s_ease-out]">
              
              {/* THE QR CODE */}
              {/* Only show QR if time is remaining */}
              <div className={`p-4 border-2 border-dashed rounded-xl mb-4 transition-all duration-300 ${timeLeft > 0 ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50 opacity-50 grayscale'}`}>
                <QRCode 
                  value={passData} 
                  size={200} 
                  level="H"
                  bgColor={timeLeft > 0 ? "#eff6ff" : "#f9fafb"} 
                  fgColor={timeLeft > 0 ? "#1e3a8a" : "#9ca3af"} 
                />
              </div>

              {/* TIMER & STATUS */}
              {timeLeft > 0 ? (
                <div className="text-center">
                  <p className="text-gray-500 text-sm mb-1">Show this to the teacher</p>
                  <div className="flex items-center gap-2 justify-center text-blue-600 font-bold text-xl font-mono bg-blue-50 px-4 py-2 rounded-lg">
                    <span className="material-symbols-outlined text-lg">timer</span>
                    {formatTime(timeLeft)}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                   {/* REGENERATE BUTTON REMOVED */}
                   <div className="flex flex-col items-center gap-1 text-red-500 bg-red-50 px-6 py-3 rounded-lg border border-red-100">
                      <span className="material-symbols-outlined">timer_off</span>
                      <p className="font-bold">Pass Expired</p>
                      <p className="text-xs text-red-400">Please close and request a new one.</p>
                   </div>
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