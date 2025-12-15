const openBtn = document.getElementById("burgerIconOpenNav");
const navBar = document.getElementById("sideNavBar");
const overlay = document.getElementById("navOverlay");
const body = document.body;

// Function to Toggle Menu
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

document.addEventListener("DOMContentLoaded", function () {
  // 1. Get User Data
  const userString = localStorage.getItem("currentUser");
  const currentUser = JSON.parse(userString);

  // 2. Security Check (Optional)
  // if (!currentUser || currentUser.role !== "admin") { ... }

  // 3. Update Header
  const headerName = document.getElementById("headerUserName");
  if (headerName && currentUser && currentUser.firstname) {
    headerName.innerText = currentUser.firstname;
  }

  // 4. Load Data
  loadPendingTeachers();
  loadAdminStats();
});

function loadAdminStats() {
  const studentEl = document.getElementById("statTotalStudents");
  if (!studentEl) return;

  fetch("http://localhost:3000/get-admin-stats")
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        document.getElementById("statTotalStudents").innerText = data.students;
        document.getElementById("statTotalTeachers").innerText = data.teachers;
        document.getElementById("statTotalParents").innerText = data.parents;
      }
    })
    .catch((err) => console.error("Error loading stats:", err));
}

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
  container.innerHTML = "";

  if (teachers.length === 0) {
    container.innerHTML = `<p style="padding:15px; color:var(--text-gray); font-size:13px;">No pending approvals.</p>`;
    return;
  }

  teachers.forEach((teacher) => {
    const item = document.createElement("div");
    item.className = "queue-item";

    const photoUrl = teacher.profilePhoto
      ? "http://localhost:3000" + teacher.profilePhoto
      : "../../../assets/placeholder_image.jpg";

    const dateObj = teacher.dateJoined ? new Date(teacher.dateJoined) : null;
    const dateString = dateObj
      ? dateObj.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "Date N/A";

    // --- UPDATED BUTTONS ---
    // Added onclick to the Reject Button passing the ID and Username
    item.innerHTML = `
            <img src="${photoUrl}" class="queue-avatar" style="object-fit:cover;" />
            <div class="queue-info">
                <span class="q-name">${teacher.firstname} ${teacher.lastname}</span>
                <span class="q-action">Role: Teacher • @${teacher.username}</span>
                <span class="q-time">Joined: ${dateString}</span>
            </div>
            <div class="action-buttons-small">
                <button class="btn-icon-approve" onclick="approveTeacher('${teacher.username}')" title="Approve">
                    <span class="material-symbols-outlined">check</span>
                </button>
                <button class="btn-icon-deny" onclick="rejectTeacher('${teacher._id}', '${teacher.username}')" title="Reject & Delete">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
        `;

    container.appendChild(item);
  });
}

// --- ACTIONS ---

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
        loadAdminStats(); // Refresh stats (Teacher count increases!)
      } else {
        alert("Error: " + data.message);
      }
    });
};

// --- NEW: REJECT FUNCTION ---
window.rejectTeacher = function (id, username) {
  if (
    !confirm(
      `Are you sure you want to REJECT and DELETE the request for @${username}?`
    )
  )
    return;

  // We reuse the existing /delete-teacher route which does exactly what we want
  fetch("http://localhost:3000/delete-teacher", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: id }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        alert("🗑️ Request Rejected. Teacher account removed.");
        loadPendingTeachers(); // Refresh list (item disappears)
        loadAdminStats(); // Refresh stats
      } else {
        alert("Error: " + data.message);
      }
    })
    .catch((err) => {
      console.error(err);
      alert("Server Error");
    });
};
