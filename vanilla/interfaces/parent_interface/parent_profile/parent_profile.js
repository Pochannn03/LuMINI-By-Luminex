// parent_profile.js

document.addEventListener("DOMContentLoaded", function () {
  // --- 1. GET & CHECK USER DATA ---
  const userString = localStorage.getItem("currentUser");
  // Parse the data immediately
  const currentUser = JSON.parse(userString);

  // Redirect if not logged in or not a parent
  if (!currentUser || currentUser.role !== "parent") {
    window.location.href = "../../../auth/login.html";
    return;
  }

  const serverUrl = "http://localhost:3000";
  // Construct full name from stored data
  const fullName = `${currentUser.firstname} ${currentUser.lastname}`;

  // --- 2. POPULATE STATIC PROFILE DATA ---
  populateProfileData(currentUser, fullName, serverUrl);

  // --- 3. FETCH & RENDER DYNAMIC CHILDREN LIST (NEW SECTION) ---
  fetchAndRenderChildren(fullName, serverUrl);

  // --- 4. SETUP EVENT LISTENERS (Save button & Modals) ---
  setupEventListeners();
});

// =============== HELPER FUNCTIONS ===============

/**
 * Populates the header and main profile card with user info.
 */
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

  // Header & Main Card visuals
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

  // Form Inputs
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
    ].filter(Boolean);
    inputAddress.value =
      parts.length > 0 ? parts.join(", ") : "Address not set";
  }
}

/**
 * (NEW) Fetches children from server and renders them.
 */
function fetchAndRenderChildren(parentFullName, serverUrl) {
  const childrenListContainer = document.getElementById(
    "childrenListContainer"
  );
  if (!childrenListContainer) return;

  // Use the existing endpoint
  fetch(`${serverUrl}/get-my-children`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parentName: parentFullName }), // Send parent name
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // Render the received array of children documents
        renderChildrenList(data.children, childrenListContainer);
      } else {
        childrenListContainer.innerHTML = `<p style="color: red; padding: 10px;">${data.message}</p>`;
      }
    })
    .catch((error) => {
      console.error("Error fetching children:", error);
      childrenListContainer.innerHTML = `<p style="color: red; padding: 10px;">Failed to load children.</p>`;
    });
}

function renderChildrenList(children, container) {
  container.innerHTML = "";

  if (children.length === 0) {
    container.innerHTML = `<p style="color: var(--text-gray); font-size: 14px; padding: 10px;">No linked students yet.</p>`;
    return;
  }

  children.forEach((child) => {
    const childItem = document.createElement("div");
    childItem.className = "child-item";

    // --- CORRECTION HERE ---
    // We now use child.gradeLevel to match your Dashboard and Schema
    const grade = child.gradeLevel || "Grade N/A";
    const section = child.section || "Section N/A";

    childItem.innerHTML = `
        <img src="../../../assets/placeholder_image.jpg" class="child-avatar" alt="Child Avatar" />
        <div class="child-info">
            <span class="child-name">${child.firstname} ${child.lastname}</span>
            <span class="child-grade">${grade} - ${section}</span>
        </div>
        <button class="icon-action-btn edit-child-btn">
            <span class="material-symbols-outlined">edit</span>
        </button>
        `;

    container.appendChild(childItem);
  });

  // Re-attach listeners for the "Edit" buttons
  attachModalTriggers();
}

/**
 * Sets up general UI event listeners.
 */
function setupEventListeners() {
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

  // Modal Closes/Saves
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

  if (saveModalBtn) {
    saveModalBtn.addEventListener("click", function () {
      saveModalBtn.innerText = "Saving...";
      setTimeout(() => {
        saveModalBtn.innerText = "Save Details";
        closeModal();
        alert("Student details updated successfully (Simulation).");
      }, 800);
    });
  }
}

// ================= MODAL FUNCTIONS =================

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

/**
 * Finds all .edit-child-btn buttons and makes them open the modal.
 * Must be called AFTER children are rendered.
 */
function attachModalTriggers() {
  const editButtons = document.querySelectorAll(".edit-child-btn");
  editButtons.forEach((btn) => {
    // Remove existing listener first to prevent duplicates
    btn.removeEventListener("click", openModal);
    btn.addEventListener("click", openModal);
  });
}
