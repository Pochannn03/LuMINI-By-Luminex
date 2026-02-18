import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Scanner } from "@yudiel/react-qr-scanner";


export default function AdminDashboardQrScan({ isOpen, onClose, onScan, scanMode }) {
  // USESTATES
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(true);

  // USEEFFECTS
  useEffect(() => {
    setScanResult(null);
    setIsScanning(true);
  }, [isOpen, scanMode]);

  // DYNAMIC TITLES
  const isUser = scanMode === 'user';
  
  const title = isUser 
    ? "Scan Parent/Guardian Pass" 
    : "Scan Student QR Code";
    
  const instructions = isUser 
    ? "Ask the parent to show their Pickup Pass." 
    : "Ask the student to show their ID QR Code.";

  const iconClass = isUser ? "orange-icon" : "blue-icon";

  // HANDLERS
  const handleScan = (detectedCodes) => {
    if (detectedCodes && detectedCodes.length > 0 && isScanning) {
      const rawValue = detectedCodes[0].rawValue;
      
      if (rawValue) {
        console.log(`Scanned (${scanMode}):`, rawValue);
        setIsScanning(false);
        
        if (onScan) {
            onScan(rawValue);
        }
      }
    }
  };

  const handleError = (error) => {
    console.error("Scanner Error:", error);
  };


  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="modal-overlay active">
        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-[500px] w-full relative overflow-hidden"> {/* Modal Card */}
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <span className={`material-symbols-outlined ${iconClass}`}>qr_code_scanner</span>
              <h3 className="font-bold text-lg">{title}</h3>
            </div>
            <button class="close-modal-ur" onClick={onClose}>
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="modal-body p-0!">
            <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden">
              
              <Scanner
                onScan={handleScan}
                onError={handleError}
                formats={['qr_code']}
                components={{
                  audio: false,
                  finder: false, 
                }}
                styles={{
                  container: { width: "100%", height: "100%" },
                  video: { width: "100%", height: "100%", objectFit: "cover" }
                }}
              />

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-[280px] h-[280px] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] rounded-3xl">

                    {/* Top Left Corner */}
                    <div className="absolute top-0 left-0 w-12 h-12 border-l-4 border-t-4 border-white rounded-tl-3xl"></div>
                    
                    {/* Top Right Corner */}
                    <div className="absolute top-0 right-0 w-12 h-12 border-r-4 border-t-4 border-white rounded-tr-3xl"></div>
                    
                    {/* Bottom Left Corner */}
                    <div className="absolute bottom-0 left-0 w-12 h-12 border-l-4 border-b-4 border-white rounded-bl-3xl"></div>
                    
                    {/* Bottom Right Corner */}
                    <div className="absolute bottom-0 right-0 w-12 h-12 border-r-4 border-b-4 border-white rounded-br-3xl"></div>

                  </div>
                </div>

            </div>
            <p className="text-center text-[#64748b]! text-[14px]! p-5">
              {instructions}
            </p>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}