import React from "react";
import QRCode from "react-qr-code";
import NavBar from "../../components/navigation/NavBar";

export default function SuperAdminDashboard() {
  const gateCode = "LUMINI_SCHOOL_ENTRY_GATE_1";

  return (
    <div className="dashboard-wrapper flex flex-col h-full min-h-screen transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20 bg-gray-50">
      
      {/* 1. Wrap NavBar in print:hidden so it disappears on paper */}
      <div className="print:hidden">
        <NavBar />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        
        {/* 2. THE PRINTABLE SIGN CONTAINER */}
        <div 
          id="printable-sign"
          className="bg-white border-4 border-black p-12 rounded-3xl text-center shadow-xl print:shadow-none print:border-4 print:w-full print:h-screen print:rounded-none print:flex print:flex-col print:items-center print:justify-center"
        >
          <h1 className="text-5xl font-extrabold mb-4 text-black tracking-tight">SCAN TO GENERATE QR</h1>
          <p className="text-2xl text-gray-600 mb-10 font-medium">Parent / Guardian Check-in</p>
          
          <div className="p-6 border-4 border-dashed border-gray-300 rounded-2xl inline-block bg-white">
            <QRCode 
              value={gateCode} 
              size={350} // Slightly larger for better visibility
              level="H"
            />
          </div>
        </div>

        {/* 3. PRINT BUTTON */}
        <button 
          onClick={() => window.print()}
          className="btn btn-primary h-14! w-45! mt-12 print:hidden flex items-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined">print</span>
          Print This Sign
        </button>

      </main>

      <style>{`
        @media print {
          /* Hide everything by default */
          body * {
            visibility: hidden;
          }
          
          /* Only show the sign and its contents */
          #printable-sign, #printable-sign * {
            visibility: visible;
          }

          /* Force the sign to take up the whole page and center itself */
          #printable-sign {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100vh;
            margin: 0;
            padding: 0;
            border: none; /* Optional: Remove border if you want a clean page */
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          /* Remove browser headers/footers */
          @page {
            margin: 0;
            size: auto;
          }
        }
      `}</style>
    </div>
  );
}