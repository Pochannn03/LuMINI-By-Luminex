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
  const steps = [
    document.getElementById("step1"),
    document.getElementById("step2"),
    document.getElementById("step3"),
    document.getElementById("step4"),
  ];
  let currentStepIndex = 0;

  // --- INVITATION CODE LOGIC (Updated for Alphanumeric) ---
  codeInputs.forEach((input, index) => {
    input.addEventListener("input", (e) => {
      // Allow Letters & Numbers, auto-uppercase
      input.value = input.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

      // If user typed a char, move to next
      if (input.value.length === 1) {
        if (index < codeInputs.length - 1) {
          codeInputs[index + 1].focus();
        }
      }
    });

    input.addEventListener("keydown", (e) => {
      // Handle Backspace
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

  // 2. Submit Button Click
  submitCodeBtn.addEventListener("click", function () {
    let code = "";
    codeInputs.forEach((input) => (code += input.value));

    // --- HARDCODED VALID CODES FOR TESTING ---
    const validCodes = ["LUMINI", "PARENT", "TEST01"];

    if (validCodes.includes(code)) {
      // SUCCESS: Hide code section, Show form
      invitationSection.style.opacity = "0";
      setTimeout(() => {
        invitationSection.style.display = "none";
        registrationSection.style.display = "flex";
        // Force reflow/repaint for transition
        void registrationSection.offsetWidth;
        registrationSection.style.opacity = "1";
      }, 300);
    } else {
      alert("❌ Invalid Invitation Code. Try 'LUMINI'");
    }
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

    if (currentStepIndex === steps.length - 1) {
      btnForward.textContent = "Finish";
      btnForward.type = "submit";
    } else {
      btnForward.textContent = "Next";
      btnForward.type = "button";
    }
  }

  btnForward.addEventListener("click", function (e) {
    // 1. VALIDATION (Check inputs on the CURRENT step only)
    const currentStepContainer = steps[currentStepIndex];
    const inputs = currentStepContainer.querySelectorAll(
      "input[required], select[required]"
    );

    let allValid = true;
    for (const input of inputs) {
      if (!input.checkValidity()) {
        allValid = false;
        input.reportValidity(); // Shows the "Please fill out this field" bubble
        break; // Stop checking so we don't spam errors
      }
    }

    // If validation failed, stop here.
    if (!allValid) return;

    // 2. CHECK: ARE WE ON THE LAST STEP?
    if (currentStepIndex === steps.length - 1) {
      // --- SUBMISSION LOGIC ---
      e.preventDefault(); // Stop browser refresh

      // A. Create FormData
      const formData = new FormData();

      // B. Gather all inputs
      const allInputs = document
        .getElementById("mainRegistrationForm")
        .querySelectorAll("input, select");

      allInputs.forEach((input) => {
        if (input.type === "file") {
          // Special handling for the file
          if (input.files[0]) {
            formData.append(input.name, input.files[0]);
          }
        } else {
          // Handle text/select inputs
          formData.append(input.name, input.value);
        }
      });

      // C. Send to Server
      fetch("http://localhost:3000/register-parent", {
        method: "POST",
        body: formData, // No Content-Type header needed for FormData
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            alert("✅ Parent Registration Successful!");
            window.location.href = "../auth/login.html";
          } else {
            alert("❌ Error: " + data.message);
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          alert("❌ Server is offline.");
        });
    } else {
      // --- NEXT STEP LOGIC ---
      // If it's NOT the last step, just go forward
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
