document.addEventListener("DOMContentLoaded", function () {
  const userString = localStorage.getItem("currentUser");
  if (!userString) return;
  const currentUser = JSON.parse(userString);

  // 1. Load the Class List
  loadTeacherClass(currentUser.id);
});

// --- LOAD CLASS & STUDENTS ---
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

        // A. Render the student rows first
        renderStudentRows(data.students);

        // B. THEN, fetch today's attendance to pre-fill the status
        loadTodayAttendance(teacherId);
      }
    });
}

// --- RENDER ROWS (Updated with "Saved" Indicator) ---
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

// --- LOAD TODAY'S DATA (The Missing Link!) ---
function loadTodayAttendance(teacherId) {
  fetch("http://localhost:3000/get-class-attendance-today", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teacherId: teacherId }),
  })
    .then((res) => res.json())
    .then((response) => {
      if (response.success) {
        const records = response.data;

        records.forEach((record) => {
          // 1. Find the row for this student
          const studentID = record.studentID;

          // 2. Update Status Visuals
          if (record.status) {
            selectStatusUIOnly(studentID, record.status);
          }

          // 3. Update Time
          if (record.arrivalTime) {
            document.getElementById(`time_${studentID}`).value =
              record.arrivalTime;
          }

          // 4. Mark as "Saved"
          markAsSaved(studentID);
        });

        updateStats();
      }
    });
}

// --- UI HELPERS ---

// Helper: Just updates the colors, doesn't save (used during loading)
function selectStatusUIOnly(id, status) {
  const row = document.querySelector(`tr[data-student-id="${id}"]`);
  if (!row) return;

  // Reset all
  row
    .querySelectorAll(".segment-opt")
    .forEach((opt) => opt.classList.remove("active"));

  // Set active
  const activeOpt = row.querySelector(`.segment-opt.${status}`);
  if (activeOpt) {
    activeOpt.classList.add("active");
    activeOpt.querySelector("input").checked = true;
  }
}

// Helper: Updates colors AND SAVES (used when clicking)
function selectStatus(id, status) {
  selectStatusUIOnly(id, status);

  // Auto-fill time if Present/Late and time is empty
  const timeInput = document.getElementById(`time_${id}`);
  if ((status === "present" || status === "late") && !timeInput.value) {
    const now = new Date();
    const timeString =
      now.getHours().toString().padStart(2, "0") +
      ":" +
      now.getMinutes().toString().padStart(2, "0");
    timeInput.value = timeString;
  } else if (status === "absent") {
    timeInput.value = "";
  }

  triggerAutoSave(id);
}

// --- AUTO SAVE LOGIC ---
function triggerAutoSave(studentID) {
  const userString = localStorage.getItem("currentUser");
  const teacherId = JSON.parse(userString).id;

  // Get current values
  const row = document.querySelector(`tr[data-student-id="${studentID}"]`);
  const status = row.querySelector('input[type="radio"]:checked').value;
  const time = document.getElementById(`time_${studentID}`).value;

  // Show "Saving..." icon (Cloud Upload)
  const icon = document.getElementById(`save_icon_${studentID}`);
  icon.innerHTML =
    '<span class="material-symbols-outlined">cloud_upload</span>';
  icon.style.color = "#f59e0b"; // Orange

  // Send to Server
  fetch("http://localhost:3000/save-single-attendance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentID: studentID,
      status: status,
      arrivalTime: time,
      teacherId: teacherId,
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
    icon.style.color = "#2ecc71"; // Green
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
