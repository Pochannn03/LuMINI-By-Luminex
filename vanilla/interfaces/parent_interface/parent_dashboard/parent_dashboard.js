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

  // 2. SECURITY CHECK
  if (!currentUser || currentUser.role !== "parent") {
    alert("⚠️ Access Denied: Parents Only.");
    window.location.href = "../../../auth/login.html";
    return;
  }

  // 3. UPDATE HEADER TEXT & IMAGE
  const headerName = document.getElementById("headerUserName");
  const welcomeMsg = document.getElementById("welcomeMessage");
  const headerImg = document.getElementById("headerProfileImage"); // <--- NEW

  // Update Name
  if (headerName) {
    headerName.innerText = currentUser.firstname;
  }

  // Update Welcome Banner
  if (welcomeMsg) {
    welcomeMsg.innerText = "Good Afternoon, " + currentUser.firstname + "!";
  }

  // Update Profile Image (NEW LOGIC)
  if (headerImg && currentUser.profilePhoto) {
    // Prepend server URL to the file path
    headerImg.src = "http://localhost:3000" + currentUser.profilePhoto;
  }

  // 5. FETCH & DISPLAY LINKED CHILD
  const parentFullName = `${currentUser.firstname} ${currentUser.lastname}`;

  fetch("http://localhost:3000/get-my-children", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parentName: parentFullName }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success && data.children.length > 0) {
        // We'll take the first child found for now
        const child = data.children[0];

        // TARGET THE DOM ELEMENTS
        const childNameEl = document.querySelector(".visual-name");
        const childGradeEl = document.querySelector(".visual-grade");
        // const childImgEl = document.querySelector(".visual-avatar"); // Enable later if students have photos

        // UPDATE THE TEXT
        if (childNameEl) {
          childNameEl.innerText = `${child.firstname} ${child.lastname}`;
        }
        if (childGradeEl) {
          childGradeEl.innerText = `${child.gradeLevel || "Grade N/A"} - ${
            child.section || "Section N/A"
          }`;
        }
      } else {
        console.log("No linked children found for: " + parentFullName);
        // Optional: Change text to "No Student Linked" if you want
      }
    })
    .catch((err) => console.error("Error loading children:", err));

  // 4. LOGOUT FUNCTION
  window.logout = function () {
    if (confirm("Are you sure you want to log out?")) {
      localStorage.removeItem("currentUser");
      window.location.href = "../../../auth/login.html";
    }
  };
});
