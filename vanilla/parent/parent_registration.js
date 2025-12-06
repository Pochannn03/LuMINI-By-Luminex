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
      document.getElementById("step4")
    ];
    let currentStepIndex = 0;
  
    // --- INVITATION CODE LOGIC (Updated for Alphanumeric) ---
    codeInputs.forEach((input, index) => {
        input.addEventListener("input", (e) => {
            // Allow Letters & Numbers, auto-uppercase
            input.value = input.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

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
    submitCodeBtn.addEventListener("click", function() {
        let code = "";
        codeInputs.forEach(input => code += input.value);
        
        if (code.length === 6) {
            invitationSection.style.opacity = "0";
            setTimeout(() => {
                invitationSection.style.display = "none";
                registrationSection.style.display = "flex"; 
                void registrationSection.offsetWidth; 
                registrationSection.style.opacity = "1";
            }, 300); 
        } else {
            alert("Please enter a valid 6-character code.");
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
      if (currentStepIndex === steps.length - 1) return;
  
      const currentStepContainer = steps[currentStepIndex];
      const inputs = currentStepContainer.querySelectorAll("input[required], select[required]");
      
      let allValid = true;
      for (const input of inputs) {
        if (!input.checkValidity()) {
          allValid = false;
          input.reportValidity();
          break;
        }
      }
  
      if (allValid) {
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
    reader.onload = function(e) {
      previewImg.src = e.target.result;
      defaultView.style.display = "none";    
      previewImg.classList.remove("hidden"); 
      removeBtn.classList.remove("hidden");  
    }
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