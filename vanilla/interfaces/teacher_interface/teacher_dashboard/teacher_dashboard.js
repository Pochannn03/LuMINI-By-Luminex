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
