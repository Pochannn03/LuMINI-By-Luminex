import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Scanner } from "@yudiel/react-qr-scanner";

export default function ParentDashboardQrScan({ isOpen, onClose, onScanSuccess }) {
  const GATE_KEY = "LUMINI_SCHOOL_ENTRY_GATE_1";
  const [scanResult, setScanResult] = useState(null);

  // Reset state when modal opens
  useEffect(() => {
    setScanResult(null);
  }, [isOpen]);

  const handleScan = (detectedCodes) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const scannedValue = detectedCodes[0].rawValue;

      if (scannedValue === scanResult) return;

      if (scannedValue === GATE_KEY) {
         setScanResult(scannedValue);
         console.log("Gate Verified!");
         onScanSuccess(); 
         onClose();

      } else {
         console.log("Ignored irrelevant QR:", scannedValue);
      }
    }
  };

  const handleError = (err) => {
    console.error(err); // Silently handle errors
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="modal-overlay active">
        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-[500px] w-full relative overflow-hidden">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined blue-icon">qr_code_scanner</span>
              <h3 className="font-bold text-lg">Scan Entry QR</h3>
            </div>
            <button className="close-modal-ur" onClick={onClose}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Scanner Body */}
          <div className="modal-body p-0!">
            <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden">
              <Scanner
                onScan={handleScan}
                onError={handleError}
                formats={['qr_code']}
                components={{ audio: false, finder: false }}
                styles={{
                  container: { width: "100%", height: "100%" },
                  video: { width: "100%", height: "100%", objectFit: "cover" }
                }}
              />

              {/* White Overlay Box */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-[280px] h-[280px] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] rounded-3xl">
                    <div className="absolute top-0 left-0 w-12 h-12 border-l-4 border-t-4 border-white rounded-tl-3xl"></div>
                    <div className="absolute top-0 right-0 w-12 h-12 border-r-4 border-t-4 border-white rounded-tr-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-12 h-12 border-l-4 border-b-4 border-white rounded-bl-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-12 h-12 border-r-4 border-b-4 border-white rounded-br-3xl"></div>
                  </div>
              </div>
            </div>

            <p className="text-center text-[#64748b]! text-[14px]! p-5">
              Scan the QR code at the school entrance to generate your pass.
            </p>
          </div>
        </div>
      </div>

      {/* <PassModal 
        isOpen={showPassModal} 
        onClose={() => setShowPassModal(false)} 
      /> */}
    </>,
    document.body
  );
}