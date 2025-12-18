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

  // --- NOTIFICATION DROPDOWN LOGIC ---
  const bellBtn = document.getElementById("bellBtn");
  const notifDropdown = document.getElementById("notificationDropdown");

  if (bellBtn && notifDropdown) {
    // 1. Toggle on Bell Click
    bellBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Stop click from bubbling to window
      notifDropdown.classList.toggle("active");
    });

    // 2. Close when clicking OUTSIDE
    window.addEventListener("click", (e) => {
      if (!notifDropdown.contains(e.target) && e.target !== bellBtn) {
        notifDropdown.classList.remove("active");
      }
    });
  }

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

    item.innerHTML = `
        <img src="${photoUrl}" class="queue-avatar" style="object-fit:cover;" />
        <div class="queue-info">
            <span class="q-name">${teacher.firstname} ${teacher.lastname}</span>
            <span class="q-action">Role: Teacher • @${teacher.username}</span>
            <span class="q-time">Joined: ${dateString}</span>
        </div>
        <div class="action-buttons-small">
            <button class="btn-icon-view view-btn" title="Review Details">
                <span class="material-symbols-outlined">visibility</span>
            </button>
            
            <button class="btn-icon-approve approve-btn" title="Approve">
                <span class="material-symbols-outlined">check</span>
            </button>
            
            <button class="btn-icon-deny reject-btn" title="Reject">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
    `;

    // --- ATTACH EVENT LISTENERS SAFELY ---

    // 1. View Button (Opens Modal)
    item.querySelector(".view-btn").addEventListener("click", () => {
      openReviewModal(teacher);
    });

    // 2. Approve Button
    item.querySelector(".approve-btn").addEventListener("click", () => {
      window.approveTeacher(teacher.username);
    });

    // 3. Reject Button
    item.querySelector(".reject-btn").addEventListener("click", () => {
      window.rejectTeacher(teacher._id, teacher.username);
    });

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

// ==========================================
// NOTIFICATION SYSTEM LOGIC (Phase 3)
// ==========================================

let previousNotifCount = 0; // Tracks history to detect NEW items
let isFirstLoad = true; // Prevents toast spam on page refresh

// 1. Start Polling (Checks every 3 seconds)
setInterval(fetchNotifications, 3000);

// Also run once immediately on load
document.addEventListener("DOMContentLoaded", () => {
  fetchNotifications();
});

// 2. Fetch Logic
function fetchNotifications() {
  fetch("http://localhost:3000/get-notifications")
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        updateNotificationUI(data.notifications);
      }
    })
    .catch((err) => console.error("Notif Sync Error:", err));
}

// 3. UI Update Logic
function updateNotificationUI(notifs) {
  const badge = document.getElementById("bellBadge");
  const list = document.getElementById("notificationList");
  const count = notifs.length;

  // A. Update Badge
  if (count > 0) {
    badge.style.display = "flex";
    badge.innerText = count > 99 ? "99+" : count;
  } else {
    badge.style.display = "none";
  }

  // B. Check for NEW notifications (Trigger Toast)
  // We only toast if count INCREASED and it's not the first load
  if (!isFirstLoad && count > previousNotifCount) {
    const newest = notifs[0]; // The first one is the newest
    showToast(newest.message);
  }

  // Update trackers
  previousNotifCount = count;
  isFirstLoad = false;

  // C. Render Dropdown List
  list.innerHTML = ""; // Clear current list

  if (count === 0) {
    list.innerHTML = `<p class="empty-notif">No new notifications.</p>`;
    return;
  }

  notifs.forEach((n) => {
    // Calculate relative time (e.g. "Just now")
    const timeText = getRelativeTime(new Date(n.createdAt));

    const item = document.createElement("div");
    item.className = "notif-item unread";
    item.innerHTML = `
            <div class="notif-icon-box">
                <span class="material-symbols-outlined">info</span>
            </div>
            <div class="notif-content">
                <h4>System Alert</h4>
                <p>${n.message}</p>
                <span class="notif-time">${timeText}</span>
            </div>
        `;
    list.appendChild(item);
  });
}

// 4. Toast Logic (Slide In)
function showToast(message) {
  const container = document.getElementById("toastContainer");

  const toast = document.createElement("div");
  toast.className = "toast";

  toast.innerHTML = `
        <span class="material-symbols-outlined toast-icon">notifications_active</span>
        <div class="toast-body">
            <h4>New Notification</h4>
            <p>${message}</p>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <span class="material-symbols-outlined">close</span>
        </button>
    `;

  container.appendChild(toast);

  // Trigger Animation (Wait 10ms for DOM to recognize element)
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  // Note: We removed the auto-dismiss timer so it stays until clicked!
}

// 5. Clear All Logic
const clearBtn = document.getElementById("clearAllNotifsBtn");
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    if (!confirm("Clear all notifications?")) return;

    fetch("http://localhost:3000/clear-notifications", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          fetchNotifications(); // Refresh UI immediately
        }
      });
  });
}

// Helper: Relative Time
function getRelativeTime(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return date.toLocaleDateString();
}

// ==========================================
// REVIEW MODAL LOGIC (Lazy Loading Fix)
// ==========================================

// NOTE: We do NOT define the variables here anymore.
// We get them inside the functions to ensure they exist.

let currentReviewTeacher = null;

// Helper to safely set text/value
function setElementValue(id, value, isImage = false) {
  const el = document.getElementById(id);
  if (el) {
    if (isImage) el.src = value;
    else if (el.tagName === "INPUT") el.value = value;
    else el.innerText = value;
  }
}

function openReviewModal(teacher) {
  // 1. GET THE MODAL ELEMENT NOW (Not at page load)
  const reviewModal = document.getElementById("reviewModal");

  if (!reviewModal) {
    console.error("ERROR: Could not find <div id='reviewModal'> in your HTML.");
    alert("Error: Modal HTML is missing or placed after the script tag.");
    return;
  }

  currentReviewTeacher = teacher;

  // 2. Populate Data
  const photoUrl = teacher.profilePhoto
    ? "http://localhost:3000" + teacher.profilePhoto
    : "../../../assets/placeholder_image.jpg";

  setElementValue("reviewPhoto", photoUrl, true);
  setElementValue("reviewName", `${teacher.firstname} ${teacher.lastname}`);
  setElementValue("reviewUsername", `@${teacher.username}`);

  setElementValue("reviewEmail", teacher.email || "N/A");
  setElementValue("reviewPhone", teacher.phone || "N/A");

  const dateObj = teacher.dateJoined
    ? new Date(teacher.dateJoined)
    : new Date();
  setElementValue("reviewDate", dateObj.toLocaleDateString());

  const house = teacher.houseUnit || "";
  const street = teacher.street || "";
  setElementValue("reviewStreet", `${house} ${street}`.trim() || "N/A");

  setElementValue("reviewBarangay", teacher.barangay || "N/A");
  setElementValue("reviewCity", teacher.city || "N/A");
  setElementValue("reviewZip", teacher.zipcode || "N/A");

  // 3. Show Modal
  reviewModal.classList.add("active");
}

// --- EVENT LISTENERS FOR MODAL BUTTONS ---
// We attach these to the document body to handle "event delegation"
// This ensures they work even if the modal loads late.

document.addEventListener("click", function (e) {
  const reviewModal = document.getElementById("reviewModal");
  if (!reviewModal) return;

  // A. Close Button or Overlay Click
  if (e.target.id === "closeReviewBtn" || e.target === reviewModal) {
    reviewModal.classList.remove("active");
  }

  // B. Approve Button
  if (e.target.closest("#modalApproveBtn")) {
    if (currentReviewTeacher) {
      window.approveTeacher(currentReviewTeacher.username);
      reviewModal.classList.remove("active");
    }
  }

  // C. Reject Button
  if (e.target.closest("#modalRejectBtn")) {
    if (currentReviewTeacher) {
      window.rejectTeacher(
        currentReviewTeacher._id,
        currentReviewTeacher.username
      );
      reviewModal.classList.remove("active");
    }
  }
});
