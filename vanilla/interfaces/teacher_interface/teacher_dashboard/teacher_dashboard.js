const openBtn = document.getElementById("burgerIconOpenNav");
const navBar = document.getElementById("sideNavBar");
const overlay = document.getElementById("navOverlay");
const body = document.body;

// Function to Toggle Menu
openBtn.addEventListener("click", () => {
  // Check if we are on Desktop or Mobile
  const isDesktop = window.innerWidth >= 1024;

  if (isDesktop) {
    // DESKTOP: Toggle the "expanded" class for width change
    navBar.classList.toggle("expanded");
    body.classList.toggle("sidebar-open");
  } else {
    // MOBILE: Toggle the "active" class for slide-in
    navBar.classList.toggle("active");
    overlay.classList.toggle("active");
  }
});

// Close menu when clicking overlay (Mobile only)
overlay.addEventListener("click", () => {
  navBar.classList.remove("active");
  overlay.classList.remove("active");
});

// BREAKER //

// --- AUTHENTICATION & PERSONALIZATION LOGIC ---

document.addEventListener("DOMContentLoaded", function () {
  // 1. GET USER DATA FROM STORAGE
  // We retrieve the string we saved during login and turn it back into an object
  const userString = localStorage.getItem("currentUser");
  const currentUser = JSON.parse(userString);

  // 2. SECURITY CHECK (The "Bouncer")
  // If there is no data, it means they never logged in. Kick them out!
  if (!currentUser) {
    alert("⚠️ You must be logged in to view this page.");
    window.location.href = "../auth/login.html"; // Adjust path if needed
    return; // Stop running code
  }

  // 3. UPDATE THE DASHBOARD TEXT
  const headerName = document.getElementById("headerUserName");
  const welcomeMsg = document.getElementById("welcomeMessage");
  const profileImg = document.querySelector(".profile-avatar");

  // We use the 'firstname' we saved in login.js
  if (headerName) {
    headerName.innerText = currentUser.firstname;
  }

  if (welcomeMsg) {
    welcomeMsg.innerText = "Welcome Back, " + currentUser.firstname + "! 👋";
  }

  if (profileImg && currentUser.profilePhoto) {
    // We prepend the server URL because the path in DB is just '/uploads/filename.jpg'
    profileImg.src = "http://localhost:3000" + currentUser.profilePhoto;
  }

  // 4. LOGOUT FUNCTIONALITY (Optional but recommended)
  // You can attach this to a logout button later
  window.logout = function () {
    if (confirm("Are you sure you want to log out?")) {
      localStorage.removeItem("currentUser"); // Destroy the ID card
      window.location.href = "../auth/login.html";
    }
  };
});

// ==========================================
// QR CODE SCANNER LOGIC
// ==========================================

const scannerModal = document.getElementById("qrScannerModal");
const closeScannerBtn = document.getElementById("closeScannerBtn");
// Note: We need to target the specific button.
// I noticed in your HTML the button doesn't have an ID yet, so let's grab it by text or class for now,
// OR you can go back to HTML and add id="startScanBtn" to the "Scan Student QR Code" button.
// For safety, I'll assume you add the ID, but I'll write a fallback selector just in case.
// NEW CODE (Use the ID you added!)
const startScanBtn = document.getElementById("startScanBtn");

let html5QrcodeScanner = null; // Variable to hold the scanner instance

// 1. OPEN SCANNER
if (startScanBtn) {
  startScanBtn.addEventListener("click", () => {
    scannerModal.classList.add("active");
    startCamera();
  });
}

// 2. CLOSE SCANNER
if (closeScannerBtn) {
  closeScannerBtn.addEventListener("click", stopCameraAndClose);
}

// Close on outside click
window.addEventListener("click", (e) => {
  if (e.target === scannerModal) {
    stopCameraAndClose();
  }
});

// 3. START CAMERA FUNCTION (Brave Browser Friendly)
// 3. START CAMERA FUNCTION (Updated with Smart Select)
function startCamera() {
  if (!document.getElementById("reader")) return;

  html5QrcodeScanner = new Html5Qrcode("reader");

  Html5Qrcode.getCameras()
    .then((devices) => {
      if (devices && devices.length) {
        console.log("Cameras found:", devices); // Check your console (F12) to see names!

        // --- SMART SELECTION LOGIC ---
        let cameraId = devices[0].id; // Default to the first one just in case

        // Try to find a camera that looks "Real" (and isn't OBS/Virtual)
        const realCamera = devices.find((device) => {
          const label = device.label.toLowerCase();
          return (
            (label.includes("integrated") ||
              label.includes("webcam") ||
              label.includes("usb")) &&
            !label.includes("virtual") &&
            !label.includes("obs")
          );
        });

        if (realCamera) {
          console.log("Selecting real camera:", realCamera.label);
          cameraId = realCamera.id;
        } else {
          console.log(
            "No obvious webcam found, using first device:",
            devices[0].label
          );
        }
        // -----------------------------

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
        alert(
          "No cameras found. Try turning Shields OFF (Lion Icon) in Brave."
        );
      }
    })
    .catch((err) => {
      console.error("Permission Error", err);
      alert("Permission Denied. Please reset site permissions.");
    });
}

// 4. SCAN SUCCESS CALLBACK (Connected to DB)
function onScanSuccess(decodedText, decodedResult) {
  // 1. Avoid double-scanning (Optional: throttle scans)
  if (html5QrcodeScanner.isScanning) {
    // Temporarily pause to process
    html5QrcodeScanner.pause();
  }

  console.log(`Scanned: ${decodedText}`);

  // 2. Get Teacher ID from storage
  const userString = localStorage.getItem("currentUser");
  if (!userString) {
    alert("Error: You are not logged in.");
    return;
  }
  const teacherId = JSON.parse(userString).id;

  // 3. Send to Backend
  fetch("http://localhost:3000/mark-attendance-qr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentID: decodedText, // The QR code content
      teacherId: teacherId,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // SUCCESS: Play a beep or show a nice alert
        alert(data.message); // e.g., "✅ Juan marked Present!"

        // Resume scanning for the next student
        html5QrcodeScanner.resume();
      } else {
        // FAIL: Show error (e.g., "Student not in your class")
        alert("❌ Error: " + data.message);

        // Resume scanning anyway so they can try again
        html5QrcodeScanner.resume();
      }
    })
    .catch((err) => {
      console.error(err);
      alert("❌ Connection Error");
      html5QrcodeScanner.resume();
    });
}

// 5. SCAN FAILURE CALLBACK (Optional)
function onScanFailure(error) {
  // console.warn(`Code scan error = ${error}`);
  // This fires continuously when no QR is in front of the camera.
  // Usually best to ignore unless debugging.
}

// 6. STOP CAMERA FUNCTION
function stopCameraAndClose() {
  if (html5QrcodeScanner) {
    html5QrcodeScanner
      .stop()
      .then(() => {
        html5QrcodeScanner.clear();
        scannerModal.classList.remove("active");
      })
      .catch((err) => {
        console.error("Failed to stop scanner", err);
        scannerModal.classList.remove("active"); // Close anyway
      });
  } else {
    scannerModal.classList.remove("active");
  }
}

// ==========================================
// REAL-TIME QUEUE LOGIC
// ==========================================

// 1. Start Polling when page loads
document.addEventListener("DOMContentLoaded", () => {
  // ... your existing init code ...

  // Start the loop
  startQueuePolling();
});

let queueInterval;

function startQueuePolling() {
  // Fetch immediately
  fetchQueueData();

  // Then fetch every 3 seconds
  queueInterval = setInterval(fetchQueueData, 3000);
}

function fetchQueueData() {
  const userString = localStorage.getItem("currentUser");
  if (!userString) return;
  const teacherId = JSON.parse(userString).id;

  // REMOVED: const currentMode = localStorage.getItem...
  // REMOVED: if (currentMode === "class") return...

  // We trust the Server now. Just ask for data.
  fetch("http://localhost:3000/get-class-queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      teacherId: teacherId,
      // No need to send 'mode', the server finds it!
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        // 1. Get the TRUTH from the server
        const serverMode = data.currentMode;

        // 2. Update Title UI based on the SERVER mode
        const titleEl = document.getElementById("queueTitle");
        if (titleEl) {
          if (serverMode === "dropoff")
            titleEl.innerText = "Morning Drop-off Queue";
          else if (serverMode === "dismissal")
            titleEl.innerText = "Afternoon Pickup Queue";
          else titleEl.innerText = "Class In-Session";
        }

        // 3. Update the Pill (If you added it)
        if (typeof updateHeaderPill === "function") {
          updateHeaderPill(serverMode);
        }

        // 4. Render the Queue
        renderQueue(data.queue, serverMode);
      }
    })
    .catch((err) => console.error("Queue Polling Error:", err));
}

function renderQueue(queueItems, mode) {
  const container = document.getElementById("queueContainer");
  if (!container) return;

  container.innerHTML = "";

  if (queueItems.length === 0) {
    const msg =
      mode === "class" ? "Students are in class." : "No active requests.";
    container.innerHTML = `<p style="padding: 20px; text-align: center; color: #cbd5e1;">${msg}</p>`;
    return;
  }

  queueItems.forEach((item) => {
    const div = document.createElement("div");
    div.className = "queue-item";

    // Determine Badge Color & Text
    let badgeClass = "badge-pending"; // default yellow
    let badgeText = item.status;

    if (item.status === "otw") {
      badgeClass = "badge-otw";
      badgeText = "On the way";
    } else if (item.status === "late") {
      badgeClass = "badge-late";
      badgeText = "Running late";
    } else if (item.status === "here") {
      badgeClass = "badge-success"; // <--- CHANGED: Now uses the new Green style
      badgeText = "At School";
      div.style.borderLeft = "4px solid #2ecc71"; // Visual highlight
    }

    // Determine Action Text
    const actionText =
      mode === "dropoff"
        ? `Dropping off: ${item.studentName}`
        : `Picking up: ${item.studentName}`;

    const photoSrc = item.profilePhoto
      ? "http://localhost:3000" + item.profilePhoto
      : "../../../assets/placeholder_image.jpg";

    div.innerHTML = `
            <img src="${photoSrc}" class="queue-avatar" style="object-fit:cover;" />
            <div class="queue-info">
                <span class="q-name">${item.parentName}</span>
                <span class="q-action">${actionText}</span>
                <span class="q-time">${item.time}</span>
            </div>
            <span class="badge-pill ${badgeClass}">${badgeText}</span>
        `;

    container.appendChild(div);
  });
}

// ==========================================
// GUARDIAN SCANNER LOGIC
// ==========================================

const guardianModal = document.getElementById("guardianScannerModal");
const scanGuardianBtn = document.getElementById("scanGuardianBtn");
const closeGuardianBtn = document.getElementById("closeGuardianScannerBtn");
let guardianScanner = null; // Separate instance for Guardian Scanner

// 1. OPEN SCANNER
if (scanGuardianBtn) {
  scanGuardianBtn.addEventListener("click", () => {
    if (guardianModal) guardianModal.classList.add("active");
    startGuardianCamera();
  });
}

// 2. CLOSE SCANNER
if (closeGuardianBtn) {
  closeGuardianBtn.addEventListener("click", stopGuardianCamera);
}

// Close on background click
if (guardianModal) {
  guardianModal.addEventListener("click", (e) => {
    if (e.target === guardianModal) stopGuardianCamera();
  });
}

// 3. START CAMERA (With Virtual Camera Filter)
function startGuardianCamera() {
  // Ensure we are targeting the NEW reader box
  if (!document.getElementById("guardianReader")) return;

  guardianScanner = new Html5Qrcode("guardianReader");

  Html5Qrcode.getCameras()
    .then((devices) => {
      if (devices && devices.length) {
        // --- SMART SELECTION LOGIC (Reused) ---
        let cameraId = devices[0].id;

        const realCamera = devices.find((device) => {
          const label = device.label.toLowerCase();
          return (
            (label.includes("integrated") ||
              label.includes("webcam") ||
              label.includes("usb") ||
              label.includes("back")) &&
            !label.includes("virtual") &&
            !label.includes("obs")
          );
        });

        if (realCamera) {
          console.log("Guardian Scanner: Using " + realCamera.label);
          cameraId = realCamera.id;
        }
        // --------------------------------------

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        guardianScanner
          .start(cameraId, config, onGuardianSuccess, (err) => {}) // Fail silently
          .catch((err) => alert("Camera Error: " + err));
      } else {
        alert("No cameras found.");
      }
    })
    .catch((err) => alert("Permission Denied: " + err));
}

// 4. SCAN SUCCESS (Step 1: Open Review Modal)
let pendingStudentID = null; // Store ID temporarily for the confirm button

function onGuardianSuccess(decodedText, decodedResult) {
  if (guardianScanner.isScanning) {
    guardianScanner.pause();
  }

  // 1. Format Check
  if (!decodedText.includes("-PARENT-")) {
    alert("⛔ WRONG QR CODE.");
    guardianScanner.resume();
    return;
  }

  const userString = localStorage.getItem("currentUser");
  const teacherId = JSON.parse(userString).id;

  // 2. Verify & Fetch Data
  fetch("http://localhost:3000/verify-pickup-qr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qrString: decodedText, teacherId: teacherId }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        // 3. POPULATE MODAL
        document.getElementById("authStudentName").innerText =
          data.student.name;
        document.getElementById("authParentName").innerText = data.parent.name;

        const sImg = document.getElementById("authStudentImg");
        const pImg = document.getElementById("authParentImg");

        if (sImg)
          sImg.src = data.student.photo
            ? "http://localhost:3000" + data.student.photo
            : "../../../assets/placeholder_image.jpg";
        if (pImg)
          pImg.src = data.parent.photo
            ? "http://localhost:3000" + data.parent.photo
            : "../../../assets/placeholder_image.jpg";

        // Store ID for the next step
        pendingStudentID = data.student.id;

        // 4. SHOW MODAL
        stopGuardianCamera(); // Close camera
        document.getElementById("pickupAuthModal").classList.add("active");
      } else {
        alert(data.message);
        guardianScanner.resume();
      }
    })
    .catch((err) => {
      console.error(err);
      alert("Connection Error");
      guardianScanner.resume();
    });
}

// 5. STOP CAMERA
function stopGuardianCamera() {
  if (guardianScanner) {
    guardianScanner
      .stop()
      .then(() => {
        guardianScanner.clear();
        guardianModal.classList.remove("active");
      })
      .catch((err) => {
        console.error("Stop Failed", err);
        guardianModal.classList.remove("active");
      });
  } else {
    guardianModal.classList.remove("active");
  }
}

// ==========================================
// AUTHORIZATION MODAL LOGIC
// ==========================================

const authModal = document.getElementById("pickupAuthModal");
const confirmBtn = document.getElementById("confirmPickupBtn");
const cancelBtn = document.getElementById("cancelAuthBtn");
const closeAuthBtn = document.getElementById("closeAuthBtn");

if (confirmBtn) {
  confirmBtn.addEventListener("click", () => {
    if (!pendingStudentID) return;

    // CALL SERVER TO CONFIRM
    fetch("http://localhost:3000/authorize-pickup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentID: pendingStudentID }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // 1. Close Modal
          authModal.classList.remove("active");

          // 2. Show Success Message
          alert(
            `✅ SUCCESS!\n${
              document.getElementById("authStudentName").innerText
            } has been officially dismissed.`
          );

          // 3. Refresh Queue (Card should disappear)
          fetchQueueData();
        } else {
          alert("Error authorizing pickup.");
        }
      });
  });
}

// Cancel Logic
function closeAuthModal() {
  authModal.classList.remove("active");
  pendingStudentID = null;
}

if (cancelBtn) cancelBtn.addEventListener("click", closeAuthModal);
if (closeAuthBtn) closeAuthBtn.addEventListener("click", closeAuthModal);
