const openBtn = document.getElementById("burgerIconOpenNav");
const navBar = document.getElementById("sideNavBar");
const overlay = document.getElementById("navOverlay");
const body = document.body;

// Function to Toggle Menu (Identical to Teacher Dashboard)
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

// --- AUTHENTICATION & PERSONALIZATION LOGIC ---

document.addEventListener("DOMContentLoaded", function () {
  // 1. GET USER DATA
  const userString = localStorage.getItem("currentUser");
  const currentUser = JSON.parse(userString);

  // 2. SECURITY CHECK (The "Bouncer")
  // If no user, OR if the user is NOT a parent, kick them out.
  if (!currentUser || currentUser.role !== "parent") {
    alert("⚠️ Access Denied: Parents Only.");
    // Adjust path to go back to login (Go Up 2 levels to vanilla, then to auth)
    window.location.href = "../../../auth/login.html";
    return;
  }

  // 3. UPDATE DASHBOARD TEXT
  const headerName = document.getElementById("headerUserName");
  const welcomeMsg = document.getElementById("welcomeMessage");

  if (headerName) {
    // e.g. "Sarah"
    headerName.innerText = currentUser.firstname;
  }

  if (welcomeMsg) {
    // e.g. "Good Afternoon, Sarah!"
    welcomeMsg.innerText = "Good Afternoon, " + currentUser.firstname + "!";
  }

  // 4. LOGOUT FUNCTION (Optional Helper)
  window.logout = function () {
    if (confirm("Are you sure you want to log out?")) {
      localStorage.removeItem("currentUser");
      window.location.href = "../../auth/login.html";
    }
  };
});
