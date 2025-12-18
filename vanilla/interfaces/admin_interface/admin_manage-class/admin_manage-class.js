const openBtn = document.getElementById("burgerIconOpenNav");
const navBar = document.getElementById("sideNavBar");
const overlay = document.getElementById("navOverlay");
const body = document.body;

// 1. Sidebar Logic
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

// --- CLASS MODAL LOGIC (Existing) ---
const editModal = document.getElementById("editClassModal");
const openEditBtns = document.querySelectorAll(".open-edit-modal");
const closeEditBtns = document.querySelectorAll(".close-edit-modal");

openEditBtns.forEach((btn) =>
  btn.addEventListener("click", () => editModal.classList.add("active"))
);
closeEditBtns.forEach((btn) =>
  btn.addEventListener("click", () => editModal.classList.remove("active"))
);

const addModal = document.getElementById("addClassModal");
const addBtn = document.getElementById("addClassBtn");
const closeAddBtn = document.getElementById("closeAddModalBtn");

if (addBtn)
  addBtn.addEventListener("click", () => addModal.classList.add("active"));
if (closeAddBtn)
  closeAddBtn.addEventListener("click", () =>
    addModal.classList.remove("active")
  );

window.addEventListener("click", (e) => {
  if (e.target === editModal) editModal.classList.remove("active");
  if (e.target === addModal) addModal.classList.remove("active");
});

// ==========================================
// TEACHER DIRECTORY LOGIC (EDIT & DELETE)
// ==========================================

// -- Elements --
const editTeacherModal = document.getElementById("editTeacherModal");
const deleteTeacherModal = document.getElementById("deleteTeacherModal"); // NEW

// Edit Elements
const closeTeacherModalBtn = document.getElementById("closeEditTeacherBtn");
const saveTeacherBtn = document.getElementById("saveTeacherChangesBtn");

// Delete Elements (NEW)
const cancelDeleteBtn = document.getElementById("cancelDeleteTeacherBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteTeacherBtn");
const deleteInput = document.getElementById("deleteConfirmationInput");

// -- Event Listeners for Modals --

// Close Edit Modal
if (closeTeacherModalBtn) {
  closeTeacherModalBtn.addEventListener("click", () =>
    editTeacherModal.classList.remove("active")
  );
}

// Close Delete Modal
if (cancelDeleteBtn) {
  cancelDeleteBtn.addEventListener("click", () => {
    deleteTeacherModal.classList.remove("active");
    deleteInput.value = ""; // Reset input
    confirmDeleteBtn.classList.remove("enabled"); // Reset button
  });
}

// Close on Outside Click
window.addEventListener("click", (e) => {
  if (e.target === editTeacherModal)
    editTeacherModal.classList.remove("active");
  if (e.target === deleteTeacherModal) {
    deleteTeacherModal.classList.remove("active");
    deleteInput.value = "";
    confirmDeleteBtn.classList.remove("enabled");
  }
});

// -- Logic: Type "Confirm" to Enable Button --
if (deleteInput) {
  deleteInput.addEventListener("input", function () {
    if (this.value === "Confirm") {
      confirmDeleteBtn.classList.add("enabled");
    } else {
      confirmDeleteBtn.classList.remove("enabled");
    }
  });
}

// -- Data Fetching --
document.addEventListener("DOMContentLoaded", function () {
  loadTeachersDirectory();
});

function loadTeachersDirectory() {
  const container = document.getElementById("teachersDirectoryList");
  if (!container) return;

  fetch("http://localhost:3000/get-approved-teachers")
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        renderTeacherCards(data.teachers, container);
      }
    })
    .catch((err) => console.error("Error loading teachers:", err));
}

function renderTeacherCards(teachers, container) {
  container.innerHTML = "";

  if (teachers.length === 0) {
    container.innerHTML = `<p style="padding:15px; color:var(--text-gray); font-size:13px;">No active teachers found.</p>`;
    return;
  }

  teachers.forEach((teacher) => {
    const item = document.createElement("div");
    item.className = "queue-item";

    const photoUrl = teacher.profilePhoto
      ? "http://localhost:3000" + teacher.profilePhoto
      : "../../../assets/placeholder_image.jpg";
    const email = teacher.email || "No email set";

    // Added Delete Button to HTML
    item.innerHTML = `
            <img src="${photoUrl}" class="queue-avatar" style="object-fit:cover;" />
            <div class="queue-info">
                <span class="q-name">${teacher.firstname} ${teacher.lastname}</span>
                <div class="meta-column">
                    <div class="meta-item">
                        <span class="material-symbols-outlined tiny-icon">badge</span>
                        <span>Faculty Member</span>
                    </div>
                    <div class="meta-item">
                        <span class="material-symbols-outlined tiny-icon">mail</span>
                        <span>${email}</span>
                    </div>
                </div>
            </div>
            <div class="action-buttons-small">
                <button class="btn-icon-tool edit-teacher-btn" title="Edit">
                    <span class="material-symbols-outlined">edit</span>
                </button>
                <button class="btn-icon-tool delete delete-teacher-btn" title="Delete">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        `;

    // Attach Listeners
    const editBtn = item.querySelector(".edit-teacher-btn");
    const deleteBtn = item.querySelector(".delete-teacher-btn");

    editBtn.addEventListener("click", () => openEditTeacherModal(teacher));
    deleteBtn.addEventListener("click", () => openDeleteTeacherModal(teacher));

    container.appendChild(item);
  });
}

// -- Open Modals Functions --

function openEditTeacherModal(teacher) {
  document.getElementById("editTeacherId").value = teacher._id;
  document.getElementById("editTeacherFirst").value = teacher.firstname;
  document.getElementById("editTeacherLast").value = teacher.lastname;
  document.getElementById("editTeacherEmail").value = teacher.email || "";
  document.getElementById("editTeacherPhone").value = teacher.phone || "";
  document.getElementById("editTeacherUsername").value = teacher.username;
  document.getElementById("editTeacherPassword").value = teacher.password;

  editTeacherModal.classList.add("active");
}

function openDeleteTeacherModal(teacher) {
  document.getElementById("deleteTeacherId").value = teacher._id;
  // Reset state
  deleteInput.value = "";
  confirmDeleteBtn.classList.remove("enabled");

  deleteTeacherModal.classList.add("active");
}

// -- Save / Delete Actions --

// Save Edit
if (saveTeacherBtn) {
  saveTeacherBtn.addEventListener("click", () => {
    // ... (Your existing Edit Logic) ...
    const id = document.getElementById("editTeacherId").value;
    const firstname = document.getElementById("editTeacherFirst").value;
    const lastname = document.getElementById("editTeacherLast").value;
    const email = document.getElementById("editTeacherEmail").value;
    const phone = document.getElementById("editTeacherPhone").value;
    const username = document.getElementById("editTeacherUsername").value;
    const password = document.getElementById("editTeacherPassword").value;

    if (!username || !password) {
      alert("Username and Password are required.");
      return;
    }

    saveTeacherBtn.innerText = "Saving...";

    fetch("http://localhost:3000/update-teacher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        firstname,
        lastname,
        email,
        phone,
        username,
        password,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        saveTeacherBtn.innerText = "Save Changes";
        if (data.success) {
          alert("✅ Teacher updated successfully!");
          editTeacherModal.classList.remove("active");
          loadTeachersDirectory();
        } else {
          alert("Error: " + data.message);
        }
      })
      .catch((err) => {
        console.error(err);
        saveTeacherBtn.innerText = "Save Changes";
      });
  });
}

// Confirm Delete
if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener("click", () => {
    const id = document.getElementById("deleteTeacherId").value;

    confirmDeleteBtn.innerText = "Deleting...";

    fetch("http://localhost:3000/delete-teacher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id }),
    })
      .then((res) => res.json())
      .then((data) => {
        confirmDeleteBtn.innerText = "Delete Forever";
        if (data.success) {
          alert("🗑️ Teacher deleted successfully.");
          deleteTeacherModal.classList.remove("active");
          loadTeachersDirectory(); // Refresh the list
        } else {
          alert("Error: " + data.message);
        }
      })
      .catch((err) => {
        console.error(err);
        confirmDeleteBtn.innerText = "Delete Forever";
        alert("Server Error");
      });
  });
}

// ==========================================
// ADD NEW TEACHER LOGIC
// ==========================================

const addTeacherModal = document.getElementById("addTeacherModal");
const addTeacherBtn = document.getElementById("addTeacherBtn"); // The button in the card
const closeAddTeacherBtn = document.getElementById("closeAddTeacherBtn");
const submitNewTeacherBtn = document.getElementById("submitNewTeacherBtn");
const realFileInput = document.getElementById("addTeacherPhoto");
const uploadTrigger = document.getElementById("photoUploadTrigger");
const initialView = document.getElementById("uploadInitialView");
const selectedView = document.getElementById("uploadSelectedView");
const fileNameDisplay = document.getElementById("selectedFileName");

// 1. Open/Close Logic
if (addTeacherBtn) {
  addTeacherBtn.addEventListener("click", () => {
    // Clear previous inputs
    document.getElementById("addTeacherFirst").value = "";
    document.getElementById("addTeacherLast").value = "";
    document.getElementById("addTeacherEmail").value = "";
    document.getElementById("addTeacherPhone").value = "";
    document.getElementById("addTeacherUsername").value = "";
    document.getElementById("addTeacherPassword").value = "";
    document.getElementById("addTeacherPhoto").value = "";

    addTeacherModal.classList.add("active");
  });
}

// 1. When the pretty box is clicked, trigger the hidden input click
if (uploadTrigger && realFileInput) {
  uploadTrigger.addEventListener("click", () => {
    realFileInput.click();
  });
}

// 2. When a file is actually picked update the UI
if (realFileInput) {
  realFileInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      fileNameDisplay.innerText = this.files[0].name;
      initialView.classList.add("hidden");
      selectedView.classList.remove("hidden");
    } else {
      // Handle cancel click (reset view)
      resetUploadView();
    }
  });
}

// Helper function to reset view (used when opening modal too)
function resetUploadView() {
  realFileInput.value = "";
  initialView.classList.remove("hidden");
  selectedView.classList.add("hidden");
  fileNameDisplay.innerText = "";
}

if (closeAddTeacherBtn) {
  closeAddTeacherBtn.addEventListener("click", () => {
    addTeacherModal.classList.remove("active");
  });
}

// Close on outside click
window.addEventListener("click", (e) => {
  if (e.target === addTeacherModal) addTeacherModal.classList.remove("active");
});

// 2. Submit Logic (Reusing /register-teacher endpoint)
if (submitNewTeacherBtn) {
  submitNewTeacherBtn.addEventListener("click", () => {
    const firstname = document.getElementById("addTeacherFirst").value;
    const lastname = document.getElementById("addTeacherLast").value;
    const email = document.getElementById("addTeacherEmail").value;
    const phone = document.getElementById("addTeacherPhone").value;
    const username = document.getElementById("addTeacherUsername").value;
    const password = document.getElementById("addTeacherPassword").value;
    const photoInput = document.getElementById("addTeacherPhoto");

    // Basic Validation
    if (!firstname || !lastname || !username || !password) {
      alert("Please fill in all required fields (Name, Username, Password).");
      return;
    }

    submitNewTeacherBtn.innerText = "Creating...";

    // IMPORTANT: We use FormData because we might be sending a file!
    const formData = new FormData();
    formData.append("firstname", firstname);
    formData.append("lastname", lastname);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("username", username);
    formData.append("password", password);

    // Append photo if selected
    if (photoInput.files[0]) {
      formData.append("profile-upload", photoInput.files[0]);
    }

    // Send to existing Register Route
    fetch("http://localhost:3000/register-teacher", {
      method: "POST",
      body: formData, // No Content-Type header needed for FormData, browser sets it automatically
    })
      .then((res) => res.json())
      .then((data) => {
        submitNewTeacherBtn.innerText = "Create Account";

        if (data.success) {
          // Since Admin created it, we might want to auto-approve it?
          // For now, it will be "Pending" unless we update the server to accept an "isApproved" flag during register.
          // Let's stick to simple registration first.

          alert("✅ Teacher Account Created Successfully!");
          addTeacherModal.classList.remove("active");

          // Refresh list (You might need to approve them first in Dashboard, or we can auto-approve next!)
          loadTeachersDirectory();
        } else {
          alert("Error: " + data.message);
        }
      })
      .catch((err) => {
        console.error(err);
        submitNewTeacherBtn.innerText = "Create Account";
        alert("Server Error");
      });
  });
}

// admin_manage-class.js

// ==========================================
// ACTIVE CLASSES LOGIC
// ==========================================

document.addEventListener("DOMContentLoaded", function () {
  loadTeachersDirectory(); // Existing
  loadActiveClasses(); // NEW: Load classes on

  // --- NOTIFICATION TOGGLE LOGIC (Copy-Pasted) ---
  const bellBtn = document.getElementById("bellBtn");
  const notifDropdown = document.getElementById("notificationDropdown");

  if (bellBtn && notifDropdown) {
    bellBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle("active");
    });

    window.addEventListener("click", (e) => {
      if (!notifDropdown.contains(e.target) && e.target !== bellBtn) {
        notifDropdown.classList.remove("active");
      }
    });
  }
});

function loadActiveClasses() {
  const container = document.getElementById("activeClassesList");
  if (!container) return;

  // fetch data
  fetch("http://localhost:3000/get-classes")
    .then((res) => {
      // Check if server returned 200 OK
      if (!res.ok) {
        throw new Error(`Server Error: ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      if (data.success) {
        renderClassCards(data.classes, container);
      } else {
        // Show DB error on screen
        container.innerHTML = `<p style="padding:15px; color:red;">Error: ${data.message}</p>`;
      }
    })
    .catch((err) => {
      console.error("Error loading classes:", err);
      // Show Network/Crash error on screen
      container.innerHTML = `<p style="padding:15px; color:red;">Failed to load. Is Server Running?<br><small>${err.message}</small></p>`;
    });
}

function renderClassCards(classes, container) {
  container.innerHTML = "";

  if (!classes || classes.length === 0) {
    container.innerHTML = `<p style="padding:15px; color:var(--text-gray); font-size:13px;">No active classes yet.</p>`;
    return;
  }

  classes.forEach((cls) => {
    const item = document.createElement("div");
    item.className = "queue-item";

    // Determine Icon Color based on Grade (Visual Polish)
    let iconBg = "blue-bg-soft";
    if (cls.gradeLevel === "Kindergarten") iconBg = "purple-bg-soft";
    if (cls.gradeLevel === "Grade 1") iconBg = "orange-bg-soft";

    const teacherName = cls.teacherUsername || "Unassigned";

    // Determine Schedule Icon
    const scheduleIcon =
      cls.schedule === "Morning" ? "light_mode" : "wb_twilight";
    const scheduleText = cls.schedule === "Morning" ? "AM" : "PM";

    // --- FIX: CALCULATE REAL STUDENT COUNT ---
    const studentCount = cls.students ? cls.students.length : 0;
    const capacity = cls.maxCapacity || 30;

    item.innerHTML = `
        <div class="icon-box-small ${iconBg}">
            <span class="material-symbols-outlined">school</span>
        </div>
        <div class="queue-info">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="q-name">${cls.gradeLevel} - ${cls.section}</span>
                <span style="font-size:11px; font-weight:600; color:#94a3b8; display:flex; align-items:center; gap:4px; background:#f1f5f9; padding:2px 6px; border-radius:4px;">
                    <span class="material-symbols-outlined" style="font-size:14px;">${scheduleIcon}</span>
                    ${scheduleText}
                </span>
            </div>
            
            <div class="meta-row">
                <div class="meta-item">
                    <span class="material-symbols-outlined tiny-icon">person</span>
                    <span>${teacherName}</span>
                </div>
                <div class="meta-item">
                    <span class="material-symbols-outlined tiny-icon">groups</span>
                    <span>${studentCount} / ${capacity} Students</span>
                </div>
            </div>
        </div>
        <div class="action-buttons-small">
            <button class="btn-icon-tool" title="Edit">
                <span class="material-symbols-outlined">edit</span>
            </button>
             <button class="btn-icon-tool delete delete-class-btn" title="Delete">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
    `;

    // Attach Edit Listener
    const editBtn = item.querySelector(".btn-icon-tool[title='Edit']"); // Or use a specific class
    editBtn.addEventListener("click", () => openEditClassModal(cls)); // Pass the 'cls' object!

    // Attach Delete Listener
    const deleteBtn = item.querySelector(".delete-class-btn");
    deleteBtn.addEventListener("click", () => {
      document.getElementById("deleteClassId").value = cls._id;
      document.getElementById("deleteClassConfirmationInput").value = "";
      document
        .getElementById("confirmDeleteClassBtn")
        .classList.remove("enabled");
      document.getElementById("deleteClassModal").classList.add("active");
    });

    container.appendChild(item);
  });
}

const viewStudentModal = document.getElementById("viewStudentModal");
const closeViewStudentBtn = document.getElementById("closeViewStudentBtn");

if (closeViewStudentBtn) {
  closeViewStudentBtn.addEventListener("click", () => {
    viewStudentModal.classList.remove("active");
  });
}
window.addEventListener("click", (e) => {
  if (e.target === viewStudentModal)
    viewStudentModal.classList.remove("active");
});

// ==========================================
// ADD CLASS MODAL LOGIC (UPDATED)
// ==========================================

const addClassModalBtn = document.getElementById("addClassBtn");
const submitCreateClassBtn = document.getElementById("submitCreateClassBtn");

// Open Modal & Pre-load Data
if (addClassModalBtn) {
  addClassModalBtn.addEventListener("click", () => {
    // 1. Reset Form (Using NEW IDs)
    document.getElementById("createClassGrade").value = "";
    document.getElementById("createClassSection").value = "";
    document.getElementById("createClassCapacity").value = "";
    document.getElementById("createClassDesc").value = "";

    // 2. Load Dynamic Options
    loadTeacherOptions();

    // 3. Show Modal
    document.getElementById("addClassModal").classList.add("active");
  });
}

// Helper: Load Teachers into Dropdown (FOR CREATE MODAL)
function loadTeacherOptions() {
  const teacherSelect = document.getElementById("createClassTeacher");
  teacherSelect.innerHTML = `<option value="" disabled selected>Loading...</option>`;

  fetch("http://localhost:3000/get-approved-teachers")
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        teacherSelect.innerHTML = `<option value="" disabled selected>Select a Teacher</option>`;
        data.teachers.forEach((teacher) => {
          const option = document.createElement("option");
          option.value = teacher._id;
          option.textContent = `${teacher.firstname} ${teacher.lastname}`;

          // --- FIX: Save the Full Name here instead of the raw username ---
          option.dataset.username = `${teacher.firstname} ${teacher.lastname}`;

          teacherSelect.appendChild(option);
        });
      }
    });
}

// Helper: Load Sections into Datalist
function loadSectionOptions() {
  // The datalist ID "sectionList" can stay shared, that's fine
  const datalist = document.getElementById("sectionList");
  fetch("http://localhost:3000/get-all-sections")
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        datalist.innerHTML = "";
        data.sections.forEach((sec) => {
          const option = document.createElement("option");
          option.value = sec;
          datalist.appendChild(option);
        });
      }
    });
}

// Submit Create Class (UPDATED)
if (submitCreateClassBtn) {
  submitCreateClassBtn.addEventListener("click", () => {
    // 1. Gather Basic Fields
    const gradeLevel = document.getElementById("createClassGrade").value;
    const section = document.getElementById("createClassSection").value;
    const schedule = document.getElementById("createClassSchedule").value;
    const maxCapacity = document.getElementById("createClassCapacity").value;
    const description = document.getElementById("createClassDesc").value;

    // 2. Gather Teacher
    const teacherSelect = document.getElementById("createClassTeacher");
    const teacherId = teacherSelect.value;
    let teacherUsername = "Unassigned";
    if (teacherSelect.selectedIndex > -1 && teacherId) {
      teacherUsername =
        teacherSelect.options[teacherSelect.selectedIndex].dataset.username;
    }

    // 3. NEW: Gather Enrolled Students
    const studentsJSON = document.getElementById("finalStudentListJSON").value;
    const students = JSON.parse(studentsJSON || "[]"); // This is the array of IDs

    // Validation
    if (!gradeLevel || !section || !schedule) {
      alert("Grade Level, Section, and Schedule are required!");
      return;
    }

    submitCreateClassBtn.innerText = "Creating...";

    // Send Payload (Now includes 'students')
    fetch("http://localhost:3000/create-class", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gradeLevel,
        section,
        schedule,
        maxCapacity,
        description,
        teacherId,
        teacherUsername,
        students, // <--- SENDING THE ARRAY OF IDS
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        submitCreateClassBtn.innerText = "Create Class";
        if (data.success) {
          alert("✅ Class Created & Students Enrolled!");
          document.getElementById("addClassModal").classList.remove("active");

          // Reset Enrollment Data
          document.getElementById("finalStudentListJSON").value = "[]";
          document.getElementById("enrollmentSummaryCount").innerText =
            "0 Selected";

          loadActiveClasses();
        } else {
          alert("Error: " + data.message);
        }
      })
      .catch((err) => {
        console.error(err);
        alert("Server Error");
        submitCreateClassBtn.innerText = "Create Class";
      });
  });
}

// ==========================================
// DELETE CLASS LOGIC
// ==========================================

const deleteClassModal = document.getElementById("deleteClassModal");
const cancelDeleteClassBtn = document.getElementById("cancelDeleteClassBtn");
const confirmDeleteClassBtn = document.getElementById("confirmDeleteClassBtn");
const deleteClassInput = document.getElementById(
  "deleteClassConfirmationInput"
);

// 1. Close Modal Logic
if (cancelDeleteClassBtn) {
  cancelDeleteClassBtn.addEventListener("click", () => {
    deleteClassModal.classList.remove("active");
    deleteClassInput.value = ""; // Reset input
    confirmDeleteClassBtn.classList.remove("enabled"); // Disable button
  });
}

// Close on outside click
window.addEventListener("click", (e) => {
  if (e.target === deleteClassModal) {
    deleteClassModal.classList.remove("active");
    deleteClassInput.value = "";
    confirmDeleteClassBtn.classList.remove("enabled");
  }
});

// 2. ENABLE BUTTON WHEN TYPING "Confirm"
if (deleteClassInput) {
  deleteClassInput.addEventListener("input", function () {
    // Case-sensitive check: Must match "Confirm" exactly
    if (this.value === "Confirm") {
      confirmDeleteClassBtn.classList.add("enabled");
    } else {
      confirmDeleteClassBtn.classList.remove("enabled");
    }
  });
}

// 3. ACTUAL DELETE ACTION
if (confirmDeleteClassBtn) {
  confirmDeleteClassBtn.addEventListener("click", () => {
    // Get the ID from the hidden input we set earlier
    const id = document.getElementById("deleteClassId").value;

    confirmDeleteClassBtn.innerText = "Deleting...";

    fetch("http://localhost:3000/delete-class", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id }),
    })
      .then((res) => res.json())
      .then((data) => {
        confirmDeleteClassBtn.innerText = "Delete Class";
        if (data.success) {
          alert("🗑️ Class deleted successfully.");
          deleteClassModal.classList.remove("active");
          loadActiveClasses(); // Refresh the list
        } else {
          alert("Error: " + data.message);
        }
      })
      .catch((err) => {
        console.error(err);
        confirmDeleteClassBtn.innerText = "Delete Class";
        alert("Server Error");
      });
  });
}

let enrollmentMode = "create";

// ==========================================
// ADD STUDENT LOGIC (UPDATED)
// ==========================================

const addStudentModal = document.getElementById("addStudentModal");
const btnAddStudentMain = document.getElementById("btnAddStudentMain");
const closeAddStudentBtn = document.getElementById("closeAddStudentBtn");
const submitNewStudentBtn = document.getElementById("submitNewStudentBtn");
const refreshInviteBtn = document.getElementById("refreshInviteCodeBtn"); // New ID

// Elements for File Upload
const stuRealInput = document.getElementById("addStudentPhoto");
const stuTrigger = document.getElementById("studentPhotoTrigger");
const stuInitial = document.getElementById("stuUploadInitial");
const stuSelected = document.getElementById("stuUploadSelected");
const stuFileName = document.getElementById("stuFileName");

// 1. Function to Generate Random Code
function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const codeInput = document.getElementById("addStudentInviteCode");
  if (codeInput) codeInput.value = result;
}

// 2. Function to Fetch Next Student ID (Auto-Increment)
function fetchNextStudentID() {
  const idInput = document.getElementById("addStudentID");
  idInput.value = "Loading...";

  fetch("http://localhost:3000/get-next-student-id")
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        idInput.value = data.nextId;
      } else {
        idInput.value = "Error";
      }
    })
    .catch((err) => {
      console.error("ID Fetch Error:", err);
      idInput.value = "Error";
    });
}

// 3. Open Modal & Initialize Data
if (btnAddStudentMain) {
  btnAddStudentMain.addEventListener("click", () => {
    // Clear Inputs
    document.getElementById("addStudentFirst").value = "";
    document.getElementById("addStudentLast").value = "";

    // Reset File View
    stuRealInput.value = "";
    stuInitial.classList.remove("hidden");
    stuSelected.classList.add("hidden");

    // A. Generate Invite Code immediately
    generateInviteCode();

    // B. Fetch Next Student ID immediately
    fetchNextStudentID();

    addStudentModal.classList.add("active");
  });
}

// 4. Manual Refresh Button Listener
if (refreshInviteBtn) {
  refreshInviteBtn.addEventListener("click", () => {
    // Add a little spin animation class if you want, or just generate
    generateInviteCode();
  });
}

// 5. Close Modal Logic
if (closeAddStudentBtn) {
  closeAddStudentBtn.addEventListener("click", () => {
    addStudentModal.classList.remove("active");
  });
}
window.addEventListener("click", (e) => {
  if (e.target === addStudentModal) addStudentModal.classList.remove("active");
});

// 6. File Upload Logic
if (stuTrigger && stuRealInput) {
  stuTrigger.addEventListener("click", () => stuRealInput.click());

  stuRealInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      stuFileName.innerText = this.files[0].name;
      stuInitial.classList.add("hidden");
      stuSelected.classList.remove("hidden");
    }
  });
}

// 7. Submit Student
if (submitNewStudentBtn) {
  submitNewStudentBtn.addEventListener("click", () => {
    const firstname = document.getElementById("addStudentFirst").value;
    const lastname = document.getElementById("addStudentLast").value;
    const studentID = document.getElementById("addStudentID").value;
    const inviteCode = document.getElementById("addStudentInviteCode").value;

    // --- FIX START: Get the birthdate value ---
    const birthdate = document.getElementById("addStudentBirthday").value;
    // --- FIX END ---

    if (!firstname || !lastname) {
      alert("Please enter the student's full name.");
      return;
    }

    submitNewStudentBtn.innerText = "Registering...";

    const formData = new FormData();
    formData.append("firstname", firstname);
    formData.append("lastname", lastname);
    formData.append("studentID", studentID);
    formData.append("parentInviteCode", inviteCode);

    // --- FIX START: Add birthdate to the payload ---
    formData.append("birthdate", birthdate);
    // --- FIX END ---

    if (stuRealInput.files[0]) {
      formData.append("profile-upload", stuRealInput.files[0]);
    }

    fetch("http://localhost:3000/register-student", {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        submitNewStudentBtn.innerText = "Register Student";
        if (data.success) {
          alert(
            `✅ Student Registered!\nID: ${studentID}\nInvite Code: ${inviteCode}`
          );
          addStudentModal.classList.remove("active");
          // TODO: Refresh Student Directory List here
        } else {
          alert("Error: " + data.message);
        }
      })
      .catch((err) => {
        console.error(err);
        submitNewStudentBtn.innerText = "Register Student";
        alert("Server Error");
      });
  });
}

// ==========================================
// STUDENTS DIRECTORY LOGIC (New)
// ==========================================

document.addEventListener("DOMContentLoaded", function () {
  // Existing loaders...
  // loadTeachersDirectory();
  // loadActiveClasses();

  // NEW: Load students when page starts
  loadStudentsDirectory();
});

function loadStudentsDirectory() {
  const container = document.getElementById("studentsDirectoryList");
  if (!container) return;

  fetch("http://localhost:3000/get-all-students")
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        renderStudentCards(data.students, container);
      }
    })
    .catch((err) => console.error("Error loading students:", err));
}

function renderStudentCards(students, container) {
  container.innerHTML = "";

  if (students.length === 0) {
    container.innerHTML = `<p style="padding:15px; color:var(--text-gray); font-size:13px;">No students registered yet.</p>`;
    return;
  }

  students.forEach((student) => {
    const item = document.createElement("div");
    item.className = "queue-item";

    const photoUrl = student.profilePhoto
      ? "http://localhost:3000" + student.profilePhoto
      : "../../../assets/placeholder_image.jpg";

    const gradeDisplay = student.gradeLevel || "Unassigned";
    const idDisplay = student.studentID || "No ID";

    // 1. ADD THE EDIT BUTTON TO THE HTML BELOW
    item.innerHTML = `
        <img src="${photoUrl}" class="queue-avatar" style="object-fit:cover;" />
        <div class="queue-info">
            <span class="q-name">${student.firstname} ${student.lastname}</span>
            <div class="meta-row">
                <div class="meta-item">
                    <span class="material-symbols-outlined tiny-icon">badge</span>
                    <span>${idDisplay}</span>
                </div>
                <div class="meta-item">
                    <span class="material-symbols-outlined tiny-icon">class</span>
                    <span>${gradeDisplay}</span>
                </div>
            </div>
        </div>
        <div class="action-buttons-small">
            <button class="btn-icon-tool view-student-btn" title="View Profile">
                <span class="material-symbols-outlined">visibility</span>
            </button>
            <button class="btn-icon-tool edit-student-btn" title="Edit Profile">
                <span class="material-symbols-outlined">edit</span>
            </button>
        </div>
    `;

    // 2. ATTACH LISTENERS

    // View Button
    const viewBtn = item.querySelector(".view-student-btn");
    viewBtn.addEventListener("click", () => openViewStudentModal(student));

    // Edit Button (NEW)
    const editBtn = item.querySelector(".edit-student-btn");
    editBtn.addEventListener("click", () => openEditStudentModal(student));

    container.appendChild(item);
  });
}

// ==========================================
// STUDENT ENROLLMENT LOGIC (New)
// ==========================================

const enrollmentModal = document.getElementById("enrollmentModal");
const openEnrollmentBtn = document.getElementById("openEnrollmentModalBtn");
const saveEnrollmentBtn = document.getElementById("saveEnrollmentSelectionBtn");
const enrollmentSearch = document.getElementById("enrollmentSearchInput");

// State to track selections
let selectedStudentIDs = new Set();
let currentMaxCapacity = 30;

// 1. OPEN MODAL & INIT
if (openEnrollmentBtn) {
  openEnrollmentBtn.addEventListener("click", () => {
    // A. Get Capacity from the input (default to 30 if empty)
    const capInput = document.getElementById("createClassCapacity").value;
    currentMaxCapacity = parseInt(capInput) || 30;
    document.getElementById("maxCapacityDisplay").innerText =
      currentMaxCapacity;

    // B. Load Current Selection from Hidden Input (Persistence)
    const savedJSON = document.getElementById("finalStudentListJSON").value;
    const savedIDs = JSON.parse(savedJSON || "[]");
    selectedStudentIDs = new Set(savedIDs);

    // C. Load List
    loadEnrollmentList([]);

    enrollmentModal.classList.add("active");
  });
}

// 2. FETCH & RENDER LIST (Updated with Filtering Logic)
function loadEnrollmentList(currentClassStudentIds = []) {
  const container = document.getElementById("enrollmentChecklistContainer");
  container.innerHTML = `<p style="padding:10px; color:#888;">Loading available students...</p>`;

  fetch("http://localhost:3000/get-all-students")
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        renderEnrollmentCheckboxes(
          data.students,
          container,
          currentClassStudentIds
        );
      }
    });
}

function renderEnrollmentCheckboxes(
  students,
  container,
  currentClassStudentIds
) {
  container.innerHTML = "";

  // FILTER THE STUDENTS ("The Cube Logic")
  const availableStudents = students.filter((student) => {
    // 1. If student is Unassigned, SHOW them.
    if (student.gradeLevel === "Unassigned") return true;

    // 2. If we are in EDIT mode, and the student is already in THIS class, SHOW them.
    // (We check if their ID exists in the currentClassStudentIds array)
    if (currentClassStudentIds.includes(student.studentID)) return true;

    // 3. Otherwise (Enrolled in another class), HIDE them.
    return false;
  });

  if (availableStudents.length === 0) {
    container.innerHTML = `<p style="padding:15px; color:var(--text-gray); font-size:13px; text-align:center;">No available students found.</p>`;
    return;
  }

  updateHeaderCount(); // Update "0 / 30" immediately

  availableStudents.forEach((student) => {
    const label = document.createElement("label");
    label.className = "student-check-item";

    // Check if this student is already selected
    const isChecked = selectedStudentIDs.has(student.studentID)
      ? "checked"
      : "";

    // Photo URL
    const photoUrl = student.profilePhoto
      ? "http://localhost:3000" + student.profilePhoto
      : "../../../assets/placeholder_image.jpg";

    // Show their current status label for clarity
    const statusBadge =
      student.gradeLevel === "Unassigned"
        ? `<span style="font-size:10px; background:#e2e8f0; padding:2px 6px; border-radius:4px;">Available</span>`
        : `<span style="font-size:10px; background:#dcfce7; color:#166534; padding:2px 6px; border-radius:4px;">In Class</span>`;

    label.innerHTML = `
            <input type="checkbox" class="enroll-checkbox" value="${student.studentID}" ${isChecked}/>
            <div class="check-content">
                <img src="${photoUrl}" class="small-avatar" style="object-fit:cover;" />
                <div class="check-info">
                    <span class="name">${student.firstname} ${student.lastname}</span>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span class="id">${student.studentID}</span>
                        ${statusBadge}
                    </div>
                </div>
            </div>
        `;

    // --- CHECKBOX LOGIC (The Enforcer) ---
    const checkbox = label.querySelector("input");
    checkbox.addEventListener("change", (e) => {
      const id = e.target.value;

      if (e.target.checked) {
        if (selectedStudentIDs.size >= currentMaxCapacity) {
          e.preventDefault();
          e.target.checked = false;
          alert(
            `⚠️ Limit Reached! This class can only hold ${currentMaxCapacity} students.`
          );
          return;
        }
        selectedStudentIDs.add(id);
      } else {
        selectedStudentIDs.delete(id);
      }
      updateHeaderCount();
    });

    container.appendChild(label);
  });
}

function updateHeaderCount() {
  document.getElementById("currentSelectionCount").innerText =
    selectedStudentIDs.size;
}

// 3. SEARCH FILTER
if (enrollmentSearch) {
  enrollmentSearch.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const items = document.querySelectorAll(
      "#enrollmentChecklistContainer .student-check-item"
    );

    items.forEach((item) => {
      const text = item.innerText.toLowerCase();
      item.style.display = text.includes(term) ? "flex" : "none";
    });
  });
}

// 4. DONE / SAVE BUTTON
if (saveEnrollmentBtn) {
  saveEnrollmentBtn.addEventListener("click", () => {
    // Convert Set back to Array
    const finalArray = Array.from(selectedStudentIDs);

    if (enrollmentMode === "create") {
      // Update Create Form
      document.getElementById("finalStudentListJSON").value =
        JSON.stringify(finalArray);
      document.getElementById(
        "enrollmentSummaryCount"
      ).innerText = `${finalArray.length} Selected`;
    } else {
      // Update Edit Form
      document.getElementById("editStudentListJSON").value =
        JSON.stringify(finalArray);
      document.getElementById(
        "editEnrollmentSummaryCount"
      ).innerText = `${finalArray.length} Selected`;
    }

    enrollmentModal.classList.remove("active");
  });
}

// ==========================================
// EDIT CLASS LOGIC
// ==========================================

const editClassModal = document.getElementById("editClassModal");
const closeEditClassBtn = document.getElementById("closeEditClassBtn");
const saveClassChangesBtn = document.getElementById("saveClassChangesBtn");
const openEditEnrollmentBtn = document.getElementById(
  "openEditEnrollmentModalBtn"
);

// 1. Open Edit Modal (Called from the Pencil Icon)
function openEditClassModal(classData) {
  // A. Populate Basic Fields
  document.getElementById("editClassId_Hidden").value = classData._id;
  document.getElementById("editClassGrade").value = classData.gradeLevel;
  document.getElementById("editClassSection").value = classData.section;
  document.getElementById("editClassSchedule").value = classData.schedule;
  document.getElementById("editClassCapacity").value = classData.maxCapacity;
  document.getElementById("editClassDesc").value = classData.description || "";

  // B. Populate Teacher
  loadTeacherOptionsForEdit(classData.teacherId);

  // C. Populate Enrollment Data
  const currentStudents = classData.students || [];
  document.getElementById("editStudentListJSON").value =
    JSON.stringify(currentStudents);
  document.getElementById(
    "editEnrollmentSummaryCount"
  ).innerText = `${currentStudents.length} Selected`;

  editClassModal.classList.add("active");
}

// Helper: Load Teachers and select the current one
function loadTeacherOptionsForEdit(currentTeacherId) {
  const teacherSelect = document.getElementById("editClassTeacher");
  teacherSelect.innerHTML = `<option value="" disabled>Loading...</option>`;

  fetch("http://localhost:3000/get-approved-teachers")
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        teacherSelect.innerHTML = `<option value="" disabled>Select a Teacher</option>`;
        data.teachers.forEach((teacher) => {
          const option = document.createElement("option");
          option.value = teacher._id;
          option.textContent = `${teacher.firstname} ${teacher.lastname}`;
          option.dataset.username = `${teacher.firstname} ${teacher.lastname}`;

          // Pre-select if matches
          if (teacher._id === currentTeacherId) {
            option.selected = true;
          }

          teacherSelect.appendChild(option);
        });
      }
    });
}

// 2. Open Enrollment Modal (FROM EDIT MODE)
if (openEditEnrollmentBtn) {
  openEditEnrollmentBtn.addEventListener("click", () => {
    enrollmentMode = "edit"; // Set flag

    // Get Capacity
    const capInput = document.getElementById("editClassCapacity").value;
    currentMaxCapacity = parseInt(capInput) || 30;
    document.getElementById("maxCapacityDisplay").innerText =
      currentMaxCapacity;

    // Load IDs from the Edit Hidden Input
    const savedJSON = document.getElementById("editStudentListJSON").value;
    const savedIDs = JSON.parse(savedJSON || "[]");
    selectedStudentIDs = new Set(savedIDs);

    loadEnrollmentList(savedIDs);
    enrollmentModal.classList.add("active");
  });
}

// 3. Save Changes
if (saveClassChangesBtn) {
  saveClassChangesBtn.addEventListener("click", () => {
    const classId = document.getElementById("editClassId_Hidden").value;
    const gradeLevel = document.getElementById("editClassGrade").value;
    const section = document.getElementById("editClassSection").value;
    const schedule = document.getElementById("editClassSchedule").value;
    const maxCapacity = document.getElementById("editClassCapacity").value;
    const description = document.getElementById("editClassDesc").value;

    // Teacher
    const teacherSelect = document.getElementById("editClassTeacher");
    const teacherId = teacherSelect.value;
    let teacherUsername = "Unassigned";
    if (teacherSelect.selectedIndex > -1 && teacherId) {
      teacherUsername =
        teacherSelect.options[teacherSelect.selectedIndex].dataset.username;
    }

    // Students
    const studentsJSON = document.getElementById("editStudentListJSON").value;
    const students = JSON.parse(studentsJSON || "[]");

    saveClassChangesBtn.innerText = "Saving...";

    fetch("http://localhost:3000/update-class", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId,
        gradeLevel,
        section,
        schedule,
        maxCapacity,
        description,
        teacherId,
        teacherUsername,
        students,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        saveClassChangesBtn.innerText = "Save Changes";
        if (data.success) {
          alert("✅ Class Updated Successfully!");
          editClassModal.classList.remove("active");
          loadActiveClasses(); // Refresh dashboard
          loadStudentsDirectory(); // Refresh students to show new assignments
        } else {
          alert("Error: " + data.message);
        }
      });
  });
}

// Close Button
if (closeEditClassBtn) {
  closeEditClassBtn.addEventListener("click", () =>
    editClassModal.classList.remove("active")
  );
}

// Variable to store the ID of the student currently being viewed
let currentViewStudentDbId = null;

function openViewStudentModal(student) {
  currentViewStudentDbId = student._id; // Save ID for deletion

  // 1. Photo
  const photoUrl = student.profilePhoto
    ? "http://localhost:3000" + student.profilePhoto
    : "../../../assets/placeholder_image.jpg";
  document.getElementById("viewStudentPhoto").src = photoUrl;

  // 2. Text Details
  document.getElementById(
    "viewStudentName"
  ).innerText = `${student.firstname} ${student.lastname}`;
  document.getElementById(
    "viewStudentID"
  ).innerText = `ID: ${student.studentID}`;

  // --- NEW: Birthday & Age ---
  const bday = student.birthdate
    ? new Date(student.birthdate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Not Set";
  const age = calculateAge(student.birthdate); // Uses your existing helper function

  document.getElementById("viewStudentBday").innerText = `Born: ${bday}`;
  document.getElementById("viewStudentAgeBadge").innerText = age
    ? `Age: ${age}`
    : "Age: --";

  // 3. Class Logic
  const grade = student.gradeLevel || "Unassigned";
  const section = student.section || "";
  document.getElementById("viewStudentClass").value =
    grade === "Unassigned" ? "Unassigned" : `${grade} - ${section}`;

  // 4. Parent Logic
  document.getElementById("viewStudentParent").value =
    student.parentUsername || "Not Linked Yet";
  document.getElementById("viewStudentInvite").value =
    student.parentInviteCode || "N/A";

  // 5. Medical Info
  document.getElementById("viewStudentAllergies").value =
    student.allergies || "None known";
  document.getElementById("viewStudentMedical").value =
    student.medicalHistory || "None known";

  // 6. Show Modal
  viewStudentModal.classList.add("active");
}

// --- NEW: Delete Student Logic ---
const deleteViewStudentBtn = document.getElementById("deleteViewStudentBtn");

if (deleteViewStudentBtn) {
  deleteViewStudentBtn.addEventListener("click", () => {
    if (!currentViewStudentDbId) return;

    if (
      confirm(
        "Are you sure you want to PERMANENTLY delete this student? This cannot be undone."
      )
    ) {
      deleteViewStudentBtn.innerText = "Deleting...";

      fetch("http://localhost:3000/delete-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentViewStudentDbId }),
      })
        .then((res) => res.json())
        .then((data) => {
          deleteViewStudentBtn.innerText = "Delete Student";
          if (data.success) {
            alert("🗑️ Student Deleted Successfully.");
            viewStudentModal.classList.remove("active");
            loadStudentsDirectory(); // Refresh the list
            loadActiveClasses(); // Refresh classes (student count changes)
          } else {
            alert("Error: " + data.message);
          }
        })
        .catch((err) => {
          console.error(err);
          deleteViewStudentBtn.innerText = "Delete Student";
          alert("Server Error");
        });
    }
  });
}

// ==========================================
// MISSING LOGIC: EDIT STUDENT & AGE CALC
// ==========================================

// 1. Age Calculator Utility
function calculateAge(birthDateString) {
  if (!birthDateString) return "";
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();

  // Adjust if birthday hasn't occurred yet this year
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// 2. Open Edit Student Modal
function openEditStudentModal(student) {
  const modal = document.getElementById("editStudentModal");

  // Populate IDs and Hidden Fields
  document.getElementById("editStudentDbId").value = student._id;
  document.getElementById("editStudentID").value = student.studentID;

  // Populate Names
  document.getElementById("editStudentFirst").value = student.firstname;
  document.getElementById("editStudentLast").value = student.lastname;

  // Populate Birthday & Auto-Calc Age
  const bdayInput = document.getElementById("editStudentBirthday");
  bdayInput.value = student.birthdate || "";
  document.getElementById("editStudentAge").value = calculateAge(
    student.birthdate
  );

  // Populate Photo Preview
  const photoUrl = student.profilePhoto
    ? "http://localhost:3000" + student.profilePhoto
    : "../../../assets/placeholder_image.jpg";
  document.getElementById("editStudentPreview").src = photoUrl;

  // Show Modal
  modal.classList.add("active");
}

// 3. Auto-Calculate Age when Date Changes (For both Add & Edit modals)
const addBdayInput = document.getElementById("addStudentBirthday");
const editBdayInput = document.getElementById("editStudentBirthday");

if (addBdayInput) {
  addBdayInput.addEventListener("change", (e) => {
    document.getElementById("addStudentAge").value = calculateAge(
      e.target.value
    );
  });
}

if (editBdayInput) {
  editBdayInput.addEventListener("change", (e) => {
    document.getElementById("editStudentAge").value = calculateAge(
      e.target.value
    );
  });
}

// 4. Save Changes Listener
const saveStudentBtn = document.getElementById("saveStudentChangesBtn");
if (saveStudentBtn) {
  saveStudentBtn.addEventListener("click", () => {
    const id = document.getElementById("editStudentDbId").value;
    const firstname = document.getElementById("editStudentFirst").value;
    const lastname = document.getElementById("editStudentLast").value;
    const birthdate = document.getElementById("editStudentBirthday").value;
    const photoInput = document.getElementById("editStudentPhotoInput");

    saveStudentBtn.innerText = "Saving...";

    const formData = new FormData();
    formData.append("id", id);
    formData.append("firstname", firstname);
    formData.append("lastname", lastname);
    formData.append("birthdate", birthdate);

    if (photoInput.files[0]) {
      formData.append("profile-upload", photoInput.files[0]);
    }

    fetch("http://localhost:3000/update-student", {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        saveStudentBtn.innerText = "Save Changes";
        if (data.success) {
          alert("✅ Student Updated!");
          document
            .getElementById("editStudentModal")
            .classList.remove("active");
          loadStudentsDirectory(); // Refresh the list
        } else {
          alert("Error: " + data.message);
        }
      })
      .catch((err) => {
        console.error(err);
        saveStudentBtn.innerText = "Save Changes";
        alert("Server Error");
      });
  });
}

// 5. Close Edit Modal Button
const closeEditStudentBtn = document.getElementById("closeEditStudentBtn");
if (closeEditStudentBtn) {
  closeEditStudentBtn.addEventListener("click", () => {
    document.getElementById("editStudentModal").classList.remove("active");
  });
}

// OPTIONAL: Immediate Preview for Edit Student Photo
const editPhotoInput = document.getElementById("editStudentPhotoInput");
const editPhotoPreview = document.getElementById("editStudentPreview");

if (editPhotoInput && editPhotoPreview) {
  editPhotoInput.addEventListener("change", function (e) {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = function (e) {
        editPhotoPreview.src = e.target.result; // Update the image tag instantly
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  });
}

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
