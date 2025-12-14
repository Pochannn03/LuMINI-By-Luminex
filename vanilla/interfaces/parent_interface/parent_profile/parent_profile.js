document.addEventListener("DOMContentLoaded", function () {
  // --- 1. GET & CHECK USER DATA ---
  const userString = localStorage.getItem("currentUser");
  const currentUser = JSON.parse(userString);

  if (!currentUser || currentUser.role !== "parent") {
    window.location.href = "../../../auth/login.html";
    return;
  }

  const serverUrl = "http://localhost:3000";
  const fullName = `${currentUser.firstname} ${currentUser.lastname}`;

  // --- 2. POPULATE STATIC PROFILE DATA ---
  populateProfileData(currentUser, fullName, serverUrl);

  // --- 3. FETCH & RENDER DYNAMIC CHILDREN ---
  fetchAndRenderChildren(fullName, serverUrl);

  // --- 4. SETUP EVENT LISTENERS ---
  setupEventListeners();
});

// =============== HELPER FUNCTIONS ===============

function populateProfileData(currentUser, fullName, serverUrl) {
  const headerName = document.getElementById("headerUserName");
  const headerImg = document.getElementById("headerProfileImage");
  const mainName = document.getElementById("profileMainName");
  const mainRole = document.getElementById("profileMainRole");
  const mainImage = document.getElementById("profileMainImage");
  const inputName = document.getElementById("profileFullName");
  const inputEmail = document.getElementById("profileEmail");
  const inputPhone = document.getElementById("profilePhone");
  const inputAddress = document.getElementById("profileAddress");

  if (headerName) headerName.innerText = currentUser.firstname;
  if (headerImg && currentUser.profilePhoto) {
    headerImg.src = serverUrl + currentUser.profilePhoto;
  }
  if (mainName) mainName.innerText = fullName;
  if (mainRole)
    mainRole.innerText = `Parent / Guardian • @${currentUser.username}`;
  if (mainImage && currentUser.profilePhoto) {
    mainImage.src = serverUrl + currentUser.profilePhoto;
  }

  if (inputName) inputName.value = fullName;
  if (inputEmail) inputEmail.value = currentUser.email || "N/A";
  if (inputPhone) inputPhone.value = currentUser.phone || "N/A";

  if (inputAddress) {
    const parts = [
      currentUser.houseUnit,
      currentUser.street,
      currentUser.barangay,
      currentUser.city,
      currentUser.zipcode,
    ].filter((part) => part && part.trim() !== "");
    inputAddress.value =
      parts.length > 0 ? parts.join(", ") : "Address not set";
  }
}

function fetchAndRenderChildren(parentFullName, serverUrl) {
  const childrenListContainer = document.getElementById(
    "childrenListContainer"
  );
  if (!childrenListContainer) return;

  fetch(`${serverUrl}/get-my-children`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parentName: parentFullName }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        renderChildrenList(data.children, childrenListContainer, serverUrl);
      } else {
        childrenListContainer.innerHTML = `<p style="color: red; padding: 10px;">${data.message}</p>`;
      }
    })
    .catch((error) => {
      console.error("Error fetching children:", error);
      childrenListContainer.innerHTML = `<p style="color: red; padding: 10px;">Failed to load children.</p>`;
    });
}

function renderChildrenList(children, container, serverUrl) {
  container.innerHTML = "";

  if (children.length === 0) {
    container.innerHTML = `<p style="color: var(--text-gray); font-size: 14px; padding: 10px;">No linked students yet.</p>`;
    return;
  }

  children.forEach((child) => {
    const childItem = document.createElement("div");
    childItem.className = "child-item";

    const grade = child.gradeLevel || "Unassigned";
    const section = child.section || "Unassigned";

    const photoSrc = child.profilePhoto
      ? serverUrl + child.profilePhoto
      : "../../../assets/placeholder_image.jpg";

    childItem.innerHTML = `
        <img src="${photoSrc}" class="child-avatar" alt="Child Avatar" style="object-fit:cover;" />
        <div class="child-info">
            <span class="child-name">${child.firstname} ${child.lastname}</span>
            <span class="child-grade">${grade} - ${section}</span>
        </div>
        
        <button class="icon-action-btn edit-child-btn">
            <span class="material-symbols-outlined">edit</span>
        </button>
    `;

    // --- NEW: Direct Click Listener for this specific child ---
    const editBtn = childItem.querySelector(".edit-child-btn");
    editBtn.addEventListener("click", () => {
      openStudentModal(child, serverUrl);
    });

    container.appendChild(childItem);
  });
}

// --- UPDATED: Populates Modal with Real Data ---
let currentEditingChildID = null; // Global variable to track who we are editing

function openStudentModal(child, serverUrl) {
  currentEditingChildID = child.studentID; // Save ID for saving later

  // 1. Get Elements
  const modalImg = document.getElementById("modalStudentImage");
  const modalBody = document.querySelector(".modal-body");
  const inputs = modalBody.querySelectorAll("input");
  const textareas = modalBody.querySelectorAll("textarea"); // [0] Allergies, [1] Medical

  // Inputs Mapping based on HTML order
  const nameInput = inputs[0];
  const bdayInput = inputs[1];
  const idInput = inputs[2];
  const gradeInput = inputs[3];

  // 2. Populate Image
  modalImg.src = child.profilePhoto
    ? serverUrl + child.profilePhoto
    : "../../../assets/placeholder_image.jpg";

  // 3. Populate Read-Only Fields
  nameInput.value = `${child.firstname} ${child.lastname}`;

  // --- NEW: DISPLAY BIRTHDAY ---
  bdayInput.value = child.birthdate || "Not set";

  idInput.value = child.studentID || "N/A";
  gradeInput.value = `${child.gradeLevel || "Unassigned"} - ${
    child.section || ""
  }`;

  // 4. Populate Editable Health Fields
  // We use empty string if undefined to avoid "undefined" text
  textareas[0].value = child.allergies || "";
  textareas[1].value = child.medicalHistory || "";

  // 5. Open the Modal
  openModal();
}

function setupEventListeners() {
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

  // Modal Controls
  const modalOverlay = document.getElementById("studentModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const cancelModalBtn = document.getElementById("cancelModalBtn");
  const saveModalBtn = document.getElementById("saveModalBtn");

  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener("click", closeModal);

  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // --- NEW: SAVE BUTTON LOGIC ---
  if (saveModalBtn) {
    saveModalBtn.addEventListener("click", function () {
      if (!currentEditingChildID) return;

      saveModalBtn.innerText = "Saving...";

      // Grab values from textareas
      const modalBody = document.querySelector(".modal-body");
      const textareas = modalBody.querySelectorAll("textarea");
      const allergiesVal = textareas[0].value;
      const medicalVal = textareas[1].value;

      fetch("http://localhost:3000/update-student-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentID: currentEditingChildID,
          allergies: allergiesVal,
          medicalHistory: medicalVal,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          saveModalBtn.innerText = "Save Details";
          if (data.success) {
            alert("✅ Health details updated!");
            closeModal();
            // Optional: Reload children to refresh local data
            // location.reload();
          } else {
            alert("Error: " + data.message);
          }
        })
        .catch((err) => {
          console.error(err);
          saveModalBtn.innerText = "Save Details";
          alert("Server Error");
        });
    });
  }
}

function openModal() {
  const modalOverlay = document.getElementById("studentModal");
  if (modalOverlay) {
    modalOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function closeModal() {
  const modalOverlay = document.getElementById("studentModal");
  if (modalOverlay) {
    modalOverlay.classList.remove("active");
    document.body.style.overflow = "";
  }
}
