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

document.addEventListener("DOMContentLoaded", function () {
  // 1. Get User Data
  const userString = localStorage.getItem("currentUser");
  const currentUser = JSON.parse(userString);

  // 2. Security Check (Optional but recommended)
  if (!currentUser || currentUser.role !== "admin") {
    // alert("Access Denied");
    // window.location.href = "../../../auth/login.html";
    // return;
  }

  // 3. Update Header
  const headerName = document.getElementById("headerUserName");
  const headerImg = document.getElementById("headerProfileImage");

  if (headerName && currentUser.firstname) {
    headerName.innerText = currentUser.firstname; // Should show "Admin_01"
  }

  loadPendingTeachers();
});

function loadPendingTeachers() {
  const listContainer = document.getElementById("pendingApprovalsList");
  if (!listContainer) return;

  fetch("http://localhost:3000/get-pending-teachers")
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        renderPendingList(data.teachers, listContainer);
      }
    })
    .catch((err) => console.error("Error loading pending:", err));
}

function renderPendingList(teachers, container) {
  container.innerHTML = ""; // Clear "Loading..." text

  if (teachers.length === 0) {
    container.innerHTML = `<p style="padding:15px; color:var(--text-gray); font-size:13px;">No pending approvals.</p>`;
    return;
  }

  teachers.forEach((teacher) => {
    // 1. Create the Item Div
    const item = document.createElement("div");
    item.className = "queue-item";

    // 2. Handle Profile Photo
    const photoUrl = teacher.profilePhoto
      ? "http://localhost:3000" + teacher.profilePhoto
      : "../../../assets/placeholder_image.jpg";

    // 3. FIX: Handle Date Formatting
    // If dateJoined exists, format it nicely. If not, fallback to "Unknown Date".
    const dateObj = teacher.dateJoined ? new Date(teacher.dateJoined) : null;
    const dateString = dateObj
      ? dateObj.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short", // "Dec" instead of "12"
          day: "numeric",
        })
      : "Date N/A";

    // 4. Generate HTML
    item.innerHTML = `
            <img src="${photoUrl}" class="queue-avatar" style="object-fit:cover;" />
            <div class="queue-info">
                <span class="q-name">${teacher.firstname} ${teacher.lastname}</span>
                <span class="q-action">Role: Teacher • @${teacher.username}</span>
                <span class="q-time">Joined: ${dateString}</span>
            </div>
            <div class="action-buttons-small">
                <button class="btn-icon-approve" onclick="approveTeacher('${teacher.username}')">
                    <span class="material-symbols-outlined">check</span>
                </button>
                <button class="btn-icon-deny">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
        `;

    container.appendChild(item);
  });
}

// Global function to handle approval click
window.approveTeacher = function (username) {
  if (!confirm(`Approve teacher account for @${username}?`)) return;

  fetch("http://localhost:3000/approve-teacher", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: username }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        alert("✅ Teacher Approved Successfully!");
        loadPendingTeachers(); // Refresh the list
      } else {
        alert("Error: " + data.message);
      }
    });
};
