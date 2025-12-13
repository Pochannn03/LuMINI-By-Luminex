document.addEventListener("DOMContentLoaded", function () {
  // 1. Load User Data from LocalStorage
  const userString = localStorage.getItem("currentUser");
  if (!userString) {
    // Optional: Redirect if not logged in
    // window.location.href = "../../../auth/login.html";
    return;
  }
  const currentUser = JSON.parse(userString);

  // 2. Update Header Profile (Name & Photo)
  const headerName = document.querySelector(".user-name");
  const headerImg = document.querySelector(".profile-avatar");

  if (headerName)
    headerName.innerText = `${currentUser.firstname} ${currentUser.lastname}`;
  if (headerImg && currentUser.profilePhoto) {
    headerImg.src = "http://localhost:3000" + currentUser.profilePhoto;
  }

  // 3. Set Date
  const dateDisplay = document.getElementById("dateDisplay");
  const today = new Date();
  if (dateDisplay)
    dateDisplay.innerText = today.toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
    });

  console.log("🕵️ DETECTIVE: My User ID is:", currentUser.id);

  // 4. Load Class & Students
  loadTeacherClass(currentUser.id);

  // 5. Attach Save Button Listener
  document
    .getElementById("saveBtn")
    .addEventListener("click", collectAttendanceData);
});

function loadTeacherClass(id) {
  // Changed parameter name to 'id' for clarity
  fetch("http://localhost:3000/get-teacher-class", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teacherId: id }), // Send 'teacherId'
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        // Update Page Title with Class Name
        const title = document.querySelector(".page-title");
        if (title) title.innerText = `Attendance: ${data.className}`;

        renderStudentRows(data.students);
      } else {
        console.warn(data.message);
        const listContainer = document.querySelector(".modern-table tbody");
        listContainer.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px; color:#64748b;">${data.message}</td></tr>`;
      }
    })
    .catch((err) => console.error("Error loading class:", err));
}

function renderStudentRows(students) {
  const listContainer = document.querySelector(".modern-table tbody");
  listContainer.innerHTML = "";

  if (students.length === 0) {
    listContainer.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px;">No students enrolled yet.</td></tr>`;
    return;
  }

  students.forEach((student) => {
    const tr = document.createElement("tr");
    tr.className = "table-row";
    tr.setAttribute("data-student-id", student.studentID);
    tr.setAttribute(
      "data-student-name",
      `${student.firstname} ${student.lastname}`
    );

    const photoUrl = student.profilePhoto
      ? "http://localhost:3000" + student.profilePhoto
      : "../../../assets/placeholder_image.jpg";

    const fullName = `${student.firstname} ${student.lastname}`;

    // HTML GENERATION
    tr.innerHTML = `
            <td>
              <div class="student-flex">
                <div class="avatar-wrapper">
                  <img src="${photoUrl}" class="s-avatar" />
                  <div class="status-dot-indicator"></div>
                </div>
                <div class="s-info">
                  <span class="s-name">${fullName}</span>
                  <span class="s-id">ID: ${student.studentID}</span>
                </div>
              </div>
            </td>

            <td>
              <input type="time" class="time-input-styled" value="" />
            </td>

            <td>
              <div class="status-segment">
                <label class="segment-opt present">
                  <input type="radio" name="st_${student.studentID}" value="present" />
                  Present
                </label>
                <label class="segment-opt late">
                  <input type="radio" name="st_${student.studentID}" value="late" />
                  Late
                </label>
                <label class="segment-opt absent active"> 
                  <input type="radio" name="st_${student.studentID}" value="absent" checked />
                  Absent
                </label>
              </div>
            </td>
        `;

    listContainer.appendChild(tr);
  });

  attachToggleListeners();
  updateStats();
}

function attachToggleListeners() {
  const toggles = document.querySelectorAll(".segment-opt");

  toggles.forEach((btn) => {
    btn.addEventListener("click", function () {
      // Visual Update
      const group = this.parentElement;
      group
        .querySelectorAll(".segment-opt")
        .forEach((sib) => sib.classList.remove("active"));
      this.classList.add("active");

      // Check input
      this.querySelector("input").checked = true;

      updateStats();
    });
  });
}

function updateStats() {
  // Logic: Present AND Late both count as "Present" in the summary box
  const totalPresent = document.querySelectorAll(
    ".segment-opt.present input:checked"
  ).length;
  const totalLate = document.querySelectorAll(
    ".segment-opt.late input:checked"
  ).length;

  // Combine them
  const combinedPresent = totalPresent + totalLate;

  const totalAbsent = document.querySelectorAll(
    ".segment-opt.absent input:checked"
  ).length;

  const countPresentEl = document.getElementById("countPresent");
  const countAbsentEl = document.getElementById("countAbsent");

  if (countPresentEl) countPresentEl.innerText = combinedPresent;
  if (countAbsentEl) countAbsentEl.innerText = totalAbsent;
}

function collectAttendanceData() {
  const attendancePayload = [];
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const saveBtn = document.getElementById("saveBtn");

  // Loop through rows to gather data
  document.querySelectorAll(".table-row").forEach((row) => {
    const studentId = row.getAttribute("data-student-id");
    const studentName = row.getAttribute("data-student-name");

    // Get Status
    const statusInput = row.querySelector('input[type="radio"]:checked');
    const status = statusInput ? statusInput.value : "absent";

    // Get Time
    const timeInput = row.querySelector(".time-input-styled");
    const timeValue = timeInput ? timeInput.value : ""; // Returns "HH:mm" (24h) or empty

    attendancePayload.push({
      studentID: studentId,
      studentName: studentName,
      date: date,
      status: status,
      arrivalTime: timeValue,
      classID: "Class_ID_Here", // Optional: You could store this in a hidden var if needed
    });
  });

  // UI Feedback
  saveBtn.innerText = "Saving...";

  // SEND TO SERVER
  fetch("http://localhost:3000/save-attendance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attendanceData: attendancePayload }),
  })
    .then((res) => res.json())
    .then((data) => {
      saveBtn.innerHTML = `Saved <span class="material-symbols-outlined">check</span>`;
      setTimeout(() => {
        saveBtn.innerHTML = `Save Attendance <span class="material-symbols-outlined">save</span>`;
      }, 2000);

      if (data.success) {
        alert("✅ Attendance Saved Successfully!");
      } else {
        alert("Error: " + data.message);
      }
    })
    .catch((err) => {
      console.error(err);
      saveBtn.innerText = "Save Failed";
    });
}
