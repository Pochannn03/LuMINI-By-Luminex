const openBtn = document.getElementById("burgerIconOpenNav");
const navBar = document.getElementById("sideNavBar");
const overlay = document.getElementById("navOverlay");
const body = document.body;

let statusPollInterval; // Variable to control the timer
let modePollInterval;
let html5QrcodeScanner = null; // Scanner instance

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
    btnLate.addEventListener("click", () => sendStatusUpdate("late"));

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
      if (data.success) {
        // 1. UPDATE VISUAL TRACKER
        renderVisualTracker(data.status);

        // 2. SMART TOGGLE LOGIC
        const buttons = document.getElementById("statusButtonsContainer");
        const safeMsg = document.getElementById("safeMessageContainer");
        const currentMode = window.currentClassMode || "dropoff"; // Default safety

        // Definition: We only hide buttons if it's MORNING and they are ALREADY HERE.
        const isSafeAndMorning =
          (data.status === "present" || data.status === "late") &&
          currentMode === "dropoff";

        if (isSafeAndMorning) {
          // Case A: Job Done for the Morning -> Show Checkmark
          if (buttons) buttons.style.display = "none";
          if (safeMsg) safeMsg.style.display = "block";

          console.log("✅ Drop-off Complete. Stopping poller.");
          if (statusPollInterval) clearInterval(statusPollInterval);
        } else {
          // Case B: Either Absent OR It's Dismissal Time -> Show Buttons!
          if (buttons) buttons.style.display = "flex"; // Restore flex layout
          if (safeMsg) safeMsg.style.display = "none";

          // NOTE: We do NOT stop the poller here, because if it's Dismissal,
          // we are waiting for the next status change (Pickup Completed).
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

// NEW HELPER: Updates the Visual Tracker UI based on status string
function renderVisualTracker(status) {
  const steps = document.querySelectorAll(".tracker-step");
  const badge = document.querySelector(".current-status-badge");

  // Reset all
  steps.forEach((s) => s.classList.remove("active", "completed"));

  if (status === "present" || status === "late") {
    // STATE: LEARNING (Complete)
    steps[0].classList.add("completed"); // On Way done
    steps[1].classList.add("active"); // Learning active

    if (badge) {
      badge.innerText = "Learning at School";
      badge.style.background = "#fffbeb";
      badge.style.color = "#b45309";
      badge.style.borderColor = "#fcd34d";
    }
  } else {
    // STATE: ON THE WAY (Default)
    steps[0].classList.add("active"); // On Way active

    if (badge) {
      badge.innerText = "On the Way";
      badge.style.background = "#e0f2fe";
      badge.style.color = "#0369a1";
      badge.style.borderColor = "#7dd3fc";
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
  // 1. Pause to prevent multiple reads
  if (html5QrcodeScanner.isScanning) {
    html5QrcodeScanner.pause();
  }

  console.log(`SCANNED: ${decodedText}`);

  // 2. TEMPORARY TEST (Just prove it works)
  alert(`✅ QR Code Read Successfully!\n\nData: ${decodedText}`);

  // 3. Close the scanner
  stopCameraAndClose();
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
