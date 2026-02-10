import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthProvider';
import axios from 'axios';
import '../../../styles/user/parent/parent-dashboard.css';
import NavBar from "../../../components/navigation/NavBar";
import ScanHandAsset from '../../../assets/scan_hand.png';
import PassModal from '../../../components/modals/user/PassModal';
import ParentDashboardQrScan from "../../../components/modals/user/parent/dashboard/ParentDashboardQrScan";

export default function Dashboard() {
  // AUTH PROVIDER INFORMATION
  const { user } = useAuth();
  // STATES
  const [showScanner, setShowScanner] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [loading, setLoading] = useState(false)
  const [childData, setChildData] = useState(null);

  // USEEFFECT
  useEffect(() => {
    const fetchChild = async () => {
      try {
        // Update URL to match your new route
        const response = await axios.get(
          'http://localhost:3000/api/parent/children',
          { withCredentials: true }
        );

        const childrenList = response.data; 

        if (Array.isArray(childrenList) && childrenList.length > 0) {
          // For now, we just grab the FIRST child to display
          const firstChild = childrenList[0];
          
          // 3. Map the database fields to your UI fields
          // Your backend returns raw DB fields (snake_case), UI expects camelCase?
          // Let's standardise it based on your UI code:
          setChildData({
              firstName: firstChild.first_name,
              lastName: firstChild.last_name,
              profilePicture: firstChild.profile_picture,
              // Access the populated virtual 'section_details'
              sectionName: firstChild.section_details ? firstChild.section_details.section_name : "Not Assigned"
          });
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchChild();
  }, []);

  // PASS CHECKER
  const hasActivePass = () => {
    const STORAGE_KEY = "lumini_pickup_pass";
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { expiry } = JSON.parse(saved);
        return Date.now() < expiry;
      } catch (err) {
        console.log(err)
        return false;
      }
    }
    return false;
  };

  // HANDLERS
  const handleScanButtonClick = () => {
    if (hasActivePass()) {
      // Valid pass exists -> Open Pass Modal directly (skip camera)
      setShowPassModal(true);
    } else {
      // No pass -> Open Camera Scanner
      setShowScanner(true);
    }
  };

  // THE BRIDGE FUNCTION
  const handleGateScanSuccess = () => {
    setShowScanner(false);
    setShowPassModal(true);
  };

  return(
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">
      <NavBar />

      <main className="overflow-y-auto p-6 animate-[fadeIn_0.4s_ease-out_forwards]">
        <section className="welcome-banner">
          <div>
            <h1 className="text-[28px]! font-bold text-[white]! mb-2 tracking-[-0.5px]">
              {user ? `Welcome, ${user.firstName}!` : "Welcome!"}
            </h1>
            <p className="text-[white]! opacity-80 text-[15px]! m-0">Here is the daily status for your children.</p>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 w-full max-w-[1200px] mx-auto items-start">
          <div className="flex flex-col gap-6"> {/* Grid Left */}
            <div className="card flex flex-col items-center gap-7 py-10 px-6 bg-[#e1f5fe] border border-[#b3e5fc] rounded-[20px]">

              <div className="flex flex-col items-center gap-1.5">
                <div className="p-1 bg-white rounded-full shadow-[0_4px_12px_rgba(57,168,237,0.2)] mb-2">
                  <img 
                    src={childData?.profilePicture || "../../../assets/placeholder_image.jpg"} 
                    alt="Child Profile"
                    className="w-[90px] h-[90px] rounded-full object-cover block" 
                  />
                </div>
                {/* Students Informataion yet to be redesigned for possible multiple kid under the same parent/guardian */}
                <h2 className="text-cdark text-[22px] font-bold">
                  {childData ? `${childData.firstName} ${childData.lastName}` : "Loading..."}
                </h2>
                <span className="text-cgray text-[14px] font-medium">
                  {childData ? `Section: ${childData.sectionName}` : "..."}
                </span>
              </div>

              <div className="flex items-start justify-between w-full max-w-[340px] relative my-2.5">
                <div class="absolute top-[18px] left-2.5 right-2.5 h-[3px] bg-[#cfd8dc] z-0 rounded-sm"></div>
              
                <div className="tracker-step active">
                  <div className="step-circle">
                    <span className="material-symbols-outlined text-[20px]">directions_walk</span>
                  </div>
                  <span class="step-label text-[12px] text-[#b0bec5] font-semibold">On Way</span>
                </div>

                <div className="tracker-step">
                  <div className="step-circle">
                    <span className="material-symbols-outlined text-[20px]">school</span>
                  </div>
                  <span class="step-label text-[12px] text-[#b0bec5] font-semibold">Learning</span>
                </div>

                <div className="tracker-step">
                  <div className="step-circle">
                    <span className="material-symbols-outlined text-[20px]">home</span>
                  </div>
                  <span class="step-label text-[12px] text-[#b0bec5] font-semibold">Dismissed</span>
                </div>
              </div>

              <div className="bg-[#fffbeb] border-2 border-[#fcd34d] py-3 px-9 rounded-[50px] shadow-[0_4px_10px_rgba(245,158,11,0.1)]">
                {/* Information depends on Status(static for the mean time */}
                <p className="text-[#b45309]! font-bold! text-base">Learning At School</p>
              </div>
            </div>

            <div className="card action-card">
              <div className="mb-6">
                <div className="flex items-center gap-2.5 mb-2">
                  <span class="material-symbols-outlined blue-icon text-[24px]">tune</span>
                  <h2 className="text-cdark text-[18px] font-bold">Quick Actions</h2>
                </div>
                <p className="text-cgray text-[14px]! leading-normal">Access the most important tasks instantly.</p>
              </div>

              <div className="quick-actions-list">
                <button className="quick-action-item">
                  <div className="flex flex-row items-center">
                    <div className="qa-icon">
                      <span className="material-symbols-outlined mt-1">group</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="qa-title">Guardian Management</span>
                      <span className="qa-desc">Manage authorized guardians for Alice</span>
                    </div>
                  </div>
                  <span class="material-symbols-outlined arrow">chevron_right</span>
                </button>

                <button className="quick-action-item">
                  <div className="flex flex-row items-center">
                    <div className="qa-icon">
                      <span className="material-symbols-outlined mt-1">history</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="qa-title">Pickup History</span>
                      <span className="qa-desc">View past pickups and approvals</span>
                    </div>
                  </div>
                  <span class="material-symbols-outlined arrow">chevron_right</span>
                </button>

                <button className="quick-action-item">
                  <div className="flex flex-row items-center">
                    <div className="qa-icon">
                      <span className="material-symbols-outlined mt-1">notification_important</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="qa-title">Report Absence</span>
                      <span className="qa-desc">Notify school about absence or delay</span>
                    </div>
                  </div>
                  <span class="material-symbols-outlined arrow">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6"> {/* Right Grid */}
            <div className="card py-8 px-6 flex flex-col items-center text-center">
              <div>
                <h2 className="text-cdark text-[20px] font-bold mb-2">Initiate Pickup</h2>
                <p className="text-cgray text-[14px]! leading-normal m-auto">Scan the school's entry QR code to begin the pickup process and generate your dynamic pickup pass.
                </p>
              </div>

              <div class="flex justify-center my-6 w-full">
                <img src={ScanHandAsset} alt="Scan QR Illustration" className="max-w-[180px] h-auto block" />
              </div>

              <button 
                className="btn btn-primary h-[50px] text-[14px]! font-semibold w-full rounded-xl" 
                id="scanQrBtn"
                onClick={handleScanButtonClick}
              >
                Scan Entry QR
              </button>
            </div>

            <div className="card action-card" id="dropoffCard">
              <div className="mb-6">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="material-symbols-outlined yellow-icon text-[24px]">update</span>
                  <h2 className="text-cdark text-[18px] font-bold">Update Status</h2>
                </div>
                <p className="text-cgray text-[14px]! leading-normal">Keep the school and parents informed about your arrival progress.</p>
              </div>

              <div class="status-options-container" id="statusButtonsContainer">
                <button class="status-option-btn status-blue">
                  <span>On the Way</span>
                  <span class="material-symbols-outlined arrow-icon"
                    >keyboard_double_arrow_right</span
                  >
                </button>

                <button class="status-option-btn status-green">
                  <span>At School</span>
                  <span class="material-symbols-outlined arrow-icon"
                    >keyboard_double_arrow_right</span
                  >
                </button>

                <button class="status-option-btn status-red">
                  <span>Running late</span>
                  <span class="material-symbols-outlined arrow-icon"
                    >keyboard_double_arrow_right</span
                  >
                </button>
              </div>

              {/* Reserved for Status Action Message Card and Safe Messege Container due to Logics Involvement Note: Another Card and Modal*/}

            </div> {/* End of Update Status Card*/}

            <div className="card queue-card">
              <div className="mb-6">
                <div className="flex center gap-2.5 mb-2">
                  <span class="material-symbols-outlined purple-icon text-[24px]">notifications_active</span>
                  <h2 className="text-cdark text-[18px] font-bold">Recent Updates</h2>
                </div>
              </div>

              <div className="flex flex-col gap-4"> {/* Data is static soon logic will be implemented */}
                <div className="bg-[white] flex items-start p-4 rounded-xl border-b-[#f0f0f0] gap-4 hover:bg-[#fafafa]">
                  <div className="bg-[#fff1f2] text-[#f43f5e] flex items-center justify-center shrink-0 w-10 h-10 rounded-[10px]">
                    <span className="material-symbols-outlined">campaign</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-cdark text-[15px] font-bold">Early Dismissal</span>
                    <span className="text-cgray text-[13px]" >Classes end at 1:00 PM today due to faculty meeting.</span>
                    <span className="text-[#94a3b8] text-[11px] font-medium mt-2">2 hours ago</span>
                  </div>
                </div>

                <div className="bg-[white] flex items-start p-4 rounded-xl border-b-[#f0f0f0] gap-4 hover:bg-[#fafafa]">
                  <div className="bg-[#f0fdf4] text-[#22c55e] flex items-center justify-center shrink-0 w-10 h-10 rounded-[10px]">
                    <span className="material-symbols-outlined">event</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-cdark text-[15px] font-bold">Parent-Teacher Conference</span>
                    <span className="text-cgray text-[13px]" >Schedule posted. Check your calendar.</span>
                    <span className="text-[#94a3b8] text-[11px] font-medium mt-2">Yesterday</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <ParentDashboardQrScan 
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleGateScanSuccess}
      />

      <PassModal 
         isOpen={showPassModal} 
         onClose={() => setShowPassModal(false)} 
      />
    </div>
  );
}