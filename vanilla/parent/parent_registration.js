document.addEventListener("DOMContentLoaded", function () {
  // --- VARIABLES ---
  const invitationSection = document.getElementById("invitationSection");
  const registrationSection = document.getElementById("registrationSection");
  const submitCodeBtn = document.getElementById("submitCodeBtn");
  const codeInputs = document.querySelectorAll(".code-box");

  // Main Registration Variables
  const stepIndicator = document.getElementById("stepIndicator");
  const btnForward = document.getElementById("frwrdBtn");
  const btnBackward = document.getElementById("backWardBtn");
  const mainForm = document.getElementById("mainRegistrationForm"); // GET THE FORM

  const steps = [
    document.getElementById("step1"),
    document.getElementById("step2"),
    document.getElementById("step3"),
    document.getElementById("step4"),
  ];
  let currentStepIndex = 0;

  // --- INVITATION CODE LOGIC ---
  codeInputs.forEach((input, index) => {
    input.addEventListener("input", (e) => {
      input.value = input.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (input.value.length === 1) {
        if (index < codeInputs.length - 1) {
          codeInputs[index + 1].focus();
        }
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && input.value === "") {
        if (index > 0) {
          codeInputs[index - 1].focus();
        }
      }
    });

    input.addEventListener("focus", () => {
      input.select();
    });
  });

  // Submit Code Button Logic
  submitCodeBtn.addEventListener("click", function () {
    // 1. Get the code from the boxes
    let code = "";
    codeInputs.forEach((input) => (code += input.value));

    if (code.length < 6) {
      alert("⚠️ Please enter the full 6-character code.");
      return;
    }

    // 2. Disable button while loading
    const originalText = submitCodeBtn.innerText;
    submitCodeBtn.innerText = "Checking...";
    submitCodeBtn.disabled = true;

    // 3. Send code to backend for verification
    fetch("http://localhost:3000/verify-invite-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // --- SUCCESS: Code Found! ---

          // A. Autofill Child's Name
          const childNameInput = document.querySelector(
            "input[name='child_name']"
          );
          if (childNameInput) {
            childNameInput.value = data.childName;
          }

          // B. NEW: Store the Student ID in the hidden field
          const studentIdInput = document.getElementById("linked_student_id");
          if (studentIdInput) {
            studentIdInput.value = data.studentID;
          }

          // B. Transition to Registration Form
          invitationSection.style.opacity = "0";
          setTimeout(() => {
            invitationSection.style.display = "none";
            registrationSection.style.display = "flex";
            void registrationSection.offsetWidth; // Trigger reflow
            registrationSection.style.opacity = "1";
          }, 300);
        } else {
          // --- FAIL: Invalid Code ---
          alert("❌ " + data.message);
          submitCodeBtn.innerText = originalText;
          submitCodeBtn.disabled = false;
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("❌ Server connection failed. Is the backend running?");
        submitCodeBtn.innerText = originalText;
        submitCodeBtn.disabled = false;
      });
  });

  // --- REGISTRATION FORM LOGIC ---
  function updateView() {
    steps.forEach((step, index) => {
      if (index === currentStepIndex) {
        step.style.display = "flex";
        step.style.flexDirection = "column";
        step.style.width = "100%";
      } else {
        step.style.display = "none";
      }
    });

    stepIndicator.innerText = `Step ${currentStepIndex + 1} of ${steps.length}`;

    if (currentStepIndex === 0) {
      btnBackward.disabled = true;
      btnBackward.style.opacity = "0.5";
      btnBackward.style.cursor = "default";
    } else {
      btnBackward.disabled = false;
      btnBackward.style.opacity = "1";
      btnBackward.style.cursor = "pointer";
    }

    // ALWAYS keep type="button" to prevent browser confusion
    if (currentStepIndex === steps.length - 1) {
      btnForward.textContent = "Finish";
      btnForward.type = "button";
    } else {
      btnForward.textContent = "Next";
      btnForward.type = "button";
    }
  }

  btnForward.addEventListener("click", function (e) {
    e.preventDefault();

    // 1. GENERIC HTML VALIDATION (Required Fields)
    const currentStepContainer = steps[currentStepIndex];
    const inputs = currentStepContainer.querySelectorAll(
      "input[required], select[required]"
    );

    let allValid = true;
    for (const input of inputs) {
      if (!input.checkValidity()) {
        allValid = false;
        input.reportValidity();
        break;
      }
    }

    if (!allValid) return;

    // ============================================================
    // 2. CUSTOM CONSTRAINTS (Ported from Teacher Registration)
    // ============================================================

    // --- STEP 1: ACCOUNT SETUP ---
    if (currentStepIndex === 0) {
      const password = document.querySelector("input[name='password']").value;
      const confirm = document.querySelector(
        "input[name='confirm-password']"
      ).value;

      // Constraint A: Match
      if (password !== confirm) {
        alert("⚠️ Passwords do not match.");
        document.querySelector("input[name='password']").value = "";
        document.querySelector("input[name='confirm-password']").value = "";
        return;
      }

      // Constraint B: Length (NEW)
      if (password.length < 6) {
        alert("⚠️ Password must be at least 6 characters long.");
        return;
      }
    }

    // --- STEP 2: PERSONAL DETAILS ---
    if (currentStepIndex === 1) {
      const phoneInput = document.querySelector("input[name='phone']").value;

      // Constraint C: PH Phone Number Format (NEW)
      // Regex: Starts with '09', followed by exactly 9 digits (total 11)
      const phPhoneRegex = /^09\d{9}$/;

      if (!phPhoneRegex.test(phoneInput)) {
        alert(
          "⛔ Invalid Phone Number.\nFormat should be 11 digits starting with 09 (e.g., 09123456789)."
        );
        return; // Stop the user from proceeding
      }
    }

    // ============================================================
    // 3. NAVIGATION & SUBMISSION LOGIC
    // ============================================================

    // CHECK: IS THIS THE LAST STEP?
    if (currentStepIndex === steps.length - 1) {
      // --- SUBMISSION LOGIC ---
      const originalText = btnForward.textContent;
      btnForward.textContent = "Creating...";
      btnForward.disabled = true;

      // Manual Data Gathering (Because form is a DIV)
      const formData = new FormData();

      // Step 1 Data
      formData.append(
        "username",
        document.querySelector("input[name='username']").value
      );
      formData.append(
        "password",
        document.querySelector("input[name='password']").value
      );

      // Step 2 Data
      formData.append(
        "firstname",
        document.querySelector("input[name='firstname']").value
      );
      formData.append(
        "lastname",
        document.querySelector("input[name='lastname']").value
      );
      formData.append(
        "email",
        document.querySelector("input[name='email']").value
      );
      formData.append(
        "phone",
        document.querySelector("input[name='phone']").value
      );

      const fileInput = document.getElementById("profile-upload");
      if (fileInput.files[0]) {
        formData.append("profile-upload", fileInput.files[0]);
      }

      // Step 3 Data
      formData.append(
        "relationship",
        document.querySelector("select[name='relationship']").value
      );
      formData.append(
        "linked_student_id",
        document.getElementById("linked_student_id").value
      );

      // Step 4 Data
      formData.append(
        "houseUnit",
        document.querySelector("input[name='house-unit']").value
      );
      formData.append(
        "street",
        document.querySelector("input[name='street']").value
      );
      formData.append(
        "barangay",
        document.querySelector("input[name='barangay']").value
      );
      formData.append(
        "city",
        document.querySelector("input[name='city']").value
      );
      formData.append(
        "zipcode",
        document.querySelector("input[name='zipcode']").value
      );

      // SEND TO SERVER
      fetch("http://localhost:3000/register-parent", {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            window.location.href = "../auth/login.html?status=registered";
          } else {
            alert("❌ Error: " + data.message);
            btnForward.textContent = originalText;
            btnForward.disabled = false;
          }
        })
        .catch((err) => {
          console.error(err);
          alert("❌ Server Connection Error");
          btnForward.textContent = originalText;
          btnForward.disabled = false;
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

  updateView();
});

// GLOBAL HELPER FUNCTIONS
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
