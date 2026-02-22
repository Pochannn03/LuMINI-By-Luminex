import React from "react";
import NavBar from "../../components/navigation/NavBar";

export default function SuperAdminBulkRegistration() {
  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">
      
      <NavBar />

      <main className="overflow-y-auto p-6 animate-[fadeIn_0.4s_ease-out_forwards]">
        
        {/* --- SUPER ADMIN BANNER (Dark Theme) --- */}
        <div className="superadmin-banner">
          <h1 className="text-[white]! text-[28px]! font-bold mb-2 tracking-[-0.5px]">
            Bulk Registration
          </h1>
          <p className="text-[white]! opacity-80 text-[15px]! m-0">
            Review and finalize teacher-approved student enrollments.
          </p>
        </div>

        {/* --- MAIN CONTENT WRAPPER --- */}
        <div className="max-w-[1200px] m-auto">
          
          {/* PLACEHOLDER CARD */}
          <div className="card queue-card flex flex-col items-center justify-center min-h-[450px] text-center p-10">
            
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-blue-50 text-blue-500">
              <span className="material-symbols-outlined text-[40px]">group_add</span>
            </div>
            
            <h2 className="text-2xl font-bold text-cdark mb-3">
              Teacher Approvals Hub
            </h2>
            
            <p className="text-cgray text-[15px] leading-relaxed max-w-lg mx-auto">
              This is where the bulk registration feature will live. Soon, you will see a list of teachers and their sections. Clicking on a section will reveal all the students the teacher has approved, allowing you to officially register them into the system database with one click!
            </p>

          </div>
          
        </div>

      </main>
    </div>
  );
}