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

  // We use the 'firstname' we saved in login.js
  if (headerName) {
    headerName.innerText = currentUser.firstname;
  }

  if (welcomeMsg) {
    welcomeMsg.innerText = "Welcome Back, " + currentUser.firstname + "! 👋";
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
