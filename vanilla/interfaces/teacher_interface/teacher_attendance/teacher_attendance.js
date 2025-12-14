// GLOBAL STATE
let currentDate = new Date(); // Defaults to "Now"

document.addEventListener("DOMContentLoaded", function () {
  const userString = localStorage.getItem("currentUser");
  if (!userString) return;
  const currentUser = JSON.parse(userString);

  // --- FIX: UPDATE HEADER (First Name Only) ---
  const headerName = document.querySelector(".user-name");
  const headerImg = document.querySelector(".profile-avatar");

  if (headerName) {
    // Just the first name, as requested!
    headerName.innerText = currentUser.firstname;
  }

  if (headerImg && currentUser.profilePhoto) {
    headerImg.src = "http://localhost:3000" + currentUser.profilePhoto;
  }

  // 1. Initialize Date Display
  updateDateDisplay();

  // 2. Load the Class List
  loadTeacherClass(currentUser.id);

  // 3. DATE NAVIGATION LISTENERS
  document.getElementById("prevDateBtn").addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() - 1);
    updateDateDisplay();
    refreshAttendanceData(currentUser.id);
  });

  document.getElementById("nextDateBtn").addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() + 1);
    updateDateDisplay();
    refreshAttendanceData(currentUser.id);
  });

  // Date Picker Logic
  const dateDisplay = document.getElementById("dateDisplay");
  const datePicker = document.getElementById("datePickerHidden");

  dateDisplay.addEventListener("click", () => {
    if (datePicker.showPicker) {
      datePicker.showPicker();
    } else {
      datePicker.click();
    }
  });

  datePicker.addEventListener("change", (e) => {
    if (e.target.value) {
      currentDate = new Date(e.target.value);
      updateDateDisplay();
      refreshAttendanceData(currentUser.id);
    }
  });

  // --- NEW: ACTIVATE THE MAIN "SAVE ATTENDANCE" BUTTON ---
  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      // Create a visual effect so the user knows it's working
      const originalText = saveBtn.innerHTML;
      saveBtn.innerHTML = `Saving... <span class="material-symbols-outlined dropdown-spin">sync</span>`;
      saveBtn.disabled = true;

      // Collect data from ALL rows
      const allData = collectAllAttendanceData(currentUser.id);

      // Send to Bulk Save Route
      fetch("http://localhost:3000/save-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceData: allData }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            // Turn all cloud icons green
            document.querySelectorAll(".save-indicator").forEach((el) => {
              el.innerHTML =
                '<span class="material-symbols-outlined">cloud_done</span>';
              el.style.color = "#2ecc71";
            });
            alert("✅ All changes saved successfully!");
          } else {
            alert("❌ Save failed: " + data.message);
          }
        })
        .catch((err) => {
          console.error(err);
          alert("❌ Connection Error");
        })
        .finally(() => {
          // Reset button
          saveBtn.innerHTML = originalText;
          saveBtn.disabled = false;
        });
    });
  }
});

// --- HELPER: COLLECT ALL DATA FOR BULK SAVE ---
function collectAllAttendanceData(teacherId) {
  const rows = document.querySelectorAll("tr.table-row");
  const payload = [];
  const targetDate = getFormattedDateForServer();

  rows.forEach((row) => {
    const studentID = row.getAttribute("data-student-id");

    // Get the status (checked radio)
    const checkedRadio = row.querySelector('input[type="radio"]:checked');
    const status = checkedRadio ? checkedRadio.value : "absent"; // Default to absent if nothing

    // Get the time value directly from the input
    const timeInput = document.getElementById(`time_${studentID}`);
    const arrivalTime = timeInput ? timeInput.value : "";

    // Add to list
    payload.push({
      studentID: studentID,
      status: status,
      arrivalTime: arrivalTime,
      teacherId: teacherId, // Optional, but good for verify
      date: targetDate, // Important: Save to the currently viewed date
      classID: "Class_ID_Here", // Server usually handles this lookup, but we can pass it if needed
    });
  });

  return payload;
}

// --- DATE HELPER FUNCTIONS ---
function updateDateDisplay() {
  const displayEl = document.getElementById("dateDisplay");
  const pickerEl = document.getElementById("datePickerHidden");

  const options = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  displayEl.innerText = currentDate.toLocaleDateString("en-US", options);

  const offset = currentDate.getTimezoneOffset() * 60000;
  const localISOTime = new Date(currentDate - offset)
    .toISOString()
    .slice(0, 10);
  pickerEl.value = localISOTime;
}

function getFormattedDateForServer() {
  const offset = currentDate.getTimezoneOffset() * 60000;
  return new Date(currentDate - offset).toISOString().slice(0, 10);
}

// --- DATA LOADING LOGIC ---
function loadTeacherClass(teacherId) {
  fetch("http://localhost:3000/get-teacher-class", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teacherId: teacherId }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        document.querySelector(
          ".page-title"
        ).innerText = `Attendance: ${data.className}`;

        // 1. Sync the Dropdown with Real Data
        const realMode = data.currentMode || "dropoff";
        const simSelect = document.getElementById("simModeSelect");
        if (simSelect) simSelect.value = realMode;

        // 2. Update the New Indicator Pill
        updateModeIndicator(realMode);

        renderStudentRows(data.students);
        refreshAttendanceData(teacherId);
      }
    });
}

// --- NEW HELPER FUNCTION ---
function updateModeIndicator(mode) {
  const pill = document.getElementById("activeModeDisplay");
  const text = document.getElementById("activeModeText");

  if (!pill || !text) return;

  // Reset Classes
  pill.classList.remove("status-dropoff", "status-class", "status-dismissal");

  if (mode === "dropoff") {
    pill.classList.add("status-dropoff");
    text.innerText = "Current: Morning Drop-off";
  } else if (mode === "class") {
    pill.classList.add("status-class");
    text.innerText = "Current: Class In-Session";
  } else if (mode === "dismissal") {
    pill.classList.add("status-dismissal");
    text.innerText = "Current: Afternoon Dismissal";
  }
}

function refreshAttendanceData(teacherId) {
  const dateString = getFormattedDateForServer();

  fetch("http://localhost:3000/get-class-attendance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      teacherId: teacherId,
      date: dateString,
    }),
  })
    .then((res) => res.json())
    .then((response) => {
      if (response.success) {
        // Reset UI
        document
          .querySelectorAll(".segment-opt")
          .forEach((el) => el.classList.remove("active"));
        document
          .querySelectorAll(".segment-opt input")
          .forEach((el) => (el.checked = false));
        document
          .querySelectorAll(".time-input-styled")
          .forEach((el) => (el.value = ""));
        document.querySelectorAll(".save-indicator").forEach((el) => {
          el.innerHTML =
            '<span class="material-symbols-outlined">cloud_off</span>';
          el.style.color = "#cbd5e1";
        });

        // Default to "Absent" active state visually
        document.querySelectorAll(".segment-opt.absent").forEach((el) => {
          el.classList.add("active");
          el.querySelector("input").checked = true;
        });

        // Fill Data
        const records = response.data;
        records.forEach((record) => {
          const studentID = record.studentID;
          if (record.status) selectStatusUIOnly(studentID, record.status);

          // CRITICAL FIX: Ensure time is populated
          if (record.arrivalTime) {
            const timeInput = document.getElementById(`time_${studentID}`);
            if (timeInput) timeInput.value = record.arrivalTime;
          }

          markAsSaved(studentID);
        });

        updateStats();
      }
    });
}

function renderStudentRows(students) {
  const listContainer = document.querySelector(".modern-table tbody");
  listContainer.innerHTML = "";

  students.forEach((student) => {
    const photoUrl = student.profilePhoto
      ? "http://localhost:3000" + student.profilePhoto
      : "../../../assets/placeholder_image.jpg";

    const tr = document.createElement("tr");
    tr.className = "table-row";
    tr.setAttribute("data-student-id", student.studentID);

    tr.innerHTML = `
        <td>
            <div class="student-flex">
                <img src="${photoUrl}" class="s-avatar" />
                <div class="s-info">
                    <span class="s-name">${student.firstname} ${student.lastname}</span>
                    <span class="s-id">ID: ${student.studentID}</span>
                </div>
            </div>
        </td>
        <td>
            <input type="time" class="time-input-styled" id="time_${student.studentID}" onchange="triggerAutoSave('${student.studentID}')" />
        </td>
        <td>
            <div class="status-segment">
                <label class="segment-opt present" onclick="selectStatus('${student.studentID}', 'present')">
                    <input type="radio" name="st_${student.studentID}" value="present" /> Present
                </label>
                <label class="segment-opt late" onclick="selectStatus('${student.studentID}', 'late')">
                    <input type="radio" name="st_${student.studentID}" value="late" /> Late
                </label>
                <label class="segment-opt absent active" onclick="selectStatus('${student.studentID}', 'absent')">
                    <input type="radio" name="st_${student.studentID}" value="absent" checked /> Absent
                </label>
            </div>
        </td>
        <td style="text-align: center;">
            <span class="save-indicator" id="save_icon_${student.studentID}" style="color: #cbd5e1; font-size: 20px;">
                <span class="material-symbols-outlined">cloud_off</span>
            </span>
        </td>
    `;
    listContainer.appendChild(tr);
  });
}

// --- INTERACTION LOGIC ---

function selectStatusUIOnly(id, status) {
  const row = document.querySelector(`tr[data-student-id="${id}"]`);
  if (!row) return;
  row
    .querySelectorAll(".segment-opt")
    .forEach((opt) => opt.classList.remove("active"));
  const activeOpt = row.querySelector(`.segment-opt.${status}`);
  if (activeOpt) {
    activeOpt.classList.add("active");
    activeOpt.querySelector("input").checked = true;
  }
}

function selectStatus(id, status) {
  selectStatusUIOnly(id, status);

  // Auto-fill time Logic
  const timeInput = document.getElementById(`time_${id}`);

  if (status === "present" || status === "late") {
    // Only auto-fill if currently empty
    if (!timeInput.value) {
      const now = new Date();
      const timeString =
        now.getHours().toString().padStart(2, "0") +
        ":" +
        now.getMinutes().toString().padStart(2, "0");
      timeInput.value = timeString;
    }
  } else if (status === "absent") {
    // Clear time if absent
    timeInput.value = "";
  }

  triggerAutoSave(id);
}

function triggerAutoSave(studentID) {
  const userString = localStorage.getItem("currentUser");
  const teacherId = JSON.parse(userString).id;

  const row = document.querySelector(`tr[data-student-id="${studentID}"]`);
  const status = row.querySelector('input[type="radio"]:checked').value;

  // CRITICAL: Get the ACTUAL value from the input box
  const timeInput = document.getElementById(`time_${studentID}`);
  const time = timeInput.value;

  const icon = document.getElementById(`save_icon_${studentID}`);
  if (icon) {
    icon.innerHTML =
      '<span class="material-symbols-outlined dropdown-spin">sync</span>'; // Spin icon
    icon.style.color = "#f59e0b";
  }

  const targetDate = getFormattedDateForServer();

  fetch("http://localhost:3000/save-single-attendance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentID: studentID,
      status: status,
      arrivalTime: time, // This sends exactly what is in the box
      teacherId: teacherId,
      date: targetDate,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        markAsSaved(studentID);
        updateStats();
      }
    });
}

function markAsSaved(id) {
  const icon = document.getElementById(`save_icon_${id}`);
  if (icon) {
    icon.innerHTML =
      '<span class="material-symbols-outlined">cloud_done</span>';
    icon.style.color = "#2ecc71";
  }
}

function updateStats() {
  const totalPresent = document.querySelectorAll(
    ".segment-opt.present.active"
  ).length;
  const totalLate = document.querySelectorAll(
    ".segment-opt.late.active"
  ).length;
  const totalAbsent = document.querySelectorAll(
    ".segment-opt.absent.active"
  ).length;

  document.getElementById("countPresent").innerText = totalPresent + totalLate;
  document.getElementById("countAbsent").innerText = totalAbsent;
}

// --- NEW: SIMULATION LOGIC ---
const simControls = document.getElementById("simulationControls");
const simSelect = document.getElementById("simModeSelect");
const setSimBtn = document.getElementById("setSimModeBtn");

// 1. Function to Check Date and Toggle Visibility
function checkSimulationVisibility() {
  // --- FIX START: Use Local Time for "Today" instead of UTC ---
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const todayStr = new Date(now - offset).toISOString().slice(0, 10);
  // --- FIX END ---

  const viewedDateStr = getFormattedDateForServer();

  if (viewedDateStr === todayStr) {
    simControls.style.display = "flex";

    // (We also need to fetch the mode from the server now, not localStorage,
    // but the UI visibility is the priority fix here)
    const currentMode = localStorage.getItem("lumini_sim_mode") || "dropoff";
    simSelect.value = currentMode;
  } else {
    simControls.style.display = "none";
  }
}

// 2. Attach check to your existing date navigation
// Find your existing updateDateDisplay function and add this call at the end:
/*
    function updateDateDisplay() {
        // ... existing code ...
        pickerEl.value = localISOTime;
        
        checkSimulationVisibility(); // <--- ADD THIS LINE
    }
*/

// 3. Handle "Set Mode" Click (Server-Side Sync)
if (setSimBtn) {
  setSimBtn.addEventListener("click", () => {
    const selectedMode = simSelect.value;
    const userString = localStorage.getItem("currentUser");
    const teacherId = JSON.parse(userString).id;

    // Send to Server
    fetch("http://localhost:3000/set-class-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId, mode: selectedMode }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // Visual Feedback
          const originalText = setSimBtn.innerText;
          setSimBtn.innerText = "Mode Saved!";
          setSimBtn.style.backgroundColor = "#16a34a";

          setTimeout(() => {
            setSimBtn.innerText = originalText;
            setSimBtn.style.backgroundColor = "";
          }, 1500);

          updateModeIndicator(selectedMode);
        }
      });
  });
}

// Initial check on load
checkSimulationVisibility();

let attendancePollInterval;

function startAttendancePolling(teacherId) {
  // Poll every 3 seconds
  attendancePollInterval = setInterval(() => {
    // Only refresh if we are looking at "Today"
    // (We don't want to refresh if the teacher is looking at history)
    if (isViewingToday()) {
      refreshAttendanceData(teacherId);
    }
  }, 3000);
}

// Helper to check if the date picker matches Today
function isViewingToday() {
  const picker = document.getElementById("datePickerHidden");
  if (!picker) return false;

  const viewedDate = picker.value;

  // Calculate "Today" in Local Time (matching your existing logic)
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const todayStr = new Date(now - offset).toISOString().slice(0, 10);

  return viewedDate === todayStr;
}
