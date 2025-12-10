document.addEventListener("DOMContentLoaded", function () {
  // Save Button Logic
  const saveBtn = document.getElementById("saveProfileBtn");

  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      // In a real app, you would gather form data here

      // Visual feedback
      const originalText = saveBtn.innerText;
      saveBtn.innerHTML =
        'Saved <span class="material-symbols-outlined" style="font-size: 18px;">check</span>';
      saveBtn.style.background = "#2ecc71"; // Success Green

      setTimeout(() => {
        saveBtn.innerText = originalText;
        saveBtn.style.background = ""; // Reset to CSS default
      }, 2000);
    });
  }

  // Camera/Upload Button Logic (Placeholder)
  const cameraBtn = document.querySelector(".camera-btn");
  if (cameraBtn) {
    cameraBtn.addEventListener("click", () => {
      alert("This would open the file picker to change your profile picture.");
    });
  }
});

document.addEventListener("DOMContentLoaded", function () {
  // 1. GET USER DATA
  const userString = localStorage.getItem("currentUser");
  const currentUser = JSON.parse(userString);

  // 2. SECURITY CHECK
  if (!currentUser || currentUser.role !== "teacher") {
    window.location.href = "../../../auth/login.html";
    return;
  }

  // 3. POPULATE MAIN PROFILE CARD
  const mainName = document.getElementById("profileMainName");
  const mainRole = document.getElementById("profileMainRole");
  const mainImage = document.getElementById("profileImage");

  if (mainName) {
    // We currently only have firstname in localStorage
    mainName.innerText = currentUser.firstname;
  }

  if (mainRole) {
    mainRole.innerText = `Role: ${currentUser.role.toUpperCase()} • @${
      currentUser.username
    }`;
  }

  if (mainImage && currentUser.profilePhoto) {
    // Load the image from the server
    mainImage.src = "http://localhost:3000" + currentUser.profilePhoto;
  }

  // 4. POPULATE PERSONAL INFORMATION FIELDS
  const inputName = document.getElementById("profileFullName");
  const inputEmail = document.getElementById("profileEmail");
  const inputPhone = document.getElementById("profilePhone");

  if (inputName) {
    // Combine First + Last Name
    inputName.value = `${currentUser.firstname} ${currentUser.lastname}`;
  }

  if (inputEmail) {
    inputEmail.value = currentUser.email;
  }

  if (inputPhone) {
    inputPhone.value = currentUser.phone;
  }

  // --- BUTTON LOGIC ---

  // Sign Out Button
  const signOutBtn = document.querySelector(".btn-signout");
  if (signOutBtn) {
    signOutBtn.onclick = function () {
      if (confirm("Are you sure you want to sign out?")) {
        localStorage.removeItem("currentUser");
        window.location.href = "../../../auth/login.html";
      }
    };
  }

  // Save Button Animation
  const saveBtn = document.getElementById("saveProfileBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      const originalText = saveBtn.innerText;
      saveBtn.innerHTML =
        'Saved <span class="material-symbols-outlined" style="font-size: 18px;">check</span>';
      saveBtn.style.background = "#2ecc71"; // Success Green
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
});
