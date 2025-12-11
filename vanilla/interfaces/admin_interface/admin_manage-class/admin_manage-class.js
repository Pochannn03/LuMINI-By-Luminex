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
  loadActiveClasses(); // NEW: Load classes on start
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
    const scheduleIcon = cls.schedule === "Morning" ? "light_mode" : "bedtime";
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

// Helper: Load Teachers into Dropdown
function loadTeacherOptions() {
  // UPDATED ID: createClassTeacher
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

    // --- THE PHOTO LOGIC ---
    // If student has a photo, use localhost + path. If not, use placeholder.
    const photoUrl = student.profilePhoto
      ? "http://localhost:3000" + student.profilePhoto
      : "../../../assets/placeholder_image.jpg";

    // Fallbacks for data
    const gradeDisplay = student.gradeLevel || "Unassigned";
    const idDisplay = student.studentID || "No ID";

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
            <button class="btn-icon-tool" title="View Profile">
                <span class="material-symbols-outlined">visibility</span>
            </button>
        </div>
    `;

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
    loadEnrollmentList();

    enrollmentModal.classList.add("active");
  });
}

// 2. FETCH & RENDER LIST
function loadEnrollmentList() {
  const container = document.getElementById("enrollmentChecklistContainer");
  container.innerHTML = `<p style="padding:10px; color:#888;">Loading students...</p>`;

  fetch("http://localhost:3000/get-all-students")
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        renderEnrollmentCheckboxes(data.students, container);
      }
    });
}

function renderEnrollmentCheckboxes(students, container) {
  container.innerHTML = "";
  updateHeaderCount(); // Update "0 / 30" immediately

  students.forEach((student) => {
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

    label.innerHTML = `
            <input type="checkbox" class="enroll-checkbox" value="${student.studentID}" ${isChecked}/>
            <div class="check-content">
                <img src="${photoUrl}" class="small-avatar" style="object-fit:cover;" />
                <div class="check-info">
                    <span class="name">${student.firstname} ${student.lastname}</span>
                    <span class="id">${student.studentID}</span>
                </div>
            </div>
        `;

    // --- CHECKBOX LOGIC (The Enforcer) ---
    const checkbox = label.querySelector("input");
    checkbox.addEventListener("change", (e) => {
      const id = e.target.value;

      if (e.target.checked) {
        // Check Capacity
        if (selectedStudentIDs.size >= currentMaxCapacity) {
          e.preventDefault();
          e.target.checked = false; // Uncheck immediately
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

    // Save to Hidden Input (So the Create Class form can read it later)
    document.getElementById("finalStudentListJSON").value =
      JSON.stringify(finalArray);

    // Update Summary Text
    document.getElementById(
      "enrollmentSummaryCount"
    ).innerText = `${finalArray.length} Selected`;

    enrollmentModal.classList.remove("active");
  });
}
