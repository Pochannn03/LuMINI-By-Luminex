const openBtn = document.getElementById("burgerIconOpenNav");
const navBar = document.getElementById("sideNavBar");
const overlay = document.getElementById("navOverlay");
const body = document.body;

let statusPollInterval; // Variable to control the timer
let modePollInterval;
let html5QrcodeScanner = null; // Scanner instance
let passTimerInterval; // Controls the 10min countdown

// Toggle Menu
openBtn.addEventListener("click", () => {
  const isDesktop = window.innerWidth >= 1024;
  if (isDesktop) {
    navBar.classList.toggle("expanded");
    body.classList.toggle("sidebar-open");
  } else {
    navBar.classList.toggle("active");
    overlay.classList.toggle("active");
  }
});

overlay.addEventListener("click", () => {
  navBar.classList.remove("active");
  overlay.classList.remove("active");
});

// 5. GATEKEEPER MODAL LOGIC
const gateModal = document.getElementById("pickupGateModal");
const openScannerFromGateBtn = document.getElementById(
  "openScannerFromGateBtn"
);
const cancelGateBtn = document.getElementById("cancelGateBtn");

// A. "Scan Entry QR" Clicked -> Close Gate Modal -> Open Scanner Modal
if (openScannerFromGateBtn) {
  openScannerFromGateBtn.addEventListener("click", () => {
    // Close the warning modal
    if (gateModal) gateModal.classList.remove("active");

    // Open the actual camera modal (reuse existing logic)
    const scannerModal = document.getElementById("qrScannerModal");
    if (scannerModal) scannerModal.classList.add("active");
    startCamera();
  });
}

// B. Cancel Clicked -> Just close
if (cancelGateBtn) {
  cancelGateBtn.addEventListener("click", () => {
    if (gateModal) gateModal.classList.remove("active");
  });
}

document.addEventListener("DOMContentLoaded", function () {
  // 1. GET USER DATA
  const userString = localStorage.getItem("currentUser");
  const currentUser = JSON.parse(userString);

  if (!currentUser || currentUser.role !== "parent") {
    alert("⚠️ Access Denied: Parents Only.");
    window.location.href = "../../../auth/login.html";
    return;
  }

  // 2. UPDATE HEADER
  const headerName = document.getElementById("headerUserName");
  const welcomeMsg = document.getElementById("welcomeMessage");
  const headerImg = document.getElementById("headerProfileImage");

  if (headerName) headerName.innerText = currentUser.firstname;
  if (welcomeMsg)
    welcomeMsg.innerText = "Good Afternoon, " + currentUser.firstname + "!";
  if (headerImg && currentUser.profilePhoto) {
    headerImg.src = "http://localhost:3000" + currentUser.profilePhoto;
  }

  // --- RESTORE PASS IF ACTIVE ---
  restoreActivePass();

  // 3. FETCH LINKED CHILD & MODE
  const parentFullName = `${currentUser.firstname} ${currentUser.lastname}`;

  fetch("http://localhost:3000/get-my-children", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parentName: parentFullName }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success && data.children.length > 0) {
        const child = data.children[0];

        // A. SET MODE GLOBALLY (The Source of Truth)
        window.currentClassMode = child.classMode;

        // B. UPDATE INTERFACE
        updateInterfaceForMode(child.classMode);

        // C. CHECK ATTENDANCE (Lock if already present)
        checkIfAlreadyDroppedOff(child.studentID);

        // D. START POLLING (With Debug Log)
        console.log("🚀 Starting Status Poller for Student:", child.studentID);
        startStatusPolling(child.studentID);

        // --- NEW: START MODE POLLING ---
        startModePolling(parentFullName);

        // D. UPDATE VISUALS
        updateVisuals(child);
      } else {
        console.log("No linked children found.");
      }
    })
    .catch((err) => console.error("Error loading children:", err));

  // 4. ATTACH BUTTON LISTENERS
  const btnOtw = document.querySelector(".status-option-btn.status-blue");
  const btnHere = document.querySelector(".status-option-btn.status-green"); // The "At School" button
  const btnLate = document.querySelector(".status-option-btn.status-red");

  if (btnOtw) btnOtw.addEventListener("click", () => sendStatusUpdate("otw"));

  // --- UPDATED LOGIC FOR "AT SCHOOL" ---
  if (btnHere) {
    btnHere.addEventListener("click", () => {
      // CHECK MODE
      if (window.currentClassMode === "dismissal") {
        // AFTERNOON LOGIC: INTERCEPT & SHOW MODAL
        const gateModal = document.getElementById("pickupGateModal");
        if (gateModal) gateModal.classList.add("active");
      } else {
        // MORNING LOGIC: JUST UPDATE STATUS
        sendStatusUpdate("here");
      }
    });
  }

  if (btnLate)
    btnLate.addEventListener("click", () => sendStatusUpdate("running_late"));

  // 5. SCAN BUTTON LOGIC (Real Scanner Implementation)
  const scanBtn = document.getElementById("scanQrBtn");
  const closeScannerBtn = document.getElementById("closeScannerBtn");
  const scannerModal = document.getElementById("qrScannerModal");

  if (scanBtn) {
    scanBtn.addEventListener("click", () => {
      // 1. Check Mode
      if (window.currentClassMode !== "dismissal") {
        alert(
          "⛔ SCANNING DISABLED.\n\nThe camera is locked until Dismissal time."
        );
        return;
      }

      // 2. Open UI & Start Camera
      if (scannerModal) scannerModal.classList.add("active");
      startCamera();
    });
  }

  if (closeScannerBtn) {
    closeScannerBtn.addEventListener("click", stopCameraAndClose);
  }

  // Close on background click
  if (scannerModal) {
    scannerModal.addEventListener("click", (e) => {
      if (e.target === scannerModal) stopCameraAndClose();
    });
  }

  // 6. LOGOUT
  window.logout = function () {
    if (confirm("Are you sure you want to log out?")) {
      localStorage.removeItem("currentUser");
      window.location.href = "../../../auth/login.html";
    }
  };
});

// ================= HELPER FUNCTIONS =================

function updateInterfaceForMode(mode) {
  const dropoffCard = document.querySelector("#dropoffCard");
  const classCard = document.querySelector("#classModeCard");

  // 1. Reset: Hide everything initially
  if (dropoffCard) dropoffCard.style.display = "none";
  if (classCard) classCard.style.display = "none";

  console.log("Applying Mode:", mode);

  // 2. Apply Logic
  if (mode === "dropoff") {
    // MORNING: Show Status Card
    if (dropoffCard) {
      dropoffCard.style.display = "block";
      dropoffCard.querySelector("h2").innerText = "Morning Drop-off";
      dropoffCard.querySelector(".header-desc").innerText =
        "Let us know you are on the way.";
    }
  } else if (mode === "class") {
    // CLASS: Show Message
    if (classCard) classCard.style.display = "block";
  } else if (mode === "dismissal") {
    // DISMISSAL: Show Status Card (Context: Pickup)
    if (dropoffCard) {
      dropoffCard.style.display = "block";
      dropoffCard.querySelector("h2").innerText = "Afternoon Pickup";
      dropoffCard.querySelector(".header-desc").innerText =
        "Let us know you are coming to pick up.";
    }
  }
}

function checkIfAlreadyDroppedOff(studentID) {
  fetch("http://localhost:3000/get-student-today-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentID: studentID }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Status Check:", data);

      const actionRow = document.getElementById("actionButtonsRow");
      const status = data.status; // 'otw', 'late', 'here', 'present', 'dismissed', 'no_record'

      // --- THE FIX IS HERE ---
      // We explicitly define which statuses are "Active Drop-off Modes"
      // These modes KEEP the buttons visible so the parent can update them.
      const isActiveDropoff =
        status === "otw" || status === "late" || status === "here";

      // If no record exists, we assume it's the start of the day (Buttons Visible)
      const showButtons = isActiveDropoff || status === "no_record";

      if (actionRow) {
        actionRow.style.display = showButtons ? "flex" : "none";
      }

      renderVisualTracker(status);
      if (data.success) {
        // 1. UPDATE VISUAL TRACKER
        renderVisualTracker(data.status);

        // 2. CHECK FOR PICKUP COMPLETION (Afternoon Logic)
        if (data.status === "completed") {
          const isPassActive = localStorage.getItem("lumini_pass_active");
          if (isPassActive === "true") {
            killPass();
            setTimeout(() => {
              alert(
                "🎉 PICKUP SUCCESSFUL!\n\nThe teacher has confirmed the handover."
              );
            }, 100);
          }
        }

        // 3. SHOW "SAFE IN CLASS" (Morning Logic)
        const buttons = document.getElementById("statusButtonsContainer");
        const safeMsg = document.getElementById("safeMessageContainer");

        // Simple Rule: If Present/Late, show Safe Message.
        // We only hide buttons if we are in Dropoff mode (to avoid hiding pickup buttons if they stay present)
        const isSafe =
          data.status === "present" ||
          data.status === "late" ||
          data.status === "completed";
        const isDropoffMode =
          (window.currentClassMode || "dropoff") === "dropoff";

        if (isSafe && isDropoffMode) {
          if (buttons) buttons.style.display = "none";
          if (safeMsg) safeMsg.style.display = "block";
          if (statusPollInterval) clearInterval(statusPollInterval);
        } else {
          // Default: Show buttons (unless it's Class mode, handled by updateInterfaceForMode)
          if (buttons) buttons.style.display = "flex";
          if (safeMsg) safeMsg.style.display = "none";
        }
      }
    })
    .catch((err) => {
      console.error("Polling Error:", err);
    });
}

function sendStatusUpdate(status) {
  // STRICT CHECK: Double protection against updating in wrong mode
  if (window.currentClassMode === "class") {
    alert("⛔ Updates disabled while class is in session.");
    return;
  }

  const userString = localStorage.getItem("currentUser");
  const user = JSON.parse(userString);
  const parentFullName = `${user.firstname} ${user.lastname}`;
  const parentPhoto = user.profilePhoto || "";

  // Use the global mode we detected earlier (or default to dropoff if missing)
  const modeToSend = window.currentClassMode || "dropoff";

  fetch("http://localhost:3000/get-my-children", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parentName: parentFullName }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success && data.children.length > 0) {
        const studentID = data.children[0].studentID;

        // SEND THE UPDATE TO THE SERVER
        return fetch("http://localhost:3000/update-queue-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentID: studentID,
            mode: modeToSend, // <--- FIXED: Now dynamic! (sends "dismissal" or "dropoff")
            status: status,
            parentPhoto: parentPhoto,
          }),
        });
      }
    })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        // UI FEEDBACK
        const actionText = status === "otw" ? "On the Way" : "At School";
        alert(`✅ Teacher Notified: ${actionText}`);

        // Optional: If you want to lock the card immediately after "At School" is clicked:
        // if (status === 'here') checkIfAlreadyDroppedOff(studentID);
      }
    })
    .catch((err) => {
      console.error(err);
      alert("Error updating status.");
    });
}

function updateVisuals(child) {
  const childNameEl = document.querySelector(".visual-name");
  const childImgEl = document.querySelector(".visual-avatar");
  const gradeEl = document.querySelector(".visual-grade");

  if (childNameEl)
    childNameEl.innerText = `${child.firstname} ${child.lastname}`;
  if (childImgEl && child.profilePhoto)
    childImgEl.src = "http://localhost:3000" + child.profilePhoto;

  if (child.gradeLevel && child.gradeLevel !== "Unassigned") {
    if (gradeEl) gradeEl.innerText = `${child.gradeLevel} - ${child.section}`;

    renderVisualTracker("otw");
  } else {
    if (gradeEl) gradeEl.innerText = "No Active Class";
  }
}

function startStatusPolling(studentID) {
  // 1. Clear any existing timer to prevent duplicates
  if (statusPollInterval) {
    clearInterval(statusPollInterval);
  }

  // 2. Start the Loop (Every 3 Seconds)
  statusPollInterval = setInterval(() => {
    console.log(`⏱️ Polling status for ${studentID}...`); // Debug Log
    checkIfAlreadyDroppedOff(studentID);
  }, 3000);
}

function startModePolling(parentFullName) {
  // Clear existing to be safe
  if (modePollInterval) clearInterval(modePollInterval);

  modePollInterval = setInterval(() => {
    fetch("http://localhost:3000/get-my-children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentName: parentFullName }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.children.length > 0) {
          const child = data.children[0];
          const newMode = child.classMode;

          // CHECK IF MODE CHANGED
          if (newMode !== window.currentClassMode) {
            console.log(
              `🔄 Mode Change Detected: ${window.currentClassMode} -> ${newMode}`
            );

            // 1. Update Global Variable
            window.currentClassMode = newMode;

            // 2. Update UI Immediately
            updateInterfaceForMode(newMode);

            // 3. CRITICAL FIX: Re-check attendance immediately
            // If we just switched to Drop-off, maybe the kid is already here!
            if (newMode === "dropoff" || newMode === "dismissal") {
              console.log(
                "Re-checking attendance status due to mode change..."
              );
              checkIfAlreadyDroppedOff(child.studentID);
              // Ensure status polling is active
              startStatusPolling(child.studentID);
            }
          }
        }
      })
      .catch((err) => console.error("Mode Polling Error:", err));
  }, 3000); // Check every 3 seconds
}

function renderVisualTracker(status) {
  const steps = document.querySelectorAll(".tracker-step");
  const badge = document.querySelector(".current-status-badge");

  // 1. RESET ALL
  steps.forEach((s) => s.classList.remove("active", "completed"));

  // 2. DEFINE BADGE HELPER
  const setBadge = (text, bg, border, color) => {
    if (badge) {
      badge.innerText = text;
      badge.style.background = bg;
      badge.style.borderColor = border;
      badge.style.color = color;
    }
  };

  // 3. STATE MACHINE LOGIC
  if (status === "completed") {
    // DISMISSED / HOME
    steps[0].classList.add("completed");
    steps[1].classList.add("completed");
    steps[2].classList.add("active");
    setBadge("Dismissed", "#eff6ff", "#bfdbfe", "#1e40af");
  } else if (status === "present" || status === "late") {
    // LEARNING (Safe at School)
    // Note: 'late' here refers to Attendance Late, which is SAFE.
    steps[0].classList.add("completed");
    steps[1].classList.add("active");
    setBadge("Learning at School", "#f0fdf4", "#86efac", "#166534");
  } else if (status === "running_late") {
    // --- FIX: RUNNING LATE (Active Queue) ---
    // Parent is still driving.
    steps[0].classList.add("active");
    setBadge("Running Late", "#fef2f2", "#fca5a5", "#dc2626");
  } else {
    // DEFAULT (On The Way / Here)
    steps[0].classList.add("active");

    if (status === "here") {
      setBadge("At School (Waiting)", "#fffbeb", "#fcd34d", "#b45309");
    } else {
      setBadge("On the Way", "#fefce8", "#fef08a", "#854d0e");
    }
  }
}
// ================= SCANNER FUNCTIONS =================

function startCamera() {
  if (!document.getElementById("reader")) return;

  html5QrcodeScanner = new Html5Qrcode("reader");

  Html5Qrcode.getCameras()
    .then((devices) => {
      if (devices && devices.length) {
        console.log("Cameras found:", devices);

        // --- SMART SELECTION LOGIC (Copy-pasted from Teacher Dashboard) ---
        let cameraId = devices[0].id; // Default to first

        // Try to find a camera that looks "Real"
        const realCamera = devices.find((device) => {
          const label = device.label.toLowerCase();
          return (
            (label.includes("integrated") ||
              label.includes("webcam") ||
              label.includes("usb") ||
              label.includes("back") || // Mobile back camera
              label.includes("environment")) && // Mobile environment camera
            !label.includes("virtual") &&
            !label.includes("obs")
          );
        });

        if (realCamera) {
          console.log("Selecting real camera:", realCamera.label);
          cameraId = realCamera.id;
        }
        // ------------------------------------------------------------------

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        html5QrcodeScanner
          .start(cameraId, config, onScanSuccess, onScanFailure)
          .catch((err) => {
            console.error("Start Error", err);
            alert("Camera started but failed to feed: " + err);
          });
      } else {
        alert("No cameras found.");
      }
    })
    .catch((err) => {
      console.error("Permission Error", err);
      alert("Permission Denied. Please reset site permissions.");
    });
}

function onScanSuccess(decodedText, decodedResult) {
  // 1. Pause Scanner
  if (html5QrcodeScanner.isScanning) {
    html5QrcodeScanner.pause();
  }

  console.log(`SCANNED: ${decodedText}`);

  // 2. CHECK FOR SECRET KEY
  if (decodedText === "THISISTHECODEFORQRENTRYHELLO") {
    // Close the Camera Modal
    stopCameraAndClose();

    // Generate the Pass
    generatePickupPass();
  } else {
    alert("❌ Invalid QR Code. Please scan the School Entry QR.");
    html5QrcodeScanner.resume();
  }
}

function onScanFailure(error) {
  // console.warn(error); // Ignored to keep console clean
}

function stopCameraAndClose() {
  const scannerModal = document.getElementById("qrScannerModal");

  if (html5QrcodeScanner) {
    html5QrcodeScanner
      .stop()
      .then(() => {
        html5QrcodeScanner.clear();
        if (scannerModal) scannerModal.classList.remove("active");
      })
      .catch((err) => {
        console.error("Stop failed", err);
        if (scannerModal) scannerModal.classList.remove("active");
      });
  } else {
    if (scannerModal) scannerModal.classList.remove("active");
  }
}

// ================= PICKUP PASS GENERATOR =================

function generatePickupPass() {
  const userString = localStorage.getItem("currentUser");
  const user = JSON.parse(userString);
  const parentName = `${user.firstname}${user.lastname}`.replace(/\s/g, "");

  fetch("http://localhost:3000/get-my-children", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parentName: `${user.firstname} ${user.lastname}` }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success && data.children.length > 0) {
        const studentID = data.children[0].studentID;
        const studentName = `${data.children[0].firstname} ${data.children[0].lastname}`;

        // 1. Create Data
        const timestamp = Date.now();
        const secretString = `${studentID}-PARENT-${parentName}-${timestamp}`;

        // 2. Set Expiration (10 minutes)
        const expiryTime = Date.now() + 600000;

        // 3. SAVE TO LOCAL STORAGE
        localStorage.setItem("lumini_pass_active", "true");
        localStorage.setItem("lumini_pass_secret", secretString);
        localStorage.setItem("lumini_pass_student", studentName);
        localStorage.setItem("lumini_pass_expiry", expiryTime);

        // --- NEW LOGIC: NOTIFY TEACHER AUTOMATICALLY ---
        console.log("🎟️ Pass Generated. Notifying Teacher...");

        fetch("http://localhost:3000/update-queue-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentID: studentID,
            mode: "dismissal", // Explicitly for Pickup
            status: "here", // This sets the green "At School" badge
            parentPhoto: user.profilePhoto,
          }),
        }).then(() =>
          console.log("✅ Teacher Alerted: Parent is Here with Pass")
        );
        // -----------------------------------------------

        // 4. Show UI
        showPassModal(studentName, secretString);
      } else {
        alert("Error: No student linked to this account.");
      }
    });
}

function showPassModal(studentName, secretString, openModal = true) {
  const modal = document.getElementById("pickupPassModal");
  const qrContainer = document.getElementById("generatedQr");
  const nameEl = document.getElementById("passStudentName");
  const headerBtn = document.getElementById("viewPassBtn");

  // 1. Setup UI
  if (nameEl) nameEl.innerText = studentName;
  if (qrContainer) qrContainer.innerHTML = "";

  // 2. Generate QR
  new QRCode(qrContainer, {
    text: secretString,
    width: 180,
    height: 180,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });

  // 3. Show Header Button (Always)
  if (headerBtn) {
    headerBtn.style.display = "flex";
    headerBtn.onclick = () => {
      // Re-generate QR if container is empty (safety) or just show modal
      modal.classList.add("active");
    };
  }

  // 1. Show Modal
  if (modal && openModal) modal.classList.add("active");

  // 2. Start Timer
  startPassTimer();

  // 3. FORCE FAST POLLING (Check every 1 second while pass is open)
  // This ensures the parent gets the "Success" msg instantly when teacher clicks button.
  if (window.fastPoll) clearInterval(window.fastPoll);

  // We grab the studentID from localStorage since we saved it during generation
  const userString = localStorage.getItem("currentUser");
  const user = JSON.parse(userString);

  // We need the studentID. Since 'generatePickupPass' saves data to localStorage,
  // let's grab it from the secret string which is "ID-PARENT-..."
  const savedSecret = localStorage.getItem("lumini_pass_secret");
  if (savedSecret) {
    const parts = savedSecret.split("-PARENT-");
    const studentID = parts[0];

    console.log("🚀 High-Speed Polling Activated for:", studentID);

    window.fastPoll = setInterval(() => {
      checkIfAlreadyDroppedOff(studentID);
    }, 1000); // 1-second interval
  }
}

function startPassTimer() {
  const display = document.getElementById("passTimer");
  const headerBtn = document.getElementById("viewPassBtn");
  const modal = document.getElementById("pickupPassModal");

  // Clear any existing timer to prevent duplicates/speeding up
  if (passTimerInterval) clearInterval(passTimerInterval);

  passTimerInterval = setInterval(function () {
    // 1. Get the DEADLINE from storage
    const expiryStr = localStorage.getItem("lumini_pass_expiry");

    // Safety: If no deadline exists, kill the pass
    if (!expiryStr) {
      killPass();
      return;
    }

    const expiryTime = parseInt(expiryStr, 10);
    const now = Date.now();

    // 2. Calculate remaining time in seconds
    const secondsRemaining = Math.floor((expiryTime - now) / 1000);

    if (secondsRemaining < 0) {
      // TIME'S UP!
      killPass();
      alert(
        "⚠️ Pickup Pass Expired.\nPlease scan the gate code again if needed."
      );
      return;
    }

    // 3. Format MM:SS
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;

    const minStr = minutes < 10 ? "0" + minutes : minutes;
    const secStr = seconds < 10 ? "0" + seconds : seconds;

    if (display) display.textContent = minStr + ":" + secStr;
  }, 1000);
}

// Helper to clean up everything
function killPass() {
  if (passTimerInterval) clearInterval(passTimerInterval);

  // --- NEW: STOP FAST POLLING ---
  if (window.fastPoll) {
    clearInterval(window.fastPoll);
    window.fastPoll = null;
  }
  // ------------------------------

  localStorage.removeItem("lumini_pass_active");
  localStorage.removeItem("lumini_pass_secret");
  localStorage.removeItem("lumini_pass_student");
  localStorage.removeItem("lumini_pass_expiry");

  const headerBtn = document.getElementById("viewPassBtn");
  const modal = document.getElementById("pickupPassModal");

  if (headerBtn) headerBtn.style.display = "none";
  if (modal) modal.classList.remove("active");
}

// Close Button Logic for Pass Modal
const closePassBtn = document.getElementById("closePassBtn");
if (closePassBtn) {
  closePassBtn.addEventListener("click", () => {
    document.getElementById("pickupPassModal").classList.remove("active");
  });
}

function restoreActivePass() {
  const isActive = localStorage.getItem("lumini_pass_active");
  const expiryStr = localStorage.getItem("lumini_pass_expiry");

  if (isActive === "true" && expiryStr) {
    const expiryTime = parseInt(expiryStr, 10);

    if (Date.now() > expiryTime) {
      killPass();
    } else {
      const studentName = localStorage.getItem("lumini_pass_student");
      const secretString = localStorage.getItem("lumini_pass_secret");

      console.log("♻️ Restoring active Pickup Pass...");
      showPassModal(studentName, secretString, false);
    }
  }
}

// ================= HELPER FUNCTIONS =================

// ... (inside renderVisualTracker)

function renderVisualTracker(status) {
  const steps = document.querySelectorAll(".tracker-step");
  const badge = document.querySelector(".current-status-badge");

  // 1. RESET ALL (Clean Slate)
  steps.forEach((s) => s.classList.remove("active", "completed"));

  // 2. DEFINE BADGE STYLES
  const setBadge = (text, bg, border, color) => {
    if (badge) {
      badge.innerText = text;
      badge.style.background = bg;
      badge.style.borderColor = border;
      badge.style.color = color;
    }
  };

  // 3. STATE MACHINE LOGIC
  if (status === "completed") {
    // --- STATE 3: DISMISSED / HOME ---
    steps[0].classList.add("completed"); // On Way: Done
    steps[1].classList.add("completed"); // Learning: Done
    steps[2].classList.add("active"); // Dismissed: Active

    setBadge("Dismissed", "#eff6ff", "#bfdbfe", "#1e40af");
  } else if (status === "present" || status === "late") {
    // --- STATE 2: LEARNING ---
    steps[0].classList.add("completed"); // On Way: Done
    steps[1].classList.add("active"); // Learning: Active

    setBadge("Learning at School", "#f0fdf4", "#86efac", "#166534");
  } else {
    // --- STATE 1: ON THE WAY (Default) ---
    // Includes: 'otw', 'here', 'no_record', etc.
    steps[0].classList.add("active"); // On Way: Active

    // Optional: Distinct text for "At School but waiting" vs "On Way"
    if (status === "here") {
      setBadge("At School (Waiting)", "#fffbeb", "#fcd34d", "#b45309");
    } else {
      setBadge("On the Way", "#fefce8", "#fef08a", "#854d0e");
    }
  }
}

// ==========================================
// PICKUP HISTORY LOGIC
// ==========================================

const historyModal = document.getElementById("historyModal");
const openHistoryBtn = document.getElementById("navPickupHistoryBtn"); // Ensure ID is in HTML sidebar!
const closeHistoryBtn = document.getElementById("closeHistoryBtn");
const prevDateBtn = document.getElementById("histPrevBtn");
const nextDateBtn = document.getElementById("histNextBtn");
const datePicker = document.getElementById("historyDatePicker");
const dateDisplay = document.getElementById("historyDateDisplay");
const resultContainer = document.getElementById("historyResultContainer");

let currentHistoryDate = new Date(); // State for the modal

// 1. Open Modal
if (openHistoryBtn) {
  openHistoryBtn.addEventListener("click", (e) => {
    e.preventDefault();
    historyModal.classList.add("active");
    currentHistoryDate = new Date(); // Reset to today
    updateHistoryUI();
  });
}

// 2. Close Modal
if (closeHistoryBtn) {
  closeHistoryBtn.addEventListener("click", () => {
    historyModal.classList.remove("active");
  });
}

// 3. Navigation
if (prevDateBtn) {
  prevDateBtn.addEventListener("click", () => {
    currentHistoryDate.setDate(currentHistoryDate.getDate() - 1);
    updateHistoryUI();
  });
}

if (nextDateBtn) {
  nextDateBtn.addEventListener("click", () => {
    currentHistoryDate.setDate(currentHistoryDate.getDate() + 1);
    updateHistoryUI();
  });
}

if (datePicker) {
  datePicker.addEventListener("change", (e) => {
    if (e.target.value) {
      currentHistoryDate = new Date(e.target.value);
      updateHistoryUI();
    }
  });
}

// 4. Update UI & Fetch
function updateHistoryUI() {
  // A. Format Date for Display (e.g., "Mon, Dec 15")
  const options = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  dateDisplay.innerText = currentHistoryDate.toLocaleDateString(
    "en-US",
    options
  );

  // B. Format Date for Server (YYYY-MM-DD in Local Time)
  const offset = currentHistoryDate.getTimezoneOffset() * 60000;
  const serverDate = new Date(currentHistoryDate - offset)
    .toISOString()
    .slice(0, 10);

  // Sync hidden picker
  datePicker.value = serverDate;

  // C. Fetch Data
  fetchHistoryData(serverDate);
}

function fetchHistoryData(dateString) {
  const userString = localStorage.getItem("currentUser");
  const user = JSON.parse(userString);
  const parentFullName = `${user.firstname} ${user.lastname}`;

  resultContainer.innerHTML = `<p style="color:#94a3b8; text-align:center; padding:20px;">Loading records...</p>`;

  fetch("http://localhost:3000/get-student-history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parentName: parentFullName, date: dateString }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success && data.record) {
        renderHistoryCard(data.record);
      } else {
        renderEmptyCard();
      }
    })
    .catch((err) => {
      console.error(err);
      resultContainer.innerHTML = `<p style="color:red; text-align:center;">Error loading data.</p>`;
    });
}

function renderHistoryCard(record) {
  // Default values if empty
  const arrival = record.arrivalTime || "--:--";
  const dismissal = record.dismissalTime || "--:--";
  const guardian = record.authorizedPickupPerson || "Not Recorded";

  // Status Logic
  let statusText = `<span class="text-gray">Absent</span>`;
  if (record.status === "present")
    statusText = `<span class="text-green">Present</span>`;
  if (record.status === "late")
    statusText = `<span style="color:#f59e0b">Late</span>`;

  resultContainer.innerHTML = `
        <div class="history-row">
            <div>
                <div class="h-label">Attendance Status</div>
                <div class="h-value">${statusText}</div>
            </div>
            <div>
                <div class="h-label" style="text-align:right;">Arrival</div>
                <div class="h-value" style="justify-content:flex-end;">
                    <span class="material-symbols-outlined" style="font-size:16px;">login</span> ${arrival}
                </div>
            </div>
        </div>

        <div class="history-row">
            <div>
                <div class="h-label">Dismissal Time</div>
                <div class="h-value">
                    <span class="material-symbols-outlined" style="font-size:16px;">logout</span> ${dismissal}
                </div>
            </div>
        </div>

        <div class="history-row">
            <div style="width:100%;">
                <div class="h-label">Authorized Pickup By</div>
                <div class="h-value" style="margin-top:4px;">
                    <span class="material-symbols-outlined" style="font-size:18px; color:#3b82f6;">verified_user</span> 
                    ${guardian}
                </div>
            </div>
        </div>
    `;
}

function renderEmptyCard() {
  resultContainer.innerHTML = `
        <div style="text-align:center; padding:30px 10px;">
            <span class="material-symbols-outlined" style="font-size:48px; color:#e2e8f0; margin-bottom:10px;">event_busy</span>
            <p style="color:#94a3b8; font-size:14px;">No records found for this date.</p>
        </div>
    `;
}
