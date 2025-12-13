document.addEventListener("DOMContentLoaded", function () {
  // --- 1. GET & CHECK USER DATA ---
  const userString = localStorage.getItem("currentUser");
  const currentUser = JSON.parse(userString);

  // Redirect if not logged in
  if (!currentUser || currentUser.role !== "parent") {
    window.location.href = "../../../auth/login.html";
    return;
  }

  const serverUrl = "http://localhost:3000";
  const fullName = `${currentUser.firstname} ${currentUser.lastname}`;

  // --- 2. POPULATE STATIC PROFILE DATA (Address Logic is here) ---
  populateProfileData(currentUser, fullName, serverUrl);

  // --- 3. FETCH & RENDER DYNAMIC CHILDREN ---
  // Passing serverUrl so we can load photos correctly
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

  // Visuals
  if (headerName) headerName.innerText = currentUser.firstname;
  if (headerImg && currentUser.profilePhoto) {
    headerImg.src = serverUrl + currentUser.profilePhoto;
  }
  if (mainName) mainName.innerText = fullName;
  if (mainRole)
    mainRole.innerText = `Parent / Guardian • @${currentUser.username}`;

  // Main Profile Picture
  if (mainImage && currentUser.profilePhoto) {
    mainImage.src = serverUrl + currentUser.profilePhoto;
  }

  // Inputs
  if (inputName) inputName.value = fullName;
  if (inputEmail) inputEmail.value = currentUser.email || "N/A";
  if (inputPhone) inputPhone.value = currentUser.phone || "N/A";

  // --- ADDRESS LOGIC ---
  if (inputAddress) {
    // We filter out any null/undefined/empty fields
    const parts = [
      currentUser.houseUnit,
      currentUser.street,
      currentUser.barangay,
      currentUser.city,
      currentUser.zipcode,
    ].filter((part) => part && part.trim() !== ""); // Stricter check

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
        // Pass serverUrl to the render function
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

// UPDATED: Now accepts serverUrl to fix the image path
function renderChildrenList(children, container, serverUrl) {
  container.innerHTML = "";

  if (children.length === 0) {
    container.innerHTML = `<p style="color: var(--text-gray); font-size: 14px; padding: 10px;">No linked students yet.</p>`;
    return;
  }

  children.forEach((child) => {
    const childItem = document.createElement("div");
    childItem.className = "child-item";

    const grade = child.gradeLevel || "Grade N/A";
    const section = child.section || "Section N/A";

    // --- FIX: DYNAMIC PHOTO LOGIC ---
    // If child has a photo, append serverUrl. If not, use placeholder.
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

    container.appendChild(childItem);
  });

  attachModalTriggers();
}

// ... (Rest of your Event Listeners & Modal functions stay the same) ...
function setupEventListeners() {
  // ... copy your existing setupEventListeners code here ...
  // (I kept the rest standard to save space, but ensure you include the modal logic below this)
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

function attachModalTriggers() {
  const editButtons = document.querySelectorAll(".edit-child-btn");
  editButtons.forEach((btn) => {
    btn.removeEventListener("click", openModal);
    btn.addEventListener("click", openModal);
  });
}
