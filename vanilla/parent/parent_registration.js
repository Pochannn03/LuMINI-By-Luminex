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

  // Submit Code Button
  submitCodeBtn.addEventListener("click", function () {
    let code = "";
    codeInputs.forEach((input) => (code += input.value));
    const validCodes = ["LUMINI", "PARENT", "TEST01"];

    if (validCodes.includes(code)) {
      invitationSection.style.opacity = "0";
      setTimeout(() => {
        invitationSection.style.display = "none";
        registrationSection.style.display = "flex";
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
    e.preventDefault(); // Safety check

    // 1. VALIDATION
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

    // 2. CHECK: LAST STEP?
    if (currentStepIndex === steps.length - 1) {
      // --- SUBMIT ---
      const formData = new FormData();
      const allInputs = document
        .getElementById("mainRegistrationForm")
        .querySelectorAll("input, select");

      allInputs.forEach((input) => {
        if (input.type === "file") {
          if (input.files[0]) {
            formData.append(input.name, input.files[0]);
          }
        } else {
          formData.append(input.name, input.value);
        }
      });

      fetch("http://localhost:3000/register-parent", {
        method: "POST",
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            // 1. NO ALERT HERE. Just redirect immediately.
            // We add '?status=registered' to the URL to tell the next page what happened.
            window.location.href = "../auth/login.html?status=registered";
          } else {
            alert("❌ Error: " + data.message);
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          alert("❌ Server is offline.");
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
