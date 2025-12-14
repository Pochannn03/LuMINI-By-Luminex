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
        const child = data.children[0];

        // --- 1. SET BASIC INFO ---
        const childNameEl = document.querySelector(".visual-name");
        if (childNameEl)
          childNameEl.innerText = `${child.firstname} ${child.lastname}`;

        // Photo
        const childImgEl = document.querySelector(".visual-avatar");
        if (childImgEl && child.profilePhoto) {
          childImgEl.src = "http://localhost:3000" + child.profilePhoto;
        }

        // --- 2. THE FORK IN THE ROAD (Enrollment Check) ---
        const isEnrolled =
          child.gradeLevel && child.gradeLevel !== "Unassigned";

        if (!isEnrolled) {
          // === PATH A: NOT ENROLLED ===

          // Text Update
          document.querySelector(".visual-grade").innerText = "No Active Class";

          // Badge Update
          const badge = document.querySelector(".current-status-badge");
          badge.innerText = "Currently not enrolled in any class";
          badge.style.background = "#f1f5f9"; // Neutral Gray
          badge.style.color = "#94a3b8"; // Text Gray
          badge.style.borderColor = "#e2e8f0";

          // Progress Bar: TURN OFF ALL LIGHTS
          const steps = document.querySelectorAll(".tracker-step");
          steps.forEach((step) => step.classList.remove("active", "completed"));
        } else {
          // === PATH B: ENROLLED (Normal Behavior) ===

          document.querySelector(
            ".visual-grade"
          ).innerText = `${child.gradeLevel} - ${child.section}`;

          // Only check attendance if they are actually in a class!
          checkStudentStatus(child.studentID);
        }
      } else {
        console.log("No linked children found.");
        document.querySelector(".visual-name").innerText = "No Student Linked";
        document.querySelector(".visual-grade").innerText =
          "Please contact admin";
      }
    })
    .catch((err) => console.error("Error loading children:", err));

  // HELPER FUNCTION: Update Progress Bar
  function checkStudentStatus(studentID) {
    fetch("http://localhost:3000/get-student-today-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentID: studentID }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          updateProgressBar(data.status);
        }
      });
  }

  function updateProgressBar(status) {
    // 1. Get Elements
    const steps = document.querySelectorAll(".tracker-step");
    // Index 0 = On Way, 1 = Learning, 2 = Dismissed

    const badge = document.querySelector(".current-status-badge");

    // 2. RESET ALL (Clean slate)
    steps.forEach((step) => {
      step.classList.remove("active", "completed");
    });

    // 3. APPLY LOGIC
    if (status === "present" || status === "late") {
      // STATE: LEARNING
      // Step 1 is done
      steps[0].classList.add("completed");
      // Step 2 is active
      steps[1].classList.add("active");

      badge.innerText = "Learning at School";
      badge.style.background = "#fffbeb";
      badge.style.color = "#b45309";
      badge.style.borderColor = "#fcd34d";
    } else {
      // STATE: ON WAY (Default for "no_record" or "absent")
      // Step 1 is active
      steps[0].classList.add("active");

      badge.innerText = "On the Way";
      badge.style.background = "#e0f2fe";
      badge.style.color = "#0369a1";
      badge.style.borderColor = "#7dd3fc";
    }
  }

  // 4. LOGOUT FUNCTION
  window.logout = function () {
    if (confirm("Are you sure you want to log out?")) {
      localStorage.removeItem("currentUser");
      window.location.href = "../../../auth/login.html";
    }
  };
});
