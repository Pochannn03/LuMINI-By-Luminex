document.addEventListener("DOMContentLoaded", function () {
  // --- VARIABLES ---
  const stepIndicator = document.getElementById("stepIndicator");
  const btnForward = document.getElementById("frwrdBtn");
  const btnBackward = document.getElementById("backWardBtn");

  // Select the DIVs for each step
  const steps = [
    document.getElementById("step1"),
    document.getElementById("step2"),
    document.getElementById("step3"),
  ];

  let currentStepIndex = 0;

  // --- FUNCTIONS ---

  function updateView() {
    // 1. Toggle visibility of steps
    steps.forEach((step, index) => {
      if (index === currentStepIndex) {
        step.style.display = "flex";
        step.style.flexDirection = "column";
        step.style.width = "100%";
      } else {
        step.style.display = "none";
      }
    });

    // 2. Update Indicator Text
    stepIndicator.innerText = `Step ${currentStepIndex + 1} of ${steps.length}`;

    // 3. Update Back Button State
    if (currentStepIndex === 0) {
      btnBackward.disabled = true;
      btnBackward.style.opacity = "0.5";
      btnBackward.style.cursor = "default";
    } else {
      btnBackward.disabled = false;
      btnBackward.style.opacity = "1";
      btnBackward.style.cursor = "pointer";
    }

    // 4. Update Next Button Text
    // CRITICAL: Always keep type="button" to prevent browser reload!
    if (currentStepIndex === steps.length - 1) {
      btnForward.textContent = "Finish";
      btnForward.type = "button";
    } else {
      btnForward.textContent = "Next";
      btnForward.type = "button";
    }
  }

  // --- EVENT LISTENERS ---

  btnForward.addEventListener("click", function (e) {
    // 1. SAFETY: Stop browser actions immediately
    e.preventDefault();

    // 2. VALIDATION (Check inputs on the CURRENT step only)
    const currentStepContainer = steps[currentStepIndex];
    const inputs = currentStepContainer.querySelectorAll("input[required]");

    // A. Basic HTML5 Validation (Required fields, types, etc.)
    let allValid = true;
    for (const input of inputs) {
      if (!input.checkValidity()) {
        allValid = false;
        input.reportValidity();
        break;
      }
    }
    if (!allValid) return; // Stop if basic checks fail

    // B. CUSTOM VALIDATION (Logic based on Step)

    // STEP 1: ACCOUNT SETUP (Password Matching)
    if (currentStepIndex === 0) {
      const pass = document.getElementById("password").value;
      const confirmPass = document.getElementById("confirm-password").value;

      if (pass !== confirmPass) {
        alert("⛔ Passwords do not match!");
        return; // Stop logic
      }

      if (pass.length < 6) {
        alert("⚠️ Password must be at least 6 characters long.");
        return;
      }
    }

    // STEP 2: PERSONAL DETAILS (Phone Number Format)
    if (currentStepIndex === 1) {
      const phoneInput = document.getElementById("phone").value;

      // Regex: Starts with '09', followed by exactly 9 digits (total 11)
      const phPhoneRegex = /^09\d{9}$/;

      if (!phPhoneRegex.test(phoneInput)) {
        alert(
          "⛔ Invalid Phone Number.\nFormat should be 11 digits starting with 09 (e.g., 09123456789)."
        );
        return; // Stop logic
      }
    }

    // 3. LOGIC: SUBMIT OR NEXT?
    if (currentStepIndex === steps.length - 1) {
      // === SUBMIT LOGIC ===

      // A. Create FormData
      const formData = new FormData();

      // B. Gather all Text Inputs
      formData.append("username", document.getElementById("username").value);
      formData.append("password", document.getElementById("password").value);
      formData.append("firstname", document.getElementById("firstname").value);
      formData.append("lastname", document.getElementById("lastname").value);
      formData.append("email", document.getElementById("email").value);
      formData.append("phone", document.getElementById("phone").value);
      formData.append("houseUnit", document.getElementById("house-unit").value);
      formData.append("street", document.getElementById("street").value);
      formData.append("barangay", document.getElementById("barangay").value);
      formData.append("city", document.getElementById("city").value);
      formData.append("zipcode", document.getElementById("zipcode").value);

      // C. Gather the File
      const fileInput = document.getElementById("profile-upload");
      if (fileInput.files[0]) {
        formData.append("profile-upload", fileInput.files[0]);
      }

      // D. Send to Server
      fetch("http://localhost:3000/register-teacher", {
        method: "POST",
        body: formData,
      })
        .then((response) => response.json())
        // teacher_register.js (Concept)
        .then((data) => {
          if (data.success) {
            // --- SILENT REDIRECT ---
            // Instead of alerting here, we send them to login with a "note"
            window.location.href = "../auth/login.html?status=pending";
          } else {
            alert("❌ Registration Failed: " + data.message);
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          alert("❌ Server Error. Make sure 'node server.js' is running!");
        });
    } else {
      // --- NEXT STEP ---
      currentStepIndex++;
      updateView();
    }
  });

  btnBackward.addEventListener("click", function () {
    if (currentStepIndex > 0) {
      currentStepIndex--;
      updateView();
    }
  });

  // Initialize the view on load
  updateView();
});

// --- GLOBAL FUNCTIONS FOR PHOTO UPLOAD (Unchanged) ---
function handleFileUpload(input) {
  const file = input.files[0];
  const defaultView = document.getElementById("default-upload-view");
  const previewImg = document.getElementById("image-preview");
  const removeBtn = document.getElementById("remove-btn");

  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      previewImg.src = e.target.result;
      defaultView.style.display = "none";
      previewImg.classList.remove("hidden");
      removeBtn.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  }
}

function removeFile() {
  const input = document.getElementById("profile-upload");
  const defaultView = document.getElementById("default-upload-view");
  const previewImg = document.getElementById("image-preview");
  const removeBtn = document.getElementById("remove-btn");

  input.value = "";
  previewImg.src = "";
  previewImg.classList.add("hidden");
  removeBtn.classList.add("hidden");
  defaultView.style.display = "flex";
}
