document.addEventListener("DOMContentLoaded", function () {
    // --- VARIABLES ---
    const stepIndicator = document.getElementById("stepIndicator");
    const btnForward = document.getElementById("frwrdBtn");
    const btnBackward = document.getElementById("backWardBtn");
    const form = document.getElementById("mainRegistrationForm");
  
    // Select the DIVs for each step
    const steps = [
      document.getElementById("step1"),
      document.getElementById("step2"),
      document.getElementById("step3")
    ];
    
    let currentStepIndex = 0;
  
    // --- FUNCTIONS ---
  
    function updateView() {
      // 1. Toggle visibility of steps
      steps.forEach((step, index) => {
        if (index === currentStepIndex) {
          step.style.display = "flex";
          step.style.flexDirection = "column"; // Ensure layout stays correct
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
      if (currentStepIndex === steps.length - 1) {
        btnForward.textContent = "Submit";
        btnForward.type = "submit"; 
      } else {
        btnForward.textContent = "Next";
        btnForward.type = "button";
      }
    }
  
    // --- EVENT LISTENERS ---
  
    btnForward.addEventListener("click", function (e) {
      // If we are on the last step, let the form submit naturally
      if (currentStepIndex === steps.length - 1) {
        // You can add an alert here if you want to test before backend exists
        // alert("Form Submitted!"); 
        return; 
      }
  
      // VALIDATION LOGIC
      // Get all inputs inside the CURRENT visible step
      const currentStepContainer = steps[currentStepIndex];
      const inputs = currentStepContainer.querySelectorAll("input");
      
      let allValid = true;
      for (const input of inputs) {
        // HTML5 built-in validation check
        if (!input.checkValidity()) {
          allValid = false;
          input.reportValidity(); // This pops up the browser "Please fill out this field" msg
          break; // Stop at the first error to avoid spamming
        }
      }
  
      // Only move forward if everything is valid
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
  
    // Initialize the view on load
    updateView();
  });
  
  // --- GLOBAL FUNCTIONS FOR PHOTO UPLOAD (Called by HTML attributes) ---
  
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
  
    input.value = ""; // Clear file input
    previewImg.src = "";
    previewImg.classList.add("hidden");
    removeBtn.classList.add("hidden");
    defaultView.style.display = "flex"; 
  }