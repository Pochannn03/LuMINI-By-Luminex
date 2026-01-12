document.addEventListener("DOMContentLoaded", function () {
  // 1. GET USER DATA
  const userString = localStorage.getItem("currentUser");
  const currentUser = JSON.parse(userString);

  if (!currentUser || currentUser.role !== "teacher") {
    window.location.href = "../../../auth/login.html";
    return;
  }

  // 2. POPULATE STATIC INFO (From LocalStorage)
  populateStaticInfo(currentUser);

  // 3. FETCH DYNAMIC STATS (From Server)
  fetchTeacherStats(currentUser.id);

  // 4. SETUP BUTTONS
  setupButtons();
});

function populateStaticInfo(user) {
  // Header
  const mainName = document.getElementById("profileMainName");
  const mainRole = document.getElementById("profileMainRole");
  const mainImage = document.getElementById("profileImage");
  const headerUser = document.getElementById("headerUserName");

  if (mainName) mainName.innerText = `${user.firstname} ${user.lastname}`;
  if (headerUser) headerUser.innerText = user.firstname;
  if (mainRole) mainRole.innerText = `Faculty Member • @${user.username}`;

  if (mainImage && user.profilePhoto) {
    mainImage.src = "http://localhost:3000" + user.profilePhoto;
  }

  // Form Fields
  const inputName = document.getElementById("profileFullName");
  const inputEmail = document.getElementById("profileEmail");
  const inputPhone = document.getElementById("profilePhone");

  if (inputName) inputName.value = `${user.firstname} ${user.lastname}`;
  if (inputEmail) inputEmail.value = user.email || "N/A";
  if (inputPhone) inputPhone.value = user.phone || "N/A";
}

function fetchTeacherStats(teacherId) {
  const classInput = document.getElementById("profileClass");
  const statStudents = document.getElementById("statTotalStudents");
  const statSections = document.getElementById("statTotalSections");

  fetch("http://localhost:3000/get-teacher-stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teacherId: teacherId }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        // Update Sections List (e.g. "Sampaguita, Rosas")
        if (classInput) classInput.value = data.sectionNames;

        // Update Numbers
        if (statStudents) statStudents.innerText = data.totalStudents;
        if (statSections) statSections.innerText = data.totalSections;
      }
    })
    .catch((err) => console.error("Stats Error:", err));
}

function setupButtons() {
  // Sign Out
  const signOutBtn = document.querySelector(".btn-signout");
  if (signOutBtn) {
    signOutBtn.onclick = function () {
      if (confirm("Are you sure you want to sign out?")) {
        localStorage.removeItem("currentUser");
        window.location.href = "../../../auth/login.html";
      }
    };
  }

  // Save Button Animation
  const saveBtn = document.getElementById("saveProfileBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      const originalText = saveBtn.innerText;
      saveBtn.innerHTML =
        'Saved <span class="material-symbols-outlined" style="font-size: 18px;">check</span>';
      saveBtn.style.background = "#2ecc71";
      saveBtn.style.borderColor = "#2ecc71";
      saveBtn.style.color = "#fff";

      setTimeout(() => {
        saveBtn.innerText = originalText;
        saveBtn.style.background = "";
        saveBtn.style.borderColor = "";
        saveBtn.style.color = "";
      }, 2000);
    });
  }
}
